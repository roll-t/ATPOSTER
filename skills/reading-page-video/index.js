import { defineSkill } from '../_core/skill-contract.js';
import { stripEmotionTags } from '../_core/base-remotion.js';
import { buildReadingPracticeScriptPrompt } from '../../src/domain/prompt-templates/gemini/readingPractice.js';
import { READING_SYLLABUS } from '../../src/domain/content/readingSyllabus.js';

const READING_SPEED_WPS = { slow: 2.3 * 0.82, medium: 2.3, fast: 2.3 * 1.18 };

export default defineSkill({
  meta: {
    id: 'reading_practice',
    name: 'Video Luyện Đọc Tiếng Anh (Reading Page)',
    description: 'Trang sách luyện đọc song ngữ tiếng Anh - tiếng Việt, hiển thị chữ kèm hình ảnh minh họa tĩnh.',
    icon: 'BookOpen',
    aspectRatio: '9:16',
    renderEngine: 'remotion',
    skillFolder: 'reading-page-video',
    badge: 'Học tập',
    categoryKey: 'reading_practice',
  },

  manifestIsImage: true,

  syllabus: {
    syllabus: READING_SYLLABUS,
  },

  formSchema: {
    fields: [
      {
        name: 'scenario',
        label: 'Chủ đề / Câu chuyện luyện đọc',
        type: 'textarea',
        required: true,
        placeholder: 'Ví dụ: A day at the sunny beach with my puppy...',
      },
      {
        name: 'readingLevel',
        label: 'Trình độ tiếng Anh',
        type: 'select',
        options: [
          { value: 'beginner', label: 'Cơ bản (Beginner - A1)' },
          { value: 'intermediate', label: 'Trung cấp (Intermediate - B1)' },
          { value: 'advanced', label: 'Nâng cao (Advanced - C1)' },
        ],
      },
      {
        name: 'readingSpeed',
        label: 'Tốc độ đọc',
        type: 'select',
        options: [
          { value: 'slow', label: 'Chậm (Slow - 1.8 wps)' },
          { value: 'medium', label: 'Vừa phải (Medium - 2.3 wps)' },
          { value: 'fast', label: 'Nhanh (Fast - 2.7 wps)' },
        ],
      },
    ],
  },

  validate(input, useGemini) {
    if (!input.scenario?.trim()) return 'Vui lòng nhập Chủ đề / câu chuyện muốn kể.';
    if (!useGemini && !input.script?.trim())
      return 'Vui lòng nhập Nội dung câu chuyện ở bên dưới khi không bật tự động tạo bằng Gemini.';
    return null;
  },

  buildPrompt(input, durationInfo) {
    return buildReadingPracticeScriptPrompt(input, durationInfo);
  },

  buildManualSegments(processedInput) {
    const body = (processedInput.script || '').replace(/\s+/g, ' ').trim();
    const wps = READING_SPEED_WPS[(processedInput.readingSpeed || 'medium').toLowerCase()] ?? 2.3;
    if (!body) return [];
    return [
      {
        segmentNumber: 1,
        durationSeconds: Math.max(8, Math.round(body.split(/\s+/).filter(Boolean).length / wps)),
        visualDescription: `A simple, mostly-empty graded-reader page background for this text: ${body}`,
        dialogueOrNarration: body,
        subtitle: body,
      },
    ];
  },

  buildRemotionConfig(record, processedInput) {
    const folder = processedInput.folderPath || 'example';
    const imgExt = processedInput.imageExt || 'jpg';
    const audExt = processedInput.audioExt || 'mp3';
    const orientation = processedInput.aspectRatio === '16:9' ? 'landscape' : 'portrait';
    const seg = record.segments?.[0];
    const paddedNum = String(seg?.segmentNumber || 1).padStart(2, '0');
    return {
      projectTitle: record.title || 'reading-page-video',
      orientation,
      image: `${folder}/images/scene-${paddedNum}.${imgExt}`,
      imageFit: 'cover',
      audio: `${folder}/audio/scene-${paddedNum}.${audExt}`,
      audioPaddingSeconds: 0.5,
      title: record.title || '',
      body: stripEmotionTags(seg?.subtitle || seg?.dialogueOrNarration || ''),
      showBilingual: true,
      bgColor: '#0E0F13',
      fontFamily: "'Be Vietnam Pro','Noto Sans',Arial,sans-serif",
    };
  },
});
