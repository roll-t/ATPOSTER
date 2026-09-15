import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSegmentedPrompts } from '../src/domain/content/buildSegmentedPrompts.js';

const baseInput = {
  aspectRatio: '9:16',
  characterStyle: 'stick_figure',
  scenario: 'Cách não bộ hình thành thói quen',
};

function buildOne(visualDescription) {
  return buildSegmentedPrompts('stick_figure_slideshow', '', 'Thói quen', [{
    segmentNumber: 1,
    durationSeconds: 3,
    visualDescription,
    dialogueOrNarration: 'Não bộ ghi nhớ hành động được lặp lại.',
    subtitle: 'Não bộ ghi nhớ hành động lặp lại.',
  }], baseInput)[0];
}

test('stick-figure image prompt matches the faceless flat-color hand-drawn reference style', () => {
  const segment = buildOne('A vibrant cinematic scientist with glowing equipment and highly detailed textures.');

  assert.match(segment.textPrompt, /Bright polished hand-drawn 2D web-explainer cartoon/);
  assert.match(segment.textPrompt, /smooth blank ivory-white oval head with no facial features/);
  assert.match(segment.textPrompt, /balanced slim line arms and legs/);
  assert.match(segment.textPrompt, /2–4 large light pastel color bands/);
  assert.match(segment.textPrompt, /Attractive consistent proportions and natural expressive poses/);
  assert.match(segment.jsonPrompt.image_style, /Bright Polished Faceless Hand-Drawn 2D Stick Figure/);
  assert.deepEqual(segment.jsonPrompt.style.color_palette, [
    '#263238 (soft charcoal outlines)',
    '#FFFDF7 (clean ivory-white heads)',
    '#BFE3F5 (light sky blue)',
    '#FFE0A3 (sunny cream)',
    '#BFE3CC (fresh mint)',
    '#FFD0C2 (soft peach)',
    '#D9E2EA (light blue-grey)',
    '#FF7043 (single focal coral/orange accent when essential)',
  ]);
  assert.doesNotMatch(segment.visualDescription, /vibrant|cinematic|glowing|highly detailed|detailed textures/i);
});

test('object and scientific prompts use the same simple flat-color explainer treatment', () => {
  const object = buildOne('A glowing clock beside a richly colored document.');
  const science = buildOne('A detailed atmospheric cross-section of the ocean floor.');

  assert.match(object.textPrompt, /Bright polished hand-drawn 2D explainer-cartoon object illustration/);
  assert.match(science.textPrompt, /Bright polished hand-drawn 2D educational explainer diagram/);
  assert.doesNotMatch(`${object.textPrompt} ${science.textPrompt}`, /Mack-style|glowing warm colors|rich stylized flat color/i);
});
