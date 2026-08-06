import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getRemotionPublicDir } from '@/lib/remotionPaths';
import { readDb } from '@/lib/db.js';

const SAFE_FOLDER_RE = /^[A-Za-z0-9_-]+$/;

// Trần dung lượng mặc định cho 1 clip nền. Pexels trả về nhiều bản dựng cho cùng 1 video (4K,
// 1080p, 720p, 360p...) nhưng KHÔNG kèm dung lượng, nên phải hỏi Content-Length từng bản. Trước
// đây chỗ này luôn lấy bản có width lớn nhất -> kéo về cả clip 4K nặng 66MB cho một video nền chỉ
// hiện mờ sau lớp phủ đen 55%: tốn ổ đĩa và làm bước render chậm hẳn mà không đẹp thêm chút nào.
const DEFAULT_MAX_SIZE_MB = 15;

// Hỏi dung lượng thật của 1 bản dựng mà không tải nội dung về.
// Trả về null khi CDN không khai báo Content-Length (không thể biết trước -> xử lý riêng bên dưới).
async function probeSizeBytes(url, apiKey) {
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { Authorization: apiKey } });
    if (!res.ok) return null;
    const len = Number(res.headers.get('content-length'));
    return Number.isFinite(len) && len > 0 ? len : null;
  } catch {
    return null;
  }
}

/**
 * Chọn bản dựng tốt nhất còn nằm dưới trần dung lượng.
 *
 * Duyệt từ nét nhất xuống: bản đầu tiên vừa trần là bản tốt nhất còn dùng được. Bản không khai báo
 * Content-Length thì để dành, chỉ dùng khi không còn lựa chọn nào chắc chắn — lúc đó vẫn còn chốt
 * chặn cuối là kiểm tra dung lượng thật sau khi tải.
 */
async function pickBestFile(candidates, maxBytes, apiKey) {
  let unknownSizeFallback = null;
  for (const file of candidates) {
    // Pexels khai báo sẵn `size` cho từng bản dựng — tin số đó, khỏi tốn thêm 1 vòng gọi mạng.
    // Chỉ bản thiếu số này mới phải hỏi CDN.
    const size = typeof file.size === 'number' && file.size > 0
      ? file.size
      : await probeSizeBytes(file.link, apiKey);
    if (size === null) {
      if (!unknownSizeFallback) unknownSizeFallback = { file, size: null };
      continue;
    }
    if (size <= maxBytes) return { file, size };
  }
  return unknownSizeFallback;
}

// POST: tải video từ Pexels về thư mục bg/ của project
// Hỗ trợ multi-video: gửi kèm `index` (0-based) để lưu thành bg-01.mp4, bg-02.mp4...
// Nếu clearExisting = true (video đầu tiên trong batch), xoá toàn bộ bg cũ trước khi tải.
export async function POST(req) {
  try {
    const { folderPath, videoUrl, videoFiles, pexelsId, index, clearExisting, maxSizeMB } = await req.json();

    if (!folderPath || !SAFE_FOLDER_RE.test(folderPath)) {
      return NextResponse.json({ success: false, error: 'Tên thư mục không hợp lệ.' }, { status: 400 });
    }

    // Danh sách bản dựng ứng viên (đã lọc/sắp xếp sẵn ở phía gọi). Vẫn nhận `videoUrl` đơn lẻ để
    // các lối gọi cũ không gãy.
    const candidates = Array.isArray(videoFiles) && videoFiles.length > 0
      ? videoFiles.filter(f => f && typeof f.link === 'string' && f.link)
      : (videoUrl ? [{ link: videoUrl }] : []);

    if (candidates.length === 0) {
      return NextResponse.json({ success: false, error: 'Thiếu videoUrl/videoFiles.' }, { status: 400 });
    }

    const db = await readDb();
    if (!db.settings?.pexelsApiKey) {
      return NextResponse.json({ success: false, error: 'Chưa cấu hình Pexels API Key.' }, { status: 400 });
    }
    const apiKey = db.settings.pexelsApiKey;

    const maxMb = Number.isFinite(Number(maxSizeMB)) && Number(maxSizeMB) > 0
      ? Number(maxSizeMB)
      : DEFAULT_MAX_SIZE_MB;
    const maxBytes = maxMb * 1024 * 1024;

    const publicDir = getRemotionPublicDir('pexels_talk_video');
    const bgDir = path.join(publicDir, folderPath, 'bg');
    fs.mkdirSync(bgDir, { recursive: true });

    // Xoá toàn bộ file bg cũ khi bắt đầu batch mới
    if (clearExisting) {
      fs.readdirSync(bgDir)
        .filter(f => f.endsWith('.mp4') || f.endsWith('.webm'))
        .forEach(f => { try { fs.unlinkSync(path.join(bgDir, f)); } catch (_) {} });
    }

    const picked = await pickBestFile(candidates, maxBytes, apiKey);
    if (!picked) {
      console.log(`[BgVideo] Bỏ qua video ${pexelsId ?? ''}: mọi bản dựng đều vượt ${maxMb}MB.`);
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: 'too_large',
        error: `Mọi bản dựng của video này đều nặng hơn ${maxMb}MB.`,
      });
    }

    const { file: chosen, size: knownSize } = picked;
    console.log(
      `[BgVideo] Tải ${index !== undefined ? `#${index + 1} ` : ''}`
      + `${chosen.width || '?'}x${chosen.height || '?'} `
      + `(${knownSize ? `${(knownSize / 1024 / 1024).toFixed(1)}MB` : 'chưa rõ dung lượng'})`
    );

    const res = await fetch(chosen.link, { headers: { Authorization: apiKey } });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `Pexels CDN trả lỗi: ${res.status}` }, { status: res.status });
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    // Chốt chặn cuối cho bản không khai báo Content-Length: đo trên dữ liệu thật đã tải về. Thà bỏ
    // hẳn còn hơn ghi ra đĩa một file vượt trần rồi lần render sau lại phải xử lý nó.
    if (buffer.length > maxBytes) {
      console.log(
        `[BgVideo] Bỏ qua video ${pexelsId ?? ''}: tải về ${(buffer.length / 1024 / 1024).toFixed(1)}MB, `
        + `vượt trần ${maxMb}MB.`
      );
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: 'too_large',
        error: `Video tải về nặng ${(buffer.length / 1024 / 1024).toFixed(1)}MB, vượt trần ${maxMb}MB.`,
      });
    }

    // Multi-video mode: bg-01.mp4, bg-02.mp4...
    // Single-video fallback: background-{pexelsId}.mp4
    const filename = index !== undefined
      ? `bg-${String(index + 1).padStart(2, '0')}.mp4`
      : `background${pexelsId ? `-${pexelsId}` : ''}.mp4`;

    fs.writeFileSync(path.join(bgDir, filename), buffer);

    const bgVideoRelPath = `${folderPath}/bg/${filename}`;
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
    console.log(`[BgVideo] Đã lưu: ${bgVideoRelPath} (${sizeMB} MB, ${chosen.width || '?'}x${chosen.height || '?'})`);

    return NextResponse.json({
      success: true,
      filename,
      index,
      backgroundVideo: bgVideoRelPath,
      sizeMB,
      width: chosen.width,
      height: chosen.height,
    });
  } catch (err) {
    console.error('[BgVideo]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
