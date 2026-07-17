import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getRemotionPublicDir } from '@/lib/remotionPaths';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderPath = searchParams.get('folderPath');
    if (!folderPath) {
      return new Response('Missing folderPath', { status: 400 });
    }

    const baseSkillDir = getRemotionPublicDir();

    const videoPath = path.join(baseSkillDir, folderPath.trim(), 'final', 'video.mp4');

    if (!fs.existsSync(videoPath)) {
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
