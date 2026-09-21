import { defineSkill } from '../_core/skill-contract.js';
import { buildSlideshowManualSegments, buildSlideshowRemotionConfig } from '../_core/base-remotion.js';
import { buildArticleStickFigureScriptPrompt } from '../../src/domain/prompt-templates/gemini/articleStickFigure.js';

export default defineSkill({
  meta: {
    id: 'article_news_stick_figure',
    name: 'Tin Tức Báo Chí — Video Người Que',
    description: 'Dán link bài báo, AI tự động bóc tách nội dung và chuyển thể thành video phóng sự hoạt họa Người Que 2D thời sự, cuốn hút.',
    icon: 'FileText',
    aspectRatio: '9:16',
    renderEngine: 'remotion',
    skillFolder: 'stick-figure-slideshow-video',
    badge: 'Tin tức',
    categoryKey: 'article_news_stick_figure',
  },

  manifestIsImage: true,

  formSchema: {
    fields: [
      {
        name: 'articleUrl',
        label: 'Đường dẫn bài báo (Link URL)',
        type: 'article-url-input',
        required: false,
        placeholder: 'https://vnexpress.net/... hoặc link bài báo bất kỳ',
      },
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
        name: 'narrationLanguage',
        label: 'Ngôn ngữ thuyết minh',
        type: 'select',
        defaultValue: 'vi',
        options: [
          { value: 'vi', label: 'Tiếng Việt (Mặc định)' },
          { value: 'en', label: 'Tiếng Anh (English)' },
        ],
      },
      {
        name: 'scenario',
        label: 'Nội dung bài báo',
        type: 'textarea',
        required: true,
        placeholder: 'Nội dung sau khi trích xuất hoặc tự nhập/dán bài viết...',
      },
    ],
  },

  validate(input, useGemini) {
    if (!input.scenario?.trim() && !input.articleUrl?.trim()) {
      return 'Vui lòng nhập Link bài báo hoặc dán nội dung bài viết cần dựng kịch bản.';
    }
    if (!useGemini && !input.script?.trim()) {
      return 'Vui lòng nhập Nội dung thuyết minh ở bên dưới khi không bật tự động tạo bằng Gemini.';
    }
    return null;
  },

  buildPrompt(input, durationInfo, durationRange) {
    return buildArticleStickFigureScriptPrompt(input, durationInfo, durationRange);
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
      openingNewsBrand: 'TIN TỨC',
    };
  },
});
