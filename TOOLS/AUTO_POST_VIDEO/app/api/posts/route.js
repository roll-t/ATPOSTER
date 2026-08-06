import { NextResponse } from 'next/server';
import { readDb, writeDb, getUploadsDir } from '@/lib/db.js';
import { runUploadInBackground, cancelUpload } from '@/lib/poster.js';
import fs from 'fs';
import path from 'path';

// Thời gian tối đa hợp lý cho một lần đăng bài (đăng nhập lại + tải video + chờ xuất bản).
// Bài nào ở trạng thái "processing" lâu hơn mốc này coi như bị kẹt (máy chủ khởi động lại
// giữa chừng hoặc tiến trình bị treo) và sẽ được tự động đánh dấu thất bại để không bị kẹt vĩnh viễn.
const STALE_PROCESSING_MS = 20 * 60 * 1000;

export async function GET() {
  const db = await readDb();
  const now = new Date();

  // Tự động phục hồi các bài bị kẹt ở trạng thái "processing" quá lâu
  let hasStaleRecovery = false;
  for (const p of db.posts) {
    if (p.status !== 'processing') continue;
    const startedAt = p.processingStartedAt ? new Date(p.processingStartedAt) : null;
    if (!startedAt || (now - startedAt) > STALE_PROCESSING_MS) {
      console.log(`[Queue Scheduler] Bài đăng ${p.id} bị kẹt ở trạng thái xử lý quá lâu, tự động đánh dấu thất bại.`);
      await cancelUpload(p.id).catch(() => {});
      p.status = 'failed';
      p.error = 'Tiến trình đăng bài bị gián đoạn quá lâu (có thể do máy chủ khởi động lại hoặc bị treo). Vui lòng thử đăng lại.';
      hasStaleRecovery = true;
    }
  }
  if (hasStaleRecovery) {
    await writeDb(db);
  }

  // Trình tự kiểm tra tự động chạy ngầm các bài đăng đến giờ
  const readyPost = db.posts.find(p => p.status === 'pending' && new Date(p.scheduledAt) <= now);

  if (readyPost) {
    console.log(`[Queue Scheduler] Phát hiện bài đăng ${readyPost.id} đến giờ đăng. Kích hoạt chạy ngầm...`);
    // Chuyển trạng thái sang processing luôn để tránh bị gọi trùng lặp
    readyPost.status = 'processing';
    await writeDb(db);

    // Gọi tác vụ upload ngầm không chặn luồng chính
    runUploadInBackground(readyPost.id).catch(err => {
      console.error('[Queue Scheduler Error] Lỗi khi đăng bài ngầm:', err);
    });
  }

  // Sắp xếp bài đăng mới nhất lên đầu
  const sortedPosts = [...db.posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return NextResponse.json({ posts: sortedPosts, syncStatus: global.syncStatus || null });
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video');
    const existingFilename = formData.get('videoFilename');
    const thumbnailFile = formData.get('thumbnail');
    const caption = formData.get('caption') || '';
    const accountId = formData.get('accountId');
    const scheduledAt = formData.get('scheduledAt');
    const videoType = formData.get('videoType') || 'shorts'; // 'shorts' hoặc 'video'
    const upscale2k = formData.get('upscale2k') === 'true';
    const upscaleResolution = formData.get('upscaleResolution') || '1440:2560';

    if (!videoFile && !existingFilename) {
      return NextResponse.json({ error: 'Thiếu file video hoặc tài khoản đăng.' }, { status: 400 });
    }
    if (!accountId) {
      return NextResponse.json({ error: 'Thiếu tài khoản đăng.' }, { status: 400 });
    }

    const db = await readDb();
    const account = db.accounts.find(a => a.id === accountId);
    if (!account) {
      return NextResponse.json({ error: 'Tài khoản chọn không hợp lệ.' }, { status: 400 });
    }

    let videoFilename = existingFilename;

    if (videoFile) {
      // Đọc buffer của video và lưu vào data/uploads nếu người dùng tải tệp trực tiếp lên
      const bytes = await videoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = path.extname(videoFile.name) || '.mp4';
      videoFilename = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}${ext}`;
      const videoFilePath = path.join(getUploadsDir(), videoFilename);

      fs.writeFileSync(videoFilePath, buffer);
      console.log(`[API Posts] Đã lưu video thành công tại: ${videoFilePath}`);
    } else {
      console.log(`[API Posts] Sử dụng video đã lưu trên máy chủ: ${videoFilename}`);
    }

    // Lưu thumbnail nếu có (lưu vào thư mục thumbnails/[category]/)
    let thumbnailFilename = formData.get('thumbnailFilename') || null;
    const postCategory = formData.get('category') || 'Chưa phân loại';
    const safeCategory = postCategory.replace(/[\/\\:\*\?"<>\|]/g, '_').trim();

    if (thumbnailFile && thumbnailFile.size > 0) {
      const thumbBytes = await thumbnailFile.arrayBuffer();
      const thumbBuffer = Buffer.from(thumbBytes);
      const thumbExt = path.extname(thumbnailFile.name) || '.jpg';
      
      const thumbFolder = path.join(getUploadsDir(), 'thumbnails', safeCategory);
      if (!fs.existsSync(thumbFolder)) {
        fs.mkdirSync(thumbFolder, { recursive: true });
      }

      const thumbFile = `thumb_${Date.now()}_${Math.random().toString(36).substr(2, 5)}${thumbExt}`;
      thumbnailFilename = `thumbnails/${safeCategory}/${thumbFile}`;
      const thumbFilePath = path.join(getUploadsDir(), thumbnailFilename);
      
      fs.writeFileSync(thumbFilePath, thumbBuffer);
      console.log(`[API Posts] Đã lưu thumbnail tại: ${thumbFilePath}`);
    }

    const postId = `post_${Date.now()}`;
    const newPost = {
      id: postId,
      accountId: accountId,
      accountLabel: account.label,
      accountUsername: account.username,
      platform: account.platform || 'youtube',
      videoType: videoType, // 'shorts' hoặc 'video'
      videoFilename: videoFilename,
      thumbnailFilename: thumbnailFilename,
      caption: caption,
      status: 'pending', // pending, processing, success, failed
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
      postedAt: null,
      error: null,
      upscale2k: upscale2k,
      upscaleResolution: upscaleResolution,
      createdAt: new Date().toISOString()
    };

    db.posts.push(newPost);
    await writeDb(db);

    // Nếu thời gian đăng là ngay bây giờ hoặc đã qua, chạy upload luôn
    const isImmediate = new Date(newPost.scheduledAt) <= new Date();
    if (isImmediate) {
      console.log(`[API Posts] Đăng ngay lập tức cho bài viết ${postId}. Chạy ngầm...`);
      newPost.status = 'processing';
      await writeDb(db);

      runUploadInBackground(postId).catch(err => {
        console.error('[API Posts Immediate Error] Lỗi đăng bài ngay:', err);
      });
    }

    return NextResponse.json({ success: true, post: newPost });
  } catch (error) {
    console.error('[API Posts POST Error] Lỗi đăng bài:', error);
    return NextResponse.json({ error: error.message || 'Lỗi không xác định.' }, { status: 500 });
  }
}
