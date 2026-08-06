import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Captions} from './Captions';

export type SceneData = {
  id: string;
  image: string;
  audio: string;
  caption: string;
  durationInSeconds: number;
};

export const Scene: React.FC<{
  scene: SceneData;
  durationInFrames: number;
  index: number;
}> = ({scene, durationInFrames, index}) => {
  const frame = useCurrentFrame();
  const zoomIn = index % 2 === 0;
  const scale = interpolate(frame, [0, durationInFrames], zoomIn ? [1, 1.08] : [1.08, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: 'black'}}>
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <Img
          src={staticFile(scene.image)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${scale})`,
          }}
        />
      </AbsoluteFill>
      <Audio src={staticFile(scene.audio)} />
      <Captions text={scene.caption} durationInFrames={durationInFrames} />
    </AbsoluteFill>
  );
};
