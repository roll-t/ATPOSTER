import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useVideoConfig } from "remotion";

export const VideoBackground: React.FC<{
  src: string | string[];
  opacity: number;
}> = ({ src, opacity }) => {
  const { durationInFrames } = useVideoConfig();
  const sources = (Array.isArray(src) ? src : [src]).filter(Boolean);

  if (sources.length === 0) {
    return (
      <AbsoluteFill style={{ background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" }} />
    );
  }

  // Phân đều thời lượng cho từng video nền. Nếu chỉ có 1 video thì loop suốt.
  const framesPerVideo = Math.ceil(durationInFrames / sources.length);

  return (
    <AbsoluteFill>
      {sources.map((videoSrc, idx) => {
        const from = idx * framesPerVideo;
        const dur = idx === sources.length - 1
          ? durationInFrames - from
          : framesPerVideo;
        return (
          <Sequence key={idx} from={from} durationInFrames={dur}>
            <AbsoluteFill>
              <OffthreadVideo
                src={staticFile(videoSrc)}
                loop
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                volume={0}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}
      {/* Dark overlay để text dễ đọc */}
      <AbsoluteFill style={{ background: `rgba(0,0,0,${opacity})` }} />
    </AbsoluteFill>
  );
};
