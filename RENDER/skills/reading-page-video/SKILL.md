---
name: reading-page-video
description: Turn a short script into a ONE-SLIDE "read-along" / graded-reader video with a fixed magazine-style layout — a bright hero illustration across the top 25% of the frame, a bold centered title, then left-aligned body text on a paper-textured background, with ~5-8 important keywords highlighted as the narration reaches them (not literal word-for-word karaoke), built with Remotion (React/TypeScript). Use whenever the user wants an English-reading-practice short, a "graded reader" style video, a video where the whole page of text stays on screen while keywords light up as the narrator reaches them, or explicitly asks for a video "chỉ 1 slide" with the full script on it. This is a separate skill from narrated-slideshow-video (not that one customized) so edits to either never affect the other. Also use it to tweak an existing video of this type — font, text/background/highlight color, size, or the hero illustration.
---

# Reading Page Video Generator (Remotion)

Turns a short script (a title + one paragraph of narration) into a video
that's exactly ONE slide for its entire duration, in a fixed layout: a bright
hero illustration across the top 25% of the frame, a bold centered title
below it, then the full body text — left-aligned, on a paper-textured
background — filling most of the rest of the frame with generous empty space
at the bottom. As the narration plays, ~5-8 important keywords (not every
word) light up with a highlight pill when the narrator reaches them. Unlike
a slideshow, there is no second scene, no transition, no page-turn — the
whole point is that the viewer reads along with the whole passage at once,
the way a "graded reader" / "one English page a day" short works.

Canvas: 1080×1920 (9:16) portrait by default, 30fps — standard
TikTok/Reels/Shorts export. Set `orientation: "landscape"` in the config for
1920×1080 instead.

This assumes the user already has a working Remotion setup (Node + `npx
remotion` runnable). Don't run `npm install` or scaffold a new project
unless the user says their setup is broken — just work inside `remotion/`.

## Project layout

```
remotion/
├── package.json              — deps: react, remotion, @remotion/cli, @remotion/media-utils, @remotion/google-fonts, zod
├── tsconfig.json
├── src/
│   ├── index.ts                 — registerRoot entry point
│   ├── Root.tsx                  — registers the "ReadingPageVideo" composition + calculateMetadata
│   ├── ReadingPageVideo.tsx       — top-level composition: lays out the hero illustration band (25%) + everything below it (audio, ReadingCard)
│   ├── schema.ts                  — zod schema = the single source of truth for all config fields
│   ├── captionFonts.ts            — curated Google Font choices for captionFont (same contract as narrated-slideshow-video's)
│   ├── utils.ts                   — resolveSrc() helper
│   └── components/
│       ├── Background.tsx         — solid fill behind everything (rarely visible fallback)
│       ├── SceneImage.tsx         — the hero illustration (cover/contain fit)
│       └── ReadingCard.tsx        — everything below the illustration: paper texture, title band, body band (keyword highlighting), bottom space — see the fixed-layout percentages at the top of ReadingPageVideo.tsx
├── configs/
│   └── example.json              — one filled-in config, uses the bundled placeholder demo assets
├── scripts/
│   ├── render.mjs                 — install-if-needed + render a hand-authored config (or array)
│   └── render-project.mjs         — install-if-needed + render from an AGENT_TOOL manifest.json (always uses segment 1 only)
└── public/                        — one self-contained folder per video: images/scene-01.*, audio/scene-01.* (+ optional manifest.json) alongside a final/ the render writes into (see public/README.md)
```

## Quick workflow

1. **Get the script.** A title (short heading, e.g. "Mistakes Make You
   Better") and ONE paragraph of body text (a few sentences — this is the
   whole video's content, there's no second slide to split it across). If
   the body is bilingual, write it as `"English text\nVietnamese
   translation"` in the config (see `showBilingual` below).

2. **Get the narration audio and, ideally, real word timestamps.** This
   skill doesn't do text-to-speech. Check first whether this monorepo's
   `AGENT_TOOL` app is available — its `/prompts` page, category
   `reading_practice`, already generates the script, calls ElevenLabs for
   narration, and writes both straight into this skill's own
   `remotion/public/<project>/` folder, including per-word timestamps for
   exact karaoke sync. Otherwise supply a TTS-generated or recorded clip by
   hand.

3. **Get a hero illustration.** Unlike narrated-slideshow-video's `"page"`
   style (a mostly-empty background peeking around a text card), this
   skill's illustration is a real focal element: it fills a dedicated top
   25% band on its own, bright/warm-colored, topic-relevant, flat-cartoon
   style reads best (see the design reference this skill was built from) —
   the paper-textured area below it is where the text lives, so the
   illustration doesn't need to leave empty space for text to sit on top.

4. **Place assets** under `remotion/public/<project>/`: image in `images/`,
   audio in `audio/` — e.g. `public/my-video/images/scene-01.jpg`,
   `public/my-video/audio/scene-01.mp3`. See `remotion/public/README.md`.

5. **Write the config.** Copy `configs/example.json`: `image`, `audio`,
   `title`, `body` (paths from step 4). Full field reference:
   `references/config_schema.md`.

6. **Render — one command, handles install too:**
   ```
   cd remotion
   node scripts/render.mjs configs/my-video.json
   ```
   - Installs Remotion (`npm install`) automatically the first time.
   - Output: `public/my-video/final/video.mp4` + `final/config.json`.
   - Preview/edit interactively instead: `npx remotion studio src/index.ts`.
   - From an AGENT_TOOL manifest.json instead of a hand-written config:
     `node scripts/render-project.mjs my-video [--captionFont=...] [...]`
     (see that script's own header comment for every flag).

7. Share the resulting `public/my-video/final/video.mp4` with the user.

## Why the video's length needs no manual math

`calculateMetadata` in `Root.tsx` resolves the video's total length from the
real length of `audio` (`getAudioDurationInSeconds` from
`@remotion/media-utils`, run once before rendering) plus
`audioPaddingSeconds` — so re-recording the narration changes the video's
length automatically, no duration field to hand-edit. Set `durationSeconds`
explicitly only to override that.

## Why the body text always fits

`ReadingCard.tsx`'s `autoBodyFontSize()` picks the body's base font size from
its own word count (a few size tiers, ~16-24px, not a continuous scale) so a
short line and a longer paragraph both comfortably fit the fixed-height body
band without hand-tuning per video. Override it with `captionFontSize` if
you want a specific size regardless of length — see below. The title is
fixed at 44px regardless of body length (clamped to 2 lines).

## Why only some words get highlighted, not every word

Unlike narrated-slideshow-video's literal word-for-word karaoke, this skill
picks ~5-8 "keyword" words up front (`pickKeywordIndices()` in
`ReadingCard.tsx`: content words ≥5 characters, skipping a short stopword
list, evenly spread across the body) and only those ever show the highlight
pill when the narration reaches them — every other word passes by plain.
This matches the "highlight_count: 5-8 keywords" design reference this skill
was built from, and reads calmer over a full paragraph than every single
word (including "a", "the", "is") flashing highlighted in sequence.

## Customizing look and feel

- **Bilingual body**: put a literal `"\n"` inside `body` to show two stacked
  lines — the primary line renders bold, left-aligned, with keyword
  highlighting; the second renders smaller/dimmer right below it.
  `showBilingual: false` hides the second line without touching the text
  itself. A `body` with no `"\n"` is unaffected either way.
- **Exact word sync (`wordTimings`)**: real per-word timestamps (e.g. from
  ElevenLabs' `/with-timestamps` endpoint, which AGENT_TOOL's voiceover step
  captures automatically) — set `wordTimings: [{ word, start, end }, ...]`
  (seconds, relative to `audio`'s own start). Only used when the array's
  word count matches the primary line of `body`; otherwise silently falls
  back to a word-length-weighted estimate.
- **CapCut-style manual overrides** — all optional and independent, same
  field names/contract as narrated-slideshow-video so the same app UI can
  drive either skill:
  - `captionFont`: one of 7 curated Google Fonts — `"be-vietnam-pro"`,
    `"roboto"`, `"montserrat"`, `"nunito"`, `"inter"`, `"oswald"`,
    `"poppins"` — loaded via `@remotion/google-fonts` so it renders the same
    regardless of what's installed on the render machine. `"poppins"` has no
    Vietnamese glyphs (falls back to Be Vietnam Pro per-character on the
    bilingual line). Omit to use `fontFamily`.
  - `captionFontSize` (14–96): overrides the body's auto-fit size. Does
    **not** affect the title — see `titleFontSize` below.
  - `captionTextColor`: overrides both title and body text color (default
    `#1A1A1A`).
  - `captionBgColor`: overrides the paper background's color (default
    `#F5F2EB`) — this is the whole area below the illustration, not a
    floating card. `"transparent"` removes the paper texture entirely.
  - `highlightColor`: overrides the keyword-highlight pill color (default a
    muted gold, `#D8B07A`).
- **CapCut-style LAYOUT overrides** — also optional/independent, all %-of-
  total-frame: `heroHeightPercent` (10–60, default 25), `titleHeightPercent`
  (4–30, default 10), `bodyHeightPercent` (15–75, default 40) — bottom space
  is never set directly, always whatever's left. Plus `titleFontSize`
  (20–80px, default 44), `titleBodyGap` (0–80px, default 18), and
  `contentPaddingPercent` (0–30, default 10 — horizontal breathing room
  around the title/body text, % of frame width per side), and `bodyAlign`
  (`"left"` default or `"justify"` — CapCut-style "canh đều", stretching
  inter-word spacing so both edges of each line align except the last).
  AGENT_TOOL's render-config modal exposes all of these as sliders/number
  inputs/toggle buttons with a live preview for `reading_practice`, plus a
  direct hero-image replace (uploads straight over `images/scene-01.<ext>`
  via the same `save-image` route Google Flow uses — no separate infra).
- **Image fit**: `imageFit: "cover"` (default) or `"contain"` — applies only
  to the hero illustration band.
- **Colors**: `bgColor` (rarely visible — a flash-of-unstyled-content
  fallback behind the illustration).
- **Font**: `fontFamily` — the free-text fallback used when `captionFont`
  isn't set; keep the Vietnamese-safe stack unless the render machine has a
  different font set up.

## A CSS gotcha worth knowing before editing ReadingCard.tsx

`PaperTexture` is an `AbsoluteFill` (`position: absolute`). Per CSS painting
order, positioned elements always paint **after** static ones in the same
stacking context — regardless of DOM order. Since `PaperTexture` is placed
first in the JSX but is positioned, it would otherwise paint on top of and
completely hide the (plain, `position: static`) Title/Body/BottomSpace bands
that come after it, even though they're later in the DOM. The fix already in
place: those three band `<div>`s all have `position: "relative"`, which
puts them in the same "positioned" painting bucket as `PaperTexture`, so
DOM order (paper → title → body → bottom) determines paint order again as
expected. If you add a new absolutely-positioned layer here, give any
sibling that needs to render on top of it a non-static `position` too.

## No text-to-speech in this pipeline

Same as narrated-slideshow-video: this skill assumes the user supplies real
narration audio — check first whether `AGENT_TOOL`'s `reading_practice`
category is available (it calls ElevenLabs and writes real per-word
`wordTimings` automatically) before improvising synthesis here.

## Reference

- `src/schema.ts` — the zod schema; authoritative list of every config
  field and its default. Read/edit this first when adding a new field.
- `src/Root.tsx` — the `calculateMetadata` audio-duration resolution logic.
- `src/ReadingPageVideo.tsx` — the composition: the illustration/rest 25%/75%
  split and audio. Edit `HERO_HEIGHT_PERCENT` here to change that split.
- `src/components/ReadingCard.tsx` — everything below the illustration: the
  paper texture, the title/body/bottom-space band proportions, `autoBodyFontSize()`,
  and `pickKeywordIndices()` (the keyword-selection heuristic).
- `src/captionFonts.ts` — the curated `captionFont` choices; edit to
  add/remove a font option.
- `references/config_schema.md` — full field-by-field config reference.
