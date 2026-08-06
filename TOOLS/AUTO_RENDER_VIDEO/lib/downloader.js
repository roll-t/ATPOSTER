import fs from 'fs';
import path from 'path';
import https from 'https';
import crypto from 'crypto';
import { exec } from 'child_process';
import { getUploadsDir } from './db.js';

const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
const DATA_DIR = path.resolve('data');
const YTDLP_PATH = path.join(DATA_DIR, 'yt-dlp-bin.exe');
const YTDLP_UPDATE_MARKER = path.join(DATA_DIR, 'yt-dlp-last-update.txt');
const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // Kiểm tra cập nhật tối đa 1 lần/ngày

// Helper to download yt-dlp.exe synchronously/asynchronously
function downloadYtdlp(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        downloadYtdlp(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Tải yt-dlp thất bại: Status Code ${response.statusCode}`));
        return;
      }

      // Ensure data directory exists
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          // Give the OS 1 second to release the file handle and finalize it
          setTimeout(resolve, 1000);
        });
      });
      file.on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

const FFMPEG_ZIP_URL = 'https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-win-64.zip';
const FFMPEG_EXE_PATH = path.join(DATA_DIR, 'ffmpeg.exe');

// Ensure yt-dlp is available
export async function ensureYtdlp() {
  if (!fs.existsSync(YTDLP_PATH)) {
    console.log('[Downloader] Đang tải xuống yt-dlp-bin.exe...');
    await downloadYtdlp(YTDLP_URL, YTDLP_PATH);
    console.log('[Downloader] Tải xuống yt-dlp-bin.exe hoàn tất!');
    try {
      fs.writeFileSync(YTDLP_UPDATE_MARKER, String(Date.now()));
    } catch (e) { }
    return;
  }

  await autoUpdateYtdlpIfStale();
}

// TikTok/YouTube/Facebook... thường xuyên thay đổi cấu trúc trang, khiến yt-dlp cũ báo lỗi
// "Cannot parse data" dù link video vẫn hợp lệ. Tự động kiểm tra & cập nhật yt-dlp (tối đa 1
// lần/ngày để không làm chậm mỗi lượt tải) thay vì chỉ tải 1 lần duy nhất rồi để mặc kệ mãi mãi.
async function autoUpdateYtdlpIfStale() {
  try {
    let lastCheck = 0;
    if (fs.existsSync(YTDLP_UPDATE_MARKER)) {
      lastCheck = parseInt(fs.readFileSync(YTDLP_UPDATE_MARKER, 'utf8'), 10) || 0;
    }
    if (Date.now() - lastCheck < UPDATE_CHECK_INTERVAL_MS) {
      return;
    }

    console.log('[Downloader] Đang kiểm tra phiên bản mới của yt-dlp...');
    await runExec(`"${YTDLP_PATH}" -U`);
    fs.writeFileSync(YTDLP_UPDATE_MARKER, String(Date.now()));
    console.log('[Downloader] Đã kiểm tra/cập nhật yt-dlp xong.');
  } catch (err) {
    console.error('[Downloader] Không thể tự động cập nhật yt-dlp (bỏ qua, dùng bản hiện tại):', err.message);
  }
}

// Ensure ffmpeg is available to merge video & audio streams for high-quality downloads (1080p+)
export async function ensureFfmpeg() {
  if (fs.existsSync(FFMPEG_EXE_PATH)) {
    return true;
  }
  
  console.log('[Downloader] Chưa phát hiện FFmpeg. Bắt đầu tải tự động FFmpeg tĩnh để xử lý video 1080p/4K...');
  const tempZipPath = path.join(DATA_DIR, 'ffmpeg.zip');
  
  try {
    // 1. Tải bằng PowerShell Invoke-WebRequest cho ổn định trên Windows
    console.log('[Downloader] Đang tải FFmpeg zip từ GitHub...');
    await runExec(`powershell -Command "Invoke-WebRequest -Uri '${FFMPEG_ZIP_URL}' -OutFile '${tempZipPath}'"`);
    
    // 2. Giải nén bằng Expand-Archive
    console.log('[Downloader] Đang giải nén FFmpeg.exe...');
    await runExec(`powershell -Command "Expand-Archive -Path '${tempZipPath}' -DestinationPath '${DATA_DIR}' -Force"`);
    
    // 3. Xóa file zip tạm
    if (fs.existsSync(tempZipPath)) {
      fs.unlinkSync(tempZipPath);
    }
    
    console.log('[Downloader] Cài đặt FFmpeg hoàn tất! Hệ thống đã sẵn sàng tải video 1080p/4K.');
    return true;
  } catch (err) {
    console.error('[Downloader Error] Không thể tải FFmpeg, hệ thống sẽ tự động hạ cấp xuống chất lượng thường (SD):', err.message);
    return false;
  }
}

// Run exec command wrapped in Promise with retry mechanism for Windows file locks
function runExec(command, retries = 3, delay = 1500) {
  return new Promise((resolve, reject) => {
    const attempt = (remaining) => {
      exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
          const isFileLocked = error.message.includes('cannot access the file') || 
                               error.message.includes('being used by another process') ||
                               error.message.includes('EBUSY');
          
          if (isFileLocked && remaining > 0) {
            console.log(`[Downloader] File bị khóa (antivirus/Windows Defender đang quét), thử lại sau ${delay}ms... (Còn ${remaining} lần thử)`);
            setTimeout(() => attempt(remaining - 1), delay);
          } else {
            reject(new Error(stderr || error.message));
          }
        } else {
          resolve(stdout);
        }
      });
    };
    attempt(retries);
  });
}

// Dịch các lỗi thường gặp của yt-dlp sang thông báo tiếng Việt dễ hiểu, thay vì hiện nguyên
// traceback kỹ thuật cho người dùng cuối. Giữ nguyên lỗi gốc trong console để debug.
function friendlyYtdlpError(rawMessage) {
  const msg = rawMessage || '';
  if (/Cannot parse data|Unable to extract|not properly formatted/i.test(msg)) {
    return 'Không thể đọc dữ liệu video từ đường link này. Nguyên nhân thường gặp: video đã bị xóa/ẩn/ở chế độ riêng tư, hoặc nền tảng vừa đổi cấu trúc trang mà công cụ tải chưa hỗ trợ kịp. Hãy thử mở link trực tiếp trên trình duyệt để kiểm tra video còn tồn tại không.';
  }
  if (/Private video|This video is unavailable|content isn.t available|video is no longer available/i.test(msg)) {
    return 'Video này đang ở chế độ riêng tư hoặc không còn tồn tại trên nền tảng gốc.';
  }
  if (/Sign in to confirm|login required/i.test(msg)) {
    return 'Nền tảng yêu cầu đăng nhập mới xem được video này, hệ thống chưa hỗ trợ tải video cần đăng nhập.';
  }
  if (/429|rate.?limit/i.test(msg)) {
    return 'Nền tảng đang tạm thời giới hạn truy cập do tải quá nhiều lần liên tục. Vui lòng thử lại sau ít phút.';
  }
  return msg;
}

/**
 * Downloads any video (YouTube Shorts, FB Reels, etc.) using yt-dlp
 * @param {string} url - Direct video link
 * @returns {Promise<{videoFilename: string, caption: string, cover: string}>}
 */
export async function downloadWithYtdlp(url, category = 'Chưa phân loại') {
  // Dọn dẹp trước để giải phóng bộ nhớ dưới 1GB trước khi bắt đầu tải
  try {
    cleanUploadsFolder();
  } catch (cleanErr) {
    console.error('[Downloader] Dọn dẹp trước khi tải lỗi:', cleanErr);
  }

  await ensureYtdlp();
  await ensureFfmpeg();

  console.log(`[Downloader] Đang lấy thông tin video từ: ${url}`);

  // 1. Get Video Metadata
  let metadataStdout;
  try {
    metadataStdout = await runExec(`"${YTDLP_PATH}" --js-runtimes node -j "${url}"`);
  } catch (err) {
    console.error(`[Downloader] Lỗi lấy metadata cho ${url}:`, err.message);
    throw new Error(friendlyYtdlpError(err.message));
  }
  const info = JSON.parse(metadataStdout);

  const caption = info.title || '';
  const cover = info.thumbnail || '';

  // 2. Download Video
  const safeCategory = (category || 'Chưa phân loại').replace(/[\/\\:\*\?"<>\|]/g, '_').trim();
  const uploadsDir = getUploadsDir();
  const videoFolder = path.join(uploadsDir, 'videos', safeCategory);
  if (!fs.existsSync(videoFolder)) {
    fs.mkdirSync(videoFolder, { recursive: true });
  }

  const filename = `reup_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.mp4`;
  const videoFilename = `videos/${safeCategory}/${filename}`;
  const outputPath = path.join(uploadsDir, videoFilename);

  console.log(`[Downloader] Đang tải video về: ${outputPath}`);

  const hasFfmpeg = fs.existsSync(FFMPEG_EXE_PATH);
  const format = hasFfmpeg 
    ? 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best' 
    : 'best[ext=mp4][protocol^=http]/best[protocol^=http]';

  console.log(`[Downloader] Chất lượng tải: ${hasFfmpeg ? 'HD (Video + Audio gốc ghép qua FFmpeg)' : 'SD (Định dạng nén sẵn)'}`);

  const downloadCmd = `"${YTDLP_PATH}" --js-runtimes node ${hasFfmpeg ? `--ffmpeg-location "${DATA_DIR}"` : ''} -f "${format}" -o "${outputPath}" "${url}"`;
  try {
    await runExec(downloadCmd);
  } catch (err) {
    console.error(`[Downloader] Lỗi tải video cho ${url}:`, err.message);
    throw new Error(friendlyYtdlpError(err.message));
  }

  if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
    throw new Error('Tải video thất bại hoặc file tải về bị rỗng.');
  }

  console.log(`[Downloader] Tải video thành công! Kích thước: ${fs.statSync(outputPath).size} bytes`);

  // Đổi mã băm MD5 của video tránh trùng lặp nội dung
  await alterVideoHash(outputPath);

  // Dọn dẹp thư mục uploads nếu vượt giới hạn 1GB
  try {
    cleanUploadsFolder();
  } catch (cleanErr) {
    console.error('[Downloader] Dọn dẹp lỗi:', cleanErr);
  }

  return {
    videoFilename,
    caption,
    cover
  };
}

export function cleanUploadsFolder() {
  try {
    const uploadsDir = getUploadsDir();
    if (!fs.existsSync(uploadsDir)) return;

    const files = fs.readdirSync(uploadsDir);
    const fileDetails = files.map(file => {
      const filePath = path.join(uploadsDir, file);
      try {
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          mtime: stats.mtimeMs
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    // Tính tổng kích thước
    let totalSize = fileDetails.reduce((sum, f) => sum + f.size, 0);
    const LIMIT = 1024 * 1024 * 1024; // 1 GB in bytes

    if (totalSize > LIMIT) {
      console.log(`[Cleaner] Tổng dung lượng thư mục uploads: ${(totalSize / (1024 * 1024)).toFixed(2)} MB. Vượt giới hạn 1GB. Đang dọn dẹp...`);
      
      // Sắp xếp theo thời gian sửa đổi (cũ nhất lên đầu)
      fileDetails.sort((a, b) => a.mtime - b.mtime);

      for (const file of fileDetails) {
        try {
          fs.unlinkSync(file.path);
          totalSize -= file.size;
          console.log(`[Cleaner] Đã xóa file cũ để giải phóng bộ nhớ: ${file.name}`);
        } catch (err) {
          console.error(`[Cleaner] Không thể xóa file ${file.name}:`, err);
        }

        if (totalSize <= LIMIT) {
          console.log(`[Cleaner] Đã dọn dẹp xong. Dung lượng hiện tại: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
          break;
        }
      }
    }
  } catch (error) {
    console.error('[Cleaner Error] Lỗi dọn dẹp thư mục uploads:', error);
  }
}

/**
 * Lấy thông tin tương tác (views, likes, comments) của video bằng yt-dlp
 * @param {string} url - Link video (YouTube/TikTok)
 * @returns {Promise<{views: number, likes: number, comments: number}>}
 */
export async function getVideoStats(url) {
  await ensureYtdlp();
  try {
    const stdout = await runExec(`"${YTDLP_PATH}" --js-runtimes node -j "${url}"`);
    const info = JSON.parse(stdout);
    return {
      views: info.view_count || 0,
      likes: info.like_count || 0,
      comments: info.comment_count || 0
    };
  } catch (err) {
    console.error(`[Stats] Lỗi khi lấy tương tác từ yt-dlp cho ${url}:`, err.message);
    throw err;
  }
}

// Thuật toán đổi mã băm video để tránh trùng lặp nội dung trên nền tảng.
// Ưu tiên dùng FFmpeg để remux lại file kèm 1 trường metadata ngẫu nhiên bằng "-c copy"
// (chỉ đóng gói lại container, KHÔNG re-encode/đụng đến luồng video-audio nên giữ nguyên
// 100% chất lượng và bitrate gốc). Cách cũ (nối thêm byte rác thẳng vào cuối file) tuy vô hại
// với hầu hết trình phát nhưng có thể khiến bước xử lý/transcode phía nền tảng đích (ví dụ
// YouTube) coi file là không chuẩn và tự hạ chất lượng đầu ra xuống mức thấp/an toàn.
export async function alterVideoHash(filePath) {
  if (!fs.existsSync(filePath)) return;

  const hasFfmpeg = fs.existsSync(FFMPEG_EXE_PATH);
  if (hasFfmpeg) {
    const tempPath = filePath.replace(/(\.[a-zA-Z0-9]+)$/, `_tmp_${Date.now()}$1`);
    const randomTag = crypto.randomBytes(6).toString('hex');
    try {
      await runExec(`"${FFMPEG_EXE_PATH}" -y -i "${filePath}" -c copy -map_metadata 0 -metadata comment="${randomTag}" "${tempPath}"`);
      if (fs.existsSync(tempPath) && fs.statSync(tempPath).size > 0) {
        fs.unlinkSync(filePath);
        fs.renameSync(tempPath, filePath);
        console.log(`[Hash Alteration] Đã đổi mã băm MD5 qua FFmpeg (giữ nguyên chất lượng gốc): ${path.basename(filePath)}`);
        return;
      }
    } catch (err) {
      console.error('[Hash Alteration] Lỗi khi remux qua FFmpeg, chuyển sang cách nối byte dự phòng:', err.message);
      try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) { }
    }
  }

  // Dự phòng nếu không có FFmpeg hoặc remux thất bại
  try {
    const numBytes = Math.floor(Math.random() * 8) + 1;
    const randomBytes = crypto.randomBytes(numBytes);
    fs.appendFileSync(filePath, randomBytes);
    console.log(`[Hash Alteration] Đã đính kèm ${numBytes} byte ngẫu nhiên vào ${path.basename(filePath)} để thay đổi mã băm MD5 của video.`);
  } catch (err) {
    console.error('[Hash Alteration] Lỗi khi thay đổi MD5 video:', err.message);
  }
}

