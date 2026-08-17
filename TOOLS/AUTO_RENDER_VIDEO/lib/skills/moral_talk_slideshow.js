import { buildMoralTalkSlideshowScriptPrompt } from '../prompts/gemini/templates/moralTalkSlideshow.js';
import { buildSlideshowManualSegments, buildSlideshowRemotionConfig } from './_utils.js';

export default {
  manifestIsImage: true,

  validate(input, useGemini) {
    if (!input.scenario?.trim()) return 'Vui lòng nhập Chủ đề / bài học đạo lý muốn kể.';
    if (!useGemini && !input.script?.trim())
      return 'Vui lòng nhập Nội dung thuyết minh ở bên dưới khi không bật tự động tạo bằng Gemini.';
    return null;
  },

  buildGeminiPrompt(input, durationInfo, durationRange) {
    return buildMoralTalkSlideshowScriptPrompt(input, durationInfo, durationRange);
  },

  buildManualSegments(processedInput) {
    return buildSlideshowManualSegments(processedInput);
  },

  buildRemotionConfig(record, processedInput) {
    const config = buildSlideshowRemotionConfig(record, processedInput, '#0E0F13');
    return {
      ...config,
      font: 'paytone-one',
      captionFont: 'paytone-one',
      fontFamily: "'Paytone One', 'Be Vietnam Pro', Arial, sans-serif",
      captionStyle: 'hook',
      fontSize: 50,
      highlightColor: '#d9a620',
      isBgTransparent: true,
      captionMarginY: -215
    };
  },
};
