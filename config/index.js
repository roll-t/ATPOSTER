/**
 * Unified Global Configuration Entry Point (Single Source of Truth)
 * Import any config directly or access the full APP_CONFIG tree.
 */

import { ENV_CONFIG } from './env.config.js';
import { PATHS_CONFIG, ensureRuntimeDirs } from './paths.config.js';
import { DATABASE_CONFIG } from './database.config.js';
import { AI_CONFIG, parseApiKeys } from './ai.config.js';
import { TTS_CONFIG } from './tts.config.js';
import { RENDER_CONFIG } from './render.config.js';
import { SKILLS_CONFIG, getSkillFolderForCategory, isRemotionSkill } from './skills.config.js';
import { PRESETS_CONFIG, DEFAULT_SETTINGS, DEFAULT_READING_PRACTICE_CONFIG } from './presets.config.js';

export {
  ENV_CONFIG,
  PATHS_CONFIG,
  DATABASE_CONFIG,
  AI_CONFIG,
  TTS_CONFIG,
  RENDER_CONFIG,
  SKILLS_CONFIG,
  PRESETS_CONFIG,
  DEFAULT_SETTINGS,
  DEFAULT_READING_PRACTICE_CONFIG,
  ensureRuntimeDirs,
  parseApiKeys,
  getSkillFolderForCategory,
  isRemotionSkill,
};

export const APP_CONFIG = {
  env: ENV_CONFIG,
  paths: PATHS_CONFIG,
  db: DATABASE_CONFIG,
  ai: AI_CONFIG,
  tts: TTS_CONFIG,
  render: RENDER_CONFIG,
  skills: SKILLS_CONFIG,
  presets: PRESETS_CONFIG,
};

export default APP_CONFIG;
