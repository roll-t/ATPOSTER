import { defineSkill } from '../_core/skill-contract.js';
import { buildSlideshowManualSegments, buildSlideshowRemotionConfig } from '../_core/base-remotion.js';
import { buildJapaneseHistoryScriptPrompt } from '../../src/domain/prompt-templates/gemini/japaneseHistory.js';
import { JAPANESE_HISTORY_SYLLABUS } from '../../src/domain/content/japaneseHistorySyllabus.js';
import { JAPANESE_HISTORY_THEMES } from '../../src/domain/content/japaneseHistoryThemes.js';

export default defineSkill({
  meta: {
    id: 'japanese_history',
    name: 'Lịch Sử Nhật Bản, Samurai & Ninja (Japanese History)',
    description: 'Biên niên sử, huyền thoại các trận đánh Samurai, gia tộc Oda, Tokugawa và văn hóa Nhật cổ qua tranh màu nước.',
    icon: 'Shield',
    aspectRatio: '9:16',
    renderEngine: 'remotion',
    skillFolder: 'moral_talk_slideshow',
    badge: 'Lịch sử',
    categoryKey: 'japanese_history',
  },

  manifestIsImage: true,

  syllabus: {
    syllabus: JAPANESE_HISTORY_SYLLABUS,
    themes: JAPANESE_HISTORY_THEMES,
  },

  formSchema: {
    fields: [
      {
        name: 'scenario',
        label: 'Chủ đề lịch sử / nhân vật muốn kể',
        type: 'textarea',
        required: true,
        placeholder: 'Ví dụ: Trận chiến Sekigahara và sự trỗi dậy của Mạc phủ Tokugawa...',
      },
      {
        name: 'japaneseHistoryTheme',
        label: 'Giai đoạn lịch sử',
        type: 'select',
        source: 'themes',
      },
    ],
  },

  validate(input, useGemini) {
    if (!input.scenario?.trim()) return 'Vui lòng nhập hoặc chọn Chủ đề lịch sử muốn kể.';
    if (!useGemini && !input.script?.trim())
      return 'Vui lòng nhập Nội dung thuyết minh ở bên dưới khi không bật tự động tạo bằng Gemini.';
    return null;
  },

  buildPrompt(input, durationInfo, durationRange) {
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
      fontFamily: "'Noto Sans JP', 'Be Vietnam Pro', 'Merriweather', serif",
      captionStyle: 'hook',
      fontSize: 44,
      highlightColor: '#f59e0b',
      isBgTransparent: true,
      captionMarginY: -180,
    };
  },
});
