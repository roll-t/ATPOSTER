import path from 'path';

/**
 * Global Environment Configuration
 * Centralized reading and normalization of process.env variables.
 */

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  const str = String(value).trim().toLowerCase();
  return str === 'true' || str === '1' || str === 'yes';
}

function parseInteger(value, defaultValue = 0) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const parsed = parseInt(String(value).trim(), 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

export const ENV_CONFIG = {
  // Server Port & Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_DEV: process.env.NODE_ENV !== 'production',
  IS_PROD: process.env.NODE_ENV === 'production',
  PORT: parseInteger(process.env.PORT, 3001),

  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_agent',

  // AI & External APIs
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  PEXELS_API_KEY: process.env.PEXELS_API_KEY || '',
  VIENEU_SERVER_URL: process.env.VIENEU_SERVER_URL || 'http://127.0.0.1:8001',

  // Remotion Render Configurations
  REMOTION_CONCURRENCY: process.env.REMOTION_CONCURRENCY
    ? parseInteger(process.env.REMOTION_CONCURRENCY, null)
    : null,
  REMOTION_HW_ACCEL: process.env.REMOTION_HW_ACCEL || null, // 'if-possible', 'disable', 'enable'
  REMOTION_GL: process.env.REMOTION_GL || 'angle', // 'angle', 'swiftshader', 'vulkan', 'egl'
  REMOTION_BRAND_LOGO: process.env.REMOTION_BRAND_LOGO || '1',
  REMOTION_SKILL_DIR: process.env.REMOTION_SKILL_DIR || null,

  // Custom paths override
  CUSTOM_DATA_DIR: process.env.CUSTOM_DATA_DIR || null,
  CUSTOM_UPLOADS_DIR: process.env.CUSTOM_UPLOADS_DIR || null,

  // Debug & Logging
  DEBUG: parseBoolean(process.env.DEBUG, false),
};

export default ENV_CONFIG;
