import { staticFile } from "remotion";

export const resolveSrc = (src: string): string =>
  src.startsWith("http://") || src.startsWith("https://")
    ? src
    : staticFile(src);

export const sceneSeconds = (scene: { durationSeconds?: number }): number =>
  scene.durationSeconds ?? 4;

export const slugify = (s: string): string =>
  (s || "slideshow-video")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50) || "slideshow-video";
