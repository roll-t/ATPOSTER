import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveProjectDir } from '@/lib/remotionPaths';
import { getMongoClientDb } from '@/lib/db.js';

// Đuôi file nhạc nền được chấp nhận khi người dùng tự tải lên — chặn việc đặt tên file kiểu
// "bg-music.exe" rồi ghi bừa vào thư mục project.
const ALLOWED_UPLOAD_EXTS = ['mp3', 'm4a', 'wav', 'ogg', 'aac'];

/**
 * Xoá SẠCH mọi file bg-music.* đang có trước khi ghi bản mới.
 *
 * Bắt buộc, không phải dọn dẹp cho đẹp: render-project.mjs dò nhạc nền bằng
 * `files.find(f => f.startsWith("bg-music."))` — lấy file ĐẦU TIÊN theo thứ tự đọc thư mục, không
 * quan tâm file nào mới hơn. Nên nếu project từng có bg-music.m4a (người dùng tự tải lên) rồi sau
 * đó chọn một bản trong kho (ghi ra bg-music.mp3), thư mục sẽ có 2 file và video render ra vẫn có
 * thể dùng đúng bài CŨ, dù giao diện đã báo đổi bài thành công.
 */
function clearExistingBgMusic(audioDir) {
  if (!fs.existsSync(audioDir)) return [];
  const removed = [];
  for (const f of fs.readdirSync(audioDir)) {
    if (f.startsWith('bg-music.')) {
      try {
        fs.unlinkSync(path.join(audioDir, f));
        removed.push(f);
      } catch (err) {
        console.warn(`[API SelectDefaultMusic] Không xoá được ${f}:`, err.message);
      }
    }
  }
  return removed;
}

function updateManifestBgMusic(targetDir, relativeFile) {
  const manifestPath = path.join(targetDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.bgMusic = relativeFile;
    manifest.updatedAt = Date.now();
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  } catch (err) {
    console.warn('[API SelectDefaultMusic] Không cập nhật được manifest.json:', err.message);
  }
}

/**
 * Đặt nhạc nền cho 1 project — dùng chung cho CẢ hai đường vào:
 *   - Chọn 1 bản trong kho nhạc hệ thống  -> gửi { trackId }
 *   - Tải file nhạc của riêng người dùng  -> gửi { dataUrl, ext }
 *
 * Gộp về một chỗ vì cả hai đều phải làm đúng cùng một bộ việc (xoá bản cũ, ghi bản mới, cập nhật
 * manifest). Trước đây nhánh tải lên đi nhờ route save-image nên bỏ sót cả 2 việc sau, để lại
 * nhiều file bg-music.* cùng lúc trong project.
 */
export async function POST(req) {
  try {
    const { folderPath, trackId, category, dataUrl, ext } = await req.json();

    if (!folderPath) {
      return NextResponse.json({ success: false, error: 'Thiếu folderPath' }, { status: 400 });
    }
    if (!trackId && !dataUrl) {
      return NextResponse.json({ success: false, error: 'Thiếu trackId hoặc file nhạc tải lên' }, { status: 400 });
    }

    const cleanFolder = path.basename(folderPath);
    const targetDir = resolveProjectDir(cleanFolder, category);
    const audioDir = path.join(targetDir, 'audio');

    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    // --- Nhánh 1: tải lên file nhạc của người dùng ---------------------------------------------
    if (dataUrl) {
      const cleanExt = String(ext || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!ALLOWED_UPLOAD_EXTS.includes(cleanExt)) {
        return NextResponse.json({
          success: false,
          error: `Định dạng .${cleanExt} không được hỗ trợ. Hãy dùng: ${ALLOWED_UPLOAD_EXTS.join(', ')}.`
        }, { status: 400 });
      }

      const buffer = Buffer.from(dataUrl.replace(/^data:[^;]+;base64,/, ''), 'base64');
      if (buffer.length === 0) {
        return NextResponse.json({ success: false, error: 'Tệp nhạc rỗng hoặc hỏng.' }, { status: 400 });
      }

      clearExistingBgMusic(audioDir);
      const filename = `bg-music.${cleanExt}`;
      fs.writeFileSync(path.join(audioDir, filename), buffer);
      updateManifestBgMusic(targetDir, `audio/${filename}`);

      console.log(`[API SelectDefaultMusic] Đã đặt nhạc nền từ tệp tải lên: ${filename} (${buffer.length} byte)`);
      return NextResponse.json({
        success: true,
        message: 'Đã áp dụng nhạc nền từ tệp tải lên',
        trackId: 'custom',
        file: `audio/${filename}`,
        filename
      });
    }

    // --- Nhánh 2: chọn lại 1 bản trong Thư viện nhạc đã từng tải lên (bg-music-library/route.js) -
    // trackId của các bản này luôn có tiền tố "lib_" (xem BgMusicLibrary POST) — chặn ở đây TRƯỚC
    // khi rơi xuống nhánh 3 (kho hệ thống), vì "lib_xxx" cũng khớp regex path-traversal của nhánh 3
    // nhưng sẽ không tìm thấy file tương ứng trong public/default-bg-music và báo nhầm lỗi 404.
    if (trackId && trackId.startsWith('lib_')) {
      const libDb = await getMongoClientDb();
      const libItem = await libDb.collection('bgMusicLibrary').findOne({ id: trackId });
      if (!libItem) {
        return NextResponse.json({ success: false, error: 'Không tìm thấy bản nhạc này trong thư viện (có thể đã bị xoá).' }, { status: 404 });
      }

      const librarySource = path.join(process.cwd(), 'public', 'custom-bg-music', libItem.filename);
      if (!fs.existsSync(librarySource)) {
        return NextResponse.json({ success: false, error: 'Tệp nhạc trong thư viện bị thiếu trên đĩa.' }, { status: 404 });
      }

      clearExistingBgMusic(audioDir);
      const destFilename = `bg-music.${libItem.ext}`;
      fs.copyFileSync(librarySource, path.join(audioDir, destFilename));
      updateManifestBgMusic(targetDir, `audio/${destFilename}`);

      return NextResponse.json({
        success: true,
        message: `Đã áp dụng "${libItem.name}" từ thư viện nhạc đã tải lên`,
        trackId,
        file: `audio/${destFilename}`,
        filename: destFilename
      });
    }

    // --- Nhánh 3: chọn 1 bản trong kho nhạc mặc định của hệ thống -------------------------------
    // Chặn path traversal: trackId đi thẳng vào tên file nguồn.
    if (!/^[a-zA-Z0-9_-]+$/.test(trackId)) {
      return NextResponse.json({ success: false, error: 'trackId không hợp lệ' }, { status: 400 });
    }

    const defaultMusicSource = path.join(process.cwd(), 'public', 'default-bg-music', `${trackId}.mp3`);
    if (!fs.existsSync(defaultMusicSource)) {
      return NextResponse.json({ success: false, error: `Không tìm thấy bản nhạc mặc định ${trackId}.mp3` }, { status: 404 });
    }

    clearExistingBgMusic(audioDir);
    fs.copyFileSync(defaultMusicSource, path.join(audioDir, 'bg-music.mp3'));
    updateManifestBgMusic(targetDir, 'audio/bg-music.mp3');

    return NextResponse.json({
      success: true,
      message: `Đã chọn bản nhạc mặc định ${trackId}`,
      trackId,
      file: 'audio/bg-music.mp3',
      filename: 'bg-music.mp3'
    });
  } catch (err) {
    console.error('[API SelectDefaultMusic Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
