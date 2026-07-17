import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getRemotionPublicDir } from '@/lib/remotionPaths';

export async function POST(req) {
  try {
    const { folderPath } = await req.json();
    if (!folderPath) {
      return NextResponse.json({ error: 'Thiếu folderPath' }, { status: 400 });
    }

    const targetDir = path.join(getRemotionPublicDir(), folderPath.trim(), 'final');
    if (!fs.existsSync(targetDir)) {
      return NextResponse.json({ error: `Không tìm thấy thư mục: ${targetDir}` }, { status: 404 });
    }

    const openCommand = process.platform === 'win32'
      ? `explorer.exe "${targetDir}"`
      : process.platform === 'darwin'
        ? `open "${targetDir}"`
        : `xdg-open "${targetDir}"`;

    exec(openCommand, (err) => {
      if (err) {
        console.error('[API OpenFolder] Lỗi mở thư mục:', err);
      }
    });

    return NextResponse.json({ success: true, path: targetDir });
  } catch (err) {
    console.error('[API OpenFolder Exception]:', err);
    return NextResponse.json({ error: err.message || 'Lỗi không xác định khi mở thư mục.' }, { status: 500 });
  }
}
