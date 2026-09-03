import { getDurationInfo } from './durationInfo.js';
import { getSkill } from '../../skills/index.js';
import { buildEnglishQuizScriptPrompt } from './templates/englishQuiz.js';
import { callGeminiApi } from './callGeminiApi.js';

/**
 * Hạn giờ riêng cho khâu VIẾT KỊCH BẢN — rộng hơn hẳn mặc định của engine (45s/90s) vì đây là lượt
 * gọi nặng nhất: prompt dài, trần token lớn, và model còn tốn thời gian "suy nghĩ" trước khi viết.
 *
 * Đặt timeout mỗi lượt (210s) LỚN HƠN thời gian quan sát được để còn biên cho lúc mạng chậm, và
 * hạn chót tổng (480s) đủ cho 2 lượt thử thật sự thay vì 15 lượt bị cắt ngang vô ích.
 */
const SCRIPT_REQUEST_TIMEOUT_MS = 210_000;
const SCRIPT_DEADLINE_MS = 480_000;

/**
 * Trần token đầu ra theo thời lượng mục tiêu.
 */
function resolveMaxOutputTokens(targetSeconds) {
  return Math.min(65536, Math.max(16384, Math.round(targetSeconds * 48)));
}

export async function generateSegmentedScript({ category, durationRange, input, apiKey }) {
  const keys = (Array.isArray(apiKey) ? apiKey : [apiKey]).filter(Boolean);
  if (keys.length === 0) {
    throw new Error('Chưa cấu hình Gemini API Key. Vui lòng cấu hình ở bảng cài đặt phía trên.');
  }

  const durationInfo = getDurationInfo(durationRange);
  const skill = getSkill(category);
  const promptText = skill?.buildGeminiPrompt(input, durationInfo, durationRange)
    ?? buildEnglishQuizScriptPrompt(input, durationInfo);

  const maxOutputTokens = resolveMaxOutputTokens(durationInfo.targetSeconds);

  // Viết kịch bản là khâu sáng tạo quan trọng nhất -> tier "quality" (model thông minh nhất), và
  // nới hạn chót vì prompt dài, model hay cần nhiều thời gian suy nghĩ hơn các tác vụ khác.
  return callGeminiApi(promptText, keys, {
    tier: 'quality',
    timeoutMs: SCRIPT_REQUEST_TIMEOUT_MS,
    deadlineMs: SCRIPT_DEADLINE_MS,
    label: 'Viết kịch bản',
    maxOutputTokens,
  });
}
