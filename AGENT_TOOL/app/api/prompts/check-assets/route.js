import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ALL_SKILL_FOLDERS, resolveSkillRemotionDir, resolveProjectDir } from '@/lib/remotionPaths';

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

    let videoCreated = false;
    for (const folder of ALL_SKILL_FOLDERS) {
      const vFile = path.join(resolveSkillRemotionDir(folder), 'public', cleanFolder, 'final', 'video.mp4');
      if (fs.existsSync(vFile)) {
        videoCreated = true;
        break;
      }
    }

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
