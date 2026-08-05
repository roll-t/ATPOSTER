import React from "react";
import { useCurrentFrame } from "remotion";

export const Visualizer: React.FC<{
  barCount: number;
  color: string;
  width: number;
  maxHeight: number;
}> = ({ barCount, color, width, maxHeight }) => {
  const frame = useCurrentFrame();

  const barWidth = Math.max(2, Math.floor((width * 0.85) / barCount) - 2);
  const gap = Math.floor((width * 0.85) / barCount) - barWidth;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: `${gap}px`,
        height: `${maxHeight}px`,
        width: `${width}px`,
      }}
    >
      {Array.from({ length: barCount }).map((_, i) => {
        // Procedural animation: combination of sin/cos at different frequencies per bar
        const seed = i * 0.31 + 1.1;
        const h =
          Math.abs(Math.sin((frame * 0.08 + i * 0.5) * seed)) * 0.45 +
          Math.abs(Math.cos((frame * 0.053 + i * 0.3) * (seed * 0.7))) * 0.35 +
          Math.abs(Math.sin((frame * 0.12 + i * 0.8) * (seed * 0.4))) * 0.2;

        const barH = Math.max(3, h * maxHeight);

        return (
          <div
            key={i}
            style={{
              width: `${barWidth}px`,
              height: `${barH}px`,
              borderRadius: `${barWidth / 2}px ${barWidth / 2}px 0 0`,
              background: color,
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
};
