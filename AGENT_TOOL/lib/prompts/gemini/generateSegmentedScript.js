import { getDurationInfo } from './durationInfo.js';
import { buildStickFigureScriptPrompt } from './templates/stickFigure.js';
import { buildMoralWisdomScriptPrompt } from './templates/moralWisdom.js';
import { buildEnglishQuizScriptPrompt } from './templates/englishQuiz.js';
import { buildEnglishTipsScriptPrompt } from './templates/englishTips.js';
import { buildImageSlideshowScriptPrompt } from './templates/imageSlideshow.js';
import { buildMoralTalkSlideshowScriptPrompt } from './templates/moralTalkSlideshow.js';
import { buildReadingPracticeScriptPrompt } from './templates/readingPractice.js';
import { callGeminiApi } from './callGeminiApi.js';

/**
 * Gọi API Gemini để tạo kịch bản tiếng Anh phân đoạn ngắn
 */
export async function generateSegmentedScript({ category, durationRange, input, apiKey }) {
  const keys = (Array.isArray(apiKey) ? apiKey : [apiKey]).filter(Boolean);
  if (keys.length === 0) {
    throw new Error('Chưa cấu hình Gemini API Key. Vui lòng cấu hình ở bảng cài đặt phía trên.');
  }

  const durationInfo = getDurationInfo(durationRange);

  let promptText;
  if (category === 'stick_figure_slideshow') {
    promptText = buildImageSlideshowScriptPrompt(input, durationInfo);
  } else if (category === 'moral_talk_slideshow') {
    promptText = buildMoralTalkSlideshowScriptPrompt(input, durationInfo, durationRange);
  } else if (category === 'reading_practice') {
    promptText = buildReadingPracticeScriptPrompt(input, durationInfo);
  } else if (category === 'stick_figure') {
    promptText = buildStickFigureScriptPrompt(input, durationInfo);
  } else if (category === 'moral_wisdom') {
    promptText = buildMoralWisdomScriptPrompt(input, durationInfo);
  } else if (category === 'english_tips') {
    promptText = buildEnglishTipsScriptPrompt(input, durationInfo);
  } else {
    promptText = buildEnglishQuizScriptPrompt(input, durationInfo);
  }

  // Viết kịch bản là khâu sáng tạo quan trọng nhất -> tier "quality" (model thông minh nhất), và
  // nới hạn chót vì prompt dài, model hay cần nhiều thời gian suy nghĩ hơn các tác vụ khác.
  return callGeminiApi(promptText, keys, { tier: 'quality', timeoutMs: 90_000, deadlineMs: 180_000, label: 'Viết kịch bản' });
}
