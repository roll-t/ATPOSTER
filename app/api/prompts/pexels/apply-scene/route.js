import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveProjectDir } from '@/src/infrastructure/rendering/remotion/paths.js';
import { settingsRepository } from '@/src/infrastructure/composition/settings.js';
import {
  cleanupStalePexelsTemps,
  downloadPexelsMediaToFile,
  removeSceneFiles,
  saveFullPexelsVideoWithoutAudio,
  trimRemotePexelsVideo
} from '@/src/infrastructure/media/pexelsMediaFiles.js';

function isAllowedPexelsMediaUrl(value, isVideo) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') return false;
    const allowedVideoHosts = new Set(['videos.pexels.com', 'player.vimeo.com']);
    const allowedImageHosts = new Set(['images.pexels.com']);
    return (isVideo ? allowedVideoHosts : allowedImageHosts).has(parsed.hostname);
  } catch {
    return false;
  }
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
    if (!isAllowedPexelsMediaUrl(url, isVideo)) {
      return NextResponse.json({ success: false, error: 'URL media không thuộc nguồn Pexels hợp lệ.' }, { status: 400 });
    }
    const cleanFolder = path.basename(folderPath);
    const projectDir = resolveProjectDir(cleanFolder, category);
    const imagesDir = path.join(projectDir, 'images');
    fs.mkdirSync(imagesDir, { recursive: true });
    cleanupStalePexelsTemps(imagesDir);

    const padNum = String(segNum).padStart(2, '0');

    // Tải tài nguyên từ Pexels (kèm API Key nếu cần)
    const apiKey = (await settingsRepository.read()).pexelsApiKey || '';
    const fetchHeaders = apiKey ? { Authorization: apiKey } : {};

    let targetFilename = '';

    if (!isVideo) {
      // 1. ÁP DỤNG ẢNH
      targetFilename = `images/scene-${padNum}.jpg`;
      const destPath = path.join(projectDir, targetFilename);
      const downloadedBytes = await downloadPexelsMediaToFile({
        url,
        headers: fetchHeaders,
        destinationPath: destPath,
        maxBytes: 30 * 1024 * 1024
      });

      // Dọn file video cũ của cảnh này (nếu có)
      removeSceneFiles(imagesDir, padNum, ['mp4', 'webm']);
      console.log(`[Pexels Apply Scene] Đã lưu ảnh Cảnh ${segNum}: ${destPath} (${(downloadedBytes / 1024).toFixed(1)} KB)`);
    } else {
      // 2. ÁP DỤNG VIDEO (CÓ THỂ CẮT CẢNH / TRIM)
      targetFilename = `images/scene-${padNum}.mp4`;
      const destPath = path.join(projectDir, targetFilename);

      const hasTrim = trim && (Number(trim.start) > 0 || (Number(trim.end) > Number(trim.start) && Number(trim.end) > 0));

      if (hasTrim) {
        const startTime = Math.max(0, Number(trim.start) || 0);
        const endTime = Math.max(startTime + 0.5, Number(trim.end) || (startTime + 5));
        const duration = endTime - startTime;
        const sourceDuration = Math.max(0, Number(trim.sourceDuration) || 0);
        const loopInput = sourceDuration > 0 && duration > sourceDuration;

        console.log(`[Pexels Apply Scene] Cắt trực tiếp video Cảnh ${segNum}: [${startTime}s -> ${endTime}s] (${duration}s)`);
        await trimRemotePexelsVideo({
          url,
          destinationPath: destPath,
          startTime,
          duration,
          loopInput,
          headers: fetchHeaders
        });
        console.log(`[Pexels Apply Scene] Đã cắt và chuẩn hóa video 30fps Cảnh ${segNum}: ${destPath}`);
      } else {
        // Chỉ tải toàn bộ file khi người dùng chủ động chọn dùng toàn bộ video.
        const outputBytes = await saveFullPexelsVideoWithoutAudio({
          url,
          headers: fetchHeaders,
          destinationPath: destPath,
          maxSourceBytes: 300 * 1024 * 1024
        });
        console.log(`[Pexels Apply Scene] Đã lưu toàn bộ video không kèm audio Cảnh ${segNum}: ${destPath} (${(outputBytes / 1024 / 1024).toFixed(1)} MB)`);
      }

      // Dọn mọi định dạng cũ không còn được manifest sử dụng.
      removeSceneFiles(imagesDir, padNum, ['jpg', 'jpeg', 'png', 'webp', 'webm']);
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
    const status = Number(err?.statusCode) || 500;
    return NextResponse.json({ success: false, error: err.message || 'Lỗi áp dụng media từ Pexels' }, { status });
  }
}
