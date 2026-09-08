import { defineSkill } from '../_core/skill-contract.js';

export default defineSkill({
  meta: {
    id: 'music_player_video',
    name: 'Video Trình Phát Nhạc (Music Player)',
    description: 'Khung phát nhạc chuyển động với đĩa than / sóng âm audio visualizer và lời bài hát.',
    icon: 'Music',
    aspectRatio: '9:16',
    renderEngine: 'remotion',
    skillFolder: 'music-player-video',
    badge: 'Âm nhạc',
    categoryKey: 'music_player_video',
  },

  manifestIsImage: false,

  formSchema: {
    fields: [
      {
        name: 'songTitle',
        label: 'Tên bài hát',
        type: 'text',
        required: true,
      },
      {
        name: 'artist',
        label: 'Nghệ sĩ / Ca sĩ',
        type: 'text',
        required: true,
      },
    ],
  },

  validate(input) {
    if (!input.songTitle?.trim()) return 'Vui lòng nhập tên bài hát.';
    return null;
  },

  buildPrompt: null,
  buildManualSegments: null,
  buildRemotionConfig: null,
});
