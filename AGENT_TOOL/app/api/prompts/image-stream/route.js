import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveProjectDir } from '@/lib/remotionPaths';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderPath = searchParams.get('folderPath');
    const file = searchParams.get('file') || 'images/scene-01.jpg';

    if (!folderPath) {
      return new Response('Missing folderPath', { status: 400 });
    }

    const imagePath = path.join(resolveProjectDir(folderPath.trim()), file);

    if (!fs.existsSync(imagePath)) {
      return new Response('Image not found', { status: 404 });
    }

    const ext = path.extname(imagePath).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.svg' ? 'image/svg+xml' : 'image/jpeg';

    const fileBuffer = fs.readFileSync(imagePath);
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
