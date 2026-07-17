#!/usr/bin/env node
/**
 * render-project.mjs
 * - Automatically generates a Remotion config from a project's manifest.json
 * - Renders the video into public/<project>/final/video.mp4
 * 
 * Usage: node scripts/render-project.mjs <project-folder-name>
 * Example: node scripts/render-project.mjs van_xai_tin_dung_260716_164922
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectFolder = process.argv[2];

if (!projectFolder) {
  console.error("Usage: node scripts/render-project.mjs <project-folder-name>");
  process.exit(1);
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
    caption: seg.subtitle || seg.dialogueOrNarration || "",
  };
});

// Build Remotion Config object
const remotionConfig = {
  title: manifest.title || "slideshow-video",
  orientation: "portrait", // Portrait is default for TikTok/Shorts
  captionPosition: "bottom",
  imageFit: "cover",
  kenBurns: true,
  transitionSeconds: 0.5,
  bgColor: "#0E0F13",
  fontFamily: "'Be Vietnam Pro','Noto Sans',Arial,sans-serif",
  captionMode: "chunked",
  captionWordsPerChunk: 4,
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
