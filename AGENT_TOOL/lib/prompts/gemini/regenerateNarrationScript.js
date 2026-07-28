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
  return callGeminiApi(promptText, keys);
}
