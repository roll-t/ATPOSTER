# Config schema reference — SlideshowVideo

Authoritative source: `remotion/src/schema.ts` (zod). This file is a readable field-by-field guide.

## Top-level fields

| Field | Type | Default | Notes |
|---|---|---|---|
| `title` | string | `""` | Not shown on screen and no longer used for output naming (output now lands next to the scenes' own assets — see "Asset paths & output location" below). Only used as a fallback slug if every scene uses a remote `https://` URL with nothing local to anchor a folder to. |
| `scenes` | Scene[] | — | **Required.** One entry per photo + its narration clip. See below. |
| `orientation` | `"landscape"` \| `"portrait"` | `"landscape"` | `"landscape"` = 1920×1080 (YouTube). `"portrait"` = 1080×1920 (TikTok/Reels/Shorts). Pick `"portrait"` when the source photos are themselves vertical — otherwise `"landscape"` with `imageFit: "contain"` leaves large empty bars on both sides. |
| `captionPosition` | `"top"` \| `"bottom"` | `"bottom"` | Where the subtitle bar sits. |
| `imageFit` | `"cover"` \| `"contain"` | `"cover"` | `"cover"` fills the frame (crops edges); `"contain"` letterboxes the whole image with no crop. Check your source photos' aspect ratio against `orientation` before picking — mismatched orientation + `"cover"` crops heavily. |
| `kenBurns` | boolean | `true` | Turns the slow zoom/pan on scene images on/off globally. |
| `transitionSeconds` | number | `0.5` | Duration of the transition at every scene edge (and the fade-in/out at the very start/end of the video). |
| `transitionStyle` | `"crossfade"` \| `"slide-left"` \| `"slide-right"` \| `"slide-up"` \| `"zoom"` | `"crossfade"` | Shape of that transition. The two scenes' visual layers are kept overlapping on screen for the whole transition window (`SlideshowVideo.tsx`/`Scene.tsx`) — `bgColor` is never exposed as a flash between cuts, regardless of style. `"slide-*"` pushes the outgoing scene off one edge while the incoming one pushes in from the opposite edge, both fully opaque. `"zoom"` scales+fades the outgoing scene up and the incoming scene in from slightly smaller. |
| `bgColor` | string (hex) | `"#0E0F13"` | Fill color behind everything — visible as letterboxing (with `imageFit: "contain"`), never visible during transitions (see `transitionStyle`). |
| `fontFamily` | string | `"'Be Vietnam Pro','Noto Sans',Arial,sans-serif"` | Caption font stack. Keep the Vietnamese-safe fallbacks if your script has diacritics. |
| `captionMode` | `"chunked"` \| `"full"` | `"chunked"` | `"chunked"` shows a few words at a time, advancing through the caption proportionally to word count across the scene's duration — reads like captions following the voice. `"full"` shows the whole caption for the whole scene. There's no word-level transcript/timestamp for the narration in this pipeline, so `"chunked"` is an approximation, not exact sync. |
| `captionWordsPerChunk` | number | `4` | Words per caption chunk when `captionMode: "chunked"`. |
| `captionStyle` | `"box"` \| `"tiktok"` \| `"karaoke"` | `"box"` | Visual treatment of the caption text. `"box"` = dark rounded subtitle bar (original look). `"tiktok"` = bold white text with a black outline, no background box, translation line in an accent color — no `captionMode` change needed. `"karaoke"` = same layout as `"box"`, but the single word currently being spoken (estimated per-word, weighted by character length, same "no forced alignment" approximation as chunk pacing) gets a red highlight pill and renders ~16% larger. See `Caption.tsx`. |
| `showBilingual` | boolean | `true` | Whether to render the secondary (translation) line of a bilingual `"\n"`-caption at all. Set `false` to quickly render an otherwise-bilingual script as English-only without touching every scene's `caption` text. Scenes with no `"\n"` are unaffected either way. |
| `audioPaddingSeconds` | number | `0.4` | Extra seconds a scene holds after its narration finishes, so the cut doesn't land right on the last word. Ignored for scenes with an explicit `durationSeconds`. |
| `bgMusic` | string | — | Optional. Filename under `public/` (any subfolder) or a full `https://` URL. Loops quietly under the whole video. |
| `bgMusicVolume` | number 0–1 | `0.12` | Kept low by default since — unlike a captions-only video — there's a narration voice to keep intelligible. |

## Scene fields (`scenes[]`)

| Field | Type | Default | Notes |
|---|---|---|---|
| `image` | string | — | **Required.** Path under `public/` (any subfolder, e.g. `"my-video/images/scene-01.jpg"`) or an `https://` URL. |
| `audio` | string | — | **Required.** Path under `public/` or an `https://` URL — the narration clip for this scene. This is what actually drives the scene's screen time (see below). |
| `caption` | string | `""` | The line(s) of script text shown as an on-screen caption. `""` means image + audio only, no text. **Bilingual captions**: put `"\n"` between two lines (e.g. `"Don't give up.\nĐừng bao giờ bỏ cuộc."`) — the first line renders larger/bold, the second renders smaller/lighter directly below it (~9px gap), and in `captionMode: "chunked"` both lines advance through their chunks together in lockstep (see `Caption.tsx`). No caption with no `"\n"` renders exactly as a single line, unchanged. |
| `durationSeconds` | number | auto (from audio) | Optional explicit screen time (0.5–60s). **If omitted**, `calculateMetadata` in `Root.tsx` measures the actual length of `audio` and uses `audio length + audioPaddingSeconds` — you never have to hand-time a scene to match its narration. Set this only to force a different length (e.g. trim a long clip, or hold an image longer than its narration). |
| `kenBurns` | `"in"` \| `"out"` \| `"pan-left"` \| `"pan-right"` \| `"none"` | auto-alternates | Per-scene override. Left unset, scenes alternate `in`/`out` by index for visual variety. |
| `wordTimings` | `{word, start, end}[]` | — | Optional real per-word timing (seconds, relative to this scene's own audio start), captured from a TTS provider's character-alignment API (e.g. ElevenLabs' `/with-timestamps` endpoint — see AGENT_TOOL's `voiceover/route.js`). Not something you'd hand-write. When present **and its word count matches the caption's own word count**, `captionStyle: "karaoke"` (and chunk switching generally) uses these exact timestamps instead of the word-length estimate, so the highlighted word matches the actual spoken audio. Mismatched or absent → silently falls back to the estimate. |
| `imageFit` | `"cover"` \| `"contain"` | inherits global | Per-scene override of the global `imageFit`. |

## How duration works (no manual timing math)

Every scene's `durationSeconds` is auto-resolved from its `audio` file's real length before the video ever renders (via `@remotion/media-utils`'s `getAudioDurationInSeconds`, called inside `calculateMetadata`) — no ffmpeg/ffprobe involved, and no separate "measure durations" step to remember to run. The total video length is just the sum of every scene's resolved duration. Add, remove, or swap a scene's audio and the total automatically follows — nothing to recompute by hand.

## Asset paths & output location

`image`/`audio` are resolved with Remotion's `staticFile()`, which always resolves relative to the project's `public/` folder root — **not** relative to any per-video subfolder. Put each video's assets under a project folder in `public/` (e.g. `public/my-video/images/scene-01.jpg`, `public/my-video/audio/scene-01.mp3`) and reference them with that full path: `"image": "my-video/images/scene-01.jpg"`.

`render.mjs` writes its output into that same project folder — `public/my-video/final/video.mp4` + `final/config.json` — derived automatically from the first path segment the scenes' own `image`/`audio` paths share. There's no separate slug to predict: input and output for one video always end up together. See `remotion/public/README.md` for the full folder convention.

## Example — minimal single scene

```json
{
  "image": "my-video/images/scene-01.jpg",
  "audio": "my-video/audio/scene-01.mp3",
  "caption": "Chào mừng bạn đến với video đầu tiên."
}
```

## Example — explicit duration override + no Ken Burns

```json
{
  "image": "my-video/images/scene-01.jpg",
  "audio": "my-video/audio/scene-01.mp3",
  "caption": "",
  "durationSeconds": 6,
  "kenBurns": "none"
}
```

See `remotion/configs/example.json` for a full 2-scene config, and `remotion/configs/batch-example.json` for rendering multiple slideshows in one command.
