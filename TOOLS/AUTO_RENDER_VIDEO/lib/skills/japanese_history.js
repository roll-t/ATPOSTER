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

  // Mỗi segment là MỘT ảnh, và ảnh giữ đúng bằng độ dài giọng đọc của segment đó — nên hụt ký tự
  // đồng nghĩa hụt cả thời lượng lẫn số ảnh. Lượt viết bù phải được dặn thêm SEGMENT chứ không
  // phải kéo dài từng đoạn ra: viết dài ra chỉ làm vài bức tranh đứng yên lâu hơn.
  extendRules(durationRange) {
    const { low, high } = getHistoryCharsPerSlide();
    return [
      `- The script is short because it is MISSING SEGMENTS, not because its segments are too brief. Expand it to ${getHistorySlideTarget(durationRange)} segments by carrying the account further, adding new beats in the MIDDLE (never after the closing segment).`,
      `- Each image is held for exactly as long as its own narration audio, so segment length follows the meaning, not a stopwatch. ${low} to ${high} JAPANESE CHARACTERS is the typical segment and most should sit near it; shorter or longer is fine where the moment asks for it. What you must NOT do is reach the total by bloating a few existing segments — add segments instead.`,
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
