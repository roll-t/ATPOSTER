import {
  buildBuddhistWisdomScriptPrompt,
  getBuddhistCharTarget,
  getBuddhistSlideTarget,
  getBuddhistCharsPerSlide,
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

  // Số KÝ TỰ tối thiểu để generateSegmentedScript biết khi nào phải gọi thêm một lượt viết bù.
  //
  // Bắt buộc phải khai riêng, và bắt buộc là ký tự chứ không phải từ: kịch bản của skill này
  // 100% tiếng Nhật, viết liền không khoảng trắng. Công thức chung ở generateSegmentedScript vừa
  // dùng tốc độ đọc tiếng Việt vừa đếm theo khoảng trắng — sai cả hai phía.
  targetWordCount(durationRange) {
    return getBuddhistCharTarget(durationRange);
  },

  // Mỗi segment khoá cứng vào MỘT ảnh giữ 5 giây, nên hụt chữ đồng nghĩa hụt segment. Lượt viết
  // bù phải được dặn thêm SEGMENT chứ không phải viết dài từng đoạn ra — viết dài ra thì ảnh phải
  // đứng yên 10 giây trong khi cả pipeline đang tính 5.
  extendRules(durationRange) {
    const { low, high } = getBuddhistCharsPerSlide();
    return [
      `- The script is short because it is MISSING SEGMENTS, not because its segments are too brief. Expand it to ${getBuddhistSlideTarget(durationRange)} segments by carrying the story further, adding new beats in the MIDDLE (never after the closing segment).`,
      `- Every segment must hold ${low} to ${high} JAPANESE CHARACTERS — about 5 seconds of slow speech, one illustration's worth. Do NOT lengthen existing segments past ${high} characters to hit the total.`,
      '- Keep writing in Japanese (ですます調), same voice as the draft. Never switch to English or Vietnamese in "dialogueOrNarration".',
      '- Each added segment needs its own "visualDescription" IN ENGLISH describing that new moment: subject and composition only, no art-style words, no colour names.',
      '- Each added segment needs its own "subtitle": Japanese line, then "\\n", then the Vietnamese translation.',
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
