import React from 'react';
import { Composition, staticFile } from 'remotion';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import { PexelsTalkVideo } from './PexelsTalkVideo';
import { pexelsTalkVideoSchema, PexelsTalkVideoProps, Segment } from './schema';
import exampleProps from '../configs/example.json';

const FPS = 30;
const PORTRAIT = { width: 1080, height: 1920 };
const LANDSCAPE = { width: 1920, height: 1080 };
const AUDIO_PADDING = 0.5;

// Khoảng lặng ở đầu video (nền đã chạy, chưa có thoại) — tránh việc câu đầu tiên bật lên ngay
// frame 0, người xem chưa kịp nhìn vào khung hình đã bị đọc chồng lên.
const LEAD_IN_SECONDS = 1;
// Khoảng lặng ở cuối, sau khi câu thoại cuối kết thúc, để video không cắt cụt ngay khi dứt tiếng.
const TAIL_OUT_SECONDS = 3;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PexelsTalkVideo"
      component={PexelsTalkVideo}
      fps={FPS}
      width={PORTRAIT.width}
      height={PORTRAIT.height}
      durationInFrames={FPS * 60}
      schema={pexelsTalkVideoSchema}
      defaultProps={{"title":"Example Pexels Talk","orientation":"landscape" as const,"backgroundVideo":"","leadInFrames":LEAD_IN_SECONDS * FPS,"bgMusic":"","bgMusicEnabled":true,"bgMusicVolume":0.12,"accentColor":"#a78bfa","showWaveform":true,"segments":[{"caption":"Bạn có bao giờ dừng lại và tự hỏi — **mình đang sống** vì điều gì?\\nDo you ever stop and ask yourself — what am I truly living for?","audio":"","durationInFrames":150},{"caption":"Cuộc sống không chờ bạn **sẵn sàng**.\\nLife doesn't wait until you're **ready**.","audio":"","durationInFrames":120}]}}
      calculateMetadata={async ({ props }) => {
        const orientation = props.orientation ?? 'portrait';
        const { width, height } = orientation === 'landscape' ? LANDSCAPE : PORTRAIT;

        // Probe actual audio file durations so the video timing matches the real TTS output
        // rather than relying on the estimated durationInFrames from the manifest.
        const resolvedSegments: Segment[] = await Promise.all(
          (props.segments ?? []).map(async (seg): Promise<Segment> => {
            if (!seg.audio) return seg as Segment;
            try {
              const secs = await getAudioDurationInSeconds(staticFile(seg.audio));
              return {
                ...seg,
                durationInFrames: Math.max(FPS, Math.round((secs + AUDIO_PADDING) * FPS)),
              } as Segment;
            } catch {
              return seg as Segment;
            }
          })
        );

        const narrationFrames = resolvedSegments.reduce(
          (sum, s) => sum + (s.durationInFrames ?? FPS * 5),
          0
        );

        const leadInFrames = Math.round(LEAD_IN_SECONDS * FPS);
        const tailOutFrames = Math.round(TAIL_OUT_SECONDS * FPS);
        const totalFrames = leadInFrames + narrationFrames + tailOutFrames;

        return {
          width,
          height,
          durationInFrames: Math.max(FPS * 5, totalFrames),
          props: {
            ...props,
            segments: resolvedSegments,
            leadInFrames,
          } as PexelsTalkVideoProps,
        };
      }}
    />
  );
};
