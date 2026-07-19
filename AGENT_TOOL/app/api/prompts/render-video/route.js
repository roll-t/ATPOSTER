import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getRemotionDir } from '@/lib/remotionPaths';

// Tên thư mục project chỉ được chứa chữ/số/gạch dưới/gạch ngang — khớp với cách
// generateDefaultFolderName() ở usePromptStudio.js sinh tên tự động, đồng thời chặn
// việc chèn ký tự đặc biệt của shell khi giá trị này được dùng làm tham số dòng lệnh.
const SAFE_FOLDER_NAME = /^[A-Za-z0-9_-]+$/;
const CAPTION_STYLES = ['box', 'tiktok', 'karaoke'];
const TRANSITION_STYLES = ['crossfade', 'slide-left', 'slide-right', 'slide-up', 'zoom'];

export async function POST(req) {
  try {
    const { folderPath, captionStyle, transitionStyle, bilingual } = await req.json();
    if (!folderPath) {
      return NextResponse.json({ error: 'Thiếu folderPath' }, { status: 400 });
    }

    const projectFolder = folderPath.trim();
    if (!SAFE_FOLDER_NAME.test(projectFolder)) {
      return NextResponse.json({ error: 'Tên thư mục không hợp lệ. Chỉ được dùng chữ, số, "_" và "-".' }, { status: 400 });
    }

    // Thư mục chứa code remotion
    const baseRemotionDir = getRemotionDir();

    const scriptPath = path.join(baseRemotionDir, 'scripts', 'render-project.mjs');
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({ error: `Không tìm thấy file script tại ${scriptPath}` }, { status: 404 });
    }

    // Chỉ chuyển tiếp các option hợp lệ (nằm trong danh sách cho phép) thành cờ dòng lệnh
    // cho render-project.mjs — bỏ qua giá trị lạ thay vì để lọt vào tham số tiến trình con.
    const extraArgs = [];
    if (CAPTION_STYLES.includes(captionStyle)) extraArgs.push(`--captionStyle=${captionStyle}`);
    if (TRANSITION_STYLES.includes(transitionStyle)) extraArgs.push(`--transitionStyle=${transitionStyle}`);
    if (typeof bilingual === 'boolean') extraArgs.push(`--bilingual=${bilingual}`);

    console.log(`[API RenderVideo] Bắt đầu render cho dự án: ${projectFolder} (${extraArgs.join(' ') || 'mặc định'})`);

    // Thực thi kịch bản render-project.mjs và chờ kết quả trả về.
    // Dùng execFile (không qua shell) + truyền từng tham số riêng biệt thay vì nối
    // chuỗi lệnh, để tránh command injection dù đã validate ở trên.
    // Dùng scriptPath (đường dẫn tuyệt đối, tính động ở trên) thay vì literal string
    // 'scripts/render-project.mjs' — Next.js/Turbopack sẽ cố dò literal đó như 1 file
    // cần trace/bundle trong chính app (module not found) nếu viết trực tiếp ở đây.
    const renderResult = await new Promise((resolve) => {
      execFile(process.execPath, [scriptPath, projectFolder, ...extraArgs], { cwd: baseRemotionDir }, (error, stdout, stderr) => {
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
