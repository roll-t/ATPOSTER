import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveProjectDir } from '@/lib/remotionPaths';

export async function POST(req) {
  try {
    const { folderPath, category } = await req.json();
    if (!folderPath) {
      return NextResponse.json({ error: 'Thiếu folderPath' }, { status: 400 });
    }

    const cleanFolder = folderPath.trim();
    const targetDir = resolveProjectDir(cleanFolder, category);
    const imagesDir = path.join(targetDir, 'images');
    const audioDir = path.join(targetDir, 'audio');

    let imageCount = 0;
    if (fs.existsSync(imagesDir)) {
      imageCount = fs.readdirSync(imagesDir).filter(f => f.startsWith('scene-') && (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp'))).length;
    }

    let audioCount = 0;
    if (fs.existsSync(audioDir)) {
      audioCount = fs.readdirSync(audioDir).filter(f => f.startsWith('scene-') && f.endsWith('.mp3')).length;
    }

    // targetDir (đã resolve ở trên qua resolveProjectDir) đã tự tìm đúng vị trí thật của
    // project — dù ở vị trí phẳng cũ hay lồng theo category mới — nên chỉ cần kiểm tra
    // final/video.mp4 ngay trong đó, không cần tự dò lại từ đầu qua từng skill.
    const videoCreated = fs.existsSync(path.join(targetDir, 'final', 'video.mp4'));

    // Nhạc nền (tuỳ chọn, người dùng tự tải lên qua Studio Thiết Kế Trang Đọc Video) — chỉ
    // reading-page-video có tính năng này, nhưng kiểm tra vô hại cho category khác.
    let hasBgMusic = false;
    if (fs.existsSync(audioDir)) {
      hasBgMusic = fs.readdirSync(audioDir).some(f => f.startsWith('bg-music.'));
    }

    return NextResponse.json({
      success: true,
      imageCount,
      audioCount,
      videoCreated,
      hasBgMusic
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
