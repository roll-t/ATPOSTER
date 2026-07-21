import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveProjectDir } from '@/lib/remotionPaths';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderPath = searchParams.get('folderPath');
    const file = searchParams.get('file') || 'images/scene-01.jpg';

    if (!folderPath) {
      return new Response('Missing folderPath', { status: 400 });
    }

    const projectDir = resolveProjectDir(folderPath.trim());
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

    if (!fs.existsSync(imagePath)) {
      return new Response('Image not found', { status: 404 });
    }

    const ext = path.extname(imagePath).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.svg' ? 'image/svg+xml' : 'image/jpeg';

    const fileBuffer = fs.readFileSync(imagePath);
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
