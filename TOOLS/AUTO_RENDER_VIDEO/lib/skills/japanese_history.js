import { buildJapaneseHistoryScriptPrompt } from '../prompts/gemini/templates/japaneseHistory.js';
import { buildSlideshowManualSegments, buildSlideshowRemotionConfig } from './_utils.js';

/**
 * Skill "Lịch Sử Nhật Bản, Samurai & Ninja".
 *
 * Song sinh với buddhist_wisdom: cùng pipeline (Remotion moral_talk_slideshow), cùng phong cách
 * ảnh tranh mực-màu nước, cùng luật viết kịch bản tiếng Nhật. Chỉ khác bối cảnh và nhân vật.
 * Mọi phần dùng chung nằm ở prompts/gemini/templates/japaneseNarrativeShared.js.
 */
export default {
  manifestIsImage: true,

  validate(input, useGemini) {
    if (!input.scenario?.trim()) return 'Vui lòng nhập hoặc chọn Chủ đề lịch sử muốn kể.';
    if (!useGemini && !input.script?.trim())
      return 'Vui lòng nhập Nội dung thuyết minh ở bên dưới khi không bật tự động tạo bằng Gemini.';
    return null;
  },

  buildGeminiPrompt(input, durationInfo, durationRange) {
    return buildJapaneseHistoryScriptPrompt(input, durationInfo, durationRange);
  },

  buildManualSegments(processedInput) {
    return buildSlideshowManualSegments(processedInput);
  },

  buildRemotionConfig(record, processedInput) {
    const config = buildSlideshowRemotionConfig(record, processedInput, '#1c1917');
    return {
      ...config,
      font: 'be-vietnam-pro',
      captionFont: 'be-vietnam-pro',
      // Chuỗi font phải có mặt chữ Nhật đứng TRƯỚC — Be Vietnam Pro không chứa glyph kana/kanji.
      fontFamily: "'Noto Sans JP', 'Be Vietnam Pro', 'Merriweather', serif",
      captionStyle: 'hook',
      fontSize: 44,
      highlightColor: '#f59e0b',
      isBgTransparent: true,
      captionMarginY: -180
    };
  },
};
