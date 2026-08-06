import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import net from 'net';
import path from 'path';
import fs from 'fs';
import { resolveSkillRemotionDir } from '@/lib/remotionPaths';

const PORT_MAPPING = {
  'moral_talk_slideshow': 3010,
  'reading_practice': 3011,
  'stick_figure_slideshow': 3012,
  'pexels_talk_video': 3013
};

const FOLDER_MAPPING = {
  'moral_talk_slideshow': 'moral_talk_slideshow',
  'reading_practice': 'reading-page-video',
  'stick_figure_slideshow': 'stick-figure-slideshow-video',
  'pexels_talk_video': 'pexels-talk-video'
};

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .once('listening', () => {
        server.close();
        resolve(false);
      })
      .listen(port);
  });
}

function updateExampleJsonOrientation(skillFolder, orientation) {
  try {
    const remotionDir = resolveSkillRemotionDir(skillFolder);
    const examplePath = path.join(remotionDir, 'configs', 'example.json');
    if (fs.existsSync(examplePath)) {
      const content = fs.readFileSync(examplePath, 'utf8');
      const parsed = JSON.parse(content);
      parsed.orientation = orientation;
      fs.writeFileSync(examplePath, JSON.stringify(parsed, null, 2), 'utf8');
      console.log(`[Start Studio] Updated example.json orientation to ${orientation} at ${examplePath}`);
    }
  } catch (err) {
    console.error('[Start Studio] Error updating example.json:', err);
  }
}

export async function POST(req) {
  try {
    const { category, orientation } = await req.json();
    if (!category) {
      return NextResponse.json({ error: 'Thiếu category' }, { status: 400 });
    }

    const port = PORT_MAPPING[category] || 3010;
    const skillFolder = FOLDER_MAPPING[category] || 'moral_talk_slideshow';
    const targetOrientation = orientation || 'portrait';

    // 1. Cập nhật trực tiếp tệp example.json của skill trước khi mở/nạp.
    // Việc này tránh được việc dùng cờ --props với ngoặc kép phức tạp gây crash terminal Windows,
    // đồng thời hỗ trợ Hot-Reload xoay khung hình lập tức nếu server đã chạy sẵn.
    updateExampleJsonOrientation(skillFolder, targetOrientation);

    const running = await isPortInUse(port);
    const url = `http://localhost:${port}`;

    if (running) {
      return NextResponse.json({
        success: true,
        alreadyRunning: true,
        url,
        message: `Remotion Studio đã chạy tại ${url} và tự động cập nhật khung hình sang ${targetOrientation}`
      });
    }

    // 2. Khởi chạy Remotion Studio trên Windows bằng lệnh an toàn không có dấu ngoặc kép lồng
    const cmd = `start "Remotion Studio - ${skillFolder}" cmd /c "npm run start --prefix TOOLS/AUTO_RENDER_VIDEO/skills/${skillFolder}/remotion -- --port ${port} --no-open"`;
    
    exec(cmd, { cwd: 'd:\\code\\wed\\ATPOSTER' }, (err) => {
      if (err) {
        console.error('[Start Remotion Studio Error]:', err);
      }
    });

    return NextResponse.json({
      success: true,
      alreadyRunning: false,
      url,
      message: `Đang khởi chạy Remotion Studio (${targetOrientation}) tại ${url}...`
    });

  } catch (error) {
    console.error('[API Start Studio Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khởi chạy Remotion Studio.' }, { status: 500 });
  }
}
