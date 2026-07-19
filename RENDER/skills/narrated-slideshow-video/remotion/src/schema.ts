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

  // Real per-word timing (seconds, relative to this scene's own audio
  // start) captured from the TTS provider's character-alignment API during
  // voiceover generation (see AGENT_TOOL's voiceover/route.js) — not
  // something you'd normally hand-write. When present and its word count
  // matches the caption's word count, captionStyle: "karaoke" (and chunk
  // switching in general) uses these exact timestamps instead of the
  // word-length-weighted estimate, so the highlighted word matches the
  // actual spoken audio instead of an approximation. Omit if you don't
  // have real timestamps — everything falls back to the estimate.
  wordTimings: z
    .array(
      z.object({
        word: z.string(),
        start: z.number(),
        end: z.number(),
      })
    )
    .optional(),
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
  // Duration of the transition applied between every pair of consecutive
  // scenes (and the fade-in/out at the very start/end of the video).
  transitionSeconds: z.number().min(0).max(2).default(0.5),

  // Shape of that transition. "crossfade" = classic opacity dissolve.
  // "slide-left"/"slide-right"/"slide-up" = the outgoing scene is pushed
  // off-screen while the incoming one pushes in from the opposite edge
  // (both fully opaque, no dissolve). "zoom" = outgoing scales up while
  // fading out, incoming scales in from slightly smaller while fading in.
  // All styles overlap the two scenes' visual layers during the
  // transition window (SlideshowVideo.tsx) so the scene's own bgColor is
  // never exposed as a flash between cuts.
  transitionStyle: z
    .enum(["crossfade", "slide-left", "slide-right", "slide-up", "zoom"])
    .default("crossfade"),
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

  // Visual treatment of the caption. "box" = the original dark rounded
  // subtitle bar. "tiktok" = bold white text with a black outline, no
  // background box (secondary/translation line in an accent color).
  // "karaoke" = same layout as "box" but the single word currently being
  // spoken (estimated the same word-weighted way as chunk pacing) gets a
  // colored highlight pill and a slightly larger size. See Caption.tsx.
  captionStyle: z.enum(["box", "tiktok", "karaoke"]).default("box"),

  // Whether to show the secondary (translation) line of a bilingual
  // caption ("English\nTiếng Việt" — see Caption.tsx). Sceneswith no
  // "\n" in their caption are unaffected either way; this only lets you
  // quickly render a bilingual script as English-only without editing
  // every scene's caption text.
  showBilingual: z.boolean().default(true),

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
