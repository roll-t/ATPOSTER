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

// Đánh dấu 1 preset làm "mặc định" cho category của nó — lần sau mở màn cấu hình render
// của MỘT KỊCH BẢN MỚI (chưa từng tuỳ chỉnh gì) sẽ tự áp dụng preset này thay vì các thông số
// mặc định cứng của app. Chỉ 1 preset được là mặc định tại 1 thời điểm mỗi category, nên khi
// bật mặc định cho preset này thì mọi preset khác cùng category tự động bị bỏ mặc định.
export async function PATCH(request) {
  try {
    const { id, isDefault } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID Preset.' }, { status: 400 });
    }

    const db = await getMongoClientDb();
    const collection = db.collection('customPresets');
    const preset = await collection.findOne({ id });
    if (!preset) {
      return NextResponse.json({ error: 'Không tìm thấy Preset.' }, { status: 404 });
    }

    if (isDefault) {
      const siblings = await collection.find({ category: preset.category, isDefault: true }).toArray();
      for (const sibling of siblings) {
        if (sibling.id !== id) {
          await collection.updateOne({ id: sibling.id }, { $set: { isDefault: false } });
        }
      }
    }
    await collection.updateOne({ id }, { $set: { isDefault: !!isDefault } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Custom Presets PATCH Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi cập nhật Preset.' }, { status: 500 });
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
