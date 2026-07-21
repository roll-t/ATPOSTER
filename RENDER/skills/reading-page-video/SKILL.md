---
name: reading-page-video
description: Turn a short script into a ONE-SLIDE "read-along" / graded-reader video with a fixed magazine-style layout — a bright hero illustration across the top 25% of the frame, a bold centered title, then left-aligned body text on a paper-textured background, with the currently-spoken word highlighted continuously, one word at a time, for the whole reading (literal word-for-word karaoke), built with Remotion (React/TypeScript). Use whenever the user wants an English-reading-practice short, a "graded reader" style video, a video where the whole page of text stays on screen while each word lights up as the narrator reaches it, or explicitly asks for a video "chỉ 1 slide" with the full script on it. This is a separate skill from narrated-slideshow-video (not that one customized) so edits to either never affect the other. Also use it to tweak an existing video of this type — font, text/background/highlight color, size, or the hero illustration.
---

# Reading Page Video Generator (Remotion)

Turns a short script (a title + one paragraph of narration) into a video
that's exactly ONE slide for its entire duration, in a fixed layout: a bright
hero illustration across the top 25% of the frame, a bold centered title
below it, then the full body text — left-aligned, on a paper-textured
background — filling most of the rest of the frame with generous empty space
at the bottom. As the narration plays, the current word lights up with a
highlight pill continuously, one word at a time, for the whole reading (true
word-for-word karaoke — every word gets its turn, not just a curated few).
Unlike a slideshow, there is no second scene, no transition, no page-turn — the
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
│       └── ReadingCard.tsx        — everything below the illustration: paper texture, title band, body band (word-by-word karaoke highlighting), bottom space — see the fixed-layout percentages at the top of ReadingPageVideo.tsx
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

## Karaoke highlight — every word, continuously, for the whole reading

`ReadingCard.tsx` highlights literal word-for-word: whichever word
`resolveActiveWordIndex()` resolves as "currently spoken" gets the pill —
every word gets its turn as the narration reaches it, not a curated subset.
(An earlier version only highlighted a handful of "keyword" words picked up
front, which looked like the effect randomly turning on/off for long
stretches of plain text — that keyword-selection step has been removed.) See
"Karaoke sync accuracy" below for how the highlighted word is kept in sync
with the actual audio.

## Customizing look and feel

- **Bilingual body**: put a literal `"\n"` inside `body` to show two stacked
  lines — the primary line renders bold, left-aligned, with the karaoke
  highlight; the second renders smaller/dimmer right below it, never
  highlighted.
  `showBilingual: false` hides the second line without touching the text
  itself. A `body` with no `"\n"` is unaffected either way.
- **Exact word sync (`wordTimings`)**: real per-word timestamps (e.g. from
  ElevenLabs' `/with-timestamps` endpoint, which AGENT_TOOL's voiceover step
  captures automatically) — set `wordTimings: [{ word, start, end }, ...]`
  (seconds, relative to `audio`'s own start). Used exactly 1:1 when the
  array's word count matches the primary line of `body`; if it doesn't,
  proportionally remapped instead of discarded (see "Karaoke sync accuracy"
  below). Missing entirely → falls back to a word-length-weighted estimate.
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
  - `highlightColor`: overrides the karaoke highlight pill color for the
    currently-spoken word (default a muted gold, `#D8B07A`).
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

AGENT_TOOL's render-config panel has a "Tốc độ đọc" (reading speed) toggle —
slow/medium/fast — right next to the "Tạo Lồng Tiếng" button (Step 2), which
AGENT_TOOL forwards to ElevenLabs as `voice_settings.speed` when generating
the narration (see `voiceover/route.js`). This is the ONE place reading
speed is chosen — deliberately not also exposed as a field on the initial
script-generation form, since the two controls showing independent state at
different points in the flow just looked out-of-sync to the user. Script
word-count sizing (`buildReadingPracticeScriptPrompt` in `readingPractice.js`)
still accepts an optional `readingSpeed` input to scale its target word
count for a non-default pace, but nothing in the current UI sets it — it
always sizes for medium pace, which is harmless since the video's real
length always comes from the actual generated audio (see `calculateMetadata`
in `Root.tsx`), not the word-count estimate.

## Karaoke sync accuracy — why it can look wrong, and how it's kept accurate

The karaoke highlight is only as good as `wordTimings` matching the on-screen
body 1:1 (see "Exact word sync" above). The most common way this used to
break: Gemini's reading-practice prompt allows bracket emotion tags in the
narration text (e.g. `"[softly]"`, `"[with a slight tremor]"`) meant as
silent delivery direction — but `eleven_multilingual_v2` (the TTS model
AGENT_TOOL uses) doesn't support those as silent tags the way ElevenLabs' v3
model does, so it used to literally SPEAK them aloud, and their characters
would show up as extra tokens in the returned per-word alignment — extra
tokens that don't exist in the displayed `body` (which is generated WITHOUT
tags). That made `wordTimings.length !== body word count`, which used to
mean the karaoke fell back entirely to a coarse per-character-length
estimate for the WHOLE video instead of the real timestamps.

Fixed on both ends:
- `AGENT_TOOL/app/api/prompts/voiceover/route.js` now strips `[...]` tags
  from the text sent to ElevenLabs before requesting narration, so the TTS
  input matches the displayed body exactly (no more mismatched counts, and
  the narration stops literally saying "softly" out loud).
- `ReadingCard.tsx`'s word-index resolution (`resolveActiveWordIndex`) no
  longer treats any length mismatch as all-or-nothing: if `wordTimings`'
  count still doesn't match `body`'s word count for some other reason, it
  proportionally remaps the matched timing index onto the body's own word
  range instead of discarding the real timings — still tracks the
  narration's actual pace reasonably well rather than reverting the whole
  video to the estimate over one stray mismatch.

A second, separate bug (fixed later): real TTS timestamps always have small
silent GAPS between words — a natural pause, often 0.2-0.4s and sometimes
close to a full second right after a sentence/punctuation. `WordLine`'s
`activeWordIndexFromTimings()` used to treat "we're past this word's `end`"
as "show the next word", which lit up the next word during that gap — i.e.
up to ~0.4-0.9s BEFORE it's actually spoken. That reads as the highlight
"running ahead" of the narration, most noticeable with voices/providers that
have pronounced inter-sentence pauses (confirmed with real Edge TTS output:
gaps up to ~0.86s at sentence boundaries). This affected both providers'
real-timestamp path, not just Edge — Edge just makes it obvious because its
natural pauses are longer/more consistent. Fixed by holding the CURRENT word
highlighted through the gap until the next word's real `start` time arrives,
instead of jumping the moment the current word's `end` passes.

## Reference

- `src/schema.ts` — the zod schema; authoritative list of every config
  field and its default. Read/edit this first when adding a new field.
- `src/Root.tsx` — the `calculateMetadata` audio-duration resolution logic.
- `src/ReadingPageVideo.tsx` — the composition: the illustration/rest 25%/75%
  split and audio. Edit `HERO_HEIGHT_PERCENT` here to change that split.
- `src/components/ReadingCard.tsx` — everything below the illustration: the
  paper texture, the title/body/bottom-space band proportions,
  `autoBodyFontSize()`, and `resolveActiveWordIndex()` (the word-by-word
  karaoke sync logic).
- `src/captionFonts.ts` — the curated `captionFont` choices; edit to
  add/remove a font option.
- `references/config_schema.md` — full field-by-field config reference.
