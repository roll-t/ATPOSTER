import React from "react";
import { Audio, Sequence, useVideoConfig } from "remotion";
import { resolveSrc } from "../utils";
import type { SfxCue } from "../types";

export const Sfx: React.FC<{ cues?: SfxCue[] }> = ({ cues }) => {
  const { fps } = useVideoConfig();

  if (!cues || cues.length === 0) return null;

  return (
    <>
      {cues.map((cue, i) => {
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
