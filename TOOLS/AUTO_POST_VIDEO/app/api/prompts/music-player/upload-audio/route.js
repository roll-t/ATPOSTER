import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getRemotionPublicDir } from '@/lib/remotionPaths';

const SAFE_FOLDER_RE = /^[A-Za-z0-9_-]+$/;

// POST: upload file audio (mp3/m4a/ogg) vào thư mục audio/ của project
export async function POST(req) {
  try {
    const formData = await req.formData();
    const folderPath = formData.get('folderPath');
    const songIndex = parseInt(formData.get('songIndex') ?? '0', 10);
    const file = formData.get('file');

    if (!folderPath || !SAFE_FOLDER_RE.test(folderPath)) {
      return NextResponse.json({ success: false, error: 'Tên thư mục không hợp lệ.' }, { status: 400 });
    }
    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'Không nhận được file.' }, { status: 400 });
    }

    // Xác định extension
    const originalName = file.name || 'song.mp3';
    const ext = originalName.split('.').pop()?.toLowerCase() || 'mp3';
    const allowed = ['mp3', 'm4a', 'ogg', 'wav', 'aac'];
    if (!allowed.includes(ext)) {
      return NextResponse.json({ success: false, error: `Định dạng không hỗ trợ: .${ext}` }, { status: 400 });
    }

    const publicDir = getRemotionPublicDir('music_player_video');
    const audioDir = path.join(publicDir, folderPath, 'audio');
    fs.mkdirSync(audioDir, { recursive: true });

    const filename = `song-${String(songIndex + 1).padStart(2, '0')}.${ext}`;

    // Xoá file cũ cùng index (khác ext) nếu có
    const existing = fs.readdirSync(audioDir).filter(f => f.startsWith(`song-${String(songIndex + 1).padStart(2, '0')}.`));
    existing.forEach(f => { try { fs.unlinkSync(path.join(audioDir, f)); } catch (_) {} });

    // Ghi file mới
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(audioDir, filename), buffer);

    // Tự động đọc duration bằng cách kiểm tra metadata header đơn giản (fallback = null)
    // Duration sẽ được user nhập tay nếu không detect được
    const audioRelPath = `${folderPath}/audio/${filename}`;

    // Cập nhật manifest.json
    const manifestPath = path.join(publicDir, folderPath, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (!Array.isArray(manifest.songs)) manifest.songs = [];
      while (manifest.songs.length <= songIndex) {
        manifest.songs.push({ title: '', artist: '', audioFile: '', durationSeconds: null });
      }
      manifest.songs[songIndex] = {
        ...manifest.songs[songIndex],
        audioFile: audioRelPath,
      };
      manifest.updatedAt = new Date().toISOString();
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    }

    return NextResponse.json({
      success: true,
      filename,
      audioFile: audioRelPath,
    });
  } catch (err) {
    console.error('[MusicPlayer UploadAudio]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
