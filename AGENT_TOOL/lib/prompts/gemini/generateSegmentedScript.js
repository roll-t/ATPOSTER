import { getDurationInfo } from './durationInfo.js';
import { buildStickFigureScriptPrompt } from './templates/stickFigure.js';
import { buildMoralWisdomScriptPrompt } from './templates/moralWisdom.js';
import { buildEnglishQuizScriptPrompt } from './templates/englishQuiz.js';
import { buildEnglishTipsScriptPrompt } from './templates/englishTips.js';
import { buildImageSlideshowScriptPrompt } from './templates/imageSlideshow.js';
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

  return callGeminiApi(promptText, keys);
}
