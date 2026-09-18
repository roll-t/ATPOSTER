import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { resolveProjectDir } from '@/src/infrastructure/rendering/remotion/paths.js';
import { settingsRepository } from '@/src/infrastructure/composition/settings.js';

function findFfmpegPath() {
  const remotionPaths = [
    path.join(process.cwd(), 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe'),
    path.join(process.cwd(), 'node_modules', '@remotion', 'compositor-linux-x64-gnu', 'ffmpeg'),
    path.join(process.cwd(), 'node_modules', '@remotion', 'compositor-darwin-x64', 'ffmpeg'),
    path.join(process.cwd(), 'node_modules', '@remotion', 'compositor-darwin-arm64', 'ffmpeg'),
  ];
  for (const p of remotionPaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'ffmpeg';
}

export async function POST(req) {
  try {
    const { folderPath, category, sceneNumber, type, url, trim } = await req.json();

    if (!folderPath || !sceneNumber || !url) {
      return NextResponse.json({ success: false, error: 'Thiếu folderPath, sceneNumber hoặc url' }, { status: 400 });
    }

    const segNum = Number(sceneNumber);
    if (!Number.isFinite(segNum) || segNum <= 0) {
      return NextResponse.json({ success: false, error: 'sceneNumber không hợp lệ' }, { status: 400 });
    }

    const isVideo = type === 'video';
    const cleanFolder = path.basename(folderPath);
    const projectDir = resolveProjectDir(cleanFolder, category);
    const imagesDir = path.join(projectDir, 'images');
    fs.mkdirSync(imagesDir, { recursive: true });

    const padNum = String(segNum).padStart(2, '0');

    // Tải tài nguyên từ Pexels (kèm API Key nếu cần)
    const apiKey = (await settingsRepository.read()).pexelsApiKey || '';
    const fetchHeaders = apiKey ? { Authorization: apiKey } : {};

    console.log(`[Pexels Apply Scene] Đang tải ${isVideo ? 'video' : 'ảnh'} cho Cảnh ${segNum}:`, url);
    const res = await fetch(url, { headers: fetchHeaders });
    if (!res.ok) {
      return NextResponse.json({
        success: false,
        error: `Không thể tải file từ Pexels: HTTP ${res.status}`
      }, { status: res.status });
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ success: false, error: 'Dữ liệu tải về bị rỗng' }, { status: 400 });
    }

    let targetFilename = '';

    if (!isVideo) {
      // 1. ÁP DỤNG ẢNH
      targetFilename = `images/scene-${padNum}.jpg`;
      const destPath = path.join(projectDir, targetFilename);
      fs.writeFileSync(destPath, buffer);

      // Dọn file video cũ của cảnh này (nếu có)
      for (const vidExt of ['mp4', 'webm']) {
        const oldVid = path.join(imagesDir, `scene-${padNum}.${vidExt}`);
        if (fs.existsSync(oldVid)) {
          try { fs.unlinkSync(oldVid); } catch {}
        }
      }
      console.log(`[Pexels Apply Scene] Đã lưu ảnh Cảnh ${segNum}: ${destPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
    } else {
      // 2. ÁP DỤNG VIDEO (CÓ THỂ CẮT CẢNH / TRIM)
      targetFilename = `images/scene-${padNum}.mp4`;
      const destPath = path.join(projectDir, targetFilename);

      const hasTrim = trim && (Number(trim.start) > 0 || (Number(trim.end) > Number(trim.start) && Number(trim.end) > 0));

      if (hasTrim) {
        // Cần cắt video bằng ffmpeg
        const tempInputPath = path.join(imagesDir, `temp_raw_${padNum}_${Date.now()}.mp4`);
        fs.writeFileSync(tempInputPath, buffer);

        try {
          const ffmpegBin = findFfmpegPath();
          const startTime = Math.max(0, Number(trim.start) || 0);
          const endTime = Math.max(startTime + 0.5, Number(trim.end) || (startTime + 5));
          const duration = endTime - startTime;

          console.log(`[Pexels Apply Scene] Cắt video Cảnh ${segNum}: [${startTime}s -> ${endTime}s] (${duration}s)`);

          execFileSync(ffmpegBin, [
            '-stream_loop', '-1',
            ...(startTime > 0 ? ['-ss', String(startTime)] : []),
            '-i', tempInputPath,
            '-t', String(duration),
            '-avoid_negative_ts', 'make_zero',
            '-r', '30',
            '-g', '30',
            '-keyint_min', '30',
            '-bf', '0',
            '-pix_fmt', 'yuv420p',
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '19',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart',
            '-y',
            destPath
          ], { stdio: 'pipe' });

          console.log(`[Pexels Apply Scene] Đã cắt và chuẩn hóa video 30fps Cảnh ${segNum}: ${destPath}`);
        } catch (fErr) {
          console.warn('[Pexels Apply Scene] Lỗi cắt video bằng ffmpeg, fallback lưu toàn bộ video:', fErr.message);
          fs.writeFileSync(destPath, buffer);
        } finally {
          if (fs.existsSync(tempInputPath)) {
            try { fs.unlinkSync(tempInputPath); } catch {}
          }
        }
      } else {
        // Lưu trực tiếp không cắt
        fs.writeFileSync(destPath, buffer);
        console.log(`[Pexels Apply Scene] Đã lưu video Cảnh ${segNum}: ${destPath} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
      }

      // Dọn file ảnh cũ của cảnh này (nếu có)
      for (const imgExt of ['jpg', 'jpeg', 'png', 'webp']) {
        const oldImg = path.join(imagesDir, `scene-${padNum}.${imgExt}`);
        if (fs.existsSync(oldImg)) {
          try { fs.unlinkSync(oldImg); } catch {}
        }
      }
    }

    // Cập nhật manifest.json
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
                mediaFile: targetFilename
              };
            }
            return seg;
          });
          manifest.updatedAt = Date.now();
          fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
        }
      } catch (mErr) {
        console.warn('[Pexels Apply Scene] Cập nhật manifest warning:', mErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      sceneNumber: segNum,
      mediaType: isVideo ? 'video' : 'image',
      filename: targetFilename
    });
  } catch (err) {
    console.error('[Pexels Apply Scene Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi áp dụng media từ Pexels' }, { status: 500 });
  }
}
