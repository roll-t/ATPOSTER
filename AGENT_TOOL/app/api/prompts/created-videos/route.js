import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAllSkillPublicDirs } from '@/lib/remotionPaths';
import { getMongoClientDb } from '@/lib/db.js';

// 1 thư mục cấp-1 dưới public/ của 1 skill là project THẬT (kiểu phẳng cũ, trước khi tách theo
// category) nếu nó có bất kỳ dấu hiệu nào dưới đây ngay bên trong nó. Nếu KHÔNG có dấu hiệu nào,
// coi đó là 1 "thư mục nhóm theo category" (kiểu lồng mới — xem lib/remotionPaths.js) và quét
// thêm 1 cấp con bên trong để tìm project thật.
function looksLikeProjectFolder(dirPath) {
  return (
    fs.existsSync(path.join(dirPath, 'manifest.json')) ||
    fs.existsSync(path.join(dirPath, 'images')) ||
    fs.existsSync(path.join(dirPath, 'audio')) ||
    fs.existsSync(path.join(dirPath, 'final'))
  );
}

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
    const folderToLevel = new Map();
    try {
      const db = await getMongoClientDb();
      const historyItems = await db.collection('promptHistory').find({}).toArray();
      historyItems
        .slice()
        .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
        .forEach(item => {
          const folder = item.input?.folderPath;
          if (folder) {
            folderToCategory.set(folder, item.category);
            const lvl = item.input?.level || item.level;
            if (lvl) folderToLevel.set(folder, lvl);
          }
        });
    } catch (e) {
      console.warn('[API CreatedVideos] Không tra cứu được category/level từ promptHistory:', e.message);
    }

    const videos = [];
    const seenFolders = new Set();

    // Xử lý 1 thư mục project THẬT (đã xác định projectDir đúng, dù tìm được ở vị trí phẳng cũ
    // hay lồng theo category mới) — đọc config/manifest, xác định category, dựng URL xem trước.
    // categoryHintFromPath: category suy ra được từ chính tên thư mục nhóm cha (chỉ có khi
    // project nằm ở vị trí lồng mới — đáng tin hơn hẳn so với đoán mò theo tên skill, vì với vị
    // trí lồng mới, tên thư mục cha CHÍNH LÀ category thật đã dùng để tạo ra nó).
    function processProjectFolder(basePublicDir, folderName, projectDir, categoryHintFromPath) {
      if (seenFolders.has(folderName)) return; // đã gặp ở skill/vị trí trước đó, bỏ qua trùng tên
      const videoPath = path.join(projectDir, 'final', 'video.mp4');

      // Chỉ lấy các thư mục ĐÃ RENDER THÀNH CÔNG tệp video.mp4
      if (!fs.existsSync(videoPath)) return;
      seenFolders.add(folderName);

      let stat;
      try {
        stat = fs.statSync(videoPath);
      } catch (e) {
        return;
      }

      // Đọc thông tin tiêu đề và cấu hình từ final/config.json nếu có
      let title = folderName.replace(/[-_]/g, ' ');
      // Capitalize first letter of words
      title = title.replace(/\b\w/g, l => l.toUpperCase());

      let aspectRatio = '9:16';
      let scenesCount = 0;
      const configPath = path.join(projectDir, 'final', 'config.json');
      const manifestPath = path.join(projectDir, 'manifest.json');

      let itemLevel = folderToLevel.get(folderName) || null;
      let driveFileId = null;
      let driveUrl = null;

      let categoryFromConfig = null;
      if (fs.existsSync(configPath)) {
        try {
          const configJson = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (configJson.title) title = configJson.title;
          if (configJson.category) categoryFromConfig = configJson.category;
          if (configJson.level) itemLevel = configJson.level;
          if (configJson.orientation === 'landscape' || configJson.aspectRatio === '16:9') {
            aspectRatio = '16:9';
          }
          if (Array.isArray(configJson.scenes)) {
            scenesCount = configJson.scenes.length;
          }
          if (configJson.driveFileId) driveFileId = configJson.driveFileId;
          if (configJson.driveUrl) driveUrl = configJson.driveUrl;
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
          if (manifestJson.level || manifestJson.input?.level) {
            itemLevel = manifestJson.level || manifestJson.input?.level;
          }
          if (manifestJson.orientation === 'landscape' || manifestJson.aspectRatio === '16:9') {
            aspectRatio = '16:9';
          }
          if (Array.isArray(manifestJson.segments) && scenesCount === 0) {
            scenesCount = manifestJson.segments.length;
          }
          if (manifestJson.driveFileId && !driveFileId) driveFileId = manifestJson.driveFileId;
          if (manifestJson.driveUrl && !driveUrl) driveUrl = manifestJson.driveUrl;
        } catch (e) {
          // Bỏ qua lỗi đọc manifest
        }
      }

      // Thứ tự ưu tiên xác định category: lịch sử DB (đáng tin nhất) -> field ghi sẵn trong
      // config/manifest -> tên thư mục nhóm cha (chỉ có ở vị trí lồng mới, cũng rất đáng tin vì
      // đó chính là category dùng để tạo ra project) -> cuối cùng mới đoán mò theo tên skill
      // (chỉ còn ý nghĩa với project phẳng cũ không có bất kỳ manh mối nào ở trên).
      let itemCategory = folderToCategory.get(folderName) || categoryFromConfig || categoryHintFromPath;
      if (!itemCategory) {
        if (basePublicDir.includes('stick-figure-slideshow-video')) {
          itemCategory = 'stick_figure_slideshow';
        } else if (basePublicDir.includes('reading-page-video')) {
          itemCategory = 'reading_practice';
        } else if (basePublicDir.includes('narrated-slideshow-video')) {
          // Skill mặc định giờ chỉ còn phục vụ moral_talk_slideshow (stick_figure_slideshow đã
          // tách sang skill riêng). Project phẳng cũ nằm ở đây mà không có manh mối nào khác
          // thì gần như chắc chắn là moral_talk_slideshow.
          itemCategory = 'moral_talk_slideshow';
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
      const categoryQuery = itemCategory ? `&category=${encodeURIComponent(itemCategory)}` : '';

      videos.push({
        id: folderName,
        folderPath: folderName,
        category: itemCategory,
        title,
        level: itemLevel,
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
        videoUrl: `/api/prompts/video-stream?folderPath=${encodeURIComponent(folderName)}${categoryQuery}`,
        thumbnailUrl: thumbnailFile
          ? `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderName)}&file=images/${encodeURIComponent(thumbnailFile)}${categoryQuery}`
          : null,
        driveFileId,
        driveUrl
      });
    }

    for (const basePublicDir of skillPublicDirs) {
      const items = fs.readdirSync(basePublicDir, { withFileTypes: true });

      for (const item of items) {
        if (!item.isDirectory()) continue;

        const entryName = item.name;
        const entryPath = path.join(basePublicDir, entryName);

        if (looksLikeProjectFolder(entryPath)) {
          // Vị trí PHẲNG cũ — entryName chính là 1 project.
          processProjectFolder(basePublicDir, entryName, entryPath, null);
          continue;
        }

        // Không có dấu hiệu nào của 1 project ngay tại đây -> coi đây là 1 thư mục NHÓM theo
        // category (vị trí lồng mới), quét thêm 1 cấp con để tìm project thật bên trong.
        let subItems;
        try {
          subItems = fs.readdirSync(entryPath, { withFileTypes: true });
        } catch (e) {
          continue;
        }
        for (const subItem of subItems) {
          if (!subItem.isDirectory()) continue;
          const projectName = subItem.name;
          const projectPath = path.join(entryPath, projectName);
          processProjectFolder(basePublicDir, projectName, projectPath, entryName);
        }
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
