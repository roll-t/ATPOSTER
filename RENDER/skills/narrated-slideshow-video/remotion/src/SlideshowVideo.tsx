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
    transitionStyle,
    bgColor,
    fontFamily,
    captionMode,
    captionWordsPerChunk,
    captionStyle,
    captionFont,
    captionFontSize,
    captionTextColor,
    captionBgColor,
    highlightColor,
    showBilingual,
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
        const sceneDurationInFrames = sceneFrames[i];
        cursor += sceneDurationInFrames;

        // Every scene but the last extends its own visual mount window
        // (image + caption, NOT audio) by transitionFrames past its
        // natural end, so it stays overlapping on screen with the next
        // scene's own fade/slide-in — a true crossfade/push instead of
        // both scenes independently fading to bgColor back-to-back.
        const isLast = i === scenes.length - 1;
        const visualDurationInFrames = sceneDurationInFrames + (isLast ? 0 : transitionFrames);

        return (
          <Sequence key={i} from={from} durationInFrames={visualDurationInFrames} name={`Scene ${i + 1}`}>
            <Scene
              scene={scene}
              sceneIndex={i}
              sceneDurationInFrames={sceneDurationInFrames}
              visualDurationInFrames={visualDurationInFrames}
              transitionFrames={transitionFrames}
              transitionStyle={transitionStyle}
              globalKenBurns={kenBurns}
              globalImageFit={imageFit}
              captionPosition={captionPosition}
              captionMode={captionMode}
              captionWordsPerChunk={captionWordsPerChunk}
              captionStyle={captionStyle}
              captionFont={captionFont}
              captionFontSize={captionFontSize}
              captionTextColor={captionTextColor}
              captionBgColor={captionBgColor}
              highlightColor={highlightColor}
              showBilingual={showBilingual}
              fontFamily={fontFamily}
            />
          </Sequence>
        );
      })}

      {bgMusic ? <Audio src={resolveSrc(bgMusic)} volume={bgMusicVolume} loop /> : null}
    </AbsoluteFill>
  );
};
