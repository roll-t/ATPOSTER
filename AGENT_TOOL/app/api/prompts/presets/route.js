import { NextResponse } from 'next/server';
import { getMongoClientDb } from '@/lib/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'general';

    const db = await getMongoClientDb();
    const presets = await db.collection('customPresets')
      .find({ $or: [{ category }, { category: 'all' }] })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ success: true, presets });
  } catch (error) {
    console.error('[API Custom Presets GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi lấy danh sách Preset.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, category = 'reading_practice', config } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập tên cho Mẫu Preset.' }, { status: 400 });
    }

    if (!config || typeof config !== 'object') {
      return NextResponse.json({ error: 'Cấu hình không hợp lệ.' }, { status: 400 });
    }

    const db = await getMongoClientDb();
    const presetRecord = {
      id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name.trim(),
      category,
      config,
      createdAt: new Date().toISOString()
    };

    await db.collection('customPresets').insertOne(presetRecord);

    return NextResponse.json({ success: true, preset: presetRecord });
  } catch (error) {
    console.error('[API Custom Presets POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi lưu Preset.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID Preset.' }, { status: 400 });
    }

    const db = await getMongoClientDb();
    await db.collection('customPresets').deleteOne({ id });

    return NextResponse.json({ success: true, message: 'Đã xóa Preset thành công.' });
  } catch (error) {
    console.error('[API Custom Presets DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi xóa Preset.' }, { status: 500 });
  }
}
