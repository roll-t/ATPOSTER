import fs from 'fs';
import path from 'path';

// Mỗi "category" (chủ đề video) có thể được render bởi 1 skill Remotion RIÊNG
// (skill của category nào chỉ chứa code của category đó, sửa 1 skill không ảnh
// hưởng tới skill kia) — bản đồ dưới đây ánh xạ category -> tên thư mục skill.
// Category không có trong bản đồ dùng skill mặc định (narrated-slideshow-video).
const DEFAULT_SKILL_FOLDER = 'narrated-slideshow-video';
const CATEGORY_SKILL_FOLDER = {
  reading_practice: 'reading-page-video',
};
const ALL_SKILL_FOLDERS = Array.from(new Set([DEFAULT_SKILL_FOLDER, ...Object.values(CATEGORY_SKILL_FOLDER)]));

function skillFolderForCategory(category) {
  return CATEGORY_SKILL_FOLDER[category] || DEFAULT_SKILL_FOLDER;
}

// Xác định thư mục chứa project Remotion của 1 skill cụ thể, mà không phụ thuộc
// vào việc ATPOSTER được đặt ở đâu trên máy.
// Thứ tự ưu tiên:
//   1. Biến môi trường REMOTION_SKILL_DIR (override thủ công khi cần, vd deploy máy khác —
//      chỉ áp dụng cho skill mặc định, vì đây là biến môi trường cũ dùng trước khi có
//      nhiều skill)
//   2. Thư mục RENDER/skills/<skillFolder> nằm cạnh AGENT_TOOL (cấu trúc mặc định của ATPOSTER)
//   3. Đường dẫn cũ trên Windows D:\agent (giữ lại để tương thích máy cũ, chỉ skill mặc định)
//   4. Bản sao dự phòng đóng gói sẵn trong chính AGENT_TOOL/public/slideshow (chỉ skill mặc định)
function resolveSkillRemotionDir(skillFolder) {
  const isDefaultSkill = skillFolder === DEFAULT_SKILL_FOLDER;
  const candidates = [
    isDefaultSkill ? process.env.REMOTION_SKILL_DIR : undefined,
    path.resolve(process.cwd(), '..', 'RENDER', 'skills', skillFolder, 'remotion'),
    isDefaultSkill ? 'D:\\agent\\skills\\narrated-slideshow-video\\remotion' : undefined,
    isDefaultSkill ? path.join(process.cwd(), 'public', 'slideshow') : undefined,
  ].filter(Boolean);

  return candidates.find((dir) => fs.existsSync(dir)) || candidates[candidates.length - 1];
}

// category: tuỳ chọn — tên category (vd 'reading_practice'). Bỏ trống -> skill mặc định
// (narrated-slideshow-video), giữ đúng hành vi cũ cho code gọi getRemotionDir() không tham số.
export function getRemotionDir(category) {
  return resolveSkillRemotionDir(skillFolderForCategory(category));
}

export function getRemotionPublicDir(category) {
  return path.join(getRemotionDir(category), 'public');
}

// Trả về danh sách [{ category-ish key, publicDir }] cho MỌI skill đang có — dùng cho các
// route cần quét/liệt kê project trên TẤT CẢ skill (vd created-videos), vì mỗi project giờ
// có thể nằm ở public/ của skill khác nhau tuỳ category đã tạo ra nó.
export function getAllSkillPublicDirs() {
  return ALL_SKILL_FOLDERS.map((folder) => ({
    skillFolder: folder,
    publicDir: path.join(resolveSkillRemotionDir(folder), 'public'),
  }));
}

// Tìm thư mục project (public/<folderPath>) đang thực sự tồn tại trên đĩa, thử lần lượt qua
// mọi skill đã biết — dùng cho các route CHỈ ĐỌC (check-assets, open-folder, stream ảnh/video,
// dịch phụ đề...) vốn không cần biết trước category vì project chắc chắn đã được tạo ra rồi.
// Nếu chưa tồn tại ở đâu cả (lần ghi đầu tiên cho 1 project hoàn toàn mới), dùng categoryHint
// (nếu có) để xác định đúng skill sẽ chứa nó, mặc định về skill mặc định nếu không có hint.
export function resolveProjectDir(folderPath, categoryHint) {
  for (const folder of ALL_SKILL_FOLDERS) {
    const candidate = path.join(resolveSkillRemotionDir(folder), 'public', folderPath);
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(getRemotionPublicDir(categoryHint), folderPath);
}
