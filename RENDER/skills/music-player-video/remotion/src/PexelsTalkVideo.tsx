import React from 'react';
import { AbsoluteFill, Audio, Sequence, useVideoConfig, staticFile } from 'remotion';
import { PexelsTalkVideoProps } from './schema';
import { VideoBackground } from './components/VideoBackground';
import { GlassTextCard } from './components/GlassTextCard';
import { AudioWaveform } from './components/AudioWaveform';

export const PexelsTalkVideo: React.FC<PexelsTalkVideoProps> = ({
  segments,
  backgroundVideo,
  bgMusic,
  bgMusicEnabled,
  bgMusicVolume,
  orientation,
  accentColor,
  showWaveform,
}) => {
  const { width, height } = useVideoConfig();
  const isPortrait = (orientation ?? 'portrait') === 'portrait' || height > width;

  // Compute cumulative frame offsets per segment
  let cumFrames = 0;
  const offsets: number[] = segments.map((s) => {
    const off = cumFrames;
    cumFrames += s.durationInFrames;
    return off;
  });

  return (
    <AbsoluteFill>
      {/* Looping Pexels background video + dark vignette overlay */}
      <VideoBackground src={backgroundVideo} opacity={0.55} />

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

      {/* Audio waveform overlay — shows throughout the entire video */}
      {showWaveform !== false ? (
        <AudioWaveform accentColor={accentColor ?? '#a78bfa'} isPortrait={isPortrait} />
      ) : null}
    </AbsoluteFill>
  );
};
