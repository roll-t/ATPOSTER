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
import os from 'node:os';
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

// Detect background video(s) in bg/ folder.
//
// TRƯỚC ĐÂY ở đây ghép sẵn toàn bộ clip nền thành 1 file background-looped.mp4 bằng
// `ffmpeg -f concat -c:v copy`. Cách đó hỏng theo 2 hướng và là nguồn gốc của lỗi nền "đơ + giật":
//   1. `-c:v copy` chỉ ghép được khi MỌI clip đầu vào trùng codec/độ phân giải/fps/timebase. Clip
//      tải từ Pexels thì mỗi clip một kiểu, nên file ghép ra có timestamp hỏng -> phát bị giật,
//      không mượt như file gốc.
//   2. Độ dài file ghép tính theo `durationSeconds` ƯỚC LƯỢNG trong manifest, trong khi thời lượng
//      thật của video lấy từ độ dài file audio đo ở calculateMetadata. Hai con số này lệch nhau.
//
// Giờ chỉ ĐO độ dài thật của từng clip rồi giao cho Remotion nối: VideoBackground nối liên tiếp
// theo đúng độ dài thật, hết danh sách thì quay vòng, và cắt clip cuối đúng lúc hết thoại.
const bgDir = path.join(projectPath, 'bg');
let backgroundVideo = manifest.backgroundVideo || '';
let backgroundVideos = [];

// ffprobe dùng chung cho cả playlist nền lẫn nền riêng của từng đoạn — ưu tiên bản đi kèm Remotion
// compositor, không có thì dùng ffprobe của hệ thống.
const ffprobeExe = (() => {
  const isWin = process.platform === 'win32';
  const pkg = isWin ? 'compositor-win32-x64-msvc'
    : process.platform === 'darwin'
      ? (process.arch === 'arm64' ? 'compositor-darwin-arm64' : 'compositor-darwin-x64')
      : (process.arch === 'arm64' ? 'compositor-linux-arm64-musl' : 'compositor-linux-x64-musl');
  const wsRoot = path.resolve(root, '..', '..', '..');
  const localDir = path.join(root, 'node_modules', '@remotion', pkg);
  const rootDir = path.join(wsRoot, 'node_modules', '@remotion', pkg);
  const dir = fs.existsSync(localDir) ? localDir : rootDir;
  const bundled = path.join(dir, isWin ? 'ffprobe.exe' : 'ffprobe');
  return fs.existsSync(bundled) ? bundled : 'ffprobe';
})();

function getDuration(filePath) {
  try {
    const out = execFileSync(ffprobeExe, [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', filePath,
    ]).toString().trim();
    const secs = parseFloat(out);
    return Number.isFinite(secs) && secs > 0 ? secs : 0;
  } catch { return 0; }
}

if (fs.existsSync(bgDir)) {
  const LEGACY_LOOPED_NAME = 'background-looped.mp4';

  // "seg-bg-NN.mp4" là nền RIÊNG của đoạn NN, không thuộc playlist chung — ghép riêng bên dưới.
  const srcFiles = fs.readdirSync(bgDir)
    .filter(f => (f.endsWith('.mp4') || f.endsWith('.webm'))
      && f !== LEGACY_LOOPED_NAME
      && !f.startsWith('seg-bg-'))
    .sort()
    .map(f => path.join(bgDir, f))
    .filter(f => fs.existsSync(f));

  if (srcFiles.length > 0) {
    backgroundVideos = srcFiles.map((f) => {
      const src = `${projectFolder}/bg/${path.basename(f)}`;
      const durationInSeconds = getDuration(f);
      if (!durationInSeconds) {
        // Không đo được (thiếu ffprobe / file lỗi) — để VideoBackground dùng độ dài giả định
        // an toàn của nó thay vì ghi một con số bịa vào config.
        console.warn(`[BgVideo] Không đo được độ dài: ${path.basename(f)} — dùng độ dài giả định.`);
        return { src };
      }
      return { src, durationInSeconds };
    });

    const measured = backgroundVideos.filter(v => v.durationInSeconds);
    const totalBgSecs = measured.reduce((sum, v) => sum + v.durationInSeconds, 0);
    console.log(
      `[BgVideo] ${backgroundVideos.length} clip nền, tổng ${totalBgSecs.toFixed(1)}s `
      + `(${measured.length}/${backgroundVideos.length} clip đo được độ dài). `
      + `Remotion sẽ nối liên tiếp & quay vòng cho tới khi hết thoại.`
    );

    backgroundVideo = backgroundVideos[0].src;

    // Dọn file ghép của cơ chế cũ: không còn dùng tới, mà mỗi file nặng hàng chục MB.
    const legacyLooped = path.join(bgDir, LEGACY_LOOPED_NAME);
    for (const stale of [legacyLooped, path.join(bgDir, 'concat-list.txt')]) {
      if (fs.existsSync(stale)) {
        try {
          fs.unlinkSync(stale);
          console.log(`[BgVideo] Đã xoá tệp thừa của cơ chế ghép cũ: ${path.basename(stale)}`);
        } catch (err) {
          console.warn(`[BgVideo] Không xoá được ${path.basename(stale)}:`, err.message);
        }
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

  // Nền riêng của đoạn: file "seg-bg-NN.mp4" trong bg/. Đo độ dài thật để Remotion cắt đúng lúc
  // clip hết thay vì để nó đứng hình cho tới hết đoạn.
  let segBg = {};
  const segBgPath = path.join(bgDir, `seg-bg-${paddedNum}.mp4`);
  if (fs.existsSync(segBgPath)) {
    const secs = getDuration(segBgPath);
    segBg = {
      bgVideo: `${projectFolder}/bg/seg-bg-${paddedNum}.mp4`,
      ...(secs > 0 ? { bgVideoDurationInSeconds: secs } : {}),
    };
  }

  return {
    caption: subtitle,
    audio: `${projectFolder}/audio/scene-${paddedNum}.${audExt}`,
    durationInFrames,
    ...segBg,
    ...(Array.isArray(seg.wordTimings) && seg.wordTimings.length > 0 ? { wordTimings: seg.wordTimings } : {}),
  };
});

const segmentsWithOwnBg = segments.filter(s => s.bgVideo).length;
if (segmentsWithOwnBg > 0) {
  console.log(`[BgVideo] ${segmentsWithOwnBg}/${segments.length} đoạn có nền riêng khớp lời kể.`);
}

// Build config
const remotionConfig = {
  title: manifest.title || projectFolder,
  orientation: flags.orientation === 'landscape' || flags.orientation === 'portrait'
    ? flags.orientation
    : (manifest.orientation || 'portrait'),
  segments,
  backgroundVideo,
  ...(backgroundVideos.length > 0 ? { backgroundVideos } : {}),
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

// Tìm @remotion/cli: local trước, rồi fallback lên workspace root (RENDER/node_modules).
// Khi dùng npm workspaces, npm install từ skill dir hoisting lên root chứ không cài local,
// nên cần check cả 2 vị trí thay vì chỉ dùng đường dẫn local cứng.
const isWindows = process.platform === 'win32';
const workspaceRoot = path.resolve(root, '..', '..', '..'); // RENDER/
const localCliDir = path.join(root, 'node_modules', '@remotion', 'cli');
const workspaceCliDir = path.join(workspaceRoot, 'node_modules', '@remotion', 'cli');

if (!fs.existsSync(localCliDir) && !fs.existsSync(workspaceCliDir)) {
  console.log('Remotion not installed — running npm install...');
  execFileSync('npm', ['install'], { cwd: workspaceRoot, stdio: 'inherit', shell: isWindows });
}

// Render
const remotionCli = path.join(
  fs.existsSync(localCliDir) ? localCliDir : workspaceCliDir,
  'remotion-cli.js'
);
const outputPath = path.join(finalDir, 'video.mp4');

const cores = os.cpus().length;
const defaultConcurrency = Math.max(1, Math.floor(cores / 2));
const concurrency = process.env.REMOTION_CONCURRENCY ? parseInt(process.env.REMOTION_CONCURRENCY, 10) : defaultConcurrency;

console.log(`\nRendering → ${outputPath} (concurrency: ${concurrency}/${cores})`);
execFileSync(
  process.execPath,
  [
    remotionCli,
    'render',
    'src/index.ts',
    'PexelsTalkVideo',
    outputPath,
    `--props=${configPath}`,
    `--concurrency=${concurrency}`
  ],
  { cwd: root, stdio: 'inherit' }
);

console.log(`\nDone! Video: ${outputPath}`);
