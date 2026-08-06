import { buildPexelsTalkVideoScriptPrompt } from '../prompts/gemini/templates/pexelsTalkVideo.js';

export default {
  // manifest.json của skill này dùng video Pexels làm nền, không phải ảnh AI.
  manifestIsImage: false,

  validate(_input, _useGemini) {
    return null;
  },

  buildGeminiPrompt(input, durationInfo, durationRange) {
    return buildPexelsTalkVideoScriptPrompt(input, durationInfo, durationRange);
  },

  buildManualSegments: null,
  buildRemotionConfig: null,
};
