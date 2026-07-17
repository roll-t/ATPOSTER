import { z } from "zod";

export const sceneSchema = z.object({
  // Path under public/ (resolved via staticFile) or a full https:// URL —
  // the photo/illustration shown for this scene.
  image: z.string(),

  // Path under public/ or a full https:// URL — the narration clip that
  // plays during this scene. This is what actually drives the scene's
  // screen time (see durationSeconds below), so every scene needs one.
  audio: z.string(),

  // The line(s) of script text shown as an on-screen caption for this
  // scene. Leave "" for a scene with no caption (image + audio only).
  caption: z.string().default(""),

  // Screen time in seconds. Optional — if omitted, it's resolved from the
  // actual length of `audio` (plus the global audioPaddingSeconds) by
  // calculateMetadata in Root.tsx before the video ever renders, so you
  // never have to hand-time a scene to match its narration. Set this only
  // to force a different length than the audio (e.g. trim a long clip, or
  // hold an image longer than its narration).
  durationSeconds: z.number().min(0.5).max(60).optional(),

  // Per-scene override of the global Ken Burns direction. "in" = slow zoom
  // in, "out" = slow zoom out, "pan-left"/"pan-right" = slow horizontal pan
  // with slight zoom. Omit to let the scene index decide (auto-alternating).
  kenBurns: z.enum(["in", "out", "pan-left", "pan-right", "none"]).optional(),

  // Per-scene override of image fit. Omit to use the global default.
  imageFit: z.enum(["cover", "contain"]).optional(),
});

export const slideshowVideoSchema = z.object({
  // Purely for naming: render.mjs slugifies this for the output folder
  // (public/<NN-slug>/). Not shown on screen. Leave "" to fall back to
  // "slideshow-video".
  title: z.string().default(""),

  // The heart of the video: one entry per photo + its narration.
  scenes: z.array(sceneSchema).min(1),

  // "landscape" = 1920x1080 (YouTube), "portrait" = 1080x1920
  // (TikTok/Reels/Shorts). Pick "portrait" when the source photos are
  // themselves vertical — otherwise "landscape" with imageFit: "contain"
  // leaves large empty bars on both sides. Resolved in Root.tsx's
  // calculateMetadata, so it can vary per video/batch entry.
  orientation: z.enum(["landscape", "portrait"]).default("landscape"),

  // Look & feel
  captionPosition: z.enum(["top", "bottom"]).default("bottom"),
  imageFit: z.enum(["cover", "contain"]).default("cover"),
  kenBurns: z.boolean().default(true),
  // Fade in/out applied at the start/end of every scene — this is what
  // makes consecutive scenes feel like a crossfade rather than a hard cut,
  // with no overlapping-Sequence bookkeeping needed.
  transitionSeconds: z.number().min(0).max(2).default(0.5),
  bgColor: z.string().default("#0E0F13"),
  fontFamily: z
    .string()
    .default("'Be Vietnam Pro','Noto Sans',Arial,sans-serif"),

  // How the caption text is paced against the narration audio. "chunked"
  // splits it into a few words at a time, advancing through the chunks
  // proportionally to each chunk's word count across the scene's
  // duration — there's no word-level transcript/timestamps to sync
  // against exactly, so this is an approximation, but it reads much closer
  // to "captions following the voice" than showing the full paragraph the
  // whole time. "full" shows the whole caption for the whole scene.
  captionMode: z.enum(["chunked", "full"]).default("chunked"),
  captionWordsPerChunk: z.number().min(1).max(12).default(4),

  // Extra seconds a scene holds after its narration finishes, so the cut
  // to the next scene doesn't land right on the last word. Ignored for
  // scenes with an explicit durationSeconds.
  audioPaddingSeconds: z.number().min(0).max(3).default(0.4),

  // Optional background music, looped quietly under the whole video.
  // Ducked well below the narration by default since (unlike a
  // captions-only video) there's a voice to keep intelligible.
  bgMusic: z.string().optional(),
  bgMusicVolume: z.number().min(0).max(1).default(0.12),
});

export type SlideshowVideoProps = z.infer<typeof slideshowVideoSchema>;
export type Scene = z.infer<typeof sceneSchema>;
