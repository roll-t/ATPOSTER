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
    captionBgOpacity,
    highlightColor,
    heroHeightPercent,
    titleHeightPercent,
    bodyHeightPercent,
    titleFontSize,
    titleBodyGap,
    contentPaddingPercent,
    bodyAlign,
    imageMode = "hero"
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

      {/* Nền ảnh phủ 100% full màn hình phía sau (để hiển thị xuyên qua khi hạ opacity màu nền trang giấy) */}
      {image && imageMode !== "none" && (
        <AbsoluteFill style={{ zIndex: 0 }}>
          <SceneImage src={image} fit={imageFit} kenBurns="none" durationInFrames={durationInFrames} />
        </AbsoluteFill>
      )}

      <AbsoluteFill style={{ flexDirection: "column", zIndex: 1 }}>
        {/* Mode hero: Ảnh nằm ngang nằm ở băng Hero trên cùng */}
        {imageMode === "hero" && (
          <div style={{ flex: `0 0 ${heroPercent}%`, position: "relative", overflow: "hidden" }}>
            <SceneImage src={image} fit={imageFit} kenBurns="none" durationInFrames={durationInFrames} />
          </div>
        )}

        {/* Màn hình trống phía trên cho mode full_bg (nếu có heroPercent) */}
        {imageMode === "full_bg" && heroPercent > 0 && (
          <div style={{ flex: `0 0 ${heroPercent}%`, position: "relative" }} />
        )}

        {/* Nội dung bài đọc (tiêu đề + đoạn văn) */}
        <div style={{ flex: `0 0 ${restPercent}%`, position: "relative" }}>
          <ReadingCard
            title={title}
            body={body}
            fontFamily={fontFamily}
            captionFont={captionFont}
            captionFontSize={captionFontSize}
            captionTextColor={captionTextColor}
            captionBgColor={captionBgColor}
            captionBgOpacity={captionBgOpacity}
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
