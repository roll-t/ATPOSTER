import React from "react";
import { AbsoluteFill, Audio, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ReadingPageVideoProps } from "./schema";
import { Background } from "./components/Background";
import { SceneImage } from "./components/SceneImage";
import { ReadingCard } from "./components/ReadingCard";
import { resolveSrc } from "./utils";

const AUDIO_FADE_FRAMES = 8; // ~0.27s at 30fps, just enough to avoid clicks

// Default vertical layout proportions of the frame — matches the design
// spec exactly (illustration / title / body / breathing room at the
// bottom). Overridable per-render via heroHeightPercent (this one) and
// titleHeightPercent/bodyHeightPercent (passed through to ReadingCard,
// which owns the title/body/bottom-space split of whatever's left below
// the hero) — see schema.ts.
const DEFAULT_HERO_HEIGHT_PERCENT = 25;

export const ReadingPageVideo: React.FC<ReadingPageVideoProps> = (props) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const {
    image,
    imageFit,
    audio,
    title,
    body,
    showBilingual,
    wordTimings,
    bgColor,
    fontFamily,
    captionFont,
    captionFontSize,
    captionTextColor,
    captionBgColor,
    highlightColor,
    heroHeightPercent,
    titleHeightPercent,
    bodyHeightPercent,
    titleFontSize,
    titleBodyGap,
    contentPaddingPercent,
    bodyAlign,
  } = props;

  const audioVolume = interpolate(
    frame,
    [0, AUDIO_FADE_FRAMES, durationInFrames - AUDIO_FADE_FRAMES, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const heroPercent = heroHeightPercent ?? DEFAULT_HERO_HEIGHT_PERCENT;
  const restPercent = 100 - heroPercent;

  return (
    <AbsoluteFill>
      <Background color={bgColor} />
      <Audio src={resolveSrc(audio)} volume={audioVolume} />

      <AbsoluteFill style={{ flexDirection: "column" }}>
        {/* Hero Illustration — top band, full width, no letterboxing (cover fit) */}
        <div style={{ flex: `0 0 ${heroPercent}%`, position: "relative", overflow: "hidden" }}>
          <SceneImage src={image} fit={imageFit} kenBurns="none" durationInFrames={durationInFrames} />
        </div>

        {/* Everything below the illustration: paper background + title + body + bottom breathing room */}
        <div style={{ flex: `0 0 ${restPercent}%`, position: "relative" }}>
          <ReadingCard
            title={title}
            body={body}
            fontFamily={fontFamily}
            captionFont={captionFont}
            captionFontSize={captionFontSize}
            captionTextColor={captionTextColor}
            captionBgColor={captionBgColor}
            highlightColor={highlightColor}
            showBilingual={showBilingual}
            durationInFrames={durationInFrames}
            wordTimings={wordTimings}
            restOfFramePercent={restPercent}
            titleHeightPercent={titleHeightPercent}
            bodyHeightPercent={bodyHeightPercent}
            titleFontSize={titleFontSize}
            titleBodyGap={titleBodyGap}
            contentPaddingPercent={contentPaddingPercent}
            bodyAlign={bodyAlign}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
