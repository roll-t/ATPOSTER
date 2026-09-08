import { defineSkill } from '../_core/skill-contract.js';
import { buildSlideshowManualSegments, buildSlideshowRemotionConfig } from '../_core/base-remotion.js';
import { buildMoralTalkSlideshowScriptPrompt } from '../../src/domain/prompt-templates/gemini/moralTalkSlideshow.js';
import { MORAL_SYLLABUS } from '../../src/domain/content/moralSyllabus.js';
import { MORAL_THEMES } from '../../src/domain/content/moralThemes.js';

export default defineSkill({
  meta: {
    id: 'moral_talk_slideshow',
    name: 'Video Nói Chuyện Đạo Lý (Slideshow)',
    description: 'Kể tình huống đời thường rút ra bài học sống, minh họa bằng pictogram trắng phẳng trên nền đen.',
    icon: 'MessageSquare',
    aspectRatio: '9:16',
    renderEngine: 'remotion',
    skillFolder: 'moral_talk_slideshow',
    badge: 'Phổ biến',
    categoryKey: 'moral_talk_slideshow',
  },

  manifestIsImage: true,

  syllabus: {
    syllabus: MORAL_SYLLABUS,
    themes: MORAL_THEMES,
  },

  formSchema: {
    fields: [
      {
        name: 'scenario',
        label: 'Chủ đề / Bài học đạo lý muốn kể',
        type: 'textarea',
        required: true,
        placeholder: 'Ví dụ: Đừng phán xét người khác khi chưa ở trong hoàn cảnh của họ...',
      },
      {
        name: 'moralTheme',
        label: 'Chủ đề tư tưởng (Theme)',
        type: 'select',
        source: 'themes',
      },
      {
        name: 'moralVoiceStyle',
        label: 'Phong cách giọng kể',
        type: 'select',
        source: 'voiceStyles',
      },
      {
        name: 'narrationLanguage',
        label: 'Ngôn ngữ thuyết minh',
        type: 'select',
        options: [
          { value: 'vi', label: 'Tiếng Việt (Mặc định)' },
          { value: 'en', label: 'Tiếng Anh (English)' },
        ],
      },
    ],
  },

  validate(input, useGemini) {
    if (!input.scenario?.trim()) return 'Vui lòng nhập Chủ đề / bài học đạo lý muốn kể.';
    if (!useGemini && !input.script?.trim())
      return 'Vui lòng nhập Nội dung thuyết minh ở bên dưới khi không bật tự động tạo bằng Gemini.';
    return null;
  },

  buildPrompt(input, durationInfo, durationRange) {
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
      captionMarginY: -215,
    };
  },
});
