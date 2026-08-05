import { buildReadingPracticeScriptPrompt } from '../prompts/gemini/templates/readingPractice.js';
import { stripEmotionTags } from './_utils.js';

const READING_SPEED_WPS = { slow: 2.3 * 0.82, medium: 2.3, fast: 2.3 * 1.18 };

export default {
  manifestIsImage: true,

  validate(input, useGemini) {
    if (!input.scenario?.trim()) return 'Vui lòng nhập Chủ đề / câu chuyện muốn kể.';
    if (!useGemini && !input.script?.trim())
      return 'Vui lòng nhập Nội dung câu chuyện ở bên dưới khi không bật tự động tạo bằng Gemini.';
    return null;
  },

  buildGeminiPrompt(input, durationInfo) {
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
};
