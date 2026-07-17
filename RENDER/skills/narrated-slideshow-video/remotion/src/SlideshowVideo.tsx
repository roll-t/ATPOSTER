import React from "react";
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from "remotion";
import { SlideshowVideoProps } from "./schema";
import { Background } from "./components/Background";
import { Scene } from "./components/Scene";
import { resolveSrc, sceneSeconds } from "./utils";

export const SlideshowVideo: React.FC<SlideshowVideoProps> = (props) => {
  const { fps } = useVideoConfig();
  const {
    scenes,
    captionPosition,
    imageFit,
    kenBurns,
    transitionSeconds,
    bgColor,
    fontFamily,
    captionMode,
    captionWordsPerChunk,
    bgMusic,
    bgMusicVolume,
  } = props;

  const transitionFrames = Math.round(transitionSeconds * fps);
  const sceneFrames = scenes.map((scene) => Math.round(sceneSeconds(scene) * fps));

  let cursor = 0;

  return (
    <AbsoluteFill>
      <Background color={bgColor} />

      {scenes.map((scene, i) => {
        const from = cursor;
        const durationInFrames = sceneFrames[i];
        cursor += durationInFrames;
        return (
          <Sequence key={i} from={from} durationInFrames={durationInFrames} name={`Scene ${i + 1}`}>
            <Scene
              scene={scene}
              sceneIndex={i}
              durationInFrames={durationInFrames}
              transitionFrames={transitionFrames}
              globalKenBurns={kenBurns}
              globalImageFit={imageFit}
              captionPosition={captionPosition}
              captionMode={captionMode}
              captionWordsPerChunk={captionWordsPerChunk}
              fontFamily={fontFamily}
            />
          </Sequence>
        );
      })}

      {bgMusic ? <Audio src={resolveSrc(bgMusic)} volume={bgMusicVolume} loop /> : null}
    </AbsoluteFill>
  );
};
