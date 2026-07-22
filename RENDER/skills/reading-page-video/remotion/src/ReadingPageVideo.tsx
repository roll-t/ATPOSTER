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
    imageMode = "hero",
    bgMusic,
    bgMusicVolume
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
      {/* Nhạc nền nhẹ (tuỳ chọn) — lặp xuyên suốt video, cùng đường bao fade-in/out ở đầu/cuối
          như giọng đọc (tái dùng audioVolume) nhưng nhân thêm bgMusicVolume để luôn nhỏ hơn
          nhiều so với giọng đọc chính, không cạnh tranh sự chú ý với phần đọc. */}
      {bgMusic ? <Audio src={resolveSrc(bgMusic)} volume={audioVolume * (bgMusicVolume ?? 0.12)} loop /> : null}

      {/* Nền ảnh phủ 100% full màn hình phía sau (để hiển thị xuyên qua khi hạ opacity màu nền trang giấy) */}
      {image && imageMode !== "none" && (
        <AbsoluteFill style={{ zIndex: 0 }}>
          <SceneImage src={image} fit={imageFit} kenBurns="none" durationInFrames={durationInFrames} />
        </AbsoluteFill>
      )}

      <AbsoluteFill style={{ flexDirection: "column", zIndex: 1 }}>
        {/* Level Badge ở góc phải bên trên */}
        {props.level && (
          <div style={{
            position: "absolute",
            top: 32,
            right: 32,
            zIndex: 100,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(10px)",
            border: "1.5px solid rgba(255, 255, 255, 0.3)",
            color: "#FFFFFF",
            padding: "8px 22px",
            borderRadius: 24,
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: "0.6px",
            boxShadow: "0 6px 18px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            pointerEvents: "none"
          }}>
            <span style={{ color: "#FFCB4D" }}>⚡</span>
            <span>{(() => {
              const str = String(props.level).trim();
              const match = str.match(/([a-c][1-2])/i);
              if (match) return `LEVEL: ${match[1].toUpperCase()}`;
              return `LEVEL: ${str.toUpperCase()}`;
            })()}</span>
          </div>
        )}

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
