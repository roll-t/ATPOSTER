// Reads audio duration for each scene in data/scenes.json (via music-metadata,
// no ffmpeg needed) and writes durationInSeconds back into the same file.
import {parseFile} from 'music-metadata';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const scenesPath = join('data', 'scenes.json');
const scenes = JSON.parse(readFileSync(scenesPath, 'utf-8'));

for (const scene of scenes) {
  const audioPath = join('public', scene.audio);
  const metadata = await parseFile(audioPath);
  const duration = metadata.format.duration;
  if (!duration) {
    throw new Error(`Could not read duration for ${audioPath}`);
  }
  scene.durationInSeconds = Number(duration.toFixed(3));
  console.log(`${scene.id}: ${scene.durationInSeconds}s`);
}

writeFileSync(scenesPath, JSON.stringify(scenes, null, 2) + '\n');
console.log(`Wrote durations into ${scenesPath}`);
