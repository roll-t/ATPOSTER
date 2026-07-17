import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getRemotionPublicDir } from '@/lib/remotionPaths';

export async function POST(req) {
  try {
    const { folderPath, filename, dataUrl } = await req.json();

    if (!folderPath || !filename || !dataUrl) {
      return NextResponse.json({ success: false, error: 'Thiếu dữ liệu' }, { status: 400 });
    }

    // Tìm thư mục đích tương ứng với cấu hình Remotion
    const baseSkillDir = getRemotionPublicDir();

    const targetDir = path.join(baseSkillDir, folderPath.trim());

    // Tách dữ liệu base64 (áp dụng cho mọi loại mime - ảnh, json manifest, ...)
    const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    const filePath = path.join(targetDir, filename);
    // filename có thể chứa subfolder (vd "images/scene-01.jpg"), nên phải
    // tạo đúng thư mục cha của file, không chỉ targetDir gốc.
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(filePath, buffer);
    
    console.log(`[API SaveImage] Ghi thành công ảnh phân cảnh vào: ${filePath}`);
    
    return NextResponse.json({ 
      success: true, 
      path: filePath,
      targetDirectory: targetDir
    });
  } catch (err) {
    console.error('[API SaveImage] Lỗi khi ghi ảnh:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
