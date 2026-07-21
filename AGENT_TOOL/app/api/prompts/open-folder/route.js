import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { ALL_SKILL_FOLDERS, resolveSkillRemotionDir } from '@/lib/remotionPaths';

const SAFE_FOLDER_NAME = /^[A-Za-z0-9_-]+$/;

export async function POST(req) {
  try {
    const { folderPath } = await req.json();
    if (!folderPath) {
      return NextResponse.json({ error: 'Thiếu folderPath' }, { status: 400 });
    }

    const cleanFolder = folderPath.trim();
    if (!SAFE_FOLDER_NAME.test(cleanFolder)) {
      return NextResponse.json({ error: 'Tên thư mục không hợp lệ. Chỉ được dùng chữ, số, "_" và "-".' }, { status: 400 });
    }

    let targetDir = null;

    // Ưu tiên 1: Tìm thư mục final/ chứa video đã render ở TẤT CẢ các skill
    for (const folder of ALL_SKILL_FOLDERS) {
      const candidateFinal = path.join(resolveSkillRemotionDir(folder), 'public', cleanFolder, 'final');
      if (fs.existsSync(candidateFinal)) {
        targetDir = candidateFinal;
        break;
      }
    }

    // Ưu tiên 2: Nếu chưa có final/, mở thư mục dự án chính
    if (!targetDir) {
      for (const folder of ALL_SKILL_FOLDERS) {
        const candidateProj = path.join(resolveSkillRemotionDir(folder), 'public', cleanFolder);
        if (fs.existsSync(candidateProj)) {
          targetDir = candidateProj;
          break;
        }
      }
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
