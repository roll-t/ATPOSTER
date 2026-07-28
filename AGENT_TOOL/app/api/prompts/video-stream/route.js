import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveProjectDir } from '@/lib/remotionPaths';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderPath = searchParams.get('folderPath');
    const category = searchParams.get('category') || undefined;
    if (!folderPath) {
      return new Response('Missing folderPath', { status: 400 });
    }

    const cleanFolder = folderPath.trim();
    // resolveProjectDir tự tìm đúng vị trí thật của project (phẳng cũ hoặc lồng theo
    // category mới) thay vì tự dò lại thủ công qua từng skill.
    const videoPath = path.join(resolveProjectDir(cleanFolder, category), 'final', 'video.mp4');

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
