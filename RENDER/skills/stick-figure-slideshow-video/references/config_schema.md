# Config schema reference — SlideshowVideo

Authoritative source: `remotion/src/schema.ts` (zod). This file is a readable field-by-field guide.

## Top-level fields

| Field | Type | Default | Notes |
|---|---|---|---|
| `title` | string | `""` | Not shown on screen and no longer used for output naming (output now lands next to the scenes' own assets — see "Asset paths & output location" below). Only used as a fallback slug if every scene uses a remote `https://` URL with nothing local to anchor a folder to. |
| `scenes` | Scene[] | — | **Required.** One entry per photo + its narration clip. See below. |
| `orientation` | `"landscape"` \| `"portrait"` | `"landscape"` | `"landscape"` = 1920×1080 (YouTube). `"portrait"` = 1080×1920 (TikTok/Reels/Shorts). Pick `"portrait"` when the source photos are themselves vertical — otherwise `"landscape"` with `imageFit: "contain"` leaves large empty bars on both sides. |
| `captionPosition` | `"top"` \| `"bottom"` \| `"center"` | `"bottom"` | Where the subtitle bar sits. `"center"` is meant for `captionStyle: "page"` — vertically centers the block instead of pinning it to an edge, which reads better for a full paragraph than a short subtitle. |
| `imageFit` | `"cover"` \| `"contain"` | `"cover"` | `"cover"` fills the frame (crops edges); `"contain"` letterboxes the whole image with no crop. Check your source photos' aspect ratio against `orientation` before picking — mismatched orientation + `"cover"` crops heavily. |
| `kenBurns` | boolean | `true` | Turns the slow zoom/pan on scene images on/off globally. |
| `transitionSeconds` | number | `0.5` | Duration of the transition at every scene edge (and the fade-in/out at the very start/end of the video). |
| `transitionStyle` | `"crossfade"` \| `"slide-left"` \| `"slide-right"` \| `"slide-up"` \| `"zoom"` | `"crossfade"` | Shape of that transition. The two scenes' visual layers are kept overlapping on screen for the whole transition window (`SlideshowVideo.tsx`/`Scene.tsx`) — `bgColor` is never exposed as a flash between cuts, regardless of style. `"slide-*"` pushes the outgoing scene off one edge while the incoming one pushes in from the opposite edge, both fully opaque. `"zoom"` scales+fades the outgoing scene up and the incoming scene in from slightly smaller. |
| `bgColor` | string (hex) | `"#0E0F13"` | Fill color behind everything — visible as letterboxing (with `imageFit: "contain"`), never visible during transitions (see `transitionStyle`). |
| `fontFamily` | string | `"'Be Vietnam Pro','Noto Sans',Arial,sans-serif"` | Caption font stack. Keep the Vietnamese-safe fallbacks if your script has diacritics. |
| `captionMode` | `"chunked"` \| `"full"` | `"chunked"` | `"chunked"` shows a few words at a time, advancing through the caption proportionally to word count across the scene's duration — reads like captions following the voice. `"full"` shows the whole caption for the whole scene. There's no word-level transcript/timestamp for the narration in this pipeline, so `"chunked"` is an approximation, not exact sync. |
| `captionWordsPerChunk` | number | `4` | Words per caption chunk when `captionMode: "chunked"`. |
| `captionStyle` | `"box"` \| `"tiktok"` \| `"karaoke"` \| `"page"` | `"box"` | Visual treatment of the caption text. `"box"` = dark rounded subtitle bar (original look). `"tiktok"` = bold white text with a black outline, no background box, translation line in an accent color — no `captionMode` change needed. `"karaoke"` = same layout as `"box"`, but the single word currently being spoken (estimated per-word, weighted by character length, or exact if `wordTimings` is set) gets a red highlight pill and renders ~16% larger. `"page"` = a large light "paper" card — meant for `captionMode: "full"` + `captionPosition: "center"`, i.e. a whole scene's text ("one page" of a story/graded-reader) held on screen for the whole scene with the currently-spoken word highlighted in amber, like a read-along video. Unlike `"box"`/`"tiktok"` in `"full"` mode, `"page"` still highlights the active word — it doesn't just show static text. See `Caption.tsx`. |
| `captionFont` | `"be-vietnam-pro"` \| `"roboto"` \| `"montserrat"` \| `"nunito"` \| `"inter"` \| `"oswald"` | — | Optional CapCut-style font override, loaded via `@remotion/google-fonts` (see `src/captionFonts.ts`) so it renders identically regardless of what's installed on the render machine — unlike `fontFamily` above, which silently falls back to a system font if the named one isn't installed. All 6 include the Vietnamese subset. Omit to keep using `fontFamily`. |
| `captionFontSize` | number (16–120) | — | Optional override of the caption's base font size (style defaults: 40, or 32 for `"page"`). The highlighted word in `"karaoke"`/`"page"` still renders ~16% larger than this. |
| `captionTextColor` | CSS color string | — | Optional override of the caption text color (style defaults: white, or a dark brown for `"page"`). |
| `captionBgColor` | CSS color string, or `"transparent"` | — | Optional override of the caption's background box/card color. `"transparent"` removes the background entirely (and its border/shadow). No visible effect on `"tiktok"`, which never renders a background box. |
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
| `sfx` | `SfxCue[]` | — | Optional one-shot sound effects layered on top of this scene's narration (e.g. a whoosh on entry, a ding on a reveal, a pop on emphasis) — independent of the narration `audio` above and the video-wide looping `bgMusic`. See below. |
| `arrows` | `ArrowCue[]` | — | Optional animated pointing arrows drawn over this scene's image (e.g. calling out a prop or a piece of in-scene text). See below. |

## SFX cues (`scenes[].sfx[]`)

Each cue is a single one-shot sound effect — it plays once starting at its own offset and stops naturally when the clip ends (no looping). Use this for whooshes on cuts, dings on reveals, pops on emphasis, etc. — anything short and tied to a specific moment, as opposed to `bgMusic` (one continuous loop for the whole video).

| Field | Type | Default | Notes |
|---|---|---|---|
| `src` | string | — | **Required.** Path under `public/` (any subfolder) or an `https://` URL. |
| `atSeconds` | number | `0` | When the cue starts, in seconds relative to this scene's own start (`0` = the instant the scene appears). |
| `volume` | number 0–1 | `0.6` | Cue volume, independent of narration/`bgMusicVolume`. |

```json
{
  "image": "my-video/images/scene-03.jpg",
  "audio": "my-video/audio/scene-03.mp3",
  "caption": "Bất ngờ chưa!",
  "sfx": [
    { "src": "my-video/sfx/whoosh.mp3", "atSeconds": 0, "volume": 0.5 },
    { "src": "my-video/sfx/ding.mp3", "atSeconds": 1.2, "volume": 0.7 }
  ]
}
```

A scene with no `sfx` field behaves exactly as before — this is purely additive.

## Arrow cues (`scenes[].arrows[]`)

Each cue is a single animated pointing arrow — it draws in from `from` to `to`, arrowhead leading, starting at its own offset. Use this to call out a specific detail (a prop, a face, a piece of in-scene text) timed to when the narration mentions it, instead of a static arrow baked into the scene's image (which can't be timed and can't fade in).

| Field | Type | Default | Notes |
|---|---|---|---|
| `from` | `{x, y}` | — | **Required.** Tail of the arrow. `x`/`y` are normalized 0–1 within the frame (`0,0` = top-left, `1,1` = bottom-right) — **not** pixels of the source image — so they line up regardless of orientation/resolution. |
| `to` | `{x, y}` | — | **Required.** Arrowhead end point, same coordinate system as `from`. |
| `atSeconds` | number | `0` | When the arrow starts drawing in, relative to this scene's own start. |
| `animateInSeconds` | number | `0.4` | How long the tail-to-arrowhead draw-in animation takes. |
| `holdSeconds` | number | — (holds until scene ends) | How long the arrow stays fully visible after it finishes drawing in, before fading out over ~0.3s. Omit to just leave it on screen until the scene cuts away. |
| `color` | string (hex) | `"#FE2C55"` | Arrow color (line + arrowhead). |
| `strokeWidth` | number | `6` | Line thickness in pixels. |

```json
{
  "image": "my-video/images/scene-03.jpg",
  "audio": "my-video/audio/scene-03.mp3",
  "caption": "Nhìn vào góc trên bên phải kìa!",
  "kenBurns": "none",
  "arrows": [
    { "from": { "x": 0.15, "y": 0.85 }, "to": { "x": 0.62, "y": 0.22 }, "atSeconds": 0.8 }
  ]
}
```

**Coordinates are relative to the frame, not the source image** — if this scene has Ken Burns motion, the image pans/zooms under a fixed-position arrow and the two will drift out of alignment. Set `kenBurns: "none"` on any scene that uses arrows so the pointed-at spot stays where you placed it.

A scene with no `arrows` field behaves exactly as before — this is purely additive.

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
