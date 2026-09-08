import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from "remotion";
import { AssetElementConfig } from "../schema";

const FADE_FRAMES = 12; // 0.4s at 30fps

function assetSrc(id: string): string {
  if (id.startsWith("prop_")) return staticFile(`assets/prop/${id}.png`);
  if (id.startsWith("sym_"))  return staticFile(`assets/sym/${id}.png`);
  if (id.startsWith("bg_"))   return staticFile(`assets/bg/${id}.png`);
  return staticFile(`assets/pose/${id}.png`); // default: pose_*
}

export const SceneCanvas: React.FC<{
  elements: AssetElementConfig[];
  bgColor?: string;
  baseSizeFraction?: number;
}> = ({ elements, bgColor = "#FFFFFF", baseSizeFraction = 0.32 }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const baseSize = height * baseSizeFraction;

  return (
    <AbsoluteFill style={{ background: bgColor }}>
      {[...elements]
        .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
        .map((el, i) => {
          const delayFrames = (el.delay ?? 0) * fps;
          const opacity = interpolate(
            frame,
            [delayFrames, delayFrames + FADE_FRAMES],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const size = baseSize * (el.scale ?? 1);
          const left = (el.x / 100) * width - size / 2;
          // anchor "bottom": y là ĐÁY phần tử, nên mọi thứ đứng trên đất dùng chung một y
          // (đường chân trời) sẽ thẳng hàng dù scale khác nhau. "center": y là tâm (mặc định,
          // dùng cho mây/mặt trời/ký hiệu bay lơ lửng).
          const top = (el.y / 100) * height - (el.anchor === "bottom" ? size : size / 2);

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left, top, width: size, height: size,
                opacity,
                transform: el.flip ? "scaleX(-1)" : undefined,
              }}
            >
              <Img
                src={assetSrc(el.asset)}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
          );
        })}
    </AbsoluteFill>
  );
};
