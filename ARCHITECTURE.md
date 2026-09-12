# ATPOSTER architecture

## Runtime map

```text
Desktop (Electron Shell) ──► ATPOSTER Studio (Next.js :3001)
                             idea → script → assets/TTS → Remotion skill
                                        │
                               packages/VieNue (local TTS)
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

## Settings and AI modules

- `app/components/settings/GeminiKeySettings.js`: credential editor and diagnostic UI state.
- `src/domain/ai/apiKeys.js`: pure parsing, deduplication and source precedence.
- `src/domain/ai/geminiErrors.js`: pure provider-error classification and quota interpretation.
- `src/application/settings/testApiKeys.js`: bounded diagnostics through an injected probe.
- `src/infrastructure/ai/gemini/probeKey.js`: timed provider HTTP probe.
- `src/infrastructure/ai/gemini/callGeminiApi.js`: generation, rotation and JSON recovery.
- `src/infrastructure/ai/gemini/usageTracker.js`: asynchronous, atomic quota history with a
  cross-process file lock; no API request performs synchronous filesystem I/O.
- `src/infrastructure/persistence/settingsRepository.js`: injected settings-only repository;
  patches submitted fields without rewriting unrelated collections and propagates write errors.
- `src/infrastructure/composition/settings.js`: binds the repository to Mongo/local persistence
  and configures the uploads directory without process-wide mutable settings.
- `src/infrastructure/settings/platformSettings.js`: folder dialogs, directory opening and
  validated `.env.local` updates. The settings route contains HTTP coordination only.

Diagnostics do not clear generation cooldowns. API keys are normalized once per operation;
HTTP timeouts cover the response body as well as headers. The editor discards diagnostics when
its draft changes. Generation source precedence is request, stored settings, then environment.
An explicitly empty diagnostic draft tests no stored credentials.

## Completed refactor slices

- Removed the whole-database `readDb`/`writeDb` facade, account/post migration side effects and
  legacy settings globals. Settings callers use `settingsRepository`; heartbeat queries active
  posts through `postRepository` without loading all posts.
- Moved Pexels selection policy to `src/domain/video/pexelsBackgrounds.js`, Pexels workflow state
  and actions to `usePexelsBackgrounds.js`, and its pipeline UI to `PexelsBackgroundStep.js`.
- Moved the voice pipeline card to `VoiceGenerationStep.js`, image/music pipeline cards to
  `ProductionAssetsSteps.js`, and removed duplicated fallback-config construction through
  `RemotionConfigDetails.js`.
- Moved segment act/display rules to `src/domain/video/segmentPresentation.js`.
- Split Gemini-key UI from `SettingsModal.js`; the modal dropped below the audit threshold.
- Moved platform-specific settings I/O out of `app/api/settings/route.js`.

Audit on 2026-09-12: `SegmentedResultView.js` decreased from 8,895 to 7,551 lines. Eight source
files still exceed 800 lines because new focused modules replace responsibilities rather than
changing the audit threshold.

## Current refactor backlog

1. Continue reducing `app/components/SegmentedResultView.js`: Pexels state/UI, voice pipeline,
   production asset cards and config details are extracted; script editing, voice implementation,
   render settings and music modal state still live in the composition.
2. Split `LiveVideoSimulator`, `VideoEditorPanel` and gallery components along their existing
   workflows. Do not introduce format branches into the generic renderer.
3. Cooldown/dead-model rotation memory in `callGeminiApi.js` remains local to one server process.
   Persistent quota history is coordinated across processes, but transient cooldowns are not.

Removed after checking references: the unused Gemini TTS adapter and its unused route import,
the key-parser forwarding module, and the unused audit digest helper. Active voice-provider
routes remain in place. No blanket deletion of legacy persistence/data was performed.

Validation: `node --test tests/ai-settings.test.js`, `npm run audit:architecture`, `npm run build`.
The audit inventories oversized files and checks dependency direction; it is not a full dead-code
or semantic-duplication detector. Provider integration tests use fake responses, not live keys.
