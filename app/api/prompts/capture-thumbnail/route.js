import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { resolveProjectDir } from '@/src/infrastructure/rendering/remotion/paths.js';

const SAFE_FOLDER_NAME = /^[A-Za-z0-9_-]+$/;

function findFfmpegPath() {
  const possiblePaths = [
    path.join(process.cwd(), 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe'),
    path.join(process.cwd(), 'node_modules', '@remotion', 'compositor-linux-x64-gnu', 'ffmpeg'),
    path.join(process.cwd(), 'node_modules', '@remotion', 'compositor-darwin-x64', 'ffmpeg'),
    path.join(process.cwd(), 'node_modules', '@remotion', 'compositor-darwin-arm64', 'ffmpeg'),
    'ffmpeg'
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'ffmpeg';
}

export async function POST(req) {
  try {
    const { folderPath, category, dataUrl, timestamp = 0 } = await req.json();

    if (!folderPath) {
      return NextResponse.json({ success: false, error: 'Thiếu folderPath' }, { status: 400 });
    }

    const cleanFolder = folderPath.trim();
    if (!SAFE_FOLDER_NAME.test(cleanFolder)) {
      return NextResponse.json({ success: false, error: 'Tên thư mục không hợp lệ' }, { status: 400 });
    }

    const projectDir = resolveProjectDir(cleanFolder, category);
    if (!fs.existsSync(projectDir)) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy thư mục dự án' }, { status: 404 });
    }

    const imagesDir = path.join(projectDir, 'images');
    const finalDir = path.join(projectDir, 'final');
    fs.mkdirSync(imagesDir, { recursive: true });
    fs.mkdirSync(finalDir, { recursive: true });

    const coverDest = path.join(imagesDir, 'cover.jpg');
    const finalThumbDest = path.join(finalDir, 'thumbnail.jpg');

    if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
      // 1. Lưu từ client-side canvas data URL (cực nhanh, đúng frame người dùng đang nhìn thấy)
      const base64Data = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      if (buffer.length === 0) {
        return NextResponse.json({ success: false, error: 'Dữ liệu ảnh rỗng' }, { status: 400 });
      }

      fs.writeFileSync(coverDest, buffer);
      fs.writeFileSync(finalThumbDest, buffer);
      console.log(`[API CaptureThumbnail] Đã lưu thumbnail từ canvas: ${coverDest} (${buffer.length} bytes)`);
    } else {
      // 2. Fallback: Dùng ffmpeg chụp frame từ file video.mp4 tại vị trí timestamp
      const videoPath = path.join(finalDir, 'video.mp4');
      if (!fs.existsSync(videoPath)) {
        return NextResponse.json({ success: false, error: 'Không tìm thấy file video.mp4 và không có dataUrl' }, { status: 404 });
      }

      const ffmpegBin = findFfmpegPath();
      const safeTime = Math.max(0, Number(timestamp) || 0);

      await new Promise((resolve, reject) => {
        execFile(
          ffmpegBin,
          ['-ss', String(safeTime), '-i', videoPath, '-vframes', '1', '-q:v', '2', '-y', coverDest],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });

      if (fs.existsSync(coverDest)) {
        fs.copyFileSync(coverDest, finalThumbDest);
        console.log(`[API CaptureThumbnail] Đã trích xuất frame bằng ffmpeg tại ${safeTime}s: ${coverDest}`);
      }
    }

    // Cập nhật manifest.json nếu có
    const manifestPath = path.join(projectDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        manifest.cover = 'images/cover.jpg';
        manifest.thumbnail = 'images/cover.jpg';
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
      } catch (e) {
        // Bỏ qua lỗi ghi manifest phụ
      }
    }

    const categoryQuery = category ? `&category=${encodeURIComponent(category)}` : '';
    const thumbnailUrl = `/api/prompts/image-stream?folderPath=${encodeURIComponent(cleanFolder)}&file=images/cover.jpg${categoryQuery}&t=${Date.now()}`;

    return NextResponse.json({
      success: true,
      message: 'Đã chụp và lưu thumbnail thành công',
      thumbnailUrl,
      savedPath: coverDest
    });
  } catch (err) {
    console.error('[API CaptureThumbnail Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi xử lý thumbnail' }, { status: 500 });
  }
}
