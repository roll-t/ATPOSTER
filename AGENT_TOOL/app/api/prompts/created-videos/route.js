import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAllSkillPublicDirs } from '@/lib/remotionPaths';
import { getMongoClientDb } from '@/lib/db.js';

export async function GET() {
  try {
    // Mỗi category có thể render bởi 1 skill khác nhau (xem lib/remotionPaths.js) -> project
    // của nó nằm ở public/ của skill đó, nên phải quét MỌI skill rồi gộp lại, không chỉ 1 thư mục.
    const skillPublicDirs = getAllSkillPublicDirs().map(s => s.publicDir).filter(dir => fs.existsSync(dir));

    // Tra cứu folderPath -> category từ lịch sử tạo prompt, để "Video đã tạo" lọc được
    // đúng theo chủ đề/skill hiện đang mở (thư mục render không tự lưu category, chỉ
    // promptHistory mới biết chủ đề nào đã sinh ra folder đó). Bản ghi mới hơn (createdAt
    // lớn hơn) ghi đè bản cũ nếu có nhiều lần tạo trùng tên thư mục.
    const folderToCategory = new Map();
    try {
      const db = await getMongoClientDb();
      const historyItems = await db.collection('promptHistory').find({}).toArray();
      historyItems
        .slice()
        .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
        .forEach(item => {
          const folder = item.input?.folderPath;
          if (folder) folderToCategory.set(folder, item.category);
        });
    } catch (e) {
      console.warn('[API CreatedVideos] Không tra cứu được category từ promptHistory:', e.message);
    }

    const videos = [];
    const seenFolders = new Set();

    for (const basePublicDir of skillPublicDirs) {
      const items = fs.readdirSync(basePublicDir, { withFileTypes: true });

      for (const item of items) {
        if (!item.isDirectory()) continue;

        const folderName = item.name;
        if (seenFolders.has(folderName)) continue; // đã gặp ở skill trước đó, bỏ qua trùng tên
        const projectDir = path.join(basePublicDir, folderName);
        const videoPath = path.join(projectDir, 'final', 'video.mp4');

        // Chỉ lấy các thư mục ĐÃ RENDER THÀNH CÔNG tệp video.mp4
        if (!fs.existsSync(videoPath)) continue;
        seenFolders.add(folderName);

        let stat;
        try {
          stat = fs.statSync(videoPath);
        } catch (e) {
          continue;
        }

        // Đọc thông tin tiêu đề và cấu hình từ final/config.json nếu có
        let title = folderName.replace(/[-_]/g, ' ');
        // Capitalize first letter of words
        title = title.replace(/\b\w/g, l => l.toUpperCase());

        let aspectRatio = '9:16';
        let scenesCount = 0;
        const configPath = path.join(projectDir, 'final', 'config.json');
        const manifestPath = path.join(projectDir, 'manifest.json');

        let categoryFromConfig = null;
        if (fs.existsSync(configPath)) {
          try {
            const configJson = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (configJson.title) title = configJson.title;
            if (configJson.category) categoryFromConfig = configJson.category;
            if (configJson.orientation === 'landscape' || configJson.aspectRatio === '16:9') {
              aspectRatio = '16:9';
            }
            if (Array.isArray(configJson.scenes)) {
              scenesCount = configJson.scenes.length;
            }
          } catch (e) {
            // Bỏ qua lỗi đọc JSON
          }
        }

        if (fs.existsSync(manifestPath)) {
          try {
            const manifestJson = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            if (manifestJson.title && (!title || title === folderName.replace(/[-_]/g, ' '))) {
              title = manifestJson.title;
            }
            if (manifestJson.category && !categoryFromConfig) {
              categoryFromConfig = manifestJson.category;
            }
            if (manifestJson.orientation === 'landscape' || manifestJson.aspectRatio === '16:9') {
              aspectRatio = '16:9';
            }
            if (Array.isArray(manifestJson.segments) && scenesCount === 0) {
              scenesCount = manifestJson.segments.length;
            }
          } catch (e) {
            // Bỏ qua lỗi đọc manifest
          }
        }

        let itemCategory = folderToCategory.get(folderName) || categoryFromConfig;
        if (!itemCategory) {
          if (basePublicDir.includes('narrated-slideshow-video')) {
            itemCategory = 'stick_figure_slideshow';
          } else if (basePublicDir.includes('reading-page-video')) {
            itemCategory = 'reading_practice';
          }
        }

        // Tìm ảnh xem trước (thumbnail) từ thư mục images/
        let thumbnailFile = null;
        const imagesDir = path.join(projectDir, 'images');
        if (fs.existsSync(imagesDir)) {
          try {
            const imgFiles = fs.readdirSync(imagesDir)
              .filter(f => f.startsWith('scene-') && (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp') || f.endsWith('.jpeg')))
              .sort();
            if (imgFiles.length > 0) {
              thumbnailFile = imgFiles[0];
              if (scenesCount === 0) scenesCount = imgFiles.length;
            }
          } catch (e) {
            // Bỏ qua
          }
        }

        const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);

        videos.push({
          id: folderName,
          folderPath: folderName,
          category: itemCategory,
          title,
          aspectRatio,
          scenesCount,
          sizeMB: `${sizeMB} MB`,
          mtimeMs: stat.mtimeMs,
          createdAt: new Date(stat.mtimeMs).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          videoUrl: `/api/prompts/video-stream?folderPath=${encodeURIComponent(folderName)}`,
          thumbnailUrl: thumbnailFile
            ? `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderName)}&file=images/${encodeURIComponent(thumbnailFile)}`
            : null
        });
      }
    }

    // Sắp xếp các video mới tạo nhất lên đầu
    videos.sort((a, b) => b.mtimeMs - a.mtimeMs);

    return NextResponse.json({
      success: true,
      total: videos.length,
      videos
    });
  } catch (err) {
    console.error('[API CreatedVideos Exception]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
