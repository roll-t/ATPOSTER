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
