import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveProjectDir } from '@/src/infrastructure/rendering/remotion/paths.js';

// Route này không chỉ nhận ảnh: saveManifest() trong content-flow.js gửi CẢ manifest.json
// qua cùng đường này (action SAVE_IMAGE_LOCAL). Thiếu 'json' trong danh sách là manifest bị
// chặn 400, và render-project.mjs mất file mô tả layout/bullets của từng slide.
const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'json', 'mp4', 'webm'];

export async function POST(req) {
  try {
    const { folderPath, filename, dataUrl, category } = await req.json();

    if (!folderPath || !filename || !dataUrl) {
      console.warn('[API SaveImage] Thiếu trường:', { folderPath: !!folderPath, filename: !!filename, dataUrl: !!dataUrl });
      return NextResponse.json({ success: false, error: 'Thiếu folderPath, filename hoặc dataUrl' }, { status: 400 });
    }

    // Chặn path traversal: chỉ cho phép tên file + 1 cấp thư mục con hợp lệ
    const normalised = path.normalize(filename).replace(/\\/g, '/');
    if (normalised.includes('..') || path.isAbsolute(normalised)) {
      console.warn('[API SaveImage] filename không hợp lệ (path traversal):', filename);
      return NextResponse.json({ success: false, error: 'filename không hợp lệ' }, { status: 400 });
    }

    const ext = (normalised.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      console.warn('[API SaveImage] Extension không được hỗ trợ:', ext, '| filename:', filename);
      return NextResponse.json(
        { success: false, error: `Định dạng .${ext} không được hỗ trợ. Dùng: ${ALLOWED_EXTS.join(', ')}.` },
        { status: 400 }
      );
    }

    const cleanFolder = path.basename(folderPath);
    const projectDir = resolveProjectDir(cleanFolder, category);

    const destPath = path.join(projectDir, normalised);

    // Đảm bảo destPath nằm trong projectDir (bảo vệ thêm 1 lớp)
    if (!destPath.startsWith(path.resolve(projectDir))) {
      console.warn('[API SaveImage] destPath nằm ngoài projectDir:', destPath, '|', projectDir);
      return NextResponse.json({ success: false, error: 'filename không hợp lệ' }, { status: 400 });
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    const buffer = Buffer.from(dataUrl.replace(/^data:[^;]+;base64,/, ''), 'base64');
    if (buffer.length === 0) {
      console.warn('[API SaveImage] Buffer rỗng cho filename:', filename, '| dataUrl prefix:', dataUrl.slice(0, 50));
      return NextResponse.json({ success: false, error: 'Dữ liệu ảnh rỗng hoặc hỏng.' }, { status: 400 });
    }

    // Bảo vệ manifest.json: Không bao giờ để một manifest partial (ít cảnh hơn) ghi đè làm mất các cảnh khác
    if (normalised === 'manifest.json' && fs.existsSync(destPath)) {
      try {
        const existingManifest = JSON.parse(fs.readFileSync(destPath, 'utf8'));
        const newManifest = JSON.parse(buffer.toString('utf8'));
        if (Array.isArray(existingManifest.segments) && existingManifest.segments.length > (newManifest.segments?.length || 0)) {
          const newSegMap = new Map((newManifest.segments || []).map(s => [s.segmentNumber, s]));
          const mergedSegments = existingManifest.segments.map(s => {
            const fresh = newSegMap.get(s.segmentNumber);
            return fresh ? { ...s, ...fresh } : s;
          });
          const finalManifest = {
            ...existingManifest,
            ...newManifest,
            segments: mergedSegments,
            updatedAt: Date.now()
          };
          fs.writeFileSync(destPath, JSON.stringify(finalManifest, null, 2), 'utf8');
          console.log(`[API SaveImage] Đã merge an toàn manifest.json (${mergedSegments.length} segments)`);
          return NextResponse.json({ success: true, filename: normalised });
        }
      } catch (e) {
        console.warn('[API SaveImage] Merge manifest.json error:', e.message);
      }
    }

    fs.writeFileSync(destPath, buffer);

    // Nếu lưu file media cho scene (ví dụ: images/scene-01.mp4 hoặc images/scene-01.jpg):
    // Tự động dọn dẹp file ngược loại cũ và cập nhật manifest
    const isVideo = ['mp4', 'webm'].includes(ext);
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(ext);
    const sceneMatch = normalised.match(/images\/scene-(\d+)\./);
    if (sceneMatch) {
      const segNum = Number(sceneMatch[1]);
      const padNum = String(segNum).padStart(2, '0');
      const imagesDir = path.join(projectDir, 'images');

      if (isVideo) {
        // Xóa file ảnh cũ nếu vừa lưu video
        for (const imgExt of ['jpg', 'jpeg', 'png', 'webp']) {
          const oldPath = path.join(imagesDir, `scene-${padNum}.${imgExt}`);
          if (fs.existsSync(oldPath)) {
            try { fs.unlinkSync(oldPath); } catch {}
          }
        }
      } else if (isImage) {
        // Xóa file video cũ nếu vừa lưu ảnh
        for (const vidExt of ['mp4', 'webm']) {
          const oldPath = path.join(imagesDir, `scene-${padNum}.${vidExt}`);
          if (fs.existsSync(oldPath)) {
            try { fs.unlinkSync(oldPath); } catch {}
          }
        }
      }

      // Cập nhật manifest.json nếu có
      const manifestPath = path.join(projectDir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          if (Array.isArray(manifest.segments)) {
            manifest.segments = manifest.segments.map(seg => {
              if (Number(seg.segmentNumber) === segNum) {
                return {
                  ...seg,
                  mediaType: isVideo ? 'video' : 'image',
                  mediaFile: normalised
                };
              }
              return seg;
            });
            manifest.updatedAt = Date.now();
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
          }
        } catch (mErr) {
          console.warn('[API SaveImage] Update manifest mediaType warning:', mErr.message);
        }
      }
    }

    console.log(`[API SaveImage] Đã lưu: ${destPath} (${buffer.length} byte)`);
    return NextResponse.json({ success: true, filename: normalised });
  } catch (err) {
    console.error('[API SaveImage Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
