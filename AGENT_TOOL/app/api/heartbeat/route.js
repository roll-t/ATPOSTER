import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db.js';

global.lastHeartbeat = Date.now();

// Khởi động vòng lặp giám sát trạng thái hoạt động của Client
if (!global.heartbeatMonitorStarted) {
  global.heartbeatMonitorStarted = true;
  console.log('[Auto-Shutdown] Đã khởi chạy tiến trình giám sát trạng thái App...');

  setInterval(async () => {
    const idleTime = Date.now() - (global.lastHeartbeat || 0);

    // Nếu quá 30 phút không nhận được tín hiệu giữ kết nối từ bất kỳ tab nào (tránh bị tắt khi tab bị sleep)
    if (idleTime > 1800000) {
      try {
        // Đọc database kiểm tra xem có tác vụ đăng bài nào đang chạy ngầm không
        const db = await readDb();
        const hasActiveUploads = db.posts && db.posts.some(p => p.status === 'processing');
        if (hasActiveUploads) {
          console.log('[Auto-Shutdown] Phát hiện tác vụ đăng video đang chạy ngầm. Hoãn tắt server.');
          // Đặt lại heartbeat để tránh kiểm tra dồn dập
          global.lastHeartbeat = Date.now();
          return;
        }

        // Kiểm tra xem có đang đồng bộ số liệu các kênh ngầm không
        if (global.channelSyncStatus && global.channelSyncStatus.active) {
          console.log('[Auto-Shutdown] Phát hiện tác vụ đồng bộ số liệu kênh đang chạy ngầm. Hoãn tắt server.');
          global.lastHeartbeat = Date.now();
          return;
        }
      } catch (err) {
        // Bỏ qua lỗi đọc DB
      }

      console.log(`[Auto-Shutdown] Không có tương tác Client trong ${Math.round(idleTime / 1000)} giây. Đang tắt máy chủ ngầm...`);
      process.exit(0);
    }
  }, 4000);
}

export async function POST() {
  global.lastHeartbeat = Date.now();
  return NextResponse.json({ success: true });
}
