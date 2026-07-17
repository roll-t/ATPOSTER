import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db.js';
import { loginYoutubeAccount } from '@/lib/poster.js';

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

    const account = db.accounts[accountIndex];

    // Thiết lập trạng thái chạy ngầm vào biến global để Client có thể poll
    global.loginStatuses = global.loginStatuses || {};
    global.loginStatuses[id] = { status: 'running', error: null };

    // Chạy ngầm tiến trình đăng nhập lại
    loginYoutubeAccount(id, account.email, account.password)
      .then(async (result) => {
        const currentDb = await readDb();
        const currentAccIndex = currentDb.accounts.findIndex(a => a.id === id);
        if (currentAccIndex !== -1) {
          currentDb.accounts[currentAccIndex].status = 'active';
          if (result.channelUrl) {
            currentDb.accounts[currentAccIndex].channelUrl = result.channelUrl;
          }
          if (result.username && result.username !== 'youtube_channel') {
            currentDb.accounts[currentAccIndex].username = result.username;
          }
          delete currentDb.accounts[currentAccIndex].sessionError;
          await writeDb(currentDb);
        }
        global.loginStatuses[id] = { status: 'success' };
        console.log(`[API Relogin] Đăng nhập lại kênh thành công: ${id}`);
      })
      .catch((error) => {
        global.loginStatuses[id] = { 
          status: 'failed', 
          error: error.message || 'Lỗi không xác định khi đăng nhập lại.' 
        };
        console.error(`[API Relogin Error] Đăng nhập lại kênh thất bại ${id}:`, error);
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Relogin Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi đăng nhập lại.' }, { status: 500 });
  }
}
