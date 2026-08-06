import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db.js';
import { cancelUpload } from '@/lib/poster.js';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const db = await readDb();
    const post = db.posts.find(p => p.id === id);

    if (!post) {
      return NextResponse.json({ error: 'Không tìm thấy bài viết.' }, { status: 404 });
    }
    if (post.status !== 'processing') {
      return NextResponse.json({ error: 'Chỉ có thể hủy bài đang trong trạng thái xử lý.' }, { status: 400 });
    }

    // Đánh dấu trước để tiến trình chạy ngầm (nếu có) không ghi đè bằng lỗi kỹ thuật thô
    global.cancelledPostIds = global.cancelledPostIds || new Set();
    global.cancelledPostIds.add(id);

    // Thử đóng trình duyệt đang chạy thực tế cho bài viết này (nếu có)
    const hadActiveHandle = await cancelUpload(id);

    post.status = 'failed';
    post.error = 'Đã hủy thủ công bởi người dùng.';
    await writeDb(db);

    // Không có tiến trình ngầm nào đang thực sự chạy (ví dụ do máy chủ đã khởi động lại) -> không cần chờ dọn cờ
    if (!hadActiveHandle) {
      global.cancelledPostIds.delete(id);
    }

    return NextResponse.json({ success: true, message: 'Đã hủy bài đăng.' });
  } catch (error) {
    console.error('[API Posts Cancel Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi không xác định.' }, { status: 500 });
  }
}
