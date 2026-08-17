import { ENV_CONFIG } from './env.config.js';

/**
 * Global Video Rendering (Remotion) Configuration
 * Centralized settings for video dimensions, FPS, concurrency, hardware acceleration, and output formats.
 */
export const RENDER_CONFIG = {
  FPS: 30,

  // Standard Video Dimensions
  DIMENSIONS: {
    PORTRAIT_9_16: {
      width: 1080,
      height: 1920,
      aspectRatio: '9:16',
      label: 'Dọc (TikTok / Reels / Shorts)',
    },
    LANDSCAPE_16_9: {
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
      label: 'Ngang (YouTube Standard)',
    },
    SQUARE_1_1: {
      width: 1080,
      height: 1080,
      aspectRatio: '1:1',
      label: 'Vuông (1:1)',
    },
  },

  // Transitions
  DEFAULT_TRANSITION_FRAMES: 15,
  MIN_SCENE_DURATION_SECONDS: 2,

  // Remotion Execution Defaults
  EXECUTION: {
    CONCURRENCY: ENV_CONFIG.REMOTION_CONCURRENCY,
    GL_RENDERER: ENV_CONFIG.REMOTION_GL || 'angle',
    HW_ACCELERATION: ENV_CONFIG.REMOTION_HW_ACCEL || 'if-possible',
    SHOW_BRAND_LOGO: ENV_CONFIG.REMOTION_BRAND_LOGO !== '0',
    CODEC: 'h264',
    CRF: 18,
    PIXEL_FORMAT: 'yuv420p',
  },
};

export default RENDER_CONFIG;
