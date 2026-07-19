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
 *   --captionStyle=box|tiktok|karaoke
 *   --transitionStyle=crossfade|slide-left|slide-right|slide-up|zoom
 *   --bilingual=true|false   (show/hide the "\n"-separated translation line)
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
const CAPTION_STYLES = ["box", "tiktok", "karaoke"];
const TRANSITION_STYLES = ["crossfade", "slide-left", "slide-right", "slide-up", "zoom"];
const captionStyle = CAPTION_STYLES.includes(flags.captionStyle) ? flags.captionStyle : "box";
const transitionStyle = TRANSITION_STYLES.includes(flags.transitionStyle) ? flags.transitionStyle : "crossfade";
const showBilingual = flags.bilingual === undefined ? true : flags.bilingual !== "false";

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
    caption: seg.subtitle || seg.dialogueOrNarration || "",
    // Real per-word timing from ElevenLabs' alignment API, if the voiceover
    // step captured it (see AGENT_TOOL's voiceover/route.js) — lets
    // captionStyle: "karaoke" highlight the exact word being spoken instead
    // of estimating from word length. Omitted entirely when absent, so it
    // falls back to the estimate (schema field is optional).
    ...(Array.isArray(seg.wordTimings) && seg.wordTimings.length > 0 ? { wordTimings: seg.wordTimings } : {}),
  };
});

// Build Remotion Config object
const remotionConfig = {
  title: manifest.title || "slideshow-video",
  // Đọc orientation thật từ manifest (do UI/extension ghi lại theo aspectRatio người dùng
  // chọn lúc sinh ảnh) — mặc định portrait cho các manifest cũ chưa có field này.
  orientation: manifest.orientation === "landscape" ? "landscape" : "portrait",
  captionPosition: "bottom",
  imageFit: "cover",
  kenBurns: true,
  transitionSeconds: 0.5,
  transitionStyle,
  bgColor: "#0E0F13",
  fontFamily: "'Be Vietnam Pro','Noto Sans',Arial,sans-serif",
  captionMode: "chunked",
  captionWordsPerChunk: 4,
  captionStyle,
  showBilingual,
  audioPaddingSeconds: 0.4,
  bgMusicVolume: 0.12,
  scenes: scenes,
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
