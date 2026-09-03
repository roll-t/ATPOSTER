import { buildBuddhistWisdomScriptPrompt } from '../prompts/gemini/templates/buddhistWisdom.js';
import { buildSlideshowManualSegments, buildSlideshowRemotionConfig } from './_utils.js';

export default {
  manifestIsImage: true,

  validate(input, useGemini) {
    if (!input.scenario?.trim()) return 'Vui lòng nhập hoặc chọn Chủ đề / Câu chuyện Phật giáo muốn kể.';
    if (!useGemini && !input.script?.trim())
      return 'Vui lòng nhập Nội dung thuyết minh ở bên dưới khi không bật tự động tạo bằng Gemini.';
    return null;
  },

  buildGeminiPrompt(input, durationInfo, durationRange) {
    return buildBuddhistWisdomScriptPrompt(input, durationInfo, durationRange);
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
      // Chuỗi font phải có mặt chữ Nhật đứng TRƯỚC: Be Vietnam Pro không chứa glyph kana/kanji,
      // trình duyệt gặp chữ Nhật sẽ rơi về font hệ thống bất kỳ — hoặc tệ hơn là ô vuông trống.
      // Noto Sans JP là font Google, Remotion tải được như mọi font Google khác.
      fontFamily: "'Noto Sans JP', 'Be Vietnam Pro', 'Merriweather', serif",
      captionStyle: 'hook',
      fontSize: 44,
      highlightColor: '#f59e0b',
      isBgTransparent: true,
      captionMarginY: -180
    };
  },
};
