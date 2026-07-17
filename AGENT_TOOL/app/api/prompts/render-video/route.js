import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getRemotionDir } from '@/lib/remotionPaths';

export async function POST(req) {
  try {
    const { folderPath } = await req.json();
    if (!folderPath) {
      return NextResponse.json({ error: 'Thiếu folderPath' }, { status: 400 });
    }

    const projectFolder = folderPath.trim();

    // Thư mục chứa code remotion
    const baseRemotionDir = getRemotionDir();

    const scriptPath = path.join(baseRemotionDir, 'scripts', 'render-project.mjs');
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({ error: `Không tìm thấy file script tại ${scriptPath}` }, { status: 404 });
    }

    console.log(`[API RenderVideo] Bắt đầu render cho dự án: ${projectFolder}`);

    // Thực thi kịch bản render-project.mjs và chờ kết quả trả về
    const renderResult = await new Promise((resolve) => {
      exec(`node scripts/render-project.mjs ${projectFolder}`, { cwd: baseRemotionDir }, (error, stdout, stderr) => {
        if (error) {
          console.error('[API RenderVideo] Lỗi render:', error);
          resolve({ success: false, error: error.message, stderr, stdout });
        } else {
          console.log('[API RenderVideo] Render thành công:', stdout);
          resolve({ success: true, stdout });
        }
      });
    });

    if (renderResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Đã tạo video thành công!',
        stdout: renderResult.stdout
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Lỗi render video.',
        details: renderResult.error,
        stderr: renderResult.stderr,
        stdout: renderResult.stdout
      }, { status: 500 });
    }

  } catch (err) {
    console.error('[API RenderVideo Exception]:', err);
    return NextResponse.json({ error: err.message || 'Lỗi không xác định khi tạo video.' }, { status: 500 });
  }
}
