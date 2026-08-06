import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveProjectDir } from '@/lib/remotionPaths';
import { getMongoClientDb } from '@/lib/db.js';

export async function POST(req) {
  try {
    const { folderPath, category, segmentNumber, mediaUrl, type } = await req.json();

    if (!folderPath || !segmentNumber || !mediaUrl || !type) {
      return NextResponse.json({ success: false, error: 'Thiếu dữ liệu bắt buộc (folderPath, segmentNumber, mediaUrl, type).' }, { status: 400 });
    }

    // 1. Xác định thư mục lưu trữ dự án
    const targetDir = resolveProjectDir(folderPath.trim(), category);
    if (!fs.existsSync(targetDir)) {
      return NextResponse.json({ success: false, error: `Không tìm thấy thư mục dự án: ${targetDir}` }, { status: 404 });
    }

    // 2. Xác định phần mở rộng tệp
    let ext = 'jpg';
    if (type === 'videos') {
      ext = 'mp4';
    } else {
      // Thử lấy ext từ URL hoặc mặc định jpg
      const cleanUrl = mediaUrl.split('?')[0];
      const urlExt = cleanUrl.split('.').pop()?.toLowerCase();
      if (urlExt && ['jpg', 'jpeg', 'png', 'webp'].includes(urlExt)) {
        ext = urlExt === 'jpeg' ? 'jpg' : urlExt;
      }
    }

    // 3. Tải tệp từ Pexels
    const res = await fetch(mediaUrl);
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `Không thể tải tệp từ Pexels: HTTP ${res.status}` }, { status: res.status });
    }
    const buffer = Buffer.from(await res.arrayBuffer());

    // 4. Tạo thư mục images/ nếu chưa có
    const imagesDir = path.join(targetDir, 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const paddedNum = String(segmentNumber).padStart(2, '0');
    
    // 5. Xóa các tệp ảnh/video cũ của scene này để tránh xung đột
    const files = fs.readdirSync(imagesDir);
    const prefix = `scene-${paddedNum}`;
    for (const file of files) {
      if (file.startsWith(prefix)) {
        try {
          fs.unlinkSync(path.join(imagesDir, file));
        } catch (_) {}
      }
    }

    // 6. Ghi tệp mới
    const filename = `scene-${paddedNum}.${ext}`;
    const filePath = path.join(imagesDir, filename);
    fs.writeFileSync(filePath, buffer);

    // 7. Cập nhật manifest.json trong dự án cục bộ
    const manifestPath = path.join(targetDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (Array.isArray(manifest.segments)) {
          const segIdx = manifest.segments.findIndex(s => Number(s.segmentNumber) === Number(segmentNumber));
          if (segIdx !== -1) {
            manifest.segments[segIdx].files = [`images/${filename}`];
            manifest.segments[segIdx].imageExt = ext;
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
          }
        }
      } catch (err) {
        console.warn('[Pexels Download] Không cập nhật được manifest.json:', err.message);
      }
    }

    // 8. Cập nhật DB (promptHistory) để đồng bộ trạng thái khi tải lại trang
    try {
      const db = await getMongoClientDb();
      const historyItem = await db.collection('promptHistory').findOne({ "input.folderPath": folderPath });
      if (historyItem && Array.isArray(historyItem.segments)) {
        const updatedSegments = historyItem.segments.map(s => {
          if (Number(s.segmentNumber) === Number(segmentNumber)) {
            return {
              ...s,
              files: [`images/${filename}`],
              imageExt: ext,
              // Lưu đường dẫn ảnh cụ thể để giao diện load đúng
              image: `${folderPath}/images/${filename}`
            };
          }
          return s;
        });
        await db.collection('promptHistory').updateOne(
          { _id: historyItem._id },
          { $set: { segments: updatedSegments } }
        );
      }
    } catch (err) {
      console.warn('[Pexels Download] Không cập nhật được promptHistory trong DB:', err.message);
    }

    console.log(`[Pexels Download] Đã tải và lưu thành công tệp vào: ${filePath}`);

    return NextResponse.json({
      success: true,
      filename,
      filePath: `/images/${filename}`
    });
  } catch (err) {
    console.error('[Pexels Download API] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
