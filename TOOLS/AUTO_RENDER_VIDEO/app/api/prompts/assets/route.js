import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const ASSETS_BASE = path.join(
  process.cwd(),
  'skills', 'stick-figure-slideshow-video', 'remotion', 'public', 'assets'
);

const SAFE_ASSET_ID = /^[a-z0-9_]+$/;

// GET /api/prompts/assets — danh sách toàn bộ asset PNG chia theo nhóm
export async function GET() {
  const categories = ['pose', 'prop', 'sym', 'bg'];
  const result = {};
  for (const cat of categories) {
    const dir = path.join(ASSETS_BASE, cat);
    try {
      result[cat] = fs.existsSync(dir)
        ? fs.readdirSync(dir)
            .filter(f => f.endsWith('.png') && SAFE_ASSET_ID.test(f.replace('.png', '')))
            .map(f => f.replace('.png', ''))
            .sort()
        : [];
    } catch {
      result[cat] = [];
    }
  }
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=300' }
  });
}
