import { getDurationInfo } from './durationInfo.js';
import { getSkill } from '../../skills/index.js';
import { buildEnglishQuizScriptPrompt } from './templates/englishQuiz.js';
import { callGeminiApi } from './callGeminiApi.js';

export async function generateSegmentedScript({ category, durationRange, input, apiKey }) {
  const keys = (Array.isArray(apiKey) ? apiKey : [apiKey]).filter(Boolean);
  if (keys.length === 0) {
    throw new Error('Chưa cấu hình Gemini API Key. Vui lòng cấu hình ở bảng cài đặt phía trên.');
  }

  const durationInfo = getDurationInfo(durationRange);
  const skill = getSkill(category);
  const promptText = skill?.buildGeminiPrompt(input, durationInfo, durationRange)
    ?? buildEnglishQuizScriptPrompt(input, durationInfo);

  // Viết kịch bản là khâu sáng tạo quan trọng nhất -> tier "quality" (model thông minh nhất), và
  // nới hạn chót vì prompt dài, model hay cần nhiều thời gian suy nghĩ hơn các tác vụ khác.
  return callGeminiApi(promptText, keys, { tier: 'quality', timeoutMs: 90_000, deadlineMs: 180_000, label: 'Viết kịch bản' });
}
