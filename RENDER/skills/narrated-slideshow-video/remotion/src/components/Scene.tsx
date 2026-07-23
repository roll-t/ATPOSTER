import React from "react";
import { AbsoluteFill, Audio, interpolate, useCurrentFrame } from "remotion";
import { SceneImage, KenBurnsDirection } from "./SceneImage";
import { Caption } from "./Caption";
import { Sfx } from "./Sfx";
import { Arrows } from "./Arrows";
import { Scene as SceneConfig, SlideshowVideoProps } from "../schema";
import { resolveSrc } from "../utils";

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
const HOOK_IMAGE_OFFSET_PERCENT = 12;

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
  captionPosition: "top" | "bottom" | "center";
  captionMode: "chunked" | "full";
  captionWordsPerChunk: number;
  captionStyle: SlideshowVideoProps["captionStyle"];
  captionFont: SlideshowVideoProps["captionFont"];
  captionFontSize: SlideshowVideoProps["captionFontSize"];
  captionTextColor: SlideshowVideoProps["captionTextColor"];
  captionBgColor: SlideshowVideoProps["captionBgColor"];
  highlightColor: SlideshowVideoProps["highlightColor"];
  showBilingual: boolean;
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
  captionPosition,
  captionMode,
  captionWordsPerChunk,
  captionStyle,
  captionFont,
  captionFontSize,
  captionTextColor,
  captionBgColor,
  highlightColor,
  showBilingual,
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

  return (
    <AbsoluteFill style={{ opacity, transform }}>
      <SceneImage
        src={scene.image}
        fit={scene.imageFit ?? globalImageFit}
        kenBurns={kenBurns}
        durationInFrames={visualDurationInFrames}
        topOffsetPercent={captionStyle === "hook" ? HOOK_IMAGE_OFFSET_PERCENT : 0}
      />
      <Audio src={resolveSrc(scene.audio)} volume={audioVolume} />
      <Sfx cues={scene.sfx} />
      <Arrows cues={scene.arrows} />
      <Caption
        text={scene.caption}
        sceneIndex={sceneIndex}
        videoTitle={videoTitle}
        position={captionPosition}
        fontFamily={fontFamily}
        mode={captionMode}
        wordsPerChunk={captionWordsPerChunk}
        style={captionStyle}
        captionFont={captionFont}
        captionFontSize={captionFontSize}
        captionTextColor={captionTextColor}
        captionBgColor={captionBgColor}
        highlightColor={highlightColor}
        showBilingual={showBilingual}
        durationInFrames={sceneDurationInFrames}
        wordTimings={scene.wordTimings}
        opacity={1}
      />
    </AbsoluteFill>
  );
};
