import { defineSkill } from '../_core/skill-contract.js';
import { buildSlideshowManualSegments, buildSlideshowRemotionConfig } from '../_core/base-remotion.js';
import { buildBuddhistWisdomScriptPrompt } from '../../src/domain/prompt-templates/gemini/buddhistWisdom.js';
import { BUDDHIST_SYLLABUS } from '../../src/domain/content/buddhistSyllabus.js';
import { BUDDHIST_THEMES } from '../../src/domain/content/buddhistThemes.js';

export default defineSkill({
  meta: {
    id: 'buddhist_wisdom',
    name: 'Triết Lý Phật Giáo & Thiền Định (Buddhist Wisdom)',
    description: 'Câu chuyện thiền, bài học nhân quả và triết lý Phật giáo qua phong cách tranh thủy mặc, màu nước.',
    icon: 'Sun',
    aspectRatio: '9:16',
    renderEngine: 'remotion',
    skillFolder: 'moral_talk_slideshow',
    badge: 'Tâm linh',
    categoryKey: 'buddhist_wisdom',
  },

  manifestIsImage: true,

  syllabus: {
    syllabus: BUDDHIST_SYLLABUS,
    themes: BUDDHIST_THEMES,
  },

  formSchema: {
    fields: [
      {
        name: 'scenario',
        label: 'Chủ đề / Câu chuyện Phật giáo muốn kể',
        type: 'textarea',
        required: true,
        placeholder: 'Ví dụ: Câu chuyện hai nhà sư và cô gái bên bờ sông...',
      },
      {
        name: 'buddhistTheme',
        label: 'Chủ đề triết lý Phật giáo',
        type: 'select',
        source: 'themes',
      },
    ],
  },

  validate(input, useGemini) {
    if (!input.scenario?.trim()) return 'Vui lòng nhập hoặc chọn Chủ đề / Câu chuyện Phật giáo muốn kể.';
    if (!useGemini && !input.script?.trim())
      return 'Vui lòng nhập Nội dung thuyết minh ở bên dưới khi không bật tự động tạo bằng Gemini.';
    return null;
  },

  buildPrompt(input, durationInfo, durationRange) {
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
      fontFamily: "'Noto Sans JP', 'Be Vietnam Pro', 'Merriweather', serif",
      captionStyle: 'hook',
      fontSize: 44,
      highlightColor: '#f59e0b',
      isBgTransparent: true,
      captionMarginY: -180,
    };
  },
});
