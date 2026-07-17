import React from 'react';
import {Composition} from 'remotion';
import {MainVideo} from './MainVideo';
import {SceneData} from './Scene';
import {FPS, WIDTH, HEIGHT, TRANSITION_FRAMES} from './constants';
import scenesData from '../data/scenes.json';

const scenes = scenesData as SceneData[];

const totalDurationInFrames = scenes.reduce((sum, scene, index) => {
  const frames = Math.round(scene.durationInSeconds * FPS);
  const overlap = index > 0 ? TRANSITION_FRAMES : 0;
  return sum + frames - overlap;
}, 0);

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MainVideo"
      component={MainVideo}
      durationInFrames={totalDurationInFrames}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{scenes, fps: FPS}}
    />
  );
};
