#!/usr/bin/env node
/**
 * render-project.mjs
 * - Automatically generates a Remotion config from a project's manifest.json
 * - Renders the video into public/<project>/final/video.mp4
 *
 * Usage: node scripts/render-project.mjs <project-folder-name> [options]
 * Example: node scripts/render-project.mjs van_xai_tin_dung_260716_164922
 * Example with options:
 *   node scripts/render-project.mjs my-video --captionStyle=karaoke --transitionStyle=slide-left --bilingual=false
 *
 * Options (all optional, fall back to the skill's original defaults):
 *   --captionStyle=box|tiktok|karaoke|page|hook
 *   --transitionStyle=crossfade|slide-left|slide-right|slide-up|zoom
 *   --bilingual=true|false   (show/hide the "\n"-separated translation line)
 *   --captionFont=be-vietnam-pro|roboto|montserrat|nunito|inter|oswald
 *   --captionFontSize=<16-120>
 *   --captionTextColor=<CSS color, e.g. "#FFFFFF">
 *   --captionBgColor=<CSS color, or "transparent" to remove the box>
 *   --highlightColor=<CSS color> (karaoke/page active-word highlight pill)
 *
 * --captionStyle=page automatically switches captionMode to "full" and
 * captionPosition to "center" (a whole scene's text held on screen, word-
 * highlighted, centered) instead of the default chunked/bottom subtitle —
 * that combination is what makes the "page" style read as a book page
 * rather than a short caption. See Caption.tsx / schema.ts.
 *
 * --captionStyle=hook is a top-anchored title card: scene 0 shows the
 * video's own title (big, uppercase, meant to hook the viewer in the first
 * few seconds), every other scene shows its own caption in a smaller card
 * (any leading "N." list-number prefix stripped). Slides down + fades in on
 * entry, slides up + fades out on exit. Also nudges the scene's image down
 * a little to leave headroom under the card. See Caption.tsx / schema.ts.
 *
 * The 4 --caption*Font/Size/Color flags are CapCut-style manual overrides on
 * top of whatever captionStyle already looks like — each is independent and
 * only replaces the one thing it names (see schema.ts).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectFolder = process.argv[2];

if (!projectFolder) {
  console.error("Usage: node scripts/render-project.mjs <project-folder-name> [--captionStyle=...] [--transitionStyle=...] [--bilingual=true|false]");
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
const CAPTION_STYLES = ["box", "tiktok", "karaoke", "page", "hook"];
const TRANSITION_STYLES = ["crossfade", "slide-left", "slide-right", "slide-up", "zoom"];
const CAPTION_FONTS = ["be-vietnam-pro", "roboto", "montserrat", "nunito", "inter", "oswald"];
// Loose allowlist for freeform color strings (hex, rgb()/rgba(), "transparent",
// CSS named colors) — just enough to reject obviously malformed input before
// it lands in config.json; execFileSync (no shell) already rules out any
// command-injection risk regardless of what's in this string.
const CSS_COLOR_RE = /^[a-zA-Z0-9#(),.\s%-]+$/;

const captionStyle = CAPTION_STYLES.includes(flags.captionStyle) ? flags.captionStyle : "box";
const transitionStyle = TRANSITION_STYLES.includes(flags.transitionStyle) ? flags.transitionStyle : "crossfade";
const showBilingual = flags.bilingual === undefined ? true : flags.bilingual !== "false";
// "page" only makes sense as a whole-scene, centered block — see the usage note above.
const isPageStyle = captionStyle === "page";
// "hook" ignores captionPosition/captionMode entirely (Caption.tsx hardcodes its own
// top/full layout for this style) — set them to reflect that anyway so config.json stays
// accurate for anyone reading it, same reasoning as isPageStyle above.
const isHookStyle = captionStyle === "hook";

const captionFont = CAPTION_FONTS.includes(flags.captionFont) ? flags.captionFont : undefined;
const parsedFontSize = flags.captionFontSize !== undefined ? Number(flags.captionFontSize) : NaN;
const captionFontSize = Number.isFinite(parsedFontSize) && parsedFontSize >= 16 && parsedFontSize <= 120
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

// Gemini đôi khi lẫn [emotion tag] (vd "[warmly]") vào field subtitle hiển thị trên màn hình, dù
// tag này chỉ nhằm hướng dẫn giọng đọc TTS diễn cảm hơn (xem AGENT_TOOL's voiceover/route.js —
// nơi tag được strip trước khi gửi tổng hợp giọng). Strip theo TỪNG DÒNG (không strip \s+ toàn
// chuỗi) vì caption song ngữ dùng "\n" làm ranh giới dòng chính/dịch — xem Caption.tsx.
function stripEmotionTags(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.replace(/\[[^\]]*\]/g, " ").replace(/[ \t]+/g, " ").trim())
    .join("\n");
}

const projectPath = path.join(root, "public", projectFolder);
const manifestPath = path.join(projectPath, "manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.error(`Error: manifest.json not found in ${projectPath}`);
  process.exit(1);
}

console.log(`Reading manifest: ${manifestPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

// Determine file extensions for images and audio
const imageDir = path.join(projectPath, "images");
const audioDir = path.join(projectPath, "audio");

// Map segments to Remotion scenes
const scenes = manifest.segments.map((seg) => {
  const paddedNum = String(seg.segmentNumber).padStart(2, "0");
  
  // Detect image extension (fallback to jpg)
  let imgExt = "jpg";
  if (fs.existsSync(imageDir)) {
    const files = fs.readdirSync(imageDir);
    const match = files.find((f) => f.startsWith(`scene-${paddedNum}.`));
    if (match) imgExt = match.split(".").pop();
  }

  // Detect audio extension (fallback to mp3)
  let audExt = "mp3";
  if (fs.existsSync(audioDir)) {
    const files = fs.readdirSync(audioDir);
    const match = files.find((f) => f.startsWith(`scene-${paddedNum}.`));
    if (match) audExt = match.split(".").pop();
  }

  return {
    image: `${projectFolder}/images/scene-${paddedNum}.${imgExt}`,
    audio: `${projectFolder}/audio/scene-${paddedNum}.${audExt}`,
    caption: stripEmotionTags(seg.subtitle || seg.dialogueOrNarration || ""),
    // Real per-word timing from ElevenLabs' alignment API, if the voiceover
    // step captured it (see AGENT_TOOL's voiceover/route.js) — lets
    // captionStyle: "karaoke" highlight the exact word being spoken instead
    // of estimating from word length. Omitted entirely when absent, so it
    // falls back to the estimate (schema field is optional).
    ...(Array.isArray(seg.wordTimings) && seg.wordTimings.length > 0 ? { wordTimings: seg.wordTimings } : {}),
  };
});

// Nhạc nền (tuỳ chọn) — tự dò file audio/bg-music.<ext>
let bgMusicPath = null;
if (fs.existsSync(audioDir)) {
  const files = fs.readdirSync(audioDir);
  const match = files.find((f) => f.startsWith("bg-music."));
  if (match) bgMusicPath = `${projectFolder}/audio/${match}`;
}

const bgMusicEnabled = flags.bgMusicEnabled === undefined ? true : flags.bgMusicEnabled !== "false";
const parsedBgMusicVolume = flags.bgMusicVolume !== undefined ? Number(flags.bgMusicVolume) : NaN;
const bgMusicVolume = Number.isFinite(parsedBgMusicVolume) && parsedBgMusicVolume >= 0 && parsedBgMusicVolume <= 1
  ? parsedBgMusicVolume
  : 0.12;

// Build Remotion Config object
const remotionConfig = {
  title: manifest.title || "slideshow-video",
  // Đọc orientation từ cờ truyền vào (--orientation=landscape|portrait) hoặc từ manifest
  orientation: (flags.orientation === "landscape" || flags.orientation === "portrait")
    ? flags.orientation
    : (manifest.orientation === "landscape" ? "landscape" : "portrait"),
  captionPosition: isPageStyle ? "center" : isHookStyle ? "top" : "bottom",
  imageFit: "cover",
  kenBurns: !isPageStyle,
  transitionSeconds: 0.5,
  transitionStyle,
  bgColor: "#0E0F13",
  fontFamily: "'Be Vietnam Pro','Noto Sans',Arial,sans-serif",
  captionMode: isPageStyle || isHookStyle ? "full" : "chunked",
  captionWordsPerChunk: 4,
  captionStyle,
  captionFont,
  captionFontSize,
  captionTextColor,
  captionBgColor,
  highlightColor,
  showBilingual,
  audioPaddingSeconds: 0.4,
  scenes: scenes,
  // Chỉ đưa bgMusic vào config khi THỰC SỰ có file đã tải lên VÀ chưa bị tắt tường minh
  ...(bgMusicPath && bgMusicEnabled ? { bgMusic: bgMusicPath, bgMusicVolume } : {}),
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
    "SlideshowVideo",
    outputVideoPath,
    `--props=${configOutPath}`,
  ],
  { cwd: root, stdio: "inherit" }
);

console.log(`\nSuccess! The final video is ready: public/${projectFolder}/final/video.mp4`);
