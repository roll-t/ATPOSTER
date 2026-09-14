import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVideoRenderConfig, videoRenderConfigToCliArgs } from '../src/domain/video/renderConfigContract.js';

test('normalizes legacy editor aliases into one Remotion vocabulary', () => {
  const config = normalizeVideoRenderConfig({
    font: 'be-vietnam-pro', fontSize: '45', secondaryFontSize: '28', textColor: '#fff',
    bgColor: '#111', bgOpacity: '65', isBgTransparent: true, heroPercent: '25',
    paddingPercent: '10', bgMusicVolume: '35', transitionEffect: 'slide-left',
  }, { category: 'moral_talk_slideshow', orientation: 'portrait' });

  assert.equal(config.captionFont, 'be-vietnam-pro');
  assert.equal(config.captionFontSize, 45);
  assert.equal(config.captionSecondaryFontSize, 28);
  assert.equal(config.captionBgColor, 'transparent');
  assert.equal(config.captionBgOpacity, 65);
  assert.equal(config.captionPosition, 'top');
  assert.equal(config.heroHeightPercent, 25);
  assert.equal(config.contentPaddingPercent, 10);
  assert.equal(config.bgMusicVolume, 35);
  assert.equal(config.transitionStyle, 'slide-left');
});

test('CLI conversion changes percent music volume exactly once', () => {
  const config = normalizeVideoRenderConfig({ bgMusicVolume: 35, captionFontSize: 45 }, { orientation: 'landscape' });
  const args = videoRenderConfigToCliArgs(config);

  assert.ok(args.includes('--bgMusicVolume=0.35'));
  assert.ok(args.includes('--captionFontSize=45'));
  assert.ok(args.includes('--orientation=landscape'));
  assert.equal(args.filter((arg) => arg.startsWith('--bgMusicVolume=')).length, 1);
});

test('invalid values cannot leak into render arguments', () => {
  const config = normalizeVideoRenderConfig({ captionFontSize: 999, imageScale: -2, transitionStyle: 'spin' });
  const args = videoRenderConfigToCliArgs(config);

  assert.equal(config.captionFontSize, undefined);
  assert.equal(config.imageScale, undefined);
  assert.equal(config.transitionStyle, 'crossfade');
  assert.ok(!args.some((arg) => arg.includes('999') || arg.includes('-2') || arg.includes('spin')));
});
