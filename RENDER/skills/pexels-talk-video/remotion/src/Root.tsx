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
      defaultProps={exampleProps as PexelsTalkVideoProps}
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

        const totalFrames = resolvedSegments.reduce(
          (sum, s) => sum + (s.durationInFrames ?? FPS * 5),
          0
        );

        return {
          width,
          height,
          durationInFrames: Math.max(FPS * 5, totalFrames),
          props: { ...props, segments: resolvedSegments } as PexelsTalkVideoProps,
        };
      }}
    />
  );
};
