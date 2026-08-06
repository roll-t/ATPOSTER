import { NextResponse } from 'next/server';
import { getMongoClientDb } from '@/lib/db.js';
import { PROMPT_CATEGORIES } from '@/lib/prompts/index.js';

export async function GET() {
  try {
    const db = await getMongoClientDb();
    const saved = await db.collection('promptStyles').find({}).toArray();
    const savedMap = new Map(saved.map(s => [s.category, s.style]));

    const styles = {};
    for (const key of Object.keys(PROMPT_CATEGORIES)) {
      styles[key] = savedMap.get(key) || PROMPT_CATEGORIES[key].defaultStyle;
    }

    return NextResponse.json({ success: true, styles });
  } catch (error) {
    console.error('[API Prompt Styles GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tải style.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { category, style } = await request.json();
    if (!category || !PROMPT_CATEGORIES[category]) {
      return NextResponse.json({ error: 'Chủ đề không hợp lệ.' }, { status: 400 });
    }
    if (!style || typeof style !== 'object') {
      return NextResponse.json({ error: 'Dữ liệu style không hợp lệ.' }, { status: 400 });
    }

    const db = await getMongoClientDb();
    await db.collection('promptStyles').updateOne(
      { category },
      { $set: { category, style, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Prompt Styles PUT Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi lưu style.' }, { status: 500 });
  }
}
