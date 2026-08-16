import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, useVideoConfig } from "remotion";
import { SlideshowVideoProps } from "./schema";
import { Background } from "@atposter/remotion-shared";
import { Scene } from "./components/Scene";
import { resolveSrc, sceneSeconds } from "@atposter/remotion-shared";

/**
 * Logo thương hiệu đóng mờ ở góc phải dưới.
 *
 * Các con số dưới đây tính theo PHẦN TRĂM CHIỀU RỘNG khung hình, không phải pixel — cùng một bộ
 * số cho ra cùng một tỉ lệ trên cả khung dọc 9:16 lẫn khung ngang 16:9, và không phải sửa lại khi
 * đổi độ phân giải xuất.
 *
 * Độ mờ 0.38: đủ nhận ra thương hiệu khi người xem để ý, nhưng không tranh mắt với nội dung. Logo
 * đậm quá trên nền đen tuyền của dòng video này sẽ chói và kéo hết sự chú ý xuống góc.
 */
const BRAND_LOGO = {
  widthPercent: 22,
  rightPercent: 4,
  bottomPercent: 2.6,
  opacity: 0.38,
};

const BrandLogo: React.FC<{ src: string }> = ({ src }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <Img
      src={resolveSrc(src)}
      style={{
        position: "absolute",
        right: `${BRAND_LOGO.rightPercent}%`,
        bottom: `${BRAND_LOGO.bottomPercent}%`,
        width: `${BRAND_LOGO.widthPercent}%`,
        // height auto + objectFit contain: logo giữ đúng tỉ lệ gốc dù file là vuông hay chữ nhật,
        // không bị bóp méo — thứ dễ thấy nhất khi một logo bị làm sai.
        height: "auto",
        objectFit: "contain",
        opacity: BRAND_LOGO.opacity,
      }}
    />
  </AbsoluteFill>
);

export const SlideshowVideo: React.FC<SlideshowVideoProps> = (props) => {
  const { fps } = useVideoConfig();
  const {
    title,
    scenes,
    captionPosition,
    imageFit,
    imageScale,
    imageTranslateY,
    captionMarginY,
    kenBurns,
    transitionSeconds,
    transitionStyle,
    bgColor,
    slideBgColor,
    slideTextColor,
    fontFamily,
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
    bgMusic,
    bgMusicVolume,
    brandLogo,
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
              videoTitle={title}
              sceneDurationInFrames={sceneDurationInFrames}
              visualDurationInFrames={visualDurationInFrames}
              transitionFrames={transitionFrames}
              transitionStyle={transitionStyle}
              globalKenBurns={kenBurns}
              globalImageFit={imageFit}
              imageScale={imageScale}
              imageTranslateY={imageTranslateY}
              captionMarginY={captionMarginY}
              captionPosition={captionPosition}
              captionMode={captionMode}
              captionWordsPerChunk={captionWordsPerChunk}
              captionStyle={captionStyle}
              captionFont={captionFont}
              captionFontSize={captionFontSize}
              captionSecondaryFontSize={captionSecondaryFontSize}
              captionTextColor={captionTextColor}
              captionBgColor={captionBgColor}
              highlightColor={highlightColor}
              showBilingual={showBilingual}
              slideBgColor={slideBgColor}
              slideTextColor={slideTextColor}
              fontFamily={fontFamily}
            />
          </Sequence>
        );
      })}

      {bgMusic ? <Audio src={resolveSrc(bgMusic)} volume={bgMusicVolume} loop /> : null}

      {/* Logo thương hiệu — lớp TRÊN CÙNG, nằm ngoài mọi <Sequence> nên hiện xuyên suốt video và
          không dính hiệu ứng chuyển cảnh của từng slide. */}
      {brandLogo ? <BrandLogo src={brandLogo} /> : null}
    </AbsoluteFill>
  );
};
