import React from "react";
import { Composition } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { ReadingPageVideo } from "./ReadingPageVideo";
import { readingPageVideoSchema, ReadingPageVideoProps } from "./schema";
import { resolveSrc } from "./utils";
import exampleProps from "../configs/example.json";

const FPS = 30;
const LANDSCAPE = { width: 1920, height: 1080 };
const PORTRAIT = { width: 1080, height: 1920 };

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ReadingPageVideo"
        component={ReadingPageVideo}
        fps={FPS}
        // Fallback dimensions/duration for Remotion Studio before
        // calculateMetadata resolves the real orientation + audio-driven
        // total below.
        width={PORTRAIT.width}
        height={PORTRAIT.height}
        durationInFrames={FPS * 30}
        schema={readingPageVideoSchema}
        defaultProps={exampleProps as ReadingPageVideoProps}
        // The video's total length comes from the length of the single
        // narration clip (unless durationSeconds is set explicitly) — this
        // runs once per render/props-change and resolves it up front so
        // ReadingPageVideo itself can stay a plain synchronous component.
        calculateMetadata={async ({ props }) => {
          const totalSeconds =
            props.durationSeconds !== undefined
              ? props.durationSeconds
              : (await getAudioDurationInSeconds(resolveSrc(props.audio))) + props.audioPaddingSeconds;

          const { width, height } =
            props.orientation === "landscape" ? LANDSCAPE : PORTRAIT;

          return {
            width,
            height,
            durationInFrames: Math.max(1, Math.round(totalSeconds * FPS)),
          };
        }}
      />
    </>
  );
};
