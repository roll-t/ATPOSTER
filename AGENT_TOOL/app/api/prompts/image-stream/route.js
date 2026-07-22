import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveProjectDir } from '@/lib/remotionPaths';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderPath = searchParams.get('folderPath');
    const file = searchParams.get('file') || 'images/scene-01.jpg';
    const category = searchParams.get('category') || undefined;

    if (!folderPath) {
      return new Response('Missing folderPath', { status: 400 });
    }

    // QUAN TRỌNG: phải truyền category — cùng 1 folderPath có thể tồn tại đồng thời ở public/
    // của NHIỀU skill (render-video/route.js tự đồng bộ project sang skill hiện tại mỗi lần
    // render), nên nếu không có category, resolveProjectDir() dò theo thứ tự mặc định (luôn
    // thử narrated-slideshow-video trước) và có thể trả về đúng 1 bản SAI skill — bản đó thiếu
    // hẳn asset chỉ mới thêm sau này (vd audio/bg-music.<ext>) dù bản đúng skill đã có, gây 404
    // dù vừa upload thành công.
    const projectDir = resolveProjectDir(folderPath.trim(), category);
    let imagePath = path.join(projectDir, file);

    // Ảnh hero tách theo tỉ lệ (scene-NN-landscape/-portrait, dùng cho reading_practice khi có
    // đủ 2 bản - xem buildSegmentedPrompts.js) có thể chưa tồn tại ở các dự án cũ hơn tính năng
    // này. Lùi về file gốc chưa tách bản (scene-NN.<ext>) trước khi báo lỗi, để UI luôn xin đúng
    // tên file theo bố cục đang chọn mà không cần tự kiểm tra tồn tại trước.
    if (!fs.existsSync(imagePath)) {
      const legacyFile = file.replace(/-(landscape|portrait)(\.[^./]+)$/, '$2');
      if (legacyFile !== file) {
        const legacyPath = path.join(projectDir, legacyFile);
        if (fs.existsSync(legacyPath)) imagePath = legacyPath;
      }
    }

    // audio/bg-music.<ext>: đuôi file thật do người dùng tự tải lên (mp3/wav/m4a/...) nên
    // frontend không biết trước để xin đúng tên — luôn xin "bg-music.mp3" rồi dò theo
    // wildcard đúng basename "bg-music.*" trong thư mục audio nếu file yêu cầu không khớp.
    if (!fs.existsSync(imagePath) && /audio[\\/]bg-music\.[^./\\]+$/.test(file)) {
      const audioDirPath = path.join(projectDir, 'audio');
      if (fs.existsSync(audioDirPath)) {
        const match = fs.readdirSync(audioDirPath).find((f) => f.startsWith('bg-music.'));
        if (match) imagePath = path.join(audioDirPath, match);
      }
    }

    if (!fs.existsSync(imagePath)) {
      return new Response('Image not found', { status: 404 });
    }

    // Dù tên route là "image-stream", vẫn dùng lại cho audio/bg-music.<ext> (nghe thử nhạc nền
    // trong Studio Thiết Kế Trang Đọc Video) — cùng cơ chế folderPath+file generic, chỉ cần
    // map thêm content-type audio thay vì tạo hẳn 1 route riêng gần như trùng lặp.
    const ext = path.extname(imagePath).toLowerCase();
    const AUDIO_CONTENT_TYPES = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.aac': 'audio/aac' };
    const isAudio = ext in AUDIO_CONTENT_TYPES;
    const contentType = AUDIO_CONTENT_TYPES[ext]
      || (ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.svg' ? 'image/svg+xml' : 'image/jpeg');

    const fileSize = fs.statSync(imagePath).size;
    const rangeHeader = isAudio ? request.headers.get('range') : null;

    // <audio> cần Content-Length (hoặc Range + Accept-Ranges) để biết duration và cho phép tua —
    // thiếu cả 2 thì trình duyệt phát qua Transfer-Encoding: chunked, kẹt mãi ở 0:00/0:00 dù đã
    // tải xong toàn bộ file. Ảnh không cần tua nên vẫn đọc trọn 1 lần như cũ, chỉ audio mới cần
    // đường Range 206 Partial Content này.
    if (rangeHeader) {
      const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
      let start = match && match[1] ? parseInt(match[1], 10) : 0;
      let end = match && match[2] ? parseInt(match[2], 10) : fileSize - 1;
      if (!Number.isFinite(start) || start < 0) start = 0;
      if (!Number.isFinite(end) || end >= fileSize) end = fileSize - 1;
      if (start > end) start = 0;
      const chunkSize = end - start + 1;
      const fd = fs.openSync(imagePath, 'r');
      const chunk = Buffer.alloc(chunkSize);
      fs.readSync(fd, chunk, 0, chunkSize, start);
      fs.closeSync(fd);
      return new Response(chunk, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    const fileBuffer = fs.readFileSync(imagePath);
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileSize),
        ...(isAudio ? { 'Accept-Ranges': 'bytes' } : {}),
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
