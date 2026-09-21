import moral_talk_slideshow from './moral_talk_slideshow/index.js';
import reading_practice from './reading-page-video/index.js';
import stick_figure_slideshow from './stick-figure-slideshow-video/index.js';
import pexels_talk_video from './pexels-talk-video/index.js';
import music_player_video from './music-player-video/index.js';
import buddhist_wisdom from './buddhist_wisdom/index.js';
import japanese_history from './japanese_history/index.js';
import article_news_stick_figure from './article_news_stick_figure/index.js';
import { videoTypeHandlers } from '../src/application/video-studio/skills/video-types.js';

/**
 * MASTER SKILL REGISTRY (Hệ thống đăng ký Skill tập trung).
 * Mỗi Skill là một module độc lập hoàn toàn.
 * Để thêm 1 skill mới:
 * 1. Tạo thư mục skills/<tên_skill>/index.js tuân thủ defineSkill.
 * 2. Đăng ký 1 dòng vào danh sách SKILLS dưới đây.
 */
const SKILLS = {
  moral_talk_slideshow,
  reading_practice,
  stick_figure_slideshow,
  article_news_stick_figure,
  pexels_talk_video,
  music_player_video,
  buddhist_wisdom,
  japanese_history,
  ...videoTypeHandlers,
};

/**
 * Lấy đối tượng Skill theo mã định danh (category / skill id).
 */
export function getSkill(category) {
  if (!category) return null;
  return SKILLS[category] ?? null;
}

/**
 * Lấy danh sách tất cả các Skills có trong hệ thống.
 */
export function getAllSkills() {
  return Object.values(SKILLS);
}

/**
 * Lấy schema cấu hình Form của một Skill.
 */
export function getSkillFormSchema(category) {
  const skill = getSkill(category);
  return skill?.formSchema ?? { fields: [] };
}

/**
 * Lấy dữ liệu giáo trình / chủ đề mẫu của một Skill.
 */
export function getSkillSyllabus(category) {
  const skill = getSkill(category);
  return skill?.syllabus ?? null;
}

export default SKILLS;
