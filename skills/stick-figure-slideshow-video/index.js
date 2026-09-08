import { defineSkill } from '../_core/skill-contract.js';
import { buildSlideshowManualSegments, buildSlideshowRemotionConfig } from '../_core/base-remotion.js';
import { buildImageSlideshowScriptPrompt } from '../../src/domain/prompt-templates/gemini/imageSlideshow.js';
import { STICK_FIGURE_LONGFORM_GROUPS } from '../../src/domain/content/stickFigureLongFormTopics.js';

export default defineSkill({
  meta: {
    id: 'stick_figure_slideshow',
    name: 'Video Người Que Minh Họa (Stick Figure)',
    description: 'Phong cách whiteboard vẽ tay nét đen trên nền trắng, giải thích các chủ đề đời sống, tâm lý, công việc.',
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
        name: 'scenario',
        label: 'Chủ đề / Vấn nạn muốn thuyết minh',
        type: 'textarea',
        required: true,
        placeholder: 'Ví dụ: Tại sao người thông minh thường ít nói? Phân tích tâm lý...',
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
    // Nền trắng — khớp với whiteboard aesthetic của ảnh người que (mực đen trên nền trắng).
    return buildSlideshowRemotionConfig(record, processedInput, '#FFFFFF');
  },
});
