Each video is one self-contained project folder here, holding both its
input assets and its rendered output together:

```
public/<my-video>/
├── images/scene-01.jpg          (the ONE background image)
├── audio/scene-01.mp3           (the ONE narration clip)
├── manifest.json                 (optional — the original script/manifest, if any)
└── final/
    ├── video.mp4                  (written by render.mjs / render-project.mjs)
    └── config.json                 (copy of the exact config used to render it)
```

This skill is single-slide — unlike narrated-slideshow-video, a project here
only ever has ONE image + ONE audio clip, not a per-scene list. The
`images/`/`audio/` split (and the `scene-01` naming) is just kept for
consistency with that skill's convention and with AGENT_TOOL's asset-writing
routes, which don't need to know which skill a project belongs to.

Reference assets in the config with the path relative to `public/`, project
folder included:

```json
{ "image": "my-video/images/scene-01.jpg", "audio": "my-video/audio/scene-01.mp3" }
```

`example/` in this folder holds the tiny placeholder demo used by
`configs/example.json` and Remotion Studio's default preview — safe to leave
in place or delete once you're working with real content.
