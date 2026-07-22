# Config schema reference — ReadingPageVideo

Authoritative source: `remotion/src/schema.ts` (zod). This file is a
readable field-by-field guide.

## Fields

| Field | Type | Default | Notes |
|---|---|---|---|
| `projectTitle` | string | `""` | Not shown on screen — only used for naming (`render.mjs` slugifies it for the output folder when nothing local anchors one). The on-screen heading is `title` below. |
| `orientation` | `"landscape"` \| `"portrait"` | `"portrait"` | `"landscape"` = 1920×1080. `"portrait"` = 1080×1920 (TikTok/Reels/Shorts). |
| `image` | string | — | **Required.** Path under `public/` (any subfolder) or an `https://` URL — the background illustration. Keep it simple/mostly-empty; the card carries the actual content. |
| `imageFit` | `"cover"` \| `"contain"` | `"cover"` | `"cover"` fills the frame (crops edges); `"contain"` letterboxes with no crop. |
| `audio` | string | — | **Required.** Path under `public/` or an `https://` URL — the single narration clip for the whole video. Drives the video's total length (see `durationSeconds`). |
| `durationSeconds` | number (1–600) | auto (from audio) | Optional explicit total length. **If omitted**, `calculateMetadata` in `Root.tsx` measures the actual length of `audio` and uses `audio length + audioPaddingSeconds`. |
| `audioPaddingSeconds` | number 0–3 | `0.5` | Extra seconds held after the narration finishes, so the video doesn't cut right on the last word. Ignored if `durationSeconds` is set. |
| `title` | string | `""` | On-screen heading, centered below the hero illustration (e.g. `"Mistakes Make You Better"`), max 2 lines (clamped). `""` renders the page with no heading, just the body. |
| `body` | string | — | **Required.** The full script — shown + read aloud, held on screen the whole video with the currently-spoken word highlighted continuously, literal word-for-word karaoke (see `highlightColor` below — every word gets a turn, not a curated subset). **Bilingual**: put `"\n"` between the primary line and a translation (e.g. `"Every mistake is a chance to grow.\nMỗi sai lầm là một cơ hội để trưởng thành."`) — the second line renders smaller/dimmer below, never highlighted. A `body` with no `"\n"` renders as a single language, unchanged. |
| `showBilingual` | boolean | `true` | Whether to render the secondary (translation) line of a bilingual `body` at all. `body` with no `"\n"` is unaffected either way. |
| `wordTimings` | `{word, start, end}[]` | — | Optional real per-word timing (seconds, relative to `audio`'s own start), captured from a TTS provider's character-alignment API (e.g. ElevenLabs' `/with-timestamps` endpoint — see AGENT_TOOL's `voiceover/route.js`, which strips `[...]` emotion tags before calling ElevenLabs so this lines up 1:1 with `body`). When its word count matches the primary line of `body`, the karaoke highlight uses these exact timestamps; if it doesn't, `resolveActiveWordIndex()` in `ReadingCard.tsx` proportionally remaps them instead of discarding them outright. Absent entirely → falls back to a word-length-weighted estimate. |
| `bgColor` | string (hex) | `"#0E0F13"` | Fill color behind everything — visible only as a brief flash before the hero image loads, or as letterboxing if `imageFit: "contain"` leaves gaps. |
| `fontFamily` | string | `"'Be Vietnam Pro','Noto Sans',Arial,sans-serif"` | Free-text font fallback, used only when `captionFont` isn't set. Keep the Vietnamese-safe fallbacks if the script has diacritics. |
| `captionFont` | `"be-vietnam-pro"` \| `"roboto"` \| `"montserrat"` \| `"nunito"` \| `"inter"` \| `"oswald"` \| `"poppins"` | — | Optional CapCut-style font override, loaded via `@remotion/google-fonts` (see `src/captionFonts.ts`) so it renders identically regardless of what's installed on the render machine. All except `"poppins"` include the Vietnamese subset directly; `"poppins"` has none in Google Fonts, so Vietnamese glyphs fall back per-character to Be Vietnam Pro automatically — pick it only if you're confident the script is English-only, or accept the mixed rendering. Omit to use `fontFamily`. |
| `captionFontSize` | number (14–96) | auto, ~16-24px (see `autoBodyFontSize` in `ReadingCard.tsx`) | Overrides the body text's base font size. Does not affect the title — see `titleFontSize` below. |
| `captionTextColor` | CSS color string | `"#1A1A1A"` | Overrides both the title and body text color. |
| `captionBgColor` | CSS color string, or `"transparent"` | `"#F5F2EB"` | Overrides the page's paper background color (the whole area below the hero illustration, edge-to-edge — not a floating card). `"transparent"` removes the paper texture entirely, leaving `bgColor`/the hero image showing through. |
| `highlightColor` | CSS color string | `"#D8B07A"` (muted gold) | Overrides the karaoke highlight pill color for the currently-spoken word. Every word in the primary line gets this treatment as its turn comes — continuous, literal word-for-word karaoke for the whole reading, not a curated subset. |
| `bgMusic` | string | — | Optional path/URL (same `staticFile`-or-`https://` convention as `image`/`audio`) to a looping background track, mixed under the narration for the whole video. Not bundled with the skill (avoids licensing issues) — populated by the user uploading their own track via AGENT_TOOL's render-config modal, which writes it to `audio/bg-music.<ext>`; `render-project.mjs` auto-detects it by filename prefix. Omit/absent → no background music. |
| `bgMusicVolume` | number (0–1) | `0.12` | Volume multiplier for `bgMusic`, relative to the narration's own fade envelope (so it shares the same fade-in/out timing but stays much quieter). Ignored if `bgMusic` isn't set. |

## Layout overrides (CapCut-style, all optional)

Default split is 25% hero / 10% title / 40% body / 25% bottom space (all %
of the total frame height). Set any of the three below to change that split
— bottom space is never set directly, it's always whatever's left after
hero+title+body, clamped to ≥ 0:

| Field | Type | Default | Notes |
|---|---|---|---|
| `heroHeightPercent` | number (10–60) | `25` | % of frame the hero illustration band takes. |
| `titleHeightPercent` | number (4–30) | `10` | % of frame the title band takes. |
| `bodyHeightPercent` | number (15–75) | `40` | % of frame the body band takes. |
| `titleFontSize` | number (20–80) | `44` | Title font size in px — independent of `captionFontSize` (body-only). |
| `titleBodyGap` | number (0–80) | `18` | Gap in px between the title band and the start of the body text. |
| `contentPaddingPercent` | number (0–30) | `10` | Horizontal breathing room around the title and body text, as % of frame width on EACH side (text column width = frame width minus 2x this). |
| `bodyAlign` | `"left"` \| `"justify"` | `"left"` | Body text alignment. `"justify"` stretches inter-word spacing so both edges of each line align (CapCut-style "canh đều"), except the paragraph's last line, which stays left-aligned — normal justified-text behavior. Applies to both the primary and bilingual secondary line; the title is always centered regardless. |

## Asset paths

Same convention as narrated-slideshow-video: `image`/`audio` are resolved
via Remotion's `staticFile()` if they don't start with `http://`/`https://`
(see `src/utils.ts`'s `resolveSrc`), i.e. they're relative to `public/`.
