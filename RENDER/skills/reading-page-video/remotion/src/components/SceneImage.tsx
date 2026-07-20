import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { resolveSrc } from "../utils";

export type KenBurnsDirection = "in" | "out" | "pan-left" | "pan-right" | "none";

export const SceneImage: React.FC<{
  src: string;
  fit: "cover" | "contain";
  kenBurns: KenBurnsDirection;
  durationInFrames: number;
}> = ({ src, fit, kenBurns, durationInFrames }) => {
  const frame = useCurrentFrame();
  const progress = durationInFrames > 1 ? frame / (durationInFrames - 1) : 0;

  let scale = 1;
  let translateX = 0;

  switch (kenBurns) {
    case "in":
      scale = interpolate(progress, [0, 1], [1, 1.12]);
      break;
    case "out":
      scale = interpolate(progress, [0, 1], [1.12, 1]);
      break;
    case "pan-left":
      scale = 1.1;
      translateX = interpolate(progress, [0, 1], [3, -3]); // % of width
      break;
    case "pan-right":
      scale = 1.1;
      translateX = interpolate(progress, [0, 1], [-3, 3]);
      break;
    case "none":
    default:
      scale = 1;
      translateX = 0;
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={resolveSrc(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: fit,
          transform: `scale(${scale}) translateX(${translateX}%)`,
          transformOrigin: "center center",
        }}
      />
    </AbsoluteFill>
  );
};
