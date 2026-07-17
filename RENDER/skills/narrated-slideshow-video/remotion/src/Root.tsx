import React from "react";
import { Composition } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { SlideshowVideo } from "./SlideshowVideo";
import { slideshowVideoSchema, SlideshowVideoProps, Scene } from "./schema";
import { resolveSrc } from "./utils";
import exampleProps from "../configs/example.json";

const FPS = 30;
const LANDSCAPE = { width: 1920, height: 1080 };
const PORTRAIT = { width: 1080, height: 1920 };

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SlideshowVideo"
        component={SlideshowVideo}
        fps={FPS}
        // Fallback dimensions/duration for Remotion Studio before
        // calculateMetadata resolves the real orientation + audio-driven
        // total below.
        width={LANDSCAPE.width}
        height={LANDSCAPE.height}
        durationInFrames={FPS * 30}
        schema={slideshowVideoSchema}
        defaultProps={exampleProps as SlideshowVideoProps}
        // Every scene's screen time comes from the length of its narration
        // clip (unless a scene sets an explicit durationSeconds). This runs
        // once per render/props-change, resolves every scene's real audio
        // duration up front, and bakes the result into `props.scenes` so
        // SlideshowVideo itself can stay a plain synchronous component —
        // it never needs to know these numbers came from probing audio
        // files.
        calculateMetadata={async ({ props }) => {
          // props at runtime already has every zod .default() applied (this
          // callback only ever runs after Remotion parses defaultProps/CLI
          // props through slideshowVideoSchema) — the explicit `Scene[]` /
          // `SlideshowVideoProps` annotations below just tell TypeScript
          // that, since the generic type Remotion infers here (an
          // intersection of the schema's pre-default input type and the
          // defaultProps type) doesn't narrow optional fields cleanly
          // inside nested arrays.
          const scenesWithDuration: Scene[] = await Promise.all(
            props.scenes.map(async (scene): Promise<Scene> => {
              if (scene.durationSeconds !== undefined) {
                return scene as Scene;
              }
              const audioSeconds = await getAudioDurationInSeconds(
                resolveSrc(scene.audio)
              );
              return {
                ...scene,
                caption: scene.caption ?? "",
                durationSeconds: audioSeconds + props.audioPaddingSeconds,
              } as Scene;
            })
          );

          const totalSeconds = scenesWithDuration.reduce(
            (sum, scene) => sum + (scene.durationSeconds ?? 4),
            0
          );

          const resolvedProps: SlideshowVideoProps = {
            ...props,
            scenes: scenesWithDuration,
          } as SlideshowVideoProps;

          const { width, height } =
            props.orientation === "portrait" ? PORTRAIT : LANDSCAPE;

          return {
            width,
            height,
            durationInFrames: Math.max(1, Math.round(totalSeconds * FPS)),
            props: resolvedProps,
          };
        }}
      />
    </>
  );
};
