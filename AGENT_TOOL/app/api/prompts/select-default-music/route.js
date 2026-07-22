import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveProjectDir } from '@/lib/remotionPaths';

export async function POST(req) {
  try {
    const { folderPath, trackId, category } = await req.json();

    if (!folderPath || !trackId) {
      return NextResponse.json({ success: false, error: 'Thiếu folderPath hoặc trackId' }, { status: 400 });
    }

    const cleanFolder = path.basename(folderPath);
    const targetDir = resolveProjectDir(cleanFolder, category);
    const audioDir = path.join(targetDir, 'audio');

    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    // Nguồn tệp nhạc mặc định từ AGENT_TOOL/public/default-bg-music/
    const defaultMusicSource = path.join(process.cwd(), 'public', 'default-bg-music', `${trackId}.mp3`);
    if (!fs.existsSync(defaultMusicSource)) {
      return NextResponse.json({ success: false, error: `Không tìm thấy bản nhạc mặc định ${trackId}.mp3` }, { status: 404 });
    }

    const destPath = path.join(audioDir, 'bg-music.mp3');
    fs.copyFileSync(defaultMusicSource, destPath);

    // Cập nhật manifest.json nếu có
    const manifestPath = path.join(targetDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        manifest.bgMusic = 'audio/bg-music.mp3';
        manifest.updatedAt = Date.now();
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      } catch (err) {
        console.warn('[API SelectDefaultMusic] Không cập nhật được manifest.json:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã chọn bản nhạc mặc định ${trackId}`,
      file: 'audio/bg-music.mp3'
    });
  } catch (err) {
    console.error('[API SelectDefaultMusic Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
