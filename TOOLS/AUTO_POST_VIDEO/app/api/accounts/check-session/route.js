import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db.js';
import { checkYoutubeSession } from '@/lib/poster.js';

export async function POST(request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID tài khoản.' }, { status: 400 });
    }

    const db = await readDb();
    const accountIndex = db.accounts.findIndex(a => a.id === id);
    if (accountIndex === -1) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản.' }, { status: 404 });
    }

    // Thực hiện kiểm tra session
    const result = await checkYoutubeSession(id);
    
    // Cập nhật trạng thái trong database
    db.accounts[accountIndex].status = result.status;
    if (result.reason) {
      db.accounts[accountIndex].sessionError = result.reason;
    } else {
      delete db.accounts[accountIndex].sessionError;
    }
    
    await writeDb(db);

    return NextResponse.json({ 
      success: true, 
      status: result.status, 
      reason: result.reason 
    });
  } catch (error) {
    console.error('[API Check Session Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi kiểm tra session.' }, { status: 500 });
  }
}
