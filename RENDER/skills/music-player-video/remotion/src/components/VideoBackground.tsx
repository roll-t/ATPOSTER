import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";

export const VideoBackground: React.FC<{
  src: string;
  opacity: number;
}> = ({ src, opacity }) => {
  if (!src) {
    return (
      <AbsoluteFill style={{ background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" }} />
    );
  }

  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={staticFile(src)}
        loop
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
        volume={0}
      />
      {/* Dark overlay to make player UI readable */}
      <AbsoluteFill
        style={{ background: `rgba(0,0,0,${opacity})` }}
      />
    </AbsoluteFill>
  );
};
