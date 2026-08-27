import {
  buildJapaneseHistoryScriptPrompt,
  getHistoryCharTarget,
  getHistorySlideTarget,
  getHistoryCharsPerSlide,
} from '../prompts/gemini/templates/japaneseHistory.js';
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

  // Số KÝ TỰ tối thiểu, không phải số từ: kịch bản 100% tiếng Nhật viết liền không khoảng trắng.
  // Xem countNarrationUnits() trong lib/speechRate.js.
  targetWordCount(durationRange) {
    return getHistoryCharTarget(durationRange);
  },

  // Mỗi segment khoá cứng vào MỘT ảnh giữ 5 giây, nên hụt ký tự đồng nghĩa hụt segment. Lượt viết
  // bù phải được dặn thêm SEGMENT chứ không phải kéo dài từng đoạn ra.
  extendRules(durationRange) {
    const { low, high } = getHistoryCharsPerSlide();
    return [
      `- The script is short because it is MISSING SEGMENTS, not because its segments are too brief. Expand it to ${getHistorySlideTarget(durationRange)} segments by carrying the account further, adding new beats in the MIDDLE (never after the closing segment).`,
      `- Every segment must hold ${low} to ${high} JAPANESE CHARACTERS — about 5 seconds of slow speech, one illustration's worth. Do NOT lengthen existing segments past ${high} characters to hit the total.`,
      '- Keep writing in Japanese (ですます調), same voice as the draft. Never switch to English or Vietnamese in "dialogueOrNarration".',
      '- Added material must still be HISTORY, not reflection: what happened next, what it cost, what the record does not say. Never fill with advice to the listener.',
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
