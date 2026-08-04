import { staticFile } from "remotion";

/** Resolves a config field that may be a public/ filename or a full https:// URL. */
export const resolveSrc = (src: string): string =>
  src.startsWith("http://") || src.startsWith("https://")
    ? src
    : staticFile(src);

/**
 * Screen time for a scene that's already had its audio duration resolved
 * (see calculateMetadata in Root.tsx, which fills in durationSeconds for
 * every scene before the video ever renders). Falls back to a safe default
 * only for the rare case a scene renders before that resolution happened
 * (e.g. a hand-edited props object in Remotion Studio) — normally this
 * value is always already set by the time SlideshowVideo reads it.
 */
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
