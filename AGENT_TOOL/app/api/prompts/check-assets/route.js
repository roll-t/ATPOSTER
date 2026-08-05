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
    // Trả về cả TÊN FILE thật (bg-music.mp3 / .m4a / .wav...) chứ không chỉ true/false: trình
    // nghe thử trong modal cần đúng đuôi file để phát, trước đây nó gắn cứng ".mp3" nên nhạc nền
    // người dùng tải lên ở định dạng khác thì không nghe thử được dù đã áp dụng thành công.
    let bgMusicFile = null;
    if (fs.existsSync(audioDir)) {
      bgMusicFile = fs.readdirSync(audioDir).find(f => f.startsWith('bg-music.')) || null;
    }

    const bgDir = path.join(targetDir, 'bg');
    let hasBgVideo = false;
    if (fs.existsSync(bgDir)) {
      hasBgVideo = fs.readdirSync(bgDir).some(f => f.endsWith('.mp4') || f.endsWith('.webm'));
    }

    return NextResponse.json({
      success: true,
      imageCount,
      audioCount,
      videoCreated,
      hasBgMusic: Boolean(bgMusicFile),
      bgMusicFile,
      hasBgVideo
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
