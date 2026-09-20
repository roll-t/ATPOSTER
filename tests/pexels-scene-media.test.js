import test from 'node:test';
import assert from 'node:assert/strict';
import { derivePexelsSceneKeyword, pickPexelsVideoFile } from '../src/domain/video/pexelsSceneMedia.js';

test('keeps the concrete topic from Vietnamese narration', () => {
  assert.equal(
    derivePexelsSceneKeyword('Facebook quan tâm đến việc bạn bè của bạn thích gì.'),
    'friends using social media phone'
  );
});

test('prioritizes narration over visual style prompt', () => {
  assert.equal(derivePexelsSceneKeyword({
    narration: 'Thuật toán TikTok theo dõi nội dung người dùng xem trên điện thoại.',
    visualPrompt: 'A simple hand-drawn 2D stick figure on a light blue background.'
  }), 'person using social media phone');
});

test('removes art direction noise from an English visual prompt', () => {
  assert.equal(
    derivePexelsSceneKeyword({ visualPrompt: 'A minimalist 2D illustration of a chef chopping vegetables in a kitchen.' }),
    'chef chopping vegetables kitchen'
  );
});

test('selects a portrait mp4 near 1080p for portrait projects', () => {
  const selected = pickPexelsVideoFile({
    video_files: [
      { id: 1, width: 1920, height: 1080, quality: 'hd', file_type: 'video/mp4', link: 'landscape.mp4' },
      { id: 2, width: 720, height: 1280, quality: 'hd', file_type: 'video/mp4', link: 'portrait.mp4' },
      { id: 3, width: 1080, height: 1920, quality: 'hd', file_type: 'video/webm', link: 'ignored.webm' }
    ]
  }, 'portrait');

  assert.equal(selected?.link, 'portrait.mp4');
});
