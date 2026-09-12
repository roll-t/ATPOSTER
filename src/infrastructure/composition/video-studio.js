import {
  generatePublishMeta as generatePublishMetaUseCase,
  generateSegmentedScript as generateSegmentedScriptUseCase,
  regenerateNarrationScript as regenerateNarrationScriptUseCase,
  translateAndExpandInputs as translateAndExpandInputsUseCase,
  translateSubtitleLines as translateSubtitleLinesUseCase,
  tagElevenLabsScript as tagElevenLabsScriptUseCase,
} from '../../application/video-studio/use-cases/index.js';
import { callGeminiApi, callGeminiWithKeyRotation } from '../ai/gemini/callGeminiApi.js';

// This is the composition root: application code receives a capability, never a concrete SDK.
export const generateSegmentedScript = (input) =>
  generateSegmentedScriptUseCase({ ...input, generateText: callGeminiApi });

export const regenerateNarrationScript = (input) =>
  regenerateNarrationScriptUseCase({ ...input, generateText: callGeminiApi });

export const generatePublishMeta = (input) =>
  generatePublishMetaUseCase({ ...input, generateText: callGeminiApi });

export const translateAndExpandInputs = (input) =>
  translateAndExpandInputsUseCase({ ...input, generateText: callGeminiWithKeyRotation });

export const translateSubtitleLines = (lines, apiKeyOrKeys) =>
  translateSubtitleLinesUseCase(lines, apiKeyOrKeys, callGeminiWithKeyRotation);

export const tagElevenLabsScript = (lines, apiKeyOrKeys) =>
  tagElevenLabsScriptUseCase(lines, apiKeyOrKeys, callGeminiWithKeyRotation);
