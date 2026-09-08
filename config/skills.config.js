/**
 * Global Skills & Category Registry Configuration
 * Centralized mapping of categories to their Remotion skills or processing pipelines.
 */

export const DEFAULT_SKILL_FOLDER = 'moral_talk_slideshow';

export const CATEGORY_SKILL_MAPPING = {
  moral_talk_slideshow: 'moral_talk_slideshow',
  buddhist_wisdom: 'moral_talk_slideshow',
  japanese_history: 'moral_talk_slideshow',
  reading_practice: 'reading-page-video',
  stick_figure_slideshow: 'stick-figure-slideshow-video',
  pexels_talk_video: 'pexels-talk-video',
  music_player_video: 'music-player-video',
};

// All known Remotion skill folders
export const ALL_SKILL_FOLDERS = Array.from(
  new Set([DEFAULT_SKILL_FOLDER, ...Object.values(CATEGORY_SKILL_MAPPING)])
);

// Metadata for video categories
export const SKILLS_METADATA = {
  buddhist_wisdom: {
    id: 'buddhist_wisdom',
    title: 'Chuyện Triết Lý & Thiền Phật Giáo',
    skillFolder: 'moral_talk_slideshow',
    type: 'remotion',
    defaultCaptionStyle: 'hook',
  },
  japanese_history: {
    id: 'japanese_history',
    title: 'Lịch Sử Nhật Bản, Samurai & Ninja',
    skillFolder: 'moral_talk_slideshow',
    type: 'remotion',
    defaultCaptionStyle: 'hook',
  },
  moral_talk_slideshow: {
    id: 'moral_talk_slideshow',
    title: 'Đạo Lý & Cuộc Sống (Slideshow)',
    skillFolder: 'moral_talk_slideshow',
    type: 'remotion',
    defaultCaptionStyle: 'page',
  },
  reading_practice: {
    id: 'reading_practice',
    title: 'Luyện Đọc Tiếng Anh (Reading Practice)',
    skillFolder: 'reading-page-video',
    type: 'remotion',
    defaultCaptionStyle: 'hook',
  },
  stick_figure_slideshow: {
    id: 'stick_figure_slideshow',
    title: 'Người Que Học Tập & Đạo Lý',
    skillFolder: 'stick-figure-slideshow-video',
    type: 'remotion',
    defaultCaptionStyle: 'line',
  },
  pexels_talk_video: {
    id: 'pexels_talk_video',
    title: 'Pexels Video Tâm Sự & Đạo Lý',
    skillFolder: 'pexels-talk-video',
    type: 'remotion',
    defaultCaptionStyle: 'karaoke',
  },
  music_player_video: {
    id: 'music_player_video',
    title: 'Music Player & Lyrics Video',
    skillFolder: 'music-player-video',
    type: 'remotion',
    defaultCaptionStyle: 'karaoke',
  },
  // Direct AI / Non-remotion video types
  english_quiz: {
    id: 'english_quiz',
    title: 'English Quiz AI',
    type: 'ai_direct',
  },
  english_tips: {
    id: 'english_tips',
    title: 'English Tips AI',
    type: 'ai_direct',
  },
  moral_wisdom: {
    id: 'moral_wisdom',
    title: 'Moral Wisdom AI',
    type: 'ai_direct',
  },
  stick_figure: {
    id: 'stick_figure',
    title: 'Stick Figure Scenario AI',
    type: 'ai_direct',
  },
};

/**
 * Get Remotion skill folder name for a given category.
 * @param {string} category
 * @returns {string}
 */
export function getSkillFolderForCategory(category) {
  if (!category) return DEFAULT_SKILL_FOLDER;
  return CATEGORY_SKILL_MAPPING[category] || DEFAULT_SKILL_FOLDER;
}

/**
 * Check if category is rendered using a Remotion skill package.
 * @param {string} category
 * @returns {boolean}
 */
export function isRemotionSkill(category) {
  return Boolean(CATEGORY_SKILL_MAPPING[category]) || category === DEFAULT_SKILL_FOLDER;
}

export const SKILLS_CONFIG = {
  DEFAULT_SKILL_FOLDER,
  CATEGORY_SKILL_MAPPING,
  ALL_SKILL_FOLDERS,
  SKILLS_METADATA,
  getSkillFolderForCategory,
  isRemotionSkill,
};

export default SKILLS_CONFIG;
