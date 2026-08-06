import { NextResponse } from 'next/server';
import { recommendScheduleSlot } from '@/lib/scheduler.js';

export async function POST(request) {
  try {
    const { accountId } = await request.json();
    if (!accountId) {
      return NextResponse.json({ error: 'Thiếu tài khoản để tính lịch đăng.' }, { status: 400 });
    }

    const result = await recommendScheduleSlot(accountId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[API Recommend Schedule Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tính toán lịch đăng.' }, { status: 500 });
  }
}
