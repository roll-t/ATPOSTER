// ==========================================================================
// Cấu hình & thuật toán tạo prompt Veo3/ảnh cho các dòng nội dung học tiếng Anh của kênh.
// Mỗi chủ đề trong categories.js có type: 'video' hoặc 'image'. Xem từng file con để biết
// chi tiết: categories.js (định nghĩa các chủ đề + style mặc định), characters.js (dàn
// nhân vật người que cố định), buildPrompt.js (luồng thủ công tạo prompt VIDEO),
// buildImagePrompt.js (luồng tạo prompt ẢNH), buildSegmentedPrompts.js (luồng phân đoạn
// video dùng chung với Gemini, xem lib/prompts/gemini/).
// ==========================================================================
export { STICK_FIGURE_CHARACTERS } from './characters.js';
export { PROMPT_CATEGORIES } from './categories.js';
export { IMAGE_STYLES } from './imageStyles.js';
export { getStickFigureCastOverrides } from './castOverrides.js';
export { buildPrompt } from './buildPrompt.js';
export { buildImagePrompt } from './buildImagePrompt.js';
export { buildSegmentedPrompts } from './buildSegmentedPrompts.js';
export { LAYOUT_TYPES } from './layouts.js';
