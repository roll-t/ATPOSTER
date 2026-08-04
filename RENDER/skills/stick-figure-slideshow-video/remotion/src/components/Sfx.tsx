import React from "react";
import { Audio, Sequence, useVideoConfig } from "remotion";
import { resolveSrc } from "../utils";
import { SfxCue } from "../schema";

/**
 * Layers this scene's one-shot SFX cues (whoosh, ding, pop, ...) on top of
 * the narration audio, each starting at its own atSeconds and playing once
 * — separate from the video-wide looping bgMusic track.
 */
export const Sfx: React.FC<{ cues?: SfxCue[] }> = ({ cues }) => {
  const { fps } = useVideoConfig();

  if (!cues || cues.length === 0) return null;

  return (
    <>
      {cues.map((cue, i) => {
        // Remotion validates `--props` against the zod schema for shape,
        // but does not fill in `.default()` values for fields nested
        // inside scene-level arrays (only top-level props get merged with
        // defaultProps) — so a cue that omits atSeconds/volume arrives
        // here as `undefined`, not the schema's documented default.
        // Falling back explicitly keeps the documented defaults true in
        // practice, and avoids `NaN` (e.g. `undefined * fps`) breaking the
        // Sequence entirely.
        const atSeconds = cue.atSeconds ?? 0;
        const volume = cue.volume ?? 0.6;
        return (
          <Sequence key={i} from={Math.round(atSeconds * fps)} name={`SFX ${i + 1}`}>
            <Audio src={resolveSrc(cue.src)} volume={volume} />
          </Sequence>
        );
      })}
    </>
  );
};
