#!/usr/bin/env node
/**
 * render-project.mjs
 * - Automatically generates a ReadingPageVideo config from a project's manifest.json
 * - Renders the video into public/<project>/final/video.mp4
 *
 * Unlike narrated-slideshow-video's render-project.mjs, this always takes
 * ONLY manifest.segments[0] — this skill is a single-slide format (the whole
 * script held on one page for the whole video), so a manifest with more than
 * one segment just has the extras ignored (logged as a warning).
 *
 * Usage: node scripts/render-project.mjs <project-folder-name> [options]
 * Example: node scripts/render-project.mjs my-video --captionFont=oswald --captionFontSize=36
 *
 * Options (all optional, fall back to the skill's own defaults):
 *   --orientation=landscape|portrait
 *   --bilingual=true|false        (show/hide the "\n"-separated translation line)
 *   --captionFont=be-vietnam-pro|roboto|montserrat|nunito|inter|oswald
 *   --captionFontSize=<14-96>
 *   --captionTextColor=<CSS color, e.g. "#241C10">
 *   --captionBgColor=<CSS color, or "transparent" to remove the paper card>
 *   --highlightColor=<CSS color>  (karaoke highlight pill color)
 *   --heroHeightPercent=<10-60>   (% of frame the hero illustration takes)
 *   --titleHeightPercent=<4-30>   (% of frame the title band takes)
 *   --bodyHeightPercent=<15-75>   (% of frame the body band takes — bottom space is whatever's left)
 *   --titleFontSize=<20-80>       (title px size, default 44)
 *   --titleBodyGap=<0-80>         (px gap between title and body, default 18)
 *   --contentPaddingPercent=<0-30> (horizontal padding around title/body, % of frame width per side, default 10)
 *   --bodyAlign=left|justify      (body text alignment — "justify" = CapCut-style "canh đều", default left)
 *   --bgMusicEnabled=true|false   (play the uploaded audio/bg-music.<ext> file, if any — default true when present)
 *   --bgMusicVolume=<0-1>         (background music volume, default 0.12 — always much quieter than narration)
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectFolder = process.argv[2];

if (!projectFolder) {
  console.error("Usage: node scripts/render-project.mjs <project-folder-name> [--captionFont=...] [--captionFontSize=...] [--captionTextColor=...] [--captionBgColor=...] [--bilingual=true|false]");
  process.exit(1);
}

// Parse --key=value flags from the remaining argv, ignoring anything malformed
// or not on the allowed list — always falls back to the schema's own default
// rather than passing a bad value through to Remotion.
const flags = {};
for (const arg of process.argv.slice(3)) {
  const match = arg.match(/^--([a-zA-Z]+)=(.*)$/);
  if (match) flags[match[1]] = match[2];
}

const CAPTION_FONTS = ["be-vietnam-pro", "roboto", "montserrat", "nunito", "inter", "oswald"];
// Loose allowlist for freeform color strings (hex, rgb()/rgba(), "transparent",
// CSS named colors) — just enough to reject obviously malformed input before
// it lands in config.json; execFileSync (no shell) already rules out any
// command-injection risk regardless of what's in this string.
const CSS_COLOR_RE = /^[a-zA-Z0-9#(),.\s%-]+$/;

const orientation = (flags.orientation === "landscape" || flags.orientation === "portrait")
  ? flags.orientation
  : undefined; // resolved from manifest below if not passed
const showBilingual = flags.bilingual === undefined ? true : flags.bilingual !== "false";
const captionFont = CAPTION_FONTS.includes(flags.captionFont) ? flags.captionFont : undefined;
const parsedFontSize = flags.captionFontSize !== undefined ? Number(flags.captionFontSize) : NaN;
const captionFontSize = Number.isFinite(parsedFontSize) && parsedFontSize >= 14 && parsedFontSize <= 96
  ? parsedFontSize
  : undefined;
const captionTextColor = flags.captionTextColor && CSS_COLOR_RE.test(flags.captionTextColor)
  ? flags.captionTextColor
  : undefined;
const captionBgColor = flags.captionBgColor && CSS_COLOR_RE.test(flags.captionBgColor)
  ? flags.captionBgColor
  : undefined;
const highlightColor = flags.highlightColor && CSS_COLOR_RE.test(flags.highlightColor)
  ? flags.highlightColor
  : undefined;

// Layout percentage/px overrides — same "parse, range-check, else undefined
// (schema default applies)" pattern as the fields above.
function parseNumberFlag(raw, min, max) {
  const n = raw !== undefined ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}
const captionBgOpacity = parseNumberFlag(flags.captionBgOpacity, 0, 100);
const heroHeightPercent = parseNumberFlag(flags.heroHeightPercent, 0, 60);
const titleHeightPercent = parseNumberFlag(flags.titleHeightPercent, 4, 30);
const bodyHeightPercent = parseNumberFlag(flags.bodyHeightPercent, 15, 75);
const titleFontSize = parseNumberFlag(flags.titleFontSize, 20, 80);
const titleBodyGap = parseNumberFlag(flags.titleBodyGap, 0, 80);
const contentPaddingPercent = parseNumberFlag(flags.contentPaddingPercent, 0, 30);
const bodyAlign = (flags.bodyAlign === "left" || flags.bodyAlign === "justify") ? flags.bodyAlign : undefined;
const imageMode = (flags.imageMode === "hero" || flags.imageMode === "full_bg" || flags.imageMode === "none") ? flags.imageMode : undefined;
const bgMusicEnabled = flags.bgMusicEnabled !== "false"; // mặc định bật nếu có file, trừ khi FE tắt tường minh
const bgMusicVolume = parseNumberFlag(flags.bgMusicVolume, 0, 1);

let projectPath = path.join(root, "public", projectFolder);
let manifestPath = path.join(projectPath, "manifest.json");

if (!fs.existsSync(manifestPath)) {
  const fallbackCandidates = [
    path.resolve(projectFolder),
    path.resolve(root, "..", "..", "narrated-slideshow-video", "remotion", "public", projectFolder),
    path.resolve(root, "..", "..", "reading-page-video", "remotion", "public", projectFolder),
  ];
  for (const cand of fallbackCandidates) {
    const candidateManifest = path.join(cand, "manifest.json");
    if (fs.existsSync(candidateManifest)) {
      projectPath = cand;
      manifestPath = candidateManifest;
      break;
    }
  }
}

if (!fs.existsSync(manifestPath)) {
  console.error(`Error: manifest.json not found in ${projectPath}`);
  process.exit(1);
}

console.log(`Reading manifest: ${manifestPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

if (!Array.isArray(manifest.segments) || manifest.segments.length === 0) {
  console.error("Error: manifest.json has no segments.");
  process.exit(1);
}
if (manifest.segments.length > 1) {
  console.warn(`Warning: manifest has ${manifest.segments.length} segments, but reading-page-video only renders ONE slide — using segment 1, ignoring the rest.`);
}
const seg = manifest.segments[0];
const paddedNum = String(seg.segmentNumber ?? 1).padStart(2, "0");

// Detect the hero image file. AGENT_TOOL's reading_practice pipeline can generate an oriented
// PAIR of hero images alongside the plain one — scene-NN-landscape.<ext> (for imageMode
// "hero", a top banner strip) and scene-NN-portrait.<ext> (for imageMode "full_bg", a
// full-bleed background) — see buildSegmentedPrompts.js and content-flow.js's
// generateSecondaryVariant. Prefer whichever orientation matches the current imageMode; fall
// back to the older flat scene-NN.<ext> (no orientation split) for projects made before this
// existed, or when imageMode is "none"/unset (no image shown, so orientation doesn't matter).
const imageDir = path.join(projectPath, "images");
function findImageFile(baseName) {
  if (!fs.existsSync(imageDir)) return null;
  const files = fs.readdirSync(imageDir);
  return files.find((f) => f.startsWith(`${baseName}.`)) || null;
}

let imageFile = null;
if (imageMode === "hero") imageFile = findImageFile(`scene-${paddedNum}-landscape`);
else if (imageMode === "full_bg") imageFile = findImageFile(`scene-${paddedNum}-portrait`);
if (!imageFile) imageFile = findImageFile(`scene-${paddedNum}`);

const imgExt = imageFile ? imageFile.split(".").pop() : "jpg";
const imageBaseName = imageFile ? imageFile.slice(0, -(imgExt.length + 1)) : `scene-${paddedNum}`;

// Detect audio extension (fallback to mp3)
const audioDir = path.join(projectPath, "audio");
let audExt = "mp3";
if (fs.existsSync(audioDir)) {
  const files = fs.readdirSync(audioDir);
  const match = files.find((f) => f.startsWith(`scene-${paddedNum}.`));
  if (match) audExt = match.split(".").pop();
}

// Nhạc nền (tuỳ chọn) — tự dò file audio/bg-music.<ext> do người dùng tải lên qua AGENT_TOOL's
// "Studio Thiết Kế Trang Đọc Video" (dùng chung save-image route, không đóng gói sẵn nhạc theo
// skill). Không có file này thì đơn giản là không phát nhạc nền, không cần cấu hình gì thêm.
let bgMusicPath = null;
if (fs.existsSync(audioDir)) {
  const files = fs.readdirSync(audioDir);
  const match = files.find((f) => f.startsWith("bg-music."));
  if (match) bgMusicPath = `${projectFolder}/audio/${match}`;
}

// Build Remotion Config object
const remotionConfig = {
  projectTitle: manifest.title || "reading-page-video",
  level: manifest.input?.level || manifest.level || flags.level || "",
  orientation: orientation || (manifest.orientation === "landscape" ? "landscape" : "portrait"),
  image: `${projectFolder}/images/${imageBaseName}.${imgExt}`,
  imageFit: "cover",
  audio: `${projectFolder}/audio/scene-${paddedNum}.${audExt}`,
  audioPaddingSeconds: 0.5,
  title: manifest.title || "",
  body: seg.subtitle || seg.dialogueOrNarration || "",
  showBilingual,
  bgColor: "#0E0F13",
  fontFamily: "'Be Vietnam Pro','Noto Sans',Arial,sans-serif",
  captionFont,
  captionFontSize,
  captionTextColor,
  captionBgColor,
  captionBgOpacity,
  highlightColor,
  heroHeightPercent,
  titleHeightPercent,
  bodyHeightPercent,
  titleFontSize,
  titleBodyGap,
  contentPaddingPercent,
  bodyAlign,
  imageMode,
  // Real per-word timing from ElevenLabs' alignment API, if the voiceover
  // step captured it (see AGENT_TOOL's voiceover/route.js) — lets the
  // karaoke highlight track the exact word being spoken instead of
  // estimating from word length. Omitted entirely when absent.
  ...(Array.isArray(seg.wordTimings) && seg.wordTimings.length > 0 ? { wordTimings: seg.wordTimings } : {}),
  // Chỉ đưa bgMusic vào config khi THỰC SỰ có file đã tải lên VÀ chưa bị tắt tường minh —
  // omit hẳn field (không phải để "") khi không dùng, khớp đúng kiểu optional() của schema.
  ...(bgMusicPath && bgMusicEnabled ? { bgMusic: bgMusicPath, bgMusicVolume: bgMusicVolume ?? 0.12 } : {}),
};

// Ensure output final directory exists
const finalDir = path.join(projectPath, "final");
fs.mkdirSync(finalDir, { recursive: true });

// Write config.json
const configOutPath = path.join(finalDir, "config.json");
fs.writeFileSync(configOutPath, JSON.stringify(remotionConfig, null, 2));
console.log(`Generated Remotion config: ${configOutPath}`);

// Run Remotion install if missing
const isWindows = process.platform === "win32";
if (!fs.existsSync(path.join(root, "node_modules", "@remotion", "cli"))) {
  console.log("Remotion not installed yet — running npm install...");
  execFileSync("npm", ["install"], { cwd: root, stdio: "inherit", shell: isWindows });
}

// Render the video
const remotionCliEntry = path.join(root, "node_modules", "@remotion", "cli", "remotion-cli.js");
const outputVideoPath = path.join(finalDir, "video.mp4");

console.log(`\nRendering video to -> public/${projectFolder}/final/video.mp4`);
execFileSync(
  process.execPath,
  [
    remotionCliEntry,
    "render",
    "src/index.ts",
    "ReadingPageVideo",
    outputVideoPath,
    `--props=${configOutPath}`,
  ],
  { cwd: root, stdio: "inherit" }
);

console.log(`\nSuccess! The final video is ready: public/${projectFolder}/final/video.mp4`);
