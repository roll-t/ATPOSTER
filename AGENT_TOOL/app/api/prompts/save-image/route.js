import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveProjectDir } from '@/lib/remotionPaths';

// Route này không chỉ nhận ảnh: saveManifest() trong content-flow.js gửi CẢ manifest.json
// qua cùng đường này (action SAVE_IMAGE_LOCAL). Thiếu 'json' trong danh sách là manifest bị
// chặn 400, và render-project.mjs mất file mô tả layout/bullets của từng slide.
const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'json'];

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

    fs.writeFileSync(destPath, buffer);

    console.log(`[API SaveImage] Đã lưu: ${destPath} (${buffer.length} byte)`);
    return NextResponse.json({ success: true, filename: normalised });
  } catch (err) {
    console.error('[API SaveImage Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
