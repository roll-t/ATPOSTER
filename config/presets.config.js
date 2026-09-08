/**
 * Global Presets & Defaults Configuration
 * Visual presets, subtitle styles, and default database settings template.
 */

export const CAPTION_STYLES = {
  PAGE: 'page',
  HOOK: 'hook',
  LINE: 'line',
  KARAOKE: 'karaoke',
  WORD_BY_WORD: 'word_by_word',
};

export const DEFAULT_READING_PRACTICE_CONFIG = {
  captionStyle: 'hook',
  font: 'be-vietnam-pro',
  fontSize: '50',
  textColor: '#FFFFFF',
  bgColor: 'rgba(8, 8, 11, 0.88)',
  bgOpacity: '100',
  isBgTransparent: true,
  highlightColor: '#d9a620',
  heroPercent: '25',
  titlePercent: '10',
  bodyPercent: '40',
  titleFontSize: '44',
  titleBodyGap: '18',
  paddingPercent: '10',
  bodyAlign: 'left',
  imageMode: 'full_bg',
  bilingual: true,
  bgMusicEnabled: true,
  bgMusicVolume: '35',
  bgMusicTrackId: 'track1',
  imageScale: 0.75,
  imageTranslateY: 0,
  captionMarginY: -125,
};

export const DEFAULT_SETTINGS = {
  customUploadsDir: '',
  geminiApiKey: '',
  voiceMappings: {},
  ttsProvider: 'edge',
  edgeVoiceMappings: {},
  vieneuServerUrl: 'http://127.0.0.1:8001',
  vieneuVoiceMappings: {},
  favoriteEdgeVoiceIds: [],
  favoriteVieneuVoiceIds: [],
  defaultCaptionStyle: 'page',
  defaultHighlightColor: '#FFD700',
  defaultBgMusicEnabled: true,
  defaultBgMusicVolume: '35',
  defaultBgMusicTrackId: 'track1',
  readingPracticeConfig: DEFAULT_READING_PRACTICE_CONFIG,
  googleDrive: {},
  pexelsApiKey: '',
};

export const PRESETS_CONFIG = {
  CAPTION_STYLES,
  DEFAULT_READING_PRACTICE_CONFIG,
  DEFAULT_SETTINGS,
};

export default PRESETS_CONFIG;
