import { buildImageSlideshowScriptPrompt } from '../prompts/gemini/templates/imageSlideshow.js';
import { buildSlideshowManualSegments, buildSlideshowRemotionConfig } from './_utils.js';

export default {
  manifestIsImage: true,

  validate(input, useGemini) {
    if (!input.scenario?.trim()) return 'Vui lòng nhập Chủ đề / vấn nạn muốn thuyết minh.';
    if (!useGemini && !input.script?.trim())
      return 'Vui lòng nhập Nội dung thuyết minh ở bên dưới khi không bật tự động tạo bằng Gemini.';
    return null;
  },

  buildGeminiPrompt(input, durationInfo, durationRange) {
    return buildImageSlideshowScriptPrompt(input, durationInfo, durationRange);
  },

  buildManualSegments(processedInput) {
    return buildSlideshowManualSegments(processedInput);
  },

  buildRemotionConfig(record, processedInput) {
    // Nền trắng — khớp với whiteboard aesthetic của ảnh người que (mực đen trên nền trắng).
    return buildSlideshowRemotionConfig(record, processedInput, '#FFFFFF');
  },
};
