import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ALL_SKILL_FOLDERS, resolveSkillRemotionDir } from '@/lib/remotionPaths';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderPath = searchParams.get('folderPath');
    if (!folderPath) {
      return new Response('Missing folderPath', { status: 400 });
    }

    const cleanFolder = folderPath.trim();
    let videoPath = null;

    // Quét qua TẤT CẢ các skill public dir để tìm đúng tệp final/video.mp4 đã render
    for (const folder of ALL_SKILL_FOLDERS) {
      const candidate = path.join(resolveSkillRemotionDir(folder), 'public', cleanFolder, 'final', 'video.mp4');
      if (fs.existsSync(candidate)) {
        videoPath = candidate;
        break;
      }
    }

    if (!videoPath || !fs.existsSync(videoPath)) {
      return new Response('Video file not found on disk', { status: 404 });
    }

    const fileStream = fs.createReadStream(videoPath);
    const stat = fs.statSync(videoPath);

    return new Response(fileStream, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': stat.size.toString(),
        'Accept-Ranges': 'bytes'
      }
    });

  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
