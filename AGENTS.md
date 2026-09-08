# ATPOSTER — AI working guide

Read `ARCHITECTURE.md` first. Then read only the bounded module being changed; do not load the
whole repository or the large UI files unless the task is in that feature.

## Ownership

- Root (`app/`, `src/`, `skills/`): Video studio app — generate scripts/assets, TTS, video rendering, Remotion skills.
- `desktop`: Electron desktop application shell.
- `SERVER/VieNeu`: local TTS service only.
- `app_runner`: launch scripts only; it contains no business logic.

## Change rules

1. Studio: keep UI in `app/components`, HTTP in `app/api`, pure rules in `src/domain`, use cases in
   `src/application`, and concrete I/O in `src/infrastructure`. A route coordinates; it must not
   become a second domain module.
2. Preserve dependency direction: `domain` imports no outer layer; `application` receives
   capabilities through parameters; `infrastructure/composition` selects concrete implementations.
3. A new video format is a `skills/<format>/remotion` package plus an entry in the skill registry;
   do not add format conditionals to the generic renderer.
4. Do not duplicate code between the publisher and studio. Extract a dependency-free helper into
   `packages/` before a second use. Keep app-specific I/O in its owning app.
5. Run `npm run audit:architecture`; run the owning app's build for changed production code.

`npm run audit:architecture` is an advisory inventory. It reports oversized modules and duplicate
implementations so refactors can be made deliberately rather than by blind repository-wide edits.
