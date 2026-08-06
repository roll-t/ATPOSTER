import React from 'react';
import { AbsoluteFill, Audio, Sequence, useVideoConfig, staticFile } from 'remotion';
import { PexelsTalkVideoProps } from './schema';
import { VideoBackground } from './components/VideoBackground';
import { GlassTextCard } from './components/GlassTextCard';

export const PexelsTalkVideo: React.FC<PexelsTalkVideoProps> = ({
  segments,
  backgroundVideo,
  backgroundVideos,
  bgMusic,
  bgMusicEnabled,
  bgMusicVolume,
  orientation,
  accentColor,
  showWaveform,
  leadInFrames,
}) => {
  const { width, height } = useVideoConfig();
  const isPortrait = (orientation ?? 'portrait') === 'portrait' || height > width;

  // Thoại bắt đầu SAU khoảng lặng đầu video (leadInFrames) — nền video và nhạc đã chạy từ frame 0.
  const startFrame = leadInFrames ?? 0;

  // Compute cumulative frame offsets per segment
  let cumFrames = startFrame;
  const offsets: number[] = segments.map((s) => {
    const off = cumFrames;
    cumFrames += s.durationInFrames;
    return off;
  });

  return (
    <AbsoluteFill>
      {/* Background video(s): dùng mảng nếu có nhiều clip, loop 1 nếu chỉ có 1 */}
      <VideoBackground
        src={backgroundVideos && backgroundVideos.length > 0 ? backgroundVideos : backgroundVideo}
        opacity={0.55}
      />

      {/* Optional background music — continuous track */}
      {bgMusicEnabled && bgMusic ? (
        <Audio src={staticFile(bgMusic)} volume={bgMusicVolume ?? 0.12} loop />
      ) : null}

      {/* Per-segment: voice audio + glass text card */}
      {segments.map((seg, idx) => {
        const from = offsets[idx];
        const dur = seg.durationInFrames;
        return (
          <Sequence from={from} durationInFrames={dur} key={idx}>
            {/* Narration voice */}
            {seg.audio ? (
              <Audio src={staticFile(seg.audio)} volume={1} />
            ) : null}

            {/* Glass caption card */}
            <GlassTextCard
              subtitle={seg.caption}
              isPortrait={isPortrait}
              segmentProgress={0}
              accentColor={accentColor ?? '#a78bfa'}
              enterFrame={0}
              totalSegmentFrames={dur}
            />
          </Sequence>
        );
      })}

    </AbsoluteFill>
  );
};
