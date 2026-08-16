import { buildRegenerateNarrationPrompt } from './templates/regenerateNarration.js';
import { callGeminiApi } from './callGeminiApi.js';

/**
 * Gọi Gemini để viết lại RIÊNG phần lời kể (dialogueOrNarration/subtitle) của các segment đã
 * có sẵn ảnh, giữ nguyên visualDescription/thứ tự — xem templates/regenerateNarration.js.
 */
export async function regenerateNarrationScript({ category, input, segments, apiKey }) {
  const keys = (Array.isArray(apiKey) ? apiKey : [apiKey]).filter(Boolean);
  if (keys.length === 0) {
    throw new Error('Chưa cấu hình Gemini API Key. Vui lòng cấu hình ở bảng cài đặt phía trên.');
  }
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error('Không có phân cảnh nào để viết lại lời kể.');
  }

  const promptText = buildRegenerateNarrationPrompt(category, input || {}, segments);
  // Cùng hạng nặng với khâu viết kịch bản (sinh lại lời kể cho TOÀN BỘ slide) nên dùng chung mức
  // hạn giờ rộng — xem lý do ở SCRIPT_REQUEST_TIMEOUT_MS trong generateSegmentedScript.js. Để 90s
  // như cũ thì lượt gọi bị CHÍNH MÌNH bỏ ngang trước khi Gemini kịp trả lời.
  return callGeminiApi(promptText, keys, { tier: 'quality', timeoutMs: 210_000, deadlineMs: 480_000, label: 'Viết lại lời kể' });
}
