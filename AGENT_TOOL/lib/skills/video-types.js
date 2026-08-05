// Handlers cho 4 category dạng "video" (Veo3/image pipeline, không dùng Remotion):
// english_quiz, stick_figure, moral_wisdom, english_tips.
// Mỗi handler chỉ cần validate() + buildGeminiPrompt() — không có buildManualSegments
// hay buildRemotionConfig vì chúng không đi qua RENDER/skills/.

import { buildEnglishQuizScriptPrompt } from '../prompts/gemini/templates/englishQuiz.js';
import { buildEnglishTipsScriptPrompt } from '../prompts/gemini/templates/englishTips.js';
import { buildMoralWisdomScriptPrompt } from '../prompts/gemini/templates/moralWisdom.js';
import { buildStickFigureScriptPrompt } from '../prompts/gemini/templates/stickFigure.js';

export const videoTypeHandlers = {
  english_quiz: {
    validate(input, useGemini) {
      if (useGemini && !input.question?.trim()) return 'Vui lòng nhập Câu hỏi tiếng Anh.';
      return null;
    },
    buildGeminiPrompt(input, durationInfo) {
      return buildEnglishQuizScriptPrompt(input, durationInfo);
    },
  },

  english_tips: {
    onlyGemini: true,
    validate(input, useGemini) {
      if (!useGemini)
        return 'Định dạng "Video Mẹo Học Tiếng Anh" chỉ hỗ trợ tạo qua Gemini AI phân đoạn. Vui lòng bật "Tự động tạo kịch bản & phân đoạn bằng Gemini AI".';
      if (!input.hook?.trim()) return 'Vui lòng nhập Câu mở đầu gây chú ý (hook).';
      if (!input.ruleTitle?.trim()) return 'Vui lòng nhập Tên mẹo / quy tắc chính.';
      if (!input.keyPoints?.trim()) return 'Vui lòng nhập Các ý chính sẽ dạy.';
      return null;
    },
    buildGeminiPrompt(input, durationInfo) {
      return buildEnglishTipsScriptPrompt(input, durationInfo);
    },
  },

  moral_wisdom: {
    validate(input, useGemini) {
      if (!useGemini) return null;
      if (!input.theme?.trim()) return 'Vui lòng nhập Chủ đề bài học.';
      if (!input.story?.trim()) return 'Vui lòng nhập Câu chuyện minh họa ngắn.';
      return null;
    },
    buildGeminiPrompt(input, durationInfo) {
      return buildMoralWisdomScriptPrompt(input, durationInfo);
    },
  },

  stick_figure: {
    validate(input, useGemini) {
      if (!useGemini) return null;
      if (!Array.isArray(input.characterIds) || input.characterIds.length === 0)
        return 'Vui lòng chọn ít nhất 1 nhân vật xuất hiện.';
      if (!input.scenario?.trim()) return 'Vui lòng nhập Tình huống / bối cảnh.';
      return null;
    },
    buildGeminiPrompt(input, durationInfo) {
      return buildStickFigureScriptPrompt(input, durationInfo);
    },
  },
};
