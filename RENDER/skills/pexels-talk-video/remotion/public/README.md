Each video is one self-contained project folder here, holding both its
input assets and its rendered output together:

```
public/<my-video>/
├── audio/scene-01.mp3, scene-02.mp3, ...
├── bg/background.mp4   (Pexels background video)
└── final/
    ├── video.mp4       (written by render-project.mjs)
    └── config.json     (copy of the exact config used to render it)
```

Project output folders are excluded from git (see root .gitignore).
Only this README and source files are tracked.
