import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ArrowCue } from "../schema";

const ARROWHEAD_SIZE = 14;
const FADE_OUT_SECONDS = 0.3;

/**
 * How visible the arrow is (0..1) and how far along its tail-to-arrowhead
 * draw-in animation it is (0..1), at the current frame. Pure math, no
 * hooks — safe to call once per cue inside a .map().
 */
function getArrowProgress(cue: ArrowCue, frame: number, fps: number): { opacity: number; drawProgress: number } {
  // Remotion validates `--props` against the zod schema for shape, but
  // does not fill in `.default()` values for fields nested inside
  // scene-level arrays (only top-level props get merged with
  // defaultProps) — so a cue that omits an optional field arrives here as
  // `undefined`, not the schema's documented default. Falling back
  // explicitly keeps the documented defaults true in practice, and avoids
  // `NaN` (e.g. `undefined * fps`) making the whole cue invisible.
  const atSeconds = cue.atSeconds ?? 0;
  const animateInSeconds = cue.animateInSeconds ?? 0.4;

  const startFrame = atSeconds * fps;
  const animateInFrames = Math.max(1, animateInSeconds * fps);
  const elapsed = frame - startFrame;

  if (elapsed < 0) return { opacity: 0, drawProgress: 0 };

  const drawProgress = interpolate(elapsed, [0, animateInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade the arrow in over the first quarter of the draw-in so it doesn't
  // pop in fully opaque before the line has actually finished drawing.
  const fadeInOpacity = interpolate(elapsed, [0, animateInFrames / 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (cue.holdSeconds === undefined) {
    return { opacity: fadeInOpacity, drawProgress };
  }

  const holdEndFrame = animateInFrames + cue.holdSeconds * fps;
  const fadeOutFrames = Math.max(1, fps * FADE_OUT_SECONDS);
  const fadeOutOpacity = interpolate(elapsed, [holdEndFrame, holdEndFrame + fadeOutFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return { opacity: Math.min(fadeInOpacity, fadeOutOpacity), drawProgress };
}

/**
 * Layers this scene's animated pointing arrows on top of the image —
 * each one draws in from `from` to `to` starting at its own atSeconds,
 * instead of being baked as a static shape into the scene's image (which
 * can't be timed to the narration). Coordinates are normalized to the
 * frame itself, not the source image, so they're unaffected by that
 * scene's Ken Burns pan/zoom.
 */
export const Arrows: React.FC<{ cues?: ArrowCue[] }> = ({ cues }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  if (!cues || cues.length === 0) return null;

  return (
    <AbsoluteFill>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          {cues.map((cue, i) => (
            <marker
              key={i}
              id={`arrowhead-${i}`}
              markerWidth={ARROWHEAD_SIZE}
              markerHeight={ARROWHEAD_SIZE}
              refX={ARROWHEAD_SIZE * 0.8}
              refY={ARROWHEAD_SIZE / 2}
              orient="auto-start-reverse"
            >
              <polygon
                points={`0 0, ${ARROWHEAD_SIZE} ${ARROWHEAD_SIZE / 2}, 0 ${ARROWHEAD_SIZE}`}
                fill={cue.color ?? "#FE2C55"}
              />
            </marker>
          ))}
        </defs>
        {cues.map((cue, i) => {
          const { opacity, drawProgress } = getArrowProgress(cue, frame, fps);
          if (opacity <= 0) return null;

          const x1 = cue.from.x * width;
          const y1 = cue.from.y * height;
          const x2 = interpolate(drawProgress, [0, 1], [x1, cue.to.x * width]);
          const y2 = interpolate(drawProgress, [0, 1], [y1, cue.to.y * height]);

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={cue.color ?? "#FE2C55"}
              strokeWidth={cue.strokeWidth ?? 6}
              strokeLinecap="round"
              opacity={opacity}
              markerEnd={`url(#arrowhead-${i})`}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
