import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { resolveSrc } from "../utils";

export type KenBurnsDirection = "in" | "out" | "pan-left" | "pan-right" | "none";

export const SceneImage: React.FC<{
  src: string;
  fit: "cover" | "contain";
  kenBurns: KenBurnsDirection;
  durationInFrames: number;
  // % of frame height to nudge the image down (captionStyle: "hook" only —
  // see Scene.tsx) so a top-anchored caption card has headroom instead of
  // sitting on top of the image. 0 = no change (every other style). Scaled
  // up by a generous multiplier to compensate so no gap shows at the top
  // edge — shifting content down always exposes a gap ABOVE it, never
  // below, since transforms apply after the element already fills the
  // frame via objectFit: cover.
  topOffsetPercent?: number;
}> = ({ src, fit, kenBurns, durationInFrames, topOffsetPercent = 0 }) => {
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

  // Compensating scale so shifting the image down by topOffsetPercent% never
  // exposes a gap at the top edge — 2x the offset is a comfortable margin
  // (crops a bit more off the sides/bottom, which this style's generous-
  // negative-space compositions tolerate fine).
  const offsetScale = topOffsetPercent > 0 ? 1 + (topOffsetPercent / 100) * 2 : 1;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={resolveSrc(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: fit,
          transform: `scale(${scale * offsetScale}) translateX(${translateX}%) translateY(${topOffsetPercent}%)`,
          transformOrigin: "center center",
        }}
      />
    </AbsoluteFill>
  );
};
