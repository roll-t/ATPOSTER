import { ENV_CONFIG } from './env.config.js';

/**
 * Global AI / Gemini Configuration
 * Centralized settings for LLM models, API endpoints, model tiers, and key management.
 */
export const AI_CONFIG = {
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',

  // Fallback API Key from ENV if not configured in DB settings
  DEFAULT_API_KEY: ENV_CONFIG.GEMINI_API_KEY,

  // Model Tiers for different workloads
  MODEL_TIERS: {
    // Sáng tạo nội dung (viết kịch bản, sinh ý tưởng, đạo lý, phân cảnh)
    quality: [
      'gemini-3.5-flash',
      'gemini-2.5-flash',
      'gemini-flash-lite-latest',
      'gemini-pro-latest',
      'gemini-flash-latest',
    ],
    // Tác vụ nhanh / cơ học (dịch thuật, phiên âm, chuẩn hoá chuỗi, sinh từ khoá)
    fast: [
      'gemini-flash-lite-latest',
      'gemini-3.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-flash-latest',
    ],
    // Xử lý hình ảnh / multimodal vision
    vision: [
      'gemini-2.5-flash',
      'gemini-flash-latest',
    ],
  },

  DEFAULT_TIER: 'quality',

  // Request timeouts and limits
  REQUEST_TIMEOUT_MS: 45000,
  FAST_TIMEOUT_MS: 20000,
  MAX_RETRIES_PER_KEY: 2,

  // Default generation params
  DEFAULT_GENERATION_CONFIG: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
  },
};

/**
 * Parse multi-line or delimited API keys string into a clean array of keys.
 * Supports: newlines, commas, semicolons.
 * @param {string|string[]} input
 * @returns {string[]}
 */
export function parseApiKeys(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(k => String(k).trim()).filter(Boolean);
  }
  if (typeof input !== 'string') return [];

  return input
    .split(/[\n,;]+/)
    .map(key => key.trim())
    .filter(key => key.length > 0);
}

export default AI_CONFIG;
