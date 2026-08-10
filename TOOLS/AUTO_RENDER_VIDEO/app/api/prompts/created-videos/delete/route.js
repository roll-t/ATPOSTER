import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveProjectDir, getAllSkillPublicDirs } from '@/lib/remotionPaths';

const SAFE_FOLDER_NAME = /^[A-Za-z0-9_-]+$/;

/**
 * Xoá video đã render, hoặc xoá trọn dự án.
 *
 *  - mode 'video'   : chỉ xoá final/video.mp4. Kịch bản, ảnh, giọng đọc còn nguyên nên render lại
 *                     được ngay mà không phải sinh lại từ đầu (tốn Gemini + ảnh + TTS).
 *  - mode 'project' : xoá cả thư mục dự án. Lấy lại đủ dung lượng đĩa, nhưng mất hẳn.
 */

/**
 * Chốt chặn cuối trước khi xoá: thư mục đích BẮT BUỘC phải nằm trong public/ của một skill đã biết.
 *
 * resolveProjectDir() ghép đường dẫn từ chuỗi người dùng gửi lên. SAFE_FOLDER_NAME đã chặn "..",
 * nhưng một lệnh xoá đệ quy thì không được phép chỉ dựa vào một lớp kiểm tra duy nhất — chỉ cần
 * một chỗ nào đó sau này nới lỏng regex là thành xoá nhầm ra ngoài. So khớp đường dẫn ĐÃ CHUẨN HOÁ
 * nên mọi mẹo symlink/'..'/hoa-thường trên Windows đều bị loại.
 */
function isInsideSkillPublicDir(targetDir) {
  const resolved = path.resolve(targetDir);
  return getAllSkillPublicDirs().some(({ publicDir }) => {
    const base = path.resolve(publicDir);
    const rel = path.relative(base, resolved);
    // rel rỗng = chính thư mục public (không được xoá), rel bắt đầu bằng '..' = nằm ngoài.
    return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
  });
}

export async function POST(req) {
  try {
    const { folderPath, category, mode = 'video' } = await req.json();

    if (!folderPath) {
      return NextResponse.json({ error: 'Thiếu folderPath.' }, { status: 400 });
    }
    if (mode !== 'video' && mode !== 'project') {
      return NextResponse.json({ error: 'mode phải là "video" hoặc "project".' }, { status: 400 });
    }

    const cleanFolder = folderPath.trim();
    if (!SAFE_FOLDER_NAME.test(cleanFolder)) {
      return NextResponse.json({ error: 'Tên thư mục không hợp lệ. Chỉ được dùng chữ, số, "_" và "-".' }, { status: 400 });
    }

    const projectDir = resolveProjectDir(cleanFolder, category);
    if (!projectDir || !fs.existsSync(projectDir)) {
      return NextResponse.json({ error: `Không tìm thấy dự án: ${cleanFolder}` }, { status: 404 });
    }
    if (!isInsideSkillPublicDir(projectDir)) {
      console.error(`[API DeleteVideo] TỪ CHỐI xoá đường dẫn nằm ngoài vùng cho phép: ${projectDir}`);
      return NextResponse.json({ error: 'Đường dẫn dự án nằm ngoài thư mục cho phép — đã từ chối xoá.' }, { status: 400 });
    }

    if (mode === 'project') {
      fs.rmSync(projectDir, { recursive: true, force: true });
      console.log(`[API DeleteVideo] Đã xoá trọn dự án: ${projectDir}`);

      // Dọn nốt thư mục nhóm theo category nếu nó vừa trở nên rỗng (vị trí lồng mới) — để lại một
      // thư mục rỗng thì lần quét sau vẫn phải mở ra rồi mới biết là không có gì.
      const parentDir = path.dirname(projectDir);
      try {
        if (isInsideSkillPublicDir(parentDir) && fs.readdirSync(parentDir).length === 0) {
          fs.rmdirSync(parentDir);
        }
      } catch (_) { /* dọn dẹp phụ, hỏng cũng không sao */ }

      return NextResponse.json({ success: true, mode, message: 'Đã xoá dự án và toàn bộ tài nguyên.' });
    }

    const videoPath = path.join(projectDir, 'final', 'video.mp4');
    if (!fs.existsSync(videoPath)) {
      // Không coi là lỗi: tệp đã biến mất từ trước (xoá tay, hoặc bấm 2 lần) — kết quả mong muốn
      // vẫn đạt được, giao diện chỉ cần làm mới danh sách.
      return NextResponse.json({ success: true, mode, alreadyGone: true, message: 'Tệp video không còn tồn tại.' });
    }

    fs.rmSync(videoPath, { force: true });
    console.log(`[API DeleteVideo] Đã xoá tệp video: ${videoPath}`);
    return NextResponse.json({ success: true, mode, message: 'Đã xoá video. Kịch bản và tài nguyên vẫn còn để render lại.' });
  } catch (err) {
    console.error('[API DeleteVideo Exception]:', err);
    return NextResponse.json({ error: err.message || 'Lỗi không xác định khi xoá.' }, { status: 500 });
  }
}
