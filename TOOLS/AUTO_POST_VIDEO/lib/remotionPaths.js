import fs from 'fs';
import path from 'path';

// Mỗi "category" (chủ đề video) có thể được render bởi 1 skill Remotion RIÊNG
// (skill của category nào chỉ chứa code của category đó, sửa 1 skill không ảnh
// hưởng tới skill kia) — bản đồ dưới đây ánh xạ category -> tên thư mục skill.
// Category không có trong bản đồ dùng skill mặc định (narrated-slideshow-video).
const DEFAULT_SKILL_FOLDER = 'moral_talk_slideshow';
const CATEGORY_SKILL_FOLDER = {
  reading_practice: 'reading-page-video',
  // stick_figure_slideshow TỪNG dùng chung DEFAULT_SKILL_FOLDER với moral_talk_slideshow, nên
  // mọi chỉnh sửa src/ (Caption.tsx, SceneLayouts.tsx...) cho skill này đều đổi luôn format
  // video của skill kia. Đã tách thành skill RIÊNG để hai bên không phá logic của nhau nữa.
  stick_figure_slideshow: 'stick-figure-slideshow-video',
  // Pexels Talk Video — video tâm sự đạo lý với nền video Pexels, glass text overlay, waveform.
  // Dùng pipeline Gemini + TTS chuẩn, render-project.mjs riêng đọc backgroundVideo từ manifest.
  pexels_talk_video: 'pexels-talk-video',
};
export const ALL_SKILL_FOLDERS = Array.from(new Set([DEFAULT_SKILL_FOLDER, ...Object.values(CATEGORY_SKILL_FOLDER)]));

function skillFolderForCategory(category) {
  return CATEGORY_SKILL_FOLDER[category] || DEFAULT_SKILL_FOLDER;
}

// TRƯỚC ĐÂY: mọi category dùng chung DEFAULT_SKILL_FOLDER (stick_figure_slideshow VÀ
// moral_talk_slideshow) đều lưu project của mình PHẲNG ngay dưới public/ của skill đó —
// project của 2 category khác nhau nằm LẪN làm anh em cùng cấp, không phân biệt được bằng
// mắt thường trong Explorer (chỉ phân biệt được qua field category trong DB). category nào
// có skill RIÊNG (reading_practice, và nay cả stick_figure_slideshow) thì không cần xử lý gì
// thêm — public/ của skill đó vốn đã chỉ chứa đúng 1 category.
//
// SAU KHI TÁCH stick_figure_slideshow RA SKILL RIÊNG: category duy nhất còn dùng
// DEFAULT_SKILL_FOLDER là moral_talk_slideshow. Nhánh lồng theo category bên dưới vì thế hiện
// chỉ còn phục vụ đúng category đó, nhưng GIỮ NGUYÊN (không rút gọn thành phẳng) vì project
// moral_talk_slideshow đã tạo từ trước đang nằm ở public/moral_talk_slideshow/<folderPath>/ —
// đổi quy ước bây giờ là mọi project cũ mất đường tìm.
//
// GIẢI PHÁP: với category dùng chung DEFAULT_SKILL_FOLDER, project MỚI được lồng thêm 1 cấp
// thư mục theo tên category: public/<category>/<folderPath>/ thay vì public/<folderPath>/.
// Project CŨ (tạo trước khi có thay đổi này) vẫn nằm nguyên ở vị trí phẳng cũ — resolveProjectDir
// bên dưới tìm CẢ 2 vị trí (ưu tiên vị trí mới trước) nên project cũ vẫn mở/render bình thường,
// không cần di chuyển thủ công.
function needsCategorySubfolder(category) {
  return false;
}

// Đoạn thư mục (có thể là "category/folderPath" hoặc chỉ "folderPath") dùng làm ĐỊNH DANH
// project ở MỌI nơi cần 1 chuỗi path: tham số dòng lệnh truyền cho render-project.mjs, và
// các chuỗi đường dẫn tương đối ghi vào remotionConfig (scenes[].image/.audio, bgMusic) mà
// Remotion sẽ tự resolve so với public/ của chính nó. CHỈ dùng khi TẠO MỚI 1 project — không
// dùng để tìm project đã tồn tại (dùng resolveProjectDir cho việc đó, vì project cũ có thể
// đang ở vị trí phẳng cũ).
export function getEffectiveFolderPath(folderPath, category) {
  return needsCategorySubfolder(category) ? `${category}/${folderPath}` : folderPath;
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
export function resolveSkillRemotionDir(skillFolder) {
  const isDefaultSkill = skillFolder === DEFAULT_SKILL_FOLDER;
  const candidates = [
    isDefaultSkill ? process.env.REMOTION_SKILL_DIR : undefined,
    path.resolve(process.cwd(), '..', 'AUTO_RENDER_VIDEO', 'skills', skillFolder, 'remotion'),
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
//
// QUAN TRỌNG: khi có categoryHint, LUÔN thử đúng skill của category đó TRƯỚC — không dò theo
// thứ tự cố định của ALL_SKILL_FOLDERS. Trước đây luôn dò 'narrated-slideshow-video' trước bất
// kể categoryHint là gì; nếu một project KHÁC (không liên quan) từng tồn tại ở đó với CÙNG TÊN
// folderPath (trùng tên là có thật — reading_practice và stick_figure_slideshow tự sinh tên
// thư mục theo cùng 1 quy tắc slug+giờ:phút:giây), route render-video sẽ nhận nhầm đó là
// "nguồn" và cpSync đè nội dung KHÔNG LIÊN QUAN đó lên đúng project đang render, trông như dữ
// liệu bị mất/lẫn giữa 2 skill. Ưu tiên skill đúng category trước loại bỏ hẳn nguy cơ này cho
// trường hợp bình thường (project vốn đã nằm đúng skill của nó).
export function resolveProjectDir(folderPath, categoryHint) {
  const preferredFolder = categoryHint ? skillFolderForCategory(categoryHint) : null;
  const searchOrder = preferredFolder
    ? [preferredFolder, ...ALL_SKILL_FOLDERS.filter((f) => f !== preferredFolder)]
    : ALL_SKILL_FOLDERS;

  for (const folder of searchOrder) {
    const skillPublicDir = path.join(resolveSkillRemotionDir(folder), 'public');
    // Vị trí MỚI (lồng theo category) chỉ có thể đúng ở đúng skill của categoryHint — thử
    // trước vị trí PHẲNG cũ, vì project tạo SAU thay đổi này luôn nằm ở đây.
    if (categoryHint && folder === preferredFolder) {
      const nestedCandidate = path.join(skillPublicDir, categoryHint, folderPath);
      if (fs.existsSync(nestedCandidate)) return nestedCandidate;
    }
    // Vị trí PHẲNG cũ — vẫn thử ở MỌI skill như trước đây, để project tạo TRƯỚC thay đổi
    // này (chưa từng lồng theo category) tiếp tục mở/render được bình thường.
    const flatCandidate = path.join(skillPublicDir, folderPath);
    if (fs.existsSync(flatCandidate)) return flatCandidate;
  }

  // KHÔNG có categoryHint (bên gọi quên truyền, hoặc truyền chuỗi rỗng) và cũng chưa thấy ở vị
  // trí phẳng nào. TRƯỚC ĐÂY rơi thẳng xuống return bên dưới -> vì needsCategorySubfolder('')
  // là false nên nó TẠO MỚI 1 thư mục ở vị trí PHẲNG, dù project đó đã tồn tại sẵn ở vị trí
  // LỒNG do một bước trước đó (có category đầy đủ) tạo ra. Hậu quả: 1 project nằm ở 2 nơi —
  // audio/ ghi vào bản lồng còn images/ ghi vào bản phẳng, render ra thiếu ảnh hoặc thiếu tiếng.
  // Ở đây dò thêm MỌI thư mục con của public/ để tìm <category>/<folderPath> đang thực sự tồn
  // tại, nhờ vậy vẫn về đúng project cũ mà không cần biết trước category.
  if (!categoryHint) {
    for (const folder of searchOrder) {
      const skillPublicDir = path.join(resolveSkillRemotionDir(folder), 'public');
      if (!fs.existsSync(skillPublicDir)) continue;
      for (const entry of fs.readdirSync(skillPublicDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const nestedCandidate = path.join(skillPublicDir, entry.name, folderPath);
        if (fs.existsSync(nestedCandidate)) return nestedCandidate;
      }
    }
  }

  // Chưa tồn tại ở đâu cả — đây là lần ghi ĐẦU TIÊN cho 1 project HOÀN TOÀN MỚI, tạo thẳng ở
  // vị trí mới (lồng theo category nếu category đó cần) thay vì vị trí phẳng cũ.
  return path.join(getRemotionPublicDir(categoryHint), getEffectiveFolderPath(folderPath, categoryHint));
}
