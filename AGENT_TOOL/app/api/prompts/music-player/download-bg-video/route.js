import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getRemotionPublicDir } from '@/lib/remotionPaths';
import { readDb } from '@/lib/db.js';

const SAFE_FOLDER_RE = /^[A-Za-z0-9_-]+$/;

// POST: tải video từ Pexels về thư mục bg/ của project
// Hỗ trợ multi-video: gửi kèm `index` (0-based) để lưu thành bg-01.mp4, bg-02.mp4...
// Nếu index === 0 (video đầu tiên trong batch), xoá toàn bộ bg cũ trước khi tải.
export async function POST(req) {
  try {
    const { folderPath, videoUrl, pexelsId, index, clearExisting } = await req.json();

    if (!folderPath || !SAFE_FOLDER_RE.test(folderPath)) {
      return NextResponse.json({ success: false, error: 'Tên thư mục không hợp lệ.' }, { status: 400 });
    }
    if (!videoUrl) {
      return NextResponse.json({ success: false, error: 'Thiếu videoUrl.' }, { status: 400 });
    }

    const db = await readDb();
    if (!db.settings?.pexelsApiKey) {
      return NextResponse.json({ success: false, error: 'Chưa cấu hình Pexels API Key.' }, { status: 400 });
    }

    const publicDir = getRemotionPublicDir('pexels_talk_video');
    const bgDir = path.join(publicDir, folderPath, 'bg');
    fs.mkdirSync(bgDir, { recursive: true });

    // Xoá toàn bộ file bg cũ (kể cả looped) khi bắt đầu batch mới
    if (clearExisting) {
      fs.readdirSync(bgDir)
        .filter(f => f.endsWith('.mp4') || f.endsWith('.webm'))
        .forEach(f => { try { fs.unlinkSync(path.join(bgDir, f)); } catch (_) {} });
    }

    console.log(`[MusicPlayer BgVideo] Tải video ${index !== undefined ? `#${index + 1}` : ''} từ Pexels: ${videoUrl}`);

    const res = await fetch(videoUrl, {
      headers: { 'Authorization': db.settings.pexelsApiKey }
    });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `Pexels CDN trả lỗi: ${res.status}` }, { status: res.status });
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    // Multi-video mode: bg-01.mp4, bg-02.mp4...
    // Single-video fallback: background-{pexelsId}.mp4
    const filename = index !== undefined
      ? `bg-${String(index + 1).padStart(2, '0')}.mp4`
      : `background${pexelsId ? `-${pexelsId}` : ''}.mp4`;

    fs.writeFileSync(path.join(bgDir, filename), buffer);

    const bgVideoRelPath = `${folderPath}/bg/${filename}`;
    console.log(`[MusicPlayer BgVideo] Đã lưu: ${bgVideoRelPath} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);

    return NextResponse.json({
      success: true,
      filename,
      index,
      backgroundVideo: bgVideoRelPath,
      sizeMB: (buffer.length / 1024 / 1024).toFixed(1),
    });
  } catch (err) {
    console.error('[MusicPlayer BgVideo]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
