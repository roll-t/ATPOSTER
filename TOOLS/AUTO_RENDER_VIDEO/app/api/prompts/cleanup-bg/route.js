import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveProjectDir } from '@/lib/remotionPaths';

const SAFE_FOLDER_RE = /^[A-Za-z0-9_-]+$/;

/**
 * Dọn bớt clip trong playlist nền chung ("bg-NN.mp4") khi mọi đoạn đã có nền riêng.
 *
 * Khi tất cả các đoạn đều dùng clip riêng khớp lời kể, playlist chung chỉ còn hiện ở khoảng lặng
 * đầu video (1 giây) và đuôi video (3 giây) — giữ hàng chục clip nặng cả trăm MB cho 4 giây hình
 * là lãng phí ổ đĩa, và mỗi lần render Remotion lại chép cả thư mục public đi một lần nữa.
 *
 * KHÔNG BAO GIỜ xoá "seg-bg-NN.mp4" (nền riêng của từng đoạn), và luôn giữ lại ít nhất `keep` clip
 * làm lớp dự phòng — xoá sạch playlist sẽ để lộ khung đen ở hai đầu video.
 */
export async function POST(req) {
  try {
    const { folderPath, category, keep = 1 } = await req.json();

    if (!folderPath || !SAFE_FOLDER_RE.test(folderPath)) {
      return NextResponse.json({ success: false, error: 'Tên thư mục không hợp lệ.' }, { status: 400 });
    }

    const keepCount = Math.max(1, Math.min(10, Number(keep) || 1));
    const bgDir = path.join(resolveProjectDir(folderPath, category), 'bg');
    if (!fs.existsSync(bgDir)) {
      return NextResponse.json({ success: true, removed: [], freedMB: '0.0', kept: 0 });
    }

    const playlistFiles = fs.readdirSync(bgDir)
      .filter(f => /^bg-\d+\.(mp4|webm)$/.test(f))
      .sort();

    const toRemove = playlistFiles.slice(keepCount);
    let freedBytes = 0;
    const removed = [];
    for (const f of toRemove) {
      const full = path.join(bgDir, f);
      try {
        freedBytes += fs.statSync(full).size;
        fs.unlinkSync(full);
        removed.push(f);
      } catch (err) {
        console.warn(`[API CleanupBg] Không xoá được ${f}:`, err.message);
      }
    }

    const freedMB = (freedBytes / 1024 / 1024).toFixed(1);
    console.log(`[API CleanupBg] ${folderPath}: xoá ${removed.length} clip playlist, giải phóng ${freedMB} MB, giữ lại ${Math.min(keepCount, playlistFiles.length)} clip dự phòng.`);

    return NextResponse.json({
      success: true,
      removed,
      freedMB,
      kept: Math.min(keepCount, playlistFiles.length),
    });
  } catch (err) {
    console.error('[API CleanupBg]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
