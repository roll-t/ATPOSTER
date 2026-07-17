import React from "react";
import { AbsoluteFill, Audio, interpolate, useCurrentFrame } from "remotion";
import { SceneImage, KenBurnsDirection } from "./SceneImage";
import { Caption } from "./Caption";
import { Scene as SceneConfig } from "../schema";
import { resolveSrc } from "../utils";

const AUDIO_FADE_FRAMES = 5; // ~0.15s at 30fps, just enough to avoid clicks

export const Scene: React.FC<{
  scene: SceneConfig;
  sceneIndex: number;
  durationInFrames: number;
  transitionFrames: number;
  globalKenBurns: boolean;
  globalImageFit: "cover" | "contain";
  captionPosition: "top" | "bottom";
  captionMode: "chunked" | "full";
  captionWordsPerChunk: number;
  fontFamily: string;
}> = ({
  scene,
  sceneIndex,
  durationInFrames,
  transitionFrames,
  globalKenBurns,
  globalImageFit,
  captionPosition,
  captionMode,
  captionWordsPerChunk,
  fontFamily,
}) => {
  const frame = useCurrentFrame();

  // Fade in over transitionFrames at the start, fade out over
  // transitionFrames at the end — this is what gives the illusion of a
  // crossfade between consecutive scenes without needing overlapping
  // Sequences (which would complicate the total-duration math, especially
  // since scene lengths here come from real audio files, not a fixed
  // formula).
  const opacity = interpolate(
    frame,
    [0, transitionFrames, durationInFrames - transitionFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const audioVolume = interpolate(
    frame,
    [0, AUDIO_FADE_FRAMES, durationInFrames - AUDIO_FADE_FRAMES, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const kenBurns: KenBurnsDirection = !globalKenBurns
    ? "none"
    : scene.kenBurns ?? (sceneIndex % 2 === 0 ? "in" : "out");

  return (
    <AbsoluteFill style={{ opacity }}>
      <SceneImage
        src={scene.image}
        fit={scene.imageFit ?? globalImageFit}
        kenBurns={kenBurns}
        durationInFrames={durationInFrames}
      />
      <Audio src={resolveSrc(scene.audio)} volume={audioVolume} />
      <Caption
        text={scene.caption}
        position={captionPosition}
        fontFamily={fontFamily}
        mode={captionMode}
        wordsPerChunk={captionWordsPerChunk}
        durationInFrames={durationInFrames}
        opacity={1}
      />
    </AbsoluteFill>
  );
};
