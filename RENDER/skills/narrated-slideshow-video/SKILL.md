---
name: narrated-slideshow-video
description: Turn real photos/images + a script (kịch bản) + matching per-scene narration audio (user-supplied, no TTS) into a landscape (16:9) narrated slideshow video — Ken Burns pan/zoom, crossfades, on-screen captions synced to the narration, built with Remotion (React/TypeScript). Use whenever the user gives photos/images plus a script plus voice/audio recordings to combine into one video, asks to "dựng video từ ảnh và giọng đọc" / "ghép ảnh với audio thành video", wants a narrated photo slideshow, a video where each image has its own voiceover clip, or wants to batch-produce several such videos. This is the landscape, real-photo, real-audio-narration counterpart to the vertical stick-figure-story-video (illustrated, captions-only) and english-quiz-video skills — prefer this one when the user already has actual audio clips to sync against, not just a script to caption. Also use it to tweak an existing video of this type — Ken Burns direction, transitions, caption style, colors, or background music.
---

# Narrated Slideshow Video Generator (Remotion)

Turns a set of photos into a video where each photo is shown alongside its
own narration clip — the audio the user already recorded/provided, not
TTS — with a slow Ken Burns pan/zoom, a crossfade into the next scene, and
an on-screen caption that follows along with the narration. Every scene's
screen time comes from the real length of its audio file, measured
automatically before the video renders — there's no manual timing to get
right and no separate "measure the audio" step to remember.

Canvas: 1920×1080 (16:9) landscape by default, 30fps — standard YouTube
export. Set `orientation: "portrait"` in the config for 1080×1920
(TikTok/Reels/Shorts) instead — worth checking the source photos' own
aspect ratio before rendering, since landscape + vertical photos (or vice
versa) means either heavy cropping (`imageFit: "cover"`) or empty bars
(`imageFit: "contain"`).

This assumes the user already has a working Remotion setup (Node + `npx
remotion` runnable). Don't run `npm install` or scaffold a new project
unless the user says their setup is broken — just work inside `remotion/`.

## Project layout

```
remotion/
├── package.json            — deps: react, remotion, @remotion/cli, @remotion/media-utils, zod
├── tsconfig.json
├── src/
│   ├── index.ts              — registerRoot entry point
│   ├── Root.tsx               — registers the "SlideshowVideo" composition + calculateMetadata
│   ├── SlideshowVideo.tsx      — top-level composition: lays out scenes + optional bg music
│   ├── schema.ts               — zod schema = the single source of truth for all config fields
│   ├── utils.ts                — resolveSrc() + sceneSeconds()/slugify() helpers
│   └── components/
│       ├── Background.tsx      — solid fill behind everything
│       ├── SceneImage.tsx      — Ken Burns pan/zoom on one scene's photo
│       ├── Caption.tsx         — bottom/top subtitle bar, chunked or full-text mode
│       └── Scene.tsx           — composes SceneImage + Audio (the narration) + Caption + fade in/out
├── configs/
│   ├── example.json           — one filled-in 2-scene video config, uses the bundled demo assets
│   └── batch-example.json     — array of 2 configs, for batch rendering
├── scripts/
│   └── render.mjs             — install-if-needed + render (single config or array); writes output into the same public/<project>/ folder the scenes' own assets live in
└── public/                    — one self-contained folder per video: images/ + audio/ (+ optional script.json) alongside a final/ the render writes into (see public/README.md)
```

## Quick workflow

1. **Get the script and audio.** The user should already have: a script
   broken into one segment of text per scene, and one narration audio clip
   per scene (they record/provide these themselves — this skill doesn't do
   text-to-speech). If any scene is missing its audio clip, ask for it
   rather than guessing a duration — the whole point of this pipeline is
   that scene timing comes from real audio.

   Images are the other required asset — if the user already has
   photos/illustrations per scene, skip to step 2. If they don't (e.g. they
   want an illustrated/stick-figure character actually reacting to each
   line, not a generic photo with just Ken Burns motion), check first
   whether this monorepo's `AGENT_TOOL` app is available — its `/prompts`
   page, category `stick_figure_slideshow`, already generates the script,
   a consistent character in a different meaningful pose per scene, and
   ElevenLabs narration with word timestamps, writing all of it straight
   into this skill's own `remotion/public/<project>/` folder (that's how
   e.g. `public/habit_complaining_instead_taking_.../` in this repo was
   made). Only fall back to generating images by hand (e.g. via Canva) if
   AGENT_TOOL isn't set up — see `references/scene_image_prompts.md` for
   both paths.

2. **Place assets.** Give each video its own project folder under
   `remotion/public/` (named after the video, e.g. `public/my-video/`),
   with images in `images/` and narration clips in `audio/` inside it —
   e.g. `public/my-video/images/scene-01.jpg`,
   `public/my-video/audio/scene-01.mp3`. Drop the original script/manifest
   in as `public/my-video/script.json` too if there is one. See
   `remotion/public/README.md`.

3. **Write the config.** Copy `configs/example.json`, replace `scenes`
   with the real list — one `{ image, audio, caption }` object per scene,
   in script order, paths from step 2 (e.g.
   `"image": "my-video/images/scene-01.jpg"`). Full field reference:
   `references/config_schema.md`. Show the user the scene list (or at
   least the first couple of captions) before rendering a long batch, so
   a misheard caption or wrong audio file gets caught early.

4. **Render — one command, handles install too:**
   ```
   cd remotion
   node scripts/render.mjs configs/my-video.json
   ```
   - Installs Remotion (`npm install`) automatically the first time — only
     if `node_modules` isn't there yet. Already installed? Skips straight
     to rendering.
   - Works the same for one config object or a JSON array of many (batch)
     — no separate batch script.
   - Output lands right next to the input: `render.mjs` derives the
     project folder from the scenes' own asset paths and writes
     `public/my-video/final/video.mp4` + `final/config.json` there — one
     folder per video holds everything, inputs and result together.
   - Preview/edit interactively instead: `npx remotion studio src/index.ts`
     — useful for checking Ken Burns direction, caption timing, and that
     every scene's audio actually loads before committing to a full render.

5. Share the resulting `public/my-video/final/video.mp4` with the user
   (via whatever file-delivery mechanism is available in this
   environment).

## Why scene timing needs no manual math

`calculateMetadata` in `Root.tsx` resolves every scene's `durationSeconds`
from its real audio length (`getAudioDurationInSeconds` from
`@remotion/media-utils`, run once before rendering) plus
`audioPaddingSeconds`, then bakes those numbers into the props
`SlideshowVideo.tsx` actually receives — so the component itself stays a
plain synchronous layout, and the total video length always matches the
sum of the narration clips automatically. Add, remove, re-order, or
re-record a scene's audio and the whole timeline follows without touching
any duration field by hand. Only set a scene's `durationSeconds` explicitly
when you want to override that (see `references/config_schema.md`).

## Customizing look and feel

- **Caption sync**: `captionMode: "chunked"` (default) advances through the
  caption a few words at a time, paced proportionally to word count across
  the scene's duration — there's no word-level transcript for the audio in
  this pipeline, so it's an approximation of "captions following the
  voice," not exact sync. `captionMode: "full"` shows the whole caption for
  the whole scene instead, if that reads better for short lines.
  `captionWordsPerChunk` (default 4) controls chunk size.
- **Bilingual captions**: put a literal `"\n"` inside a scene's `caption` string to
  show two stacked lines — e.g. `"Don't give up.\nĐừng bao giờ bỏ cuộc."` — the
  first line renders larger/bold, the second smaller/lighter right below it
  (~9px gap). Works with both `captionMode`s; in `"chunked"` mode the two
  lines stay paired chunk-for-chunk even though the translation's word count
  differs from the original. A caption with no `"\n"` renders as a single
  line exactly as before — no config change needed to keep using English-only
  captions. See `references/config_schema.md` and `src/components/Caption.tsx`.
- **Caption style**: `captionStyle` — `"box"` (default, dark rounded subtitle
  bar), `"tiktok"` (bold white text with a black outline, no background box),
  or `"karaoke"` (same layout as `"box"`, but the word currently being spoken
  gets a red highlight pill and renders slightly larger). Estimated per-word
  by default (word length, no forced alignment) — pass real per-word
  `wordTimings` on a scene (see below) for exact sync to the actual audio
  instead of an estimate.
- **Exact word sync (`wordTimings`)**: if you have real per-word timestamps
  for a scene's narration — e.g. from ElevenLabs' `/with-timestamps` TTS
  endpoint, which AGENT_TOOL's voiceover step captures automatically — set
  `scenes[i].wordTimings: [{ word, start, end }, ...]` (seconds, relative to
  that scene's own audio start). `captionStyle: "karaoke"` then highlights
  the exact word being spoken instead of estimating. Only used when the
  timing array's word count matches the caption's own word count; otherwise
  silently falls back to the estimate. See `references/config_schema.md`.
- **Show/hide bilingual line**: `showBilingual` (default `true`) — set
  `false` to render an otherwise-bilingual (`"\n"`-caption) script as
  English-only for a given render, without touching the caption text itself.
- **Caption position**: `captionPosition: "top"` or `"bottom"` (default).
- **Image fit**: `imageFit: "cover"` (default, fills frame, may crop edges)
  or `"contain"` (letterboxes, no crop) — per-video or per-scene override.
- **Ken Burns**: `kenBurns: false` turns it off globally; per-scene
  `"in"` / `"out"` / `"pan-left"` / `"pan-right"` / `"none"` overrides the
  auto-alternating default.
- **Transitions**: `transitionSeconds` (default 0.5) controls the duration;
  `transitionStyle` controls the shape — `"crossfade"` (default dissolve),
  `"slide-left"` / `"slide-right"` / `"slide-up"` (push transition, both
  scenes fully opaque), or `"zoom"` (scale + fade). The two scenes' visual
  layers overlap for the whole transition window regardless of style, so
  `bgColor` never flashes through between cuts.
- **Colors**: `bgColor` (letterboxing/background fill).
- **Font**: `fontFamily` — keep the Vietnamese-safe fallback stack
  (`'Be Vietnam Pro','Noto Sans',Arial,sans-serif`) unless the user's
  Remotion install has a different font set up.

## Background music

`bgMusic` (filename under `public/` or an `https://` URL) loops quietly
under the whole video via `bgMusicVolume` (default 0.12 — kept low since,
unlike the stick-figure-story-video skill, there's an actual narration
voice to keep intelligible, not just captions). Each scene's own narration
`<Audio>` also gets a short ~0.15s volume fade in/out to avoid clicks at
cut points.

## Sound effects (per-scene SFX cues)

For one-shot sounds tied to a specific moment — a whoosh on entry, a ding
on a reveal, a pop on emphasis — set `scenes[i].sfx: [{ src, atSeconds,
volume }]`. Unlike `bgMusic` (one continuous loop for the whole video),
each cue plays once, starting at `atSeconds` relative to that scene's own
start, and stops naturally when its clip ends. Purely additive — a scene
with no `sfx` renders exactly as before. Rendered by
`src/components/Sfx.tsx` (one `<Sequence>`-delayed `<Audio>` per cue,
mounted from `Scene.tsx`). See `references/config_schema.md` for the full
field reference and an example.

## Pointing arrows (per-scene arrow cues)

For calling out a specific detail — a prop, a face, a piece of in-scene
text — at the moment the narration mentions it, set
`scenes[i].arrows: [{ from: {x, y}, to: {x, y}, atSeconds }]`. The arrow
draws in (tail to arrowhead) starting at `atSeconds`, instead of being a
static shape baked into the image. `from`/`to` are normalized 0–1
coordinates within the frame, not the source image's own pixels — so set
that scene's `kenBurns: "none"` too, otherwise the image pans/zooms under
a fixed-position arrow and the two drift apart. Purely additive — a scene
with no `arrows` renders exactly as before. Rendered by
`src/components/Arrows.tsx` (an SVG line + arrowhead marker per cue,
mounted from `Scene.tsx`). See `references/config_schema.md` for the full
field reference and an example.

## Batch production

For multiple videos in one go, build a JSON array in `configs/` (see
`configs/batch-example.json` for the shape) with one full config object per
video, then run `node scripts/render.mjs configs/my-batch.json` once — same
script as single-video rendering. Each video's assets still need to be
placed under their own `public/<project>/` first (step 2 above); each
batch entry writes its own `final/` inside its own project folder.

## No text-to-speech in this pipeline

This skill assumes the user supplies real narration audio per scene — that
was a deliberate choice, not a gap to fill in silently. If the user has a
script but no audio yet and wants voiceover generated, that's a different
request. Check first whether `AGENT_TOOL`'s `stick_figure_slideshow`
pipeline is available (see `references/scene_image_prompts.md`) — its
voiceover step already calls ElevenLabs' `/with-timestamps` endpoint and
writes real per-word `wordTimings` straight into the scene, which is
exactly what powers this skill's `captionStyle: "karaoke"`. Otherwise
point the user to free TTS options — ElevenLabs, `edge-tts` — the
same ones documented in the english-quiz-video skill's
`references/audio_resources.md` — rather than improvising synthesis here. If
the user has no audio at all and just wants captions carrying the
narration instead, the stick-figure-story-video skill's approach (or a
`captionMode: "full"`, `audio`-less variant of this one) fits better than
forcing silent/dummy audio files through this pipeline.

## Reference

- `src/schema.ts` — the zod schema; authoritative list of every config
  field and its default. Read/edit this first when adding a new field.
- `src/Root.tsx` — the `calculateMetadata` audio-duration resolution logic;
  edit this if the duration formula itself needs to change (e.g. a
  different padding rule).
- `src/SlideshowVideo.tsx` — the composition timeline; edit this to change
  scene ordering or add new global layers (e.g. a title card).
- `src/components/*.tsx` — one file per visual piece; each is a normal
  React component, safe to edit directly for layout/animation tweaks not
  covered by the config.
- `references/config_schema.md` — full field-by-field config reference,
  including how asset paths resolve.
- `references/scene_image_prompts.md` — how to get a consistent character
  in a different, meaningful pose per scene for videos that don't start
  from real photos: `AGENT_TOOL`'s existing `stick_figure_slideshow`
  pipeline first, a manual Canva prompt template as the fallback.
