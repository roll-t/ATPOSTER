import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getRemotionPublicDir } from '@/lib/remotionPaths';

export async function POST(req) {
  try {
    const { folderPath } = await req.json();
    if (!folderPath) {
      return NextResponse.json({ error: 'Thiếu folderPath' }, { status: 400 });
    }

    const baseSkillDir = getRemotionPublicDir();

    const targetDir = path.join(baseSkillDir, folderPath.trim());
    const imagesDir = path.join(targetDir, 'images');
    const audioDir = path.join(targetDir, 'audio');
    const videoFile = path.join(targetDir, 'final', 'video.mp4');

    let imageCount = 0;
    if (fs.existsSync(imagesDir)) {
      imageCount = fs.readdirSync(imagesDir).filter(f => f.startsWith('scene-') && (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp'))).length;
    }

    let audioCount = 0;
    if (fs.existsSync(audioDir)) {
      audioCount = fs.readdirSync(audioDir).filter(f => f.startsWith('scene-') && f.endsWith('.mp3')).length;
    }

    const videoCreated = fs.existsSync(videoFile);

    return NextResponse.json({
      success: true,
      imageCount,
      audioCount,
      videoCreated
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
