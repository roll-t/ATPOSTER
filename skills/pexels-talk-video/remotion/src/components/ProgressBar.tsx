import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

export const ProgressBar: React.FC<{
  durationSeconds: number;
  color: string;
  width: number;
}> = ({ durationSeconds, color, width }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalFrames = durationSeconds * fps;
  const progress = Math.min(1, frame / totalFrames);

  const elapsed = Math.floor(frame / fps);
  const total = Math.floor(durationSeconds);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div style={{ width: `${width}px` }}>
      {/* Track */}
      <div
        style={{
          width: "100%",
          height: "3px",
          background: "rgba(255,255,255,0.18)",
          borderRadius: "2px",
          position: "relative",
          marginBottom: "8px",
        }}
      >
        {/* Fill */}
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: color,
            borderRadius: "2px",
            transition: "width 0.1s linear",
          }}
        />
        {/* Thumb */}
        <div
          style={{
            position: "absolute",
            left: `${progress * 100}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "9px",
            height: "9px",
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 0 4px rgba(0,0,0,0.4)",
          }}
        />
      </div>
      {/* Time labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11px",
          color: "rgba(255,255,255,0.45)",
          fontFamily: "monospace",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span>{fmt(elapsed)}</span>
        <span>{fmt(total)}</span>
      </div>
    </div>
  );
};
