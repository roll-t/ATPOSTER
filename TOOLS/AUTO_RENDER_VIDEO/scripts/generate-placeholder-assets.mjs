// Generates placeholder SVG images + WAV tones so the Remotion pipeline can be
// smoke-tested before real images/audio arrive. Safe to delete once real
// assets are dropped into public/images and public/audio.
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const imagesDir = join('public', 'images');
const audioDir = join('public', 'audio');
mkdirSync(imagesDir, {recursive: true});
mkdirSync(audioDir, {recursive: true});

const scenes = [
  {id: 'scene-01', color: '#2563eb', label: 'Scene 1', freq: 440, seconds: 3},
  {id: 'scene-02', color: '#16a34a', label: 'Scene 2', freq: 523, seconds: 4},
  {id: 'scene-03', color: '#dc2626', label: 'Scene 3', freq: 659, seconds: 3.5},
];

function makeSvg(color, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <rect width="1920" height="1080" fill="${color}"/>
  <text x="960" y="540" font-family="sans-serif" font-size="120" fill="white" text-anchor="middle" dominant-baseline="middle">${label}</text>
</svg>`;
}

function makeWav(freq, seconds, sampleRate = 44100) {
  const numSamples = Math.floor(sampleRate * seconds);
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // fade in/out to avoid clicks, quiet tone as a placeholder "voice" cue
    const envelope = Math.min(1, t * 8, (seconds - t) * 8);
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.2 * Math.max(0, envelope);
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }

  return buffer;
}

for (const scene of scenes) {
  writeFileSync(join(imagesDir, `${scene.id}.svg`), makeSvg(scene.color, scene.label));
  writeFileSync(join(audioDir, `${scene.id}.wav`), makeWav(scene.freq, scene.seconds));
  console.log(`Generated placeholder assets for ${scene.id}`);
}
