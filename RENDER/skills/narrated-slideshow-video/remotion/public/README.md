Each video is one self-contained project folder here, holding both its
input assets and its rendered output together:

```
public/<my-video>/
├── images/scene-01.jpg, scene-02.jpg, ...
├── audio/scene-01.mp3, scene-02.mp3, ...
├── script.json              (optional — the original script/manifest, if any)
└── final/
    ├── video.mp4              (written by render.mjs)
    └── config.json             (copy of the exact config used to render it)
```

Reference assets in the config with the path relative to `public/`,
project folder included:

```json
{ "image": "my-video/images/scene-01.jpg", "audio": "my-video/audio/scene-01.mp3" }
```

`node scripts/render.mjs` figures out the project folder for its output
from the scenes' own asset paths — the first path segment they share (e.g.
`my-video` above) — and writes `final/video.mp4` + `final/config.json`
there. You don't pick or predict this folder yourself; it always matches
wherever the config's own images/audio already live. The `images/`/`audio/`
split is just a convention for readability — render.mjs only cares about
that shared first segment, so flat layouts (`my-video/scene-01.jpg`
directly) work exactly the same.

`example/` in this folder holds the tiny placeholder demo used by
`configs/example.json` and Remotion Studio's default preview — safe to
leave in place or delete once you're working with real content.
