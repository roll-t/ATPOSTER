#!/usr/bin/env node
/**
 * render-project.mjs — Pexels Talk Video
 * Reads a project's manifest.json (standard segments format) and renders
 * a narrated life-philosophy video with Pexels video background.
 *
 * Usage: node scripts/render-project.mjs <project-folder-name> [options]
 *
 * Options (same as narrated-slideshow-video):
 *   --orientation=portrait|landscape
 *   --bgMusicEnabled=true|false
 *   --bgMusicVolume=<0.0-1.0>
 *   --accentColor=<CSS hex, e.g. "#a78bfa">
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectFolder = process.argv[2];

if (!projectFolder) {
  console.error('Usage: node scripts/render-project.mjs <project-folder-name>');
  process.exit(1);
}

const flags = {};
for (const arg of process.argv.slice(3)) {
  const m = arg.match(/^--([a-zA-Z]+)=(.*)$/);
  if (m) flags[m[1]] = m[2];
}

const CSS_COLOR_RE = /^[a-zA-Z0-9#(),.\s%-]+$/;

const orientation = flags.orientation === 'landscape' ? 'landscape' : 'portrait';
const bgMusicEnabled = flags.bgMusicEnabled !== 'false';
const bgMusicVolumeRaw = parseFloat(flags.bgMusicVolume);
const bgMusicVolume = Number.isFinite(bgMusicVolumeRaw) ? Math.min(1, Math.max(0, bgMusicVolumeRaw)) : 0.12;
const accentColor = flags.accentColor && CSS_COLOR_RE.test(flags.accentColor) ? flags.accentColor : '#a78bfa';

const FPS = 30;

function stripEmotionTags(text) {
  return String(text || '')
    .split('\n')
    .map(l => l.replace(/\[[^\]]*\]/g, ' ').replace(/[ \t]+/g, ' ').trim())
    .join('\n');
}

// Read manifest
const projectPath = path.join(root, 'public', projectFolder);
const manifestPath = path.join(projectPath, 'manifest.json');

if (!fs.existsSync(manifestPath)) {
  console.error(`Error: manifest.json not found in ${projectPath}`);
  process.exit(1);
}

console.log(`Reading manifest: ${manifestPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

if (!Array.isArray(manifest.segments) || manifest.segments.length === 0) {
  console.error('Error: manifest.json has no segments');
  process.exit(1);
}

// Detect background video in bg/ folder
const bgDir = path.join(projectPath, 'bg');
let backgroundVideo = manifest.backgroundVideo || '';
if (!backgroundVideo && fs.existsSync(bgDir)) {
  const bgFiles = fs.readdirSync(bgDir).filter(f => f.endsWith('.mp4') || f.endsWith('.webm'));
  if (bgFiles.length > 0) {
    backgroundVideo = `${projectFolder}/bg/${bgFiles[0]}`;
  }
}

// Ghép nhiều video nền thành 1 playlist đủ dài để phủ toàn bộ thời lượng kịch bản
{
  const isWindows = process.platform === 'win32';
  const compositorDir = path.join(root, 'node_modules', '@remotion',
    isWindows ? 'compositor-win32-x64-msvc'
    : (process.arch === 'arm64' ? 'compositor-linux-arm64-musl' : 'compositor-linux-x64-musl'));
  const ffmpegBin  = path.join(compositorDir, isWindows ? 'ffmpeg.exe'  : 'ffmpeg');
  const ffprobeBin = path.join(compositorDir, isWindows ? 'ffprobe.exe' : 'ffprobe');
  const ffmpegExe  = fs.existsSync(ffmpegBin)  ? ffmpegBin  : 'ffmpeg';
  const ffprobeExe = fs.existsSync(ffprobeBin) ? ffprobeBin : 'ffprobe';

  const bgDir = path.join(projectPath, 'bg');
  const loopedName = 'background-looped.mp4';
  const loopedPath = path.join(bgDir, loopedName);

  if (fs.existsSync(bgDir)) {
    // Thu thập tất cả video nền (bg-01.mp4, bg-02.mp4... hoặc background-*.mp4), bỏ file looped
    const srcFiles = fs.readdirSync(bgDir)
      .filter(f => (f.endsWith('.mp4') || f.endsWith('.webm')) && f !== loopedName)
      .sort()
      .map(f => path.join(bgDir, f))
      .filter(f => fs.existsSync(f));

    if (srcFiles.length > 0) {
      const totalManifestSecs = manifest.segments.reduce((sum, s) => sum + (Number(s.durationSeconds) || 5), 0);
      const requiredSecs = Math.ceil(totalManifestSecs) + 20; // 20s buffer

      // Đo thời lượng từng video bằng ffprobe
      const getDuration = (filePath) => {
        try {
          const out = execFileSync(ffprobeExe, [
            '-v', 'error', '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1', filePath
          ]).toString().trim();
          return parseFloat(out) || 0;
        } catch { return 0; }
      };

      const durations = srcFiles.map(getDuration);
      const totalSrcSecs = durations.reduce((a, b) => a + b, 0);

      console.log(`[BgVideo] ${srcFiles.length} video nền, tổng ${totalSrcSecs.toFixed(1)}s, cần ${requiredSecs}s`);

      // Tạo concat list — lặp danh sách đủ lần để phủ requiredSecs
      const concatListPath = path.join(bgDir, 'concat-list.txt');
      let concatLines = [];
      let accumulated = 0;
      let pass = 0;
      while (accumulated < requiredSecs && pass < 50) {
        for (let i = 0; i < srcFiles.length && accumulated < requiredSecs; i++) {
          concatLines.push(`file '${srcFiles[i].replace(/\\/g, '/')}'`);
          accumulated += durations[i] || 5;
        }
        pass++;
      }
      fs.writeFileSync(concatListPath, concatLines.join('\n'), 'utf8');

      // Kiểm tra có cần tạo lại không (nếu số file src thay đổi thì tạo lại)
      const srcMtime = Math.max(...srcFiles.map(f => fs.statSync(f).mtimeMs));
      const loopedMtime = fs.existsSync(loopedPath) ? fs.statSync(loopedPath).mtimeMs : 0;
      const needRebuild = loopedMtime < srcMtime || !fs.existsSync(loopedPath);

      if (needRebuild) {
        console.log(`[BgVideo] Ghép playlist ${concatLines.length} đoạn → ${loopedPath}`);
        try {
          execFileSync(ffmpegExe, [
            '-f', 'concat', '-safe', '0',
            '-i', concatListPath,
            '-t', String(requiredSecs),
            '-an',
            '-c:v', 'copy',
            '-y',
            loopedPath,
          ], { stdio: 'inherit' });
          console.log(`[BgVideo] Đã tạo playlist video nền: ${loopedPath}`);
        } catch (err) {
          console.warn('[BgVideo] ffmpeg concat thất bại:', err.message);
        }
      } else {
        console.log(`[BgVideo] Dùng lại playlist đã tạo trước: ${loopedPath}`);
      }

      if (fs.existsSync(loopedPath)) {
        backgroundVideo = `${projectFolder}/bg/${loopedName}`;
      }
    }
  }
}

// Detect BGM
const audioDir = path.join(projectPath, 'audio');
let bgMusic = '';
if (fs.existsSync(audioDir)) {
  const bgMusicFile = fs.readdirSync(audioDir).find(f => f.startsWith('bg-music'));
  if (bgMusicFile) bgMusic = `${projectFolder}/audio/${bgMusicFile}`;
}

// Map manifest segments → Remotion segments
const segments = manifest.segments.map(seg => {
  const paddedNum = String(seg.segmentNumber).padStart(2, '0');

  // Detect audio file
  let audExt = 'mp3';
  if (fs.existsSync(audioDir)) {
    const match = fs.readdirSync(audioDir).find(f =>
      f.startsWith(`scene-${paddedNum}.`) || f.startsWith(`scene-${paddedNum}_`)
    );
    if (match) audExt = match.split('.').pop();
  }

  const durationSeconds = Number(seg.durationSeconds) || 5;
  const durationInFrames = Math.max(FPS, Math.round(durationSeconds * FPS));

  const subtitle = stripEmotionTags(seg.subtitle || seg.dialogueOrNarration || '');

  return {
    caption: subtitle,
    audio: `${projectFolder}/audio/scene-${paddedNum}.${audExt}`,
    durationInFrames,
    ...(Array.isArray(seg.wordTimings) && seg.wordTimings.length > 0 ? { wordTimings: seg.wordTimings } : {}),
  };
});

// Build config
const remotionConfig = {
  title: manifest.title || projectFolder,
  orientation: flags.orientation === 'landscape' || flags.orientation === 'portrait'
    ? flags.orientation
    : (manifest.orientation || 'portrait'),
  segments,
  backgroundVideo,
  bgMusic,
  bgMusicEnabled,
  bgMusicVolume,
  accentColor: manifest.accentColor && CSS_COLOR_RE.test(manifest.accentColor)
    ? manifest.accentColor
    : accentColor,
  showWaveform: true,
};

// Write config
const finalDir = path.join(projectPath, 'final');
fs.mkdirSync(finalDir, { recursive: true });
const configPath = path.join(finalDir, 'config.json');
fs.writeFileSync(configPath, JSON.stringify(remotionConfig, null, 2));
console.log(`Generated config: ${configPath}`);

// Install deps if needed
const isWindows = process.platform === 'win32';
if (!fs.existsSync(path.join(root, 'node_modules', '@remotion', 'cli'))) {
  console.log('Remotion not installed — running npm install...');
  execFileSync('npm', ['install'], { cwd: root, stdio: 'inherit', shell: isWindows });
}

// Render
const remotionCli = path.join(root, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');
const outputPath = path.join(finalDir, 'video.mp4');

console.log(`\nRendering → ${outputPath}`);
execFileSync(
  process.execPath,
  [remotionCli, 'render', 'src/index.ts', 'PexelsTalkVideo', outputPath, `--props=${configPath}`],
  { cwd: root, stdio: 'inherit' }
);

console.log(`\nDone! Video: ${outputPath}`);
