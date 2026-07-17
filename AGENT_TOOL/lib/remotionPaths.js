import fs from 'fs';
import path from 'path';

// Xác định thư mục chứa project Remotion (RENDER/skills/narrated-slideshow-video/remotion)
// mà không phụ thuộc vào việc ATPOSTER được đặt ở đâu trên máy.
// Thứ tự ưu tiên:
//   1. Biến môi trường REMOTION_SKILL_DIR (override thủ công khi cần, vd deploy máy khác)
//   2. Thư mục RENDER nằm cạnh AGENT_TOOL (cấu trúc mặc định của ATPOSTER)
//   3. Đường dẫn cũ trên Windows D:\agent (giữ lại để tương thích máy cũ)
//   4. Bản sao dự phòng đóng gói sẵn trong chính AGENT_TOOL/public/slideshow
function resolveRemotionDir() {
  const candidates = [
    process.env.REMOTION_SKILL_DIR,
    path.resolve(process.cwd(), '..', 'RENDER', 'skills', 'narrated-slideshow-video', 'remotion'),
    'D:\\agent\\skills\\narrated-slideshow-video\\remotion',
    path.join(process.cwd(), 'public', 'slideshow'),
  ].filter(Boolean);

  return candidates.find((dir) => fs.existsSync(dir)) || candidates[candidates.length - 1];
}

export function getRemotionDir() {
  return resolveRemotionDir();
}

export function getRemotionPublicDir() {
  return path.join(getRemotionDir(), 'public');
}
