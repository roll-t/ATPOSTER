import { AbsoluteFill, Img, Video, interpolate, useCurrentFrame } from "remotion";
import { resolveSrc } from "../utils";
import type { KenBurnsDirection } from "../types";

export type { KenBurnsDirection };

export const SceneImage: React.FC<{
  src: string;
  fit: "cover" | "contain";
  kenBurns: KenBurnsDirection;
  durationInFrames: number;
  topOffsetPercent?: number;
  imageScale?: number;
  imageTranslateY?: number;
}> = ({ src, fit, kenBurns, durationInFrames, topOffsetPercent = 0, imageScale = 1, imageTranslateY = 0 }) => {
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
      translateX = interpolate(progress, [0, 1], [3, -3]);
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

  const offsetScale = topOffsetPercent > 0 ? 1 + (topOffsetPercent / 100) * 2 : 1;
  const isVideo = src.toLowerCase().endsWith(".mp4") || src.toLowerCase().endsWith(".webm");

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {isVideo ? (
        <Video
          src={resolveSrc(src)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: fit,
            transform: `scale(${scale * offsetScale * imageScale}) translateX(${translateX}%) translateY(${topOffsetPercent + imageTranslateY}%)`,
            transformOrigin: "center center",
          }}
          startFrom={0}
          muted
          loop
        />
      ) : (
        <Img
          src={resolveSrc(src)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: fit,
            transform: `scale(${scale * offsetScale * imageScale}) translateX(${translateX}%) translateY(${topOffsetPercent + imageTranslateY}%)`,
            transformOrigin: "center center",
          }}
        />
      )}
    </AbsoluteFill>
  );
};
