import React from 'react';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {Scene, SceneData} from './Scene';
import {TRANSITION_FRAMES} from './constants';

export const MainVideo: React.FC<{scenes: SceneData[]; fps: number}> = ({scenes, fps}) => {
  const children: React.ReactNode[] = [];

  scenes.forEach((scene, index) => {
    const durationInFrames = Math.round(scene.durationInSeconds * fps);

    children.push(
      <TransitionSeries.Sequence key={`${scene.id}-seq`} durationInFrames={durationInFrames}>
        <Scene scene={scene} durationInFrames={durationInFrames} index={index} />
      </TransitionSeries.Sequence>,
    );

    if (index < scenes.length - 1) {
      children.push(
        <TransitionSeries.Transition
          key={`${scene.id}-trans`}
          presentation={fade()}
          timing={linearTiming({durationInFrames: TRANSITION_FRAMES})}
        />,
      );
    }
  });

  return <TransitionSeries>{children}</TransitionSeries>;
};
