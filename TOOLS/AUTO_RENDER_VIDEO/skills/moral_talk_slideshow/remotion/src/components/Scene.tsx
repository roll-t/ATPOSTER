import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { SceneImage, KenBurnsDirection } from "@atposter/remotion-shared";
import { Caption } from "@atposter/remotion-shared";
import { BulletsLayout, SplitLayout, CaptionLeftOverlay } from "@atposter/remotion-shared";
import { Sfx } from "@atposter/remotion-shared";
import { Arrows } from "@atposter/remotion-shared";
import { Scene as SceneConfig, SlideshowVideoProps } from "../schema";
import { resolveSrc } from "@atposter/remotion-shared";

const AUDIO_FADE_FRAMES = 5; // ~0.15s at 30fps, just enough to avoid clicks

type TransitionStyle = SlideshowVideoProps["transitionStyle"];

/**
 * Opacity + transform for one phase ("in" at the scene's own head, "out"
 * during the overlap with the next scene) of a transition. `progress` is
 * 0..1 across that phase's transitionFrames window. Every style keeps both
 * scenes fully mounted and visible during the shared overlap window (see
 * SlideshowVideo.tsx) — the difference is purely how each one moves/fades,
 * never whether the background peeks through.
 */
function transitionFrame(
  style: TransitionStyle,
  phase: "in" | "out",
  progress: number
): { opacity: number; transform: string } {
  switch (style) {
    case "slide-left":
      return phase === "in"
        ? { opacity: 1, transform: `translateX(${interpolate(progress, [0, 1], [100, 0])}%)` }
        : { opacity: 1, transform: `translateX(${interpolate(progress, [0, 1], [0, -100])}%)` };
    case "slide-right":
      return phase === "in"
        ? { opacity: 1, transform: `translateX(${interpolate(progress, [0, 1], [-100, 0])}%)` }
        : { opacity: 1, transform: `translateX(${interpolate(progress, [0, 1], [0, 100])}%)` };
    case "slide-up":
      return phase === "in"
        ? { opacity: 1, transform: `translateY(${interpolate(progress, [0, 1], [100, 0])}%)` }
        : { opacity: 1, transform: `translateY(${interpolate(progress, [0, 1], [0, -100])}%)` };
    case "zoom":
      return phase === "in"
        ? { opacity: interpolate(progress, [0, 1], [0, 1]), transform: `scale(${interpolate(progress, [0, 1], [0.92, 1])})` }
        : { opacity: interpolate(progress, [0, 1], [1, 0]), transform: `scale(${interpolate(progress, [0, 1], [1, 1.08])})` };
    case "crossfade":
    default:
      return {
        opacity: interpolate(progress, [0, 1], phase === "in" ? [0, 1] : [1, 0]),
        transform: "none",
      };
  }
}

// How far down (% of frame height) the image is nudged for captionStyle:
// "hook", to leave headroom under the top-anchored title card instead of
// the card sitting on top of the image content. Paired with a compensating
// scale bump in SceneImage.tsx so no gap shows at the top edge.
const HOOK_IMAGE_OFFSET_PERCENT = 5;

export const Scene: React.FC<{
  scene: SceneConfig;
  sceneIndex: number;
  videoTitle?: string;
  sceneDurationInFrames: number;
  visualDurationInFrames: number;
  transitionFrames: number;
  transitionStyle: TransitionStyle;
  globalKenBurns: boolean;
  globalImageFit: "cover" | "contain";
  imageScale: number;
  imageTranslateY: number;
  captionMarginY: number;
  captionPosition: "top" | "bottom" | "center";
  captionMode: "chunked" | "full";
  captionWordsPerChunk: number;
  captionStyle: SlideshowVideoProps["captionStyle"];
  captionFont: SlideshowVideoProps["captionFont"];
  captionFontSize: SlideshowVideoProps["captionFontSize"];
  captionSecondaryFontSize: SlideshowVideoProps["captionSecondaryFontSize"];
  captionTextColor: SlideshowVideoProps["captionTextColor"];
  captionBgColor: SlideshowVideoProps["captionBgColor"];
  highlightColor: SlideshowVideoProps["highlightColor"];
  showBilingual: boolean;
  // Màu nền cho slide không có ảnh phủ kín (layout "bullets"/"split") — xem schema.ts.
  slideBgColor: string;
  // Màu chữ cho 3 bố cục mới — xem schema.ts (tách riêng khỏi captionTextColor).
  slideTextColor: string;
  fontFamily: string;
}> = ({
  scene,
  sceneIndex,
  videoTitle,
  sceneDurationInFrames,
  visualDurationInFrames,
  transitionFrames,
  transitionStyle,
  globalKenBurns,
  globalImageFit,
  imageScale,
  imageTranslateY,
  captionMarginY,
  captionPosition,
  captionMode,
  captionWordsPerChunk,
  captionStyle,
  captionFont,
  captionFontSize,
  captionSecondaryFontSize,
  captionTextColor,
  captionBgColor,
  highlightColor,
  showBilingual,
  slideBgColor,
  slideTextColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();

  // The scene's own head (fade/slide-in) always runs over the first
  // transitionFrames. Its tail (fade/slide-out) runs over the LAST
  // transitionFrames of its (possibly extended) visual mount window — for
  // every scene but the last, that window already overlaps the next
  // scene's own head, which is what makes this a true crossfade/push
  // instead of two independent fades meeting at a hard cut.
  const inProgress = transitionFrames > 0 ? Math.min(1, Math.max(0, frame / transitionFrames)) : 1;
  const outStart = visualDurationInFrames - transitionFrames;
  const outProgress = transitionFrames > 0 ? Math.min(1, Math.max(0, (frame - outStart) / transitionFrames)) : 0;

  const isOutPhase = frame >= outStart;
  const { opacity, transform } = isOutPhase
    ? transitionFrame(transitionStyle, "out", outProgress)
    : transitionFrame(transitionStyle, "in", inProgress);

  const audioVolume = interpolate(
    frame,
    [0, AUDIO_FADE_FRAMES, sceneDurationInFrames - AUDIO_FADE_FRAMES, sceneDurationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const kenBurns: KenBurnsDirection = !globalKenBurns
    ? "none"
    : scene.kenBurns ?? (sceneIndex % 2 === 0 ? "in" : "out");

  // Bố cục riêng của slide này. Mặc định "default" = giữ nguyên hành vi cũ (hình phủ kín +
  // Caption theo cấu hình toàn cục), nên mọi video/config cũ render ra y hệt như trước.
  const layout = scene.layout ?? "default";

  // Cỡ chữ dùng cho các bố cục mới. Bám theo captionFontSize người dùng đã chọn để không lệch
  // hẳn với phần còn lại của video; nếu chưa đặt thì lấy mốc riêng hợp với từng bố cục.
  const layoutFontSize = captionFontSize ?? 40;
  const layoutSecondaryFontSize = captionSecondaryFontSize ?? Math.round(layoutFontSize * 0.62);
  const layoutTextColor = slideTextColor;
  const layoutHighlightColor = highlightColor || "#FE2C55";

  // Slide chữ thuần: KHÔNG dựng SceneImage, nhưng vẫn giữ nguyên Audio/Sfx/Arrows để lời kể và
  // hiệu ứng của scene chạy bình thường — nếu bỏ luôn thì slide này mất tiếng.
  if (layout === "bullets") {
    return (
      <AbsoluteFill style={{ opacity, transform }}>
        <BulletsLayout
          bullets={scene.bullets ?? []}
          durationInFrames={visualDurationInFrames}
          fontFamily={fontFamily}
          captionFont={captionFont}
          fontSize={layoutFontSize}
          textColor={layoutTextColor}
          bgColor={slideBgColor}
          highlightColor={layoutHighlightColor}
        />
        <Audio src={resolveSrc(scene.audio)} volume={audioVolume} />
        <Sfx cues={scene.sfx} />
        <Arrows cues={scene.arrows} />
      </AbsoluteFill>
    );
  }

  if (layout === "split") {
    return (
      <AbsoluteFill style={{ opacity, transform, background: slideBgColor }}>
        <SplitLayout
          image={scene.image}
          caption={scene.caption}
          side={scene.splitSide ?? "right"}
          fontFamily={fontFamily}
          captionFont={captionFont}
          fontSize={layoutFontSize}
          secondaryFontSize={layoutSecondaryFontSize}
          textColor={layoutTextColor}
          highlightColor={layoutHighlightColor}
          showBilingual={showBilingual}
          durationInFrames={visualDurationInFrames}
        />
        <Audio src={resolveSrc(scene.audio)} volume={audioVolume} />
        <Sfx cues={scene.sfx} />
        <Arrows cues={scene.arrows} />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ opacity, transform }}>
      <SceneImage
        src={scene.image}
        fit={scene.imageFit ?? globalImageFit}
        kenBurns={kenBurns}
        durationInFrames={visualDurationInFrames}
        topOffsetPercent={captionStyle === "hook" ? HOOK_IMAGE_OFFSET_PERCENT : 0}
        imageScale={imageScale}
        imageTranslateY={imageTranslateY}
        // Chỉ bật ở skill này (xem CORNER_PATCH trong SceneImage.tsx). Nền ảnh của dòng video này
        // là đen tuyền nên ô che trùng màu nền, không để lại vệt.
        patchBottomRightCorner
        cornerPatchColor="#000000"
      />
      <Audio src={resolveSrc(scene.audio)} volume={audioVolume} />
      <Sfx cues={scene.sfx} />
      <Arrows cues={scene.arrows} />
      {/* "image-only": bỏ hẳn phụ đề dù scene CÓ caption — dùng làm nhịp nghỉ, để hình tự nói.
          Khác với việc để caption rỗng ở khâu viết kịch bản: caption vẫn cần giữ nguyên vì lời kể
          (dialogueOrNarration) và phụ đề là 2 trường tách biệt, xoá caption đi thì mất luôn dữ
          liệu, còn ở đây chỉ là không VẼ nó ra. */}
      {layout === "caption-left" ? (
        <CaptionLeftOverlay
          caption={scene.caption}
          fontFamily={fontFamily}
          captionFont={captionFont}
          fontSize={layoutFontSize}
          secondaryFontSize={layoutSecondaryFontSize}
          textColor={layoutTextColor}
          highlightColor={layoutHighlightColor}
          showBilingual={showBilingual}
        />
      ) : layout === "image-only" ? null : (
        <Caption
          text={scene.caption}
          sceneIndex={sceneIndex}
          videoTitle={videoTitle}
          position={captionPosition}
          captionMarginY={captionMarginY}
          fontFamily={fontFamily}
          mode={captionMode}
          wordsPerChunk={captionWordsPerChunk}
          style={captionStyle}
          captionFont={captionFont}
          captionFontSize={captionFontSize}
          captionSecondaryFontSize={captionSecondaryFontSize}
          captionTextColor={captionTextColor}
          captionBgColor={captionBgColor}
          highlightColor={highlightColor}
          showBilingual={showBilingual}
          durationInFrames={sceneDurationInFrames}
          wordTimings={scene.wordTimings}
          opacity={1}
        />
      )}
      {/* Watermark Logo tinh tế phía dưới ảnh */}
      <div
        style={{
          position: "absolute",
          bottom: 130,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
          zIndex: 4,
          opacity: 0.45,
        }}
      >
        <Img
          src={staticFile("logo/the-mind-logo.png")}
          style={{
            width: 260,
            height: "auto",
            objectFit: "contain",
            mixBlendMode: "screen",
            filter: "brightness(0.98)",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
