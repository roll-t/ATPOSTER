import {
  buildBuddhistWisdomScriptPrompt,
  getBuddhistWordTarget,
  getBuddhistSlideTarget,
  getBuddhistWordsPerSlide,
} from '../prompts/gemini/templates/buddhistWisdom.js';
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

  // Số từ tối thiểu để generateSegmentedScript biết khi nào phải gọi thêm một lượt viết bù.
  // Bắt buộc phải khai riêng: công thức chung ở đó tính theo tốc độ đọc TIẾNG VIỆT (4.3 âm
  // tiết/giây), áp vào kịch bản tiếng Anh đọc chậm sẽ đòi gần gấp đôi số từ thật sự cần.
  targetWordCount(durationRange) {
    return getBuddhistWordTarget(durationRange);
  },

  // Mỗi segment khoá cứng vào MỘT ảnh giữ 10 giây, nên hụt chữ đồng nghĩa hụt segment. Lượt viết
  // bù phải được dặn thêm SEGMENT chứ không phải viết dài từng đoạn ra — viết dài ra thì ảnh phải
  // đứng yên 20 giây trong khi cả pipeline đang tính 10.
  extendRules(durationRange) {
    const { low, high } = getBuddhistWordsPerSlide();
    return [
      `- The script is short because it is MISSING SEGMENTS, not because its segments are too brief. Expand it to ${getBuddhistSlideTarget(durationRange)} segments by carrying the story further, adding new beats in the MIDDLE (never after the closing segment).`,
      `- Every segment must hold ${low} to ${high} spoken words — about 10 seconds of slow speech, one illustration's worth. Do NOT lengthen existing segments past ${high} words to hit the total.`,
      '- Each added segment needs its own "visualDescription" describing that new moment: subject and composition only, no art-style words, no colour names.',
    ];
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
      fontFamily: "'Be Vietnam Pro', 'Merriweather', serif",
      captionStyle: 'hook',
      fontSize: 44,
      highlightColor: '#f59e0b',
      isBgTransparent: true,
      captionMarginY: -180
    };
  },
};
