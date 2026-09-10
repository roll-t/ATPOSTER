import { defineSkill } from '../_core/skill-contract.js';
import { buildSlideshowManualSegments, buildSlideshowRemotionConfig } from '../_core/base-remotion.js';
import { buildImageSlideshowScriptPrompt } from '../../src/domain/prompt-templates/gemini/imageSlideshow.js';
import { STICK_FIGURE_LONGFORM_GROUPS } from '../../src/domain/content/stickFigureLongFormTopics.js';

export default defineSkill({
  meta: {
    id: 'stick_figure_slideshow',
    name: 'Video Người Que Minh Họa (Stick Figure)',
    description: 'Phong cách phóng sự / tài liệu hoạt hình người que vẽ tay (Mack, Kurzgesagt) — giải thích khoa học, sinh tồn cổ đại, tâm lý và đời sống.',
    icon: 'Edit3',
    aspectRatio: '9:16',
    renderEngine: 'remotion',
    skillFolder: 'stick-figure-slideshow-video',
    badge: 'Sáng tạo',
    categoryKey: 'stick_figure_slideshow',
  },

  manifestIsImage: true,

  syllabus: {
    topics: STICK_FIGURE_LONGFORM_GROUPS,
  },

  formSchema: {
    fields: [
      {
        name: 'aspectRatio',
        label: 'Định dạng video (Tỉ lệ)',
        type: 'select',
        required: true,
        defaultValue: '9:16',
        options: [
          { value: '9:16', label: 'YouTube Shorts / TikTok (Màn dọc 9:16)' },
          { value: '16:9', label: 'YouTube Dài (Màn ngang 16:9)' },
        ],
      },
      {
        name: 'scenario',
        label: 'Chủ đề / Vấn nạn muốn thuyết minh',
        type: 'textarea',
        required: true,
        placeholder: 'Ví dụ: Làm sao người cổ đại sống sót qua mùa đông kỷ băng hà? Hoặc: Vì sao chúng ta hay trì hoãn?...',
      },
      {
        name: 'narrationLanguage',
        label: 'Ngôn ngữ thuyết minh',
        type: 'select',
        defaultValue: 'vi',
        options: [
          { value: 'vi', label: 'Tiếng Việt (Mặc định)' },
          { value: 'en', label: 'Tiếng Anh (English)' },
        ],
      },
    ],
  },

  validate(input, useGemini) {
    if (!input.scenario?.trim()) return 'Vui lòng nhập Chủ đề / vấn nạn muốn thuyết minh.';
    if (!useGemini && !input.script?.trim())
      return 'Vui lòng nhập Nội dung thuyết minh ở bên dưới khi không bật tự động tạo bằng Gemini.';
    return null;
  },

  buildPrompt(input, durationInfo, durationRange) {
    return buildImageSlideshowScriptPrompt(input, durationInfo, durationRange);
  },

  buildManualSegments(processedInput) {
    return buildSlideshowManualSegments(processedInput);
  },

  buildRemotionConfig(record, processedInput) {
    const isLandscape = processedInput?.aspectRatio === '16:9' || record?.input?.aspectRatio === '16:9';
    const orientation = isLandscape ? 'landscape' : 'portrait';
    const baseConfig = buildSlideshowRemotionConfig(record, processedInput, '#18181B');
    return {
      ...baseConfig,
      orientation,
      showBilingual: false,
    };
  },
});
