import fs from 'fs';
import path from 'path';
import { resolveProjectDir } from '../rendering/remotion/paths.js';
import { getOptimizedMediaUrls } from './articleExtractor.js';

/**
 * Tải ảnh hoặc video từ URL bên ngoài về thư mục images của dự án
 * @param {Object} options
 * @param {string} options.folderPath - Tên thư mục dự án
 * @param {string} options.category - Category của video
 * @param {Array<{url: string, type?: 'image' | 'video', alt?: string, caption?: string}>} options.mediaList - Danh sách media từ bài báo
 * @param {number[]} [options.targetSceneNumbers] - Các số cảnh cần gán (mặc định [1, 2, 3...])
 * @param {boolean} [options.replaceExisting=false] - Có ghi đè cảnh đã có ảnh không
 * @param {string} [options.referer] - Referer header để tránh bị chặn hotlinking
 * @returns {Promise<{success: boolean, savedCount: number, savedFiles: Array<{sceneNum: number, filename: string, type: string}>}>}
 */
export async function downloadArticleMediaToProject({
  folderPath,
  category = 'stick_figure_slideshow',
  mediaList = [],
  targetSceneNumbers,
  replaceExisting = false,
  referer = '',
}) {
  if (!folderPath) {
    throw new Error('Thiếu folderPath dự án.');
  }
  if (!Array.isArray(mediaList) || mediaList.length === 0) {
    return { success: true, savedCount: 0, savedFiles: [] };
  }

  const cleanFolder = path.basename(folderPath.trim());
  const projectDir = resolveProjectDir(cleanFolder, category);
  const imagesDir = path.join(projectDir, 'images');

  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const manifestPath = path.join(projectDir, 'manifest.json');
  let manifest = null;
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (_) {}
  }

  // Đọc danh sách các file ảnh/video hiện có để tránh ghi đè nếu replaceExisting = false
  const existingFiles = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir) : [];
  const existingSceneNumbers = new Set();
  for (const f of existingFiles) {
    const m = f.match(/^scene-(\d+)\.(jpg|jpeg|png|webp|mp4|webm)$/i);
    if (m) existingSceneNumbers.add(Number(m[1]));
  }

  const totalScenes = manifest?.segments?.length || 30;
  const scenesToAssign = targetSceneNumbers && targetSceneNumbers.length > 0
    ? targetSceneNumbers
    : Array.from({ length: totalScenes }, (_, i) => i + 1);

  const downloadQueue = [];
  let mediaIndex = 0;
  for (const sceneNum of scenesToAssign) {
    if (mediaIndex >= mediaList.length) break;

    // Nếu cảnh đã có ảnh và không yêu cầu ghi đè thì bỏ qua
    if (!replaceExisting && existingSceneNumbers.has(sceneNum)) {
      continue;
    }

    const item = mediaList[mediaIndex];
    mediaIndex++;

    if (!item?.url) continue;
    downloadQueue.push({ sceneNum, item });
  }

  const savedFiles = [];

  // Tải song song tất cả các ảnh/video được gán để tiết kiệm 80-90% thời gian
  await Promise.all(
    downloadQueue.map(async ({ sceneNum, item }) => {
      const padNum = String(sceneNum).padStart(2, '0');
      const opt = getOptimizedMediaUrls(item.url);
      const targetUrl = item.downloadUrl || opt.downloadUrl || item.url;
      try {
        const parsedUrl = new URL(targetUrl);
        const reqHeaders = {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': '*/*',
        };
        if (referer) {
          reqHeaders['Referer'] = referer;
        } else {
          reqHeaders['Referer'] = `${parsedUrl.protocol}//${parsedUrl.hostname}/`;
        }

        const res = await fetch(targetUrl, { headers: reqHeaders });
        if (!res.ok) {
          console.warn(`[ArticleMediaDownloader] Tải media thất bại (${res.status}):`, targetUrl);
          return;
        }

        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        const isVideo = item.type === 'video' || contentType.includes('video/') || targetUrl.endsWith('.mp4');

        let ext = 'jpg';
        if (isVideo) {
          ext = 'mp4';
        } else if (contentType.includes('png') || targetUrl.includes('.png')) {
          ext = 'png';
        } else if (contentType.includes('webp') || targetUrl.includes('.webp')) {
          ext = 'webp';
        }

        const filename = `images/scene-${padNum}.${ext}`;
        const destPath = path.join(projectDir, filename);

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.byteLength < 500) {
          // File quá nhỏ (có thể là lỗi trả về HTML/tracker), bỏ qua
          return;
        }

        // Xóa các file ảnh/video cũ khác phần mở rộng của scene này
        for (const oldExt of ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm']) {
          if (oldExt === ext) continue;
          const oldFile = path.join(imagesDir, `scene-${padNum}.${oldExt}`);
          if (fs.existsSync(oldFile)) {
            try { fs.unlinkSync(oldFile); } catch (_) {}
          }
        }

        fs.writeFileSync(destPath, buffer);
        savedFiles.push({
          sceneNum,
          filename,
          type: isVideo ? 'video' : 'image',
          url: targetUrl,
        });
      } catch (err) {
        console.warn(`[ArticleMediaDownloader] Lỗi khi tải ${targetUrl}:`, err.message);
      }
    })
  );

  // Cập nhật manifest.json nếu có
  if (manifest && fs.existsSync(manifestPath)) {
    try {
      const savedMap = new Map(savedFiles.map((f) => [f.sceneNum, f]));
      if (Array.isArray(manifest.segments)) {
        manifest.segments = manifest.segments.map((seg) => {
          const segNum = Number(seg.segmentNumber);
          const saved = savedMap.get(segNum);
          if (saved) {
            const isVid = saved.type === 'video';
            return {
              ...seg,
              mediaType: saved.type,
              mediaFile: saved.filename,
              ...(isVid ? { kenBurns: 'none' } : {})
            };
          }
          return seg;
        });
      }

      // Lưu trữ toàn bộ kho media của bài báo vào manifest (tránh ghi đè nếu mediaList chỉ là 1 ảnh đơn lẻ)
      if (!Array.isArray(manifest.articleMedia) || manifest.articleMedia.length <= mediaList.length) {
        manifest.articleMedia = mediaList;
      }
      manifest.updatedAt = Date.now();
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    } catch (mErr) {
      console.warn('[ArticleMediaDownloader] Lỗi cập nhật manifest.json:', mErr.message);
    }
  }

  return {
    success: true,
    savedCount: savedFiles.length,
    savedFiles,
  };
}

export default {
  downloadArticleMediaToProject,
};
