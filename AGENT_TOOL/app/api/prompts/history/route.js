import { NextResponse } from 'next/server';
import { getMongoClientDb } from '@/lib/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const db = await getMongoClientDb();
    const query = category && category !== 'all' ? { category } : {};
    const items = await db.collection('promptHistory').find(query).sort({ createdAt: -1 }).limit(100).toArray();
    const clean = items.map(({ _id, ...rest }) => rest);
    return NextResponse.json({ success: true, items: clean });
  } catch (error) {
    console.error('[API Prompt History GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tải lịch sử.' }, { status: 500 });
  }
}

// Lưu lại remotionConfig (nhạc nền, font, bố cục %, ...) đã tuỳ chỉnh qua nút "Lưu & Áp dụng"
// vào ĐÚNG bản ghi lịch sử của kịch bản này — trước đây chỉ cập nhật state React (onResult) nên
// mất ngay khi rời trang/quay lại từ "Lịch sử đã tạo", vì trang luôn load lại remotionConfig gốc
// lúc mới tạo kịch bản (ghi 1 lần duy nhất ở /api/prompts/generate). Cùng cách cập nhật-tại-chỗ
// mà translate-subtitles/route.js đã dùng cho segments/subtitle.
export async function PATCH(request) {
  try {
    const { id, remotionConfig } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Thiếu id.' }, { status: 400 });
    }
    if (!remotionConfig || typeof remotionConfig !== 'object') {
      return NextResponse.json({ error: 'Thiếu remotionConfig.' }, { status: 400 });
    }

    const db = await getMongoClientDb();
    const result = await db.collection('promptHistory').updateOne({ id }, { $set: { remotionConfig } });
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Không tìm thấy kịch bản trong lịch sử.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Prompt History PATCH Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi lưu cấu hình render.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids');
    const db = await getMongoClientDb();
    
    if (ids) {
      const idList = ids.split(',').filter(Boolean);
      await db.collection('promptHistory').deleteMany({ id: { $in: idList } });
    } else if (id) {
      await db.collection('promptHistory').deleteOne({ id });
    } else {
      return NextResponse.json({ error: 'Thiếu id hoặc danh sách ids.' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Prompt History DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xóa lịch sử.' }, { status: 500 });
  }
}
