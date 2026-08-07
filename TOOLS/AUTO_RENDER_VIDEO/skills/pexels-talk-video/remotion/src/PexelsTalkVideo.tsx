import React from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, useVideoConfig, staticFile } from 'remotion';
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
  const { width, height, fps } = useVideoConfig();
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
      {/* Lớp nền NỀN TẢNG: playlist chung, chạy suốt cả video. Đoạn nào có nền riêng sẽ vẽ đè lên
          lớp này; giữ nó lại để phần chờ đầu video, phần lặng cuối và các đoạn chưa gán nền riêng
          luôn có hình, không bao giờ lọt ra khung đen. */}
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
            {/* Nền RIÊNG của đoạn này (clip chọn theo đúng câu đang đọc). Vẽ đè lên playlist nền
                chung và chỉ tồn tại trong khoảng thời gian của đoạn, nên hết đoạn là tự trả lại
                nền chung — không cần xử lý ranh giới thủ công. */}
            {seg.bgVideo ? (
              <Sequence
                from={0}
                durationInFrames={Math.max(
                  1,
                  Math.min(
                    dur,
                    seg.bgVideoDurationInSeconds
                      ? Math.round(seg.bgVideoDurationInSeconds * fps)
                      : dur
                  )
                )}
              >
                <AbsoluteFill>
                  <OffthreadVideo
                    src={staticFile(seg.bgVideo)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    volume={0}
                  />
                  <AbsoluteFill style={{ background: 'rgba(0,0,0,0.55)' }} />
                </AbsoluteFill>
              </Sequence>
            ) : null}

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
