import { ENV_CONFIG } from './env.config.js';

/**
 * Global Text-to-Speech (TTS) Configuration
 * Centralized settings for all TTS providers, server endpoints, default voices, and audio formats.
 */
export const TTS_CONFIG = {
  PROVIDERS: {
    EDGE: 'edge',
    VIENEU: 'vieneu',
    GEMINI: 'gemini',
    CAPCUT: 'capcut',
  },

  DEFAULT_PROVIDER: 'edge',

  // VieNeu TTS Server Config
  VIENEU: {
    DEFAULT_SERVER_URL: ENV_CONFIG.VIENEU_SERVER_URL,
    TIMEOUT_MS: 45000,
    DEFAULT_VOICE: 'Minh Quân',
  },

  // Microsoft Edge TTS Config
  EDGE: {
    DEFAULT_VIETNAMESE_VOICE: 'vi-VN-NamMinhNeural',
    DEFAULT_ENGLISH_VOICE: 'en-US-GuyNeural',
    DEFAULT_VOICE: 'vi-VN-NamMinhNeural',
    TIMEOUT_MS: 30000,
  },

  // Gemini TTS Config
  GEMINI: {
    DEFAULT_VOICE: 'Puck',
    MODEL: 'gemini-2.5-flash',
    VOICES: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
  },

  // Audio Speech Defaults
  DEFAULTS: {
    RATE: '+0%',
    PITCH: '+0Hz',
    VOLUME: '+0%',
    SAMPLE_RATE: 24000,
  },
};

export default TTS_CONFIG;
