# ATPOSTER architecture

## Runtime map

```text
Desktop (Electron Shell) ──► ATPOSTER Studio (Next.js :3001)
                             idea → script → assets/TTS → Remotion skill
                                        │
                               SERVER/VieNeu (local TTS)
```

ATPOSTER is a unified desktop & web studio application. All studio logic lives at the project root (`app/`, `src/`, `skills/`, `config/`), wrapped by Electron (`desktop/`).

## Studio layers

| Layer | Responsibility | Must not contain |
| --- | --- | --- |
| `app/components` | Browser UI and local UI state | filesystem, database, API-key logic |
| `app/api` | HTTP adapter: validation, response and composition | prompt/TTS/render business rules |
| `src/domain` | Pure content policy, prompt templates and narration calculations | Next.js, SDKs, filesystem, environment |
| `src/application` | Use cases and skill registry | React, route objects and concrete SDKs |
| `src/infrastructure` | Mongo/local persistence, Gemini, TTS, Remotion and composition root | UI state or domain policy |
| `config` | Validated environment values and registry data | request-specific mutable state |
| `skills/*/remotion` | One isolated video-format implementation | generic studio behavior |

The dependency direction is `app → infrastructure composition → application → domain`.
Infrastructure implements the outer capabilities. The composition root injects those capabilities
into use cases; a use case never imports Gemini directly.

## Safe growth path

1. Add a small, focused module in the owning layer. Keep `src/domain` dependency-free.
2. If a pure helper is needed by both apps, put it in `packages/<name>/src` with no Next.js,
   filesystem, database, or environment dependency.
3. Add a format through the skill registry, never with a growing cross-app `switch` statement.
4. Keep one responsibility per module. Split a UI component before it becomes a second feature area.

## Current refactor backlog

- `AUTO_RENDER_VIDEO/app/components/SegmentedResultView.js` is 8k+ lines. Split it by user
  workflow (script, voice, assets, render) while preserving `SegmentedResultView.js` as composition only.
- The Publisher still has its legacy `lib` layout. Migrate it in independent vertical slices;
  do not point it at Studio internals. Pure helpers can later move into `packages/`.

Run `npm run audit:architecture` before a broad refactor to refresh these figures.
