import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getRemotionPublicDir } from '@/lib/remotionPaths';

const SAFE_FOLDER_RE = /^[A-Za-z0-9_-]+$/;

// POST: tạo project folder + manifest.json ban đầu cho music player video
export async function POST(req) {
  try {
    const { folderPath, title, orientation, playerStyle, accentColor, barCount, bgVideoOpacity, songs: incomingSongs } = await req.json();

    if (!folderPath || !SAFE_FOLDER_RE.test(folderPath)) {
      return NextResponse.json({ success: false, error: 'Tên thư mục không hợp lệ.' }, { status: 400 });
    }

    const publicDir = getRemotionPublicDir('music_player_video');
    const projectDir = path.join(publicDir, folderPath);

    fs.mkdirSync(path.join(projectDir, 'audio'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'bg'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'final'), { recursive: true });

    const manifestPath = path.join(projectDir, 'manifest.json');

    // Nếu manifest đã tồn tại, cập nhật metadata thay vì ghi đè toàn bộ
    let manifest = {};
    if (fs.existsSync(manifestPath)) {
      try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (_) {}
    }

    manifest = {
      ...manifest,
      title: title || manifest.title || folderPath,
      category: 'music_player_video',
      orientation: orientation || manifest.orientation || 'portrait',
      playerStyle: playerStyle || manifest.playerStyle || 'glass',
      accentColor: accentColor || manifest.accentColor || '#A78BFA',
      barCount: barCount || manifest.barCount || 32,
      bgVideoOpacity: bgVideoOpacity ?? manifest.bgVideoOpacity ?? 0.35,
      backgroundVideo: manifest.backgroundVideo || '',
      songs: incomingSongs !== undefined ? incomingSongs : (manifest.songs || []),
      createdAt: manifest.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    return NextResponse.json({ success: true, folderPath, manifest });
  } catch (err) {
    console.error('[MusicPlayer Setup]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// GET: đọc manifest hiện tại
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const folderPath = searchParams.get('folderPath');

    if (!folderPath || !SAFE_FOLDER_RE.test(folderPath)) {
      return NextResponse.json({ success: false, error: 'Thiếu folderPath.' }, { status: 400 });
    }

    const publicDir = getRemotionPublicDir('music_player_video');
    const manifestPath = path.join(publicDir, folderPath, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      return NextResponse.json({ success: false, error: 'Dự án chưa tồn tại.' }, { status: 404 });
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return NextResponse.json({ success: true, manifest });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
