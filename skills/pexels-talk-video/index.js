import { defineSkill } from '../_core/skill-contract.js';
import { buildPexelsTalkVideoScriptPrompt } from '../../src/domain/prompt-templates/gemini/pexelsTalkVideo.js';

export default defineSkill({
  meta: {
    id: 'pexels_talk_video',
    name: 'Video Lời Bình Nền Pexels (Stock Footage)',
    description: 'Video phóng sự, lời bình cuộc sống kết hợp với kho video stock chất lượng cao từ Pexels.',
    icon: 'Video',
    aspectRatio: '9:16',
    renderEngine: 'remotion',
    skillFolder: 'pexels-talk-video',
    badge: 'Stock Video',
    categoryKey: 'pexels_talk_video',
  },

  manifestIsImage: false,

  formSchema: {
    fields: [
      {
        name: 'scenario',
        label: 'Chủ đề / Bài viết muốn chia sẻ',
        type: 'textarea',
        required: true,
        placeholder: 'Ví dụ: Hãy sống chậm lại giữa dòng đời vội vã...',
      },
    ],
  },

  validate(_input, _useGemini) {
    return null;
  },

  buildPrompt(input, durationInfo, durationRange) {
    return buildPexelsTalkVideoScriptPrompt(input, durationInfo, durationRange);
  },

  buildManualSegments: null,
  buildRemotionConfig: null,
});
