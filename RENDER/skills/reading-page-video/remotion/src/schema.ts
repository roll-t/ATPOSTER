import { z } from "zod";

// ReadingPageVideo is a deliberately simple, ONE-SLIDE sibling of the
// narrated-slideshow-video skill: no scenes[] array, no transitions, no
// multiple images — a single background image + a single narration clip for
// the whole video, with the full script (title + body) held on screen the
// entire time as a "page", the currently-spoken word highlighted karaoke-
// style. Built for graded-reader / reading-practice style shorts (see
// SKILL.md), where splitting the story across several slides would fight the
// "read the whole page along with the narrator" effect.
export const readingPageVideoSchema = z.object({
  // Purely for naming: render.mjs slugifies this for the output folder
  // (public/<slug>/) when nothing local anchors a folder to. Not shown on
  // screen — the on-screen heading is `title` below.
  projectTitle: z.string().default(""),

  // "landscape" = 1920x1080, "portrait" = 1080x1920 (TikTok/Reels/Shorts).
  orientation: z.enum(["landscape", "portrait"]).default("portrait"),

  // Path under public/ (resolved via staticFile) or a full https:// URL —
  // the background illustration/photo for the page.
  image: z.string(),
  imageFit: z.enum(["cover", "contain"]).default("cover"),
  imageMode: z.enum(["hero", "full_bg", "none"]).optional(),

  // Path under public/ or a full https:// URL — the single narration clip
  // for the whole video. Drives the video's total duration (see
  // calculateMetadata in Root.tsx) unless durationSeconds is set below.
  audio: z.string(),

  // Optional explicit total length in seconds. Omit to resolve it from the
  // actual length of `audio` (plus audioPaddingSeconds).
  durationSeconds: z.number().min(1).max(600).optional(),
  audioPaddingSeconds: z.number().min(0).max(3).default(0.5),

  // On-screen heading, centered below the hero illustration (e.g. "Mistakes
  // Make You Better"). Leave "" to render the page with no heading, just the
  // body.
  title: z.string().default(""),

  // The full script shown + read aloud, held on screen for the whole video
  // with the currently-spoken word highlighted. Bilingual: put "\n" between
  // the primary line and a translation (e.g. "Every mistake is a
  // chance to grow.\nMỗi sai lầm là một cơ hội để trưởng thành.") — the
  // second line renders smaller/dimmer below the first. A body with no "\n"
  // renders as a single language, unchanged.
  body: z.string(),

  // Whether to show the secondary (translation) line of a bilingual `body`.
  // A body with no "\n" is unaffected either way.
  showBilingual: z.boolean().default(true),

  // Real per-word timing (seconds, relative to `audio`'s own start) captured
  // from the TTS provider's character-alignment API (e.g. ElevenLabs'
  // `/with-timestamps` endpoint — see AGENT_TOOL's voiceover/route.js). When
  // present and its word count matches the primary line of `body`, the
  // karaoke highlight uses these exact timestamps instead of a word-length
  // estimate. Omit if you don't have real timestamps.
  wordTimings: z
    .array(z.object({ word: z.string(), start: z.number(), end: z.number() }))
    .optional(),

  // Look & feel
  bgColor: z.string().default("#0E0F13"),
  fontFamily: z
    .string()
    .default("'Be Vietnam Pro','Noto Sans',Arial,sans-serif"),

  // CapCut-style manual overrides, all optional and independent (same
  // contract as narrated-slideshow-video's captionFont/Size/Text/Bg — kept
  // under the same field names so the same app UI can drive either skill).
  // Curated Google Font loaded via @remotion/google-fonts (see
  // captionFonts.ts) so it renders identically regardless of what's
  // installed on the render machine. Omit to keep using `fontFamily`.
  // Default is "montserrat" — "poppins" looks closest to the original design
  // reference but has no Vietnamese glyphs (falls back to Be Vietnam Pro
  // per-glyph for the bilingual line — see captionFonts.ts).
  captionFont: z
    .enum(["be-vietnam-pro", "roboto", "montserrat", "nunito", "inter", "oswald", "poppins"])
    .optional(),
  // Overrides the BODY text's base font size in px (auto-fit default ~18-24px:
  // see autoBodyFontSize() in ReadingCard.tsx). The title is sized
  // independently (42-46px range, not derived from this).
  captionFontSize: z.number().min(14).max(96).optional(),
  // Overrides both the title and body text color (default "#1A1A1A").
  captionTextColor: z.string().optional(),
  // Overrides the page's paper background color (default "#F5F2EB"). Set to
  // "transparent" to remove the paper texture entirely, leaving `bgColor`.
  captionBgColor: z.string().optional(),
  // Overrides the page's paper background opacity (0-100%, default 100%).
  captionBgOpacity: z.number().min(0).max(100).optional(),
  // Overrides the karaoke highlight pill color for the currently-spoken word
  // (default a muted gold, "#D8B07A") — every word gets this treatment as
  // its turn comes, continuously for the whole reading.
  highlightColor: z.string().optional(),

  // CapCut-style LAYOUT overrides — all optional, all percentages of the
  // TOTAL frame height. Default split is 25 / 10 / 40 / (25 remainder), see
  // ReadingPageVideo.tsx / ReadingCard.tsx. Bottom space is never set
  // directly — it's whatever's left after hero+title+body, clamped to >= 0,
  // so the three you CAN set always sum sensibly regardless of what a UI
  // slider lets through.
  heroHeightPercent: z.number().min(0).max(60).optional(),
  titleHeightPercent: z.number().min(4).max(30).optional(),
  bodyHeightPercent: z.number().min(15).max(75).optional(),
  // Title font size in px (default 44, independent of captionFontSize which
  // only affects the body).
  titleFontSize: z.number().min(20).max(80).optional(),
  // Gap in px between the title band and the start of the body text
  // (default 18).
  titleBodyGap: z.number().min(0).max(80).optional(),
  // Horizontal breathing room around the title and body text, as % of frame
  // width on EACH side (default 10, so the text column is frame-width minus
  // 2x this). Matches the design spec's content_block.horizontal_padding.
  contentPaddingPercent: z.number().min(0).max(30).optional(),
  // Body text alignment — "left" (default) or "justify" (CapCut-style "canh
  // đều": both edges of each line align, except the paragraph's last line,
  // matching normal justified-text behavior). Applies to both the primary
  // and bilingual secondary line. Does not affect the title, which is
  // always centered.
  bodyAlign: z.enum(["left", "justify"]).optional(),
});

export type ReadingPageVideoProps = z.infer<typeof readingPageVideoSchema>;
