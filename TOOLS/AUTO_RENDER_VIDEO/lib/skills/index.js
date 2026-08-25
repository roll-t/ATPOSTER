import moral_talk_slideshow from './moral_talk_slideshow.js';
import stick_figure_slideshow from './stick_figure_slideshow.js';
import reading_practice from './reading_practice.js';
import pexels_talk_video from './pexels_talk_video.js';
import buddhist_wisdom from './buddhist_wisdom.js';
import { videoTypeHandlers } from './video-types.js';

// Registry: category key -> skill handler.
// Slideshow skills (có RENDER/skills riêng): file riêng mỗi skill.
// Video-type skills (Veo3/image pipeline): gom chung vào video-types.js.
const SKILL_HANDLERS = {
  moral_talk_slideshow,
  stick_figure_slideshow,
  reading_practice,
  pexels_talk_video,
  buddhist_wisdom,
  ...videoTypeHandlers,
};

export function getSkill(category) {
  return SKILL_HANDLERS[category] ?? null;
}
