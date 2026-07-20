#!/usr/bin/env node
/**
 * render.mjs — one command for this whole skill, for a hand-authored config
 * (or a JSON array of them) rather than an AGENT_TOOL manifest.json — see
 * scripts/render-project.mjs for the manifest-driven path.
 * - Installs Remotion deps if missing (node_modules absent).
 * - Accepts one config object OR a JSON array of configs (batch).
 * - Output lands inside the same project folder as the input assets: for a
 *   config whose `image`/`audio` are "my-video/scene-01.jpg" /
 *   "my-video/scene-01.mp3", the project folder is "my-video" (the first
 *   path segment), and the video + the exact config used are written to
 *   public/my-video/final/.
 *
 * Usage: node scripts/render.mjs <config.json | configs-array.json>
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = process.argv[2];
if (!configPath) {
  console.error("Usage: node scripts/render.mjs <config.json | configs-array.json>");
  process.exit(1);
}

// On Windows, npm is a .cmd shim, and Node's execFileSync refuses to spawn
// .cmd/.bat files directly (EINVAL) unless shell: true is set.
const isWindows = process.platform === "win32";

if (!fs.existsSync(path.join(root, "node_modules", "@remotion", "cli"))) {
  console.log("Remotion not installed yet — running npm install...");
  execFileSync("npm", ["install"], { cwd: root, stdio: "inherit", shell: isWindows });
}

const remotionCliEntry = path.join(root, "node_modules", "@remotion", "cli", "remotion-cli.js");

const slugify = (s) =>
  (s || "reading-page-video")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50) || "reading-page-video";

const isRemote = (src) => src.startsWith("http://") || src.startsWith("https://");

// The project folder a config's output belongs in: the shared first path
// segment of `image`/`audio` (when local). Falls back to a slug of
// `projectTitle` only if both are remote URLs (nothing local to anchor to).
const projectFolderFor = (cfg, index) => {
  const localSegments = [cfg.image, cfg.audio]
    .filter((src) => typeof src === "string" && !isRemote(src))
    .map((src) => src.split("/")[0]);

  if (localSegments.length === 0) {
    return `${String(index + 1).padStart(2, "0")}-${slugify(cfg.projectTitle)}`;
  }

  const folder = localSegments[0];
  const mismatched = localSegments.find((s) => s !== folder);
  if (mismatched) {
    console.warn(
      `Warning: item ${index + 1}'s image/audio span multiple public/ folders ` +
        `("${folder}" vs "${mismatched}") — using "${folder}" for output.`
    );
  }
  return folder;
};

const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
const items = Array.isArray(parsed) ? parsed : [parsed];

items.forEach((cfg, i) => {
  const projectFolder = projectFolderFor(cfg, i);
  const dir = path.join(root, "public", projectFolder, "final");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "config.json"), JSON.stringify(cfg, null, 2));

  console.log(`\n[${i + 1}/${items.length}] rendering -> public/${projectFolder}/final/video.mp4`);
  execFileSync(
    process.execPath,
    [
      remotionCliEntry,
      "render",
      "src/index.ts",
      "ReadingPageVideo",
      path.join(dir, "video.mp4"),
      `--props=${path.join(dir, "config.json")}`,
    ],
    { cwd: root, stdio: "inherit" }
  );
});

console.log(`\nDone. Each video's final/video.mp4 lives alongside its own input assets under public/<project>/.`);
