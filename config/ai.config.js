import { ENV_CONFIG } from './env.config.js';

/**
 * Global AI / Gemini Configuration
 * Centralized settings for LLM models, API endpoints, model tiers, and key management.
 */
export const AI_CONFIG = {
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',

  // Fallback API Key from ENV if not configured in DB settings
  DEFAULT_API_KEY: ENV_CONFIG.GEMINI_API_KEY,

  // Model Tiers for different workloads (cập nhật theo Google Generative Language API v1beta)
  MODEL_TIERS: {
    // Sáng tạo nội dung (viết kịch bản, sinh ý tưởng, đạo lý, phân cảnh)
    // Ưu tiên gemini-3.5-flash và gemini-3.1-flash-lite vì phản hồi ổn định, không dính 503/treo như 3.6
    quality: [
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.6-flash',
      'gemini-flash-lite-latest',
    ],
    // Tác vụ nhanh / cơ học (dịch thuật, phiên âm, chuẩn hoá chuỗi, sinh từ khoá)
    fast: [
      'gemini-flash-lite-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.6-flash',
    ],
    // Xử lý hình ảnh / multimodal vision
    vision: [
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-flash-lite-latest',
    ],
  },

  DEFAULT_TIER: 'quality',

  // Request timeouts and limits (rút ngắn timeout để phát hiện treo sớm, không bắt người dùng đợi 45s)
  REQUEST_TIMEOUT_MS: 25000,
  FAST_TIMEOUT_MS: 15000,
  MAX_RETRIES_PER_KEY: 2,

  // Default generation params
  DEFAULT_GENERATION_CONFIG: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
  },
};

export { parseApiKeys } from '../src/domain/ai/apiKeys.js';

export default AI_CONFIG;
