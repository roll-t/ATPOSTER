#!/usr/bin/env node
/**
 * render.mjs — one command for this whole skill.
 * - Installs Remotion deps if missing (node_modules absent).
 * - Accepts one config object OR a JSON array of configs (batch).
 * - Output lands inside the same project folder as the input assets: for a
 *   config whose scenes reference "my-video/images/scene-01.jpg", the
 *   project folder is "my-video" (the first path segment), and the video
 *   + the exact config used are written to public/my-video/final/ — so one
 *   folder ends up holding everything for that video, inputs and output
 *   together. This assumes the convention documented in public/README.md:
 *   every scene in one config lives under a single top-level public/
 *   subfolder.
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
// .cmd/.bat files directly (EINVAL) unless shell: true is set — this runs
// it via cmd.exe instead of exec'ing directly, which is required on Windows
// and harmless on macOS/Linux (where npm is a plain executable). Args here
// are always our own static/computed strings, never raw user input, so the
// lack of shell-escaping this implies is not a real injection risk.
const isWindows = process.platform === "win32";

if (!fs.existsSync(path.join(root, "node_modules", "@remotion", "cli"))) {
  console.log("Remotion not installed yet — running npm install...");
  execFileSync("npm", ["install"], { cwd: root, stdio: "inherit", shell: isWindows });
}

// Invoke the locally installed Remotion CLI's JS entry point directly via
// `node`, instead of going through the npx/npm shim — this sidesteps the
// .cmd-on-Windows problem entirely (no shell needed at all) and works
// identically on every platform.
const remotionCliEntry = path.join(root, "node_modules", "@remotion", "cli", "remotion-cli.js");

const slugify = (s) =>
  (s || "slideshow-video")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50) || "slideshow-video";

const isRemote = (src) => src.startsWith("http://") || src.startsWith("https://");

// The project folder a config's output belongs in: the first path segment
// shared by every local (non-URL) scene asset. Falls back to a slug of
// `title` only if every scene uses a remote URL (nothing local to anchor
// the folder to).
const projectFolderFor = (cfg, index) => {
  const localSegments = cfg.scenes
    .flatMap((scene) => [scene.image, scene.audio])
    .filter((src) => !isRemote(src))
    .map((src) => src.split("/")[0]);

  if (localSegments.length === 0) {
    return `${String(index + 1).padStart(2, "0")}-${slugify(cfg.title)}`;
  }

  const folder = localSegments[0];
  const mismatched = localSegments.find((s) => s !== folder);
  if (mismatched) {
    console.warn(
      `Warning: item ${index + 1}'s scenes span multiple public/ folders ` +
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
      "SlideshowVideo",
      path.join(dir, "video.mp4"),
      `--props=${path.join(dir, "config.json")}`,
    ],
    { cwd: root, stdio: "inherit" }
  );
});

console.log(`\nDone. Each video's final/video.mp4 lives alongside its own input assets under public/<project>/.`);
