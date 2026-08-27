import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { resolveProjectDir } from '@/lib/remotionPaths';

const SAFE_FOLDER_NAME = /^[A-Za-z0-9_-]+$/;

// Thư mục con được phép mở thẳng. Whitelist CỨNG, không ghép chuỗi tự do từ client: giá trị này
// đi vào path.join rồi vào execFile, nên nhận bừa sẽ mở được thư mục bất kỳ ngoài dự án.
const SAFE_SUBFOLDERS = new Set(['images', 'audio', 'final']);

export async function POST(req) {
  try {
    const { folderPath, category, subfolder } = await req.json();
    if (!folderPath) {
      return NextResponse.json({ error: 'Thiếu folderPath' }, { status: 400 });
    }

    const cleanFolder = folderPath.trim();
    if (!SAFE_FOLDER_NAME.test(cleanFolder)) {
      return NextResponse.json({ error: 'Tên thư mục không hợp lệ. Chỉ được dùng chữ, số, "_" và "-".' }, { status: 400 });
    }

    // resolveProjectDir tự tìm đúng vị trí thật của project (phẳng cũ hoặc lồng theo category
    // mới, ở đúng skill của category — xem lib/remotionPaths.js) thay vì tự dò lại thủ công.
    const projectDir = resolveProjectDir(cleanFolder, category);
    let targetDir;
    if (subfolder) {
      // Gọi có subfolder = người dùng bấm nút đi thẳng vào chỗ chứa ảnh (hoặc audio).
      if (!SAFE_SUBFOLDERS.has(subfolder)) {
        return NextResponse.json({ error: `Thư mục con không hợp lệ: ${subfolder}` }, { status: 400 });
      }
      const subDir = path.join(projectDir, subfolder);
      // Thư mục con chỉ sinh ra khi có file đầu tiên rơi vào; chưa có thì mở tạm thư mục dự án
      // còn hơn báo lỗi rồi không mở gì cả.
      targetDir = fs.existsSync(subDir) ? subDir : projectDir;
    } else {
      // Hành vi cũ giữ nguyên: ưu tiên final/ (chứa video đã render), không có thì thư mục dự án.
      const finalDir = path.join(projectDir, 'final');
      targetDir = fs.existsSync(finalDir) ? finalDir : projectDir;
    }

    if (!targetDir || !fs.existsSync(targetDir)) {
      return NextResponse.json({ error: `Không tìm thấy thư mục dự án: ${cleanFolder}` }, { status: 404 });
    }

    // execFile (không qua shell) + truyền targetDir như 1 tham số riêng biệt, tránh command injection.
    const openBin = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    execFile(openBin, [targetDir], (err) => {
      // explorer.exe trả exit code khác 0 ngay cả khi mở thành công -> chỉ log, không coi là lỗi thật.
      if (err && process.platform !== 'win32') {
        console.error('[API OpenFolder] Lỗi mở thư mục:', err);
      }
    });

    return NextResponse.json({ success: true, path: targetDir });
  } catch (err) {
    console.error('[API OpenFolder Exception]:', err);
    return NextResponse.json({ error: err.message || 'Lỗi không xác định khi mở thư mục.' }, { status: 500 });
  }
}
