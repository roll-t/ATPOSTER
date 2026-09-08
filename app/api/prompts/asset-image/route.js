import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const ASSETS_BASE = path.join(
  process.cwd(),
  'skills', 'stick-figure-slideshow-video', 'remotion', 'public', 'assets'
);

// Chỉ cho phép ký tự an toàn để tránh path traversal
const SAFE_ASSET_ID = /^[a-z0-9_]+$/;

function resolveAssetPath(id) {
  if (id.startsWith('prop_')) return path.join(ASSETS_BASE, 'prop', `${id}.png`);
  if (id.startsWith('sym_'))  return path.join(ASSETS_BASE, 'sym',  `${id}.png`);
  if (id.startsWith('bg_'))   return path.join(ASSETS_BASE, 'bg',   `${id}.png`);
  return path.join(ASSETS_BASE, 'pose', `${id}.png`);
}

// GET /api/prompts/asset-image?id=pose_thinking
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = (searchParams.get('id') || '').trim();

  if (!id || !SAFE_ASSET_ID.test(id)) {
    return NextResponse.json({ error: 'Invalid asset id' }, { status: 400 });
  }

  const filePath = resolveAssetPath(id);

  // Đảm bảo file nằm bên trong ASSETS_BASE (không ra ngoài)
  if (!filePath.startsWith(ASSETS_BASE)) {
    return NextResponse.json({ error: 'Invalid asset id' }, { status: 400 });
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
