import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { resolveSrc } from "../utils";
import { resolveCaptionFontFamily } from "../captionFonts";
import type { CaptionFont } from "../types";

function stripTags(text: string): string {
  return text.replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
}

function withHighlights(text: string, highlightColor: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((p) => p.length > 0);
  return parts.map((part, i) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(part);
    return m ? (
      <span key={i} style={{ color: highlightColor }}>{m[1]}</span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    );
  });
}

function primaryLine(text: string): string {
  return stripTags((text || "").split("\n")[0] || "");
}

function secondaryLine(text: string): string {
  return stripTags((text || "").split("\n")[1] || "");
}

export const BulletsLayout: React.FC<{
  bullets: string[];
  durationInFrames: number;
  fontFamily: string;
  captionFont?: CaptionFont;
  fontSize: number;
  textColor: string;
  bgColor: string;
  highlightColor: string;
}> = ({ bullets, durationInFrames, fontFamily, captionFont, fontSize, textColor, bgColor, highlightColor }) => {
  const frame = useCurrentFrame();
  const resolvedFont = resolveCaptionFontFamily(captionFont, fontFamily);
  const items = bullets.filter((b) => (b || "").trim().length > 0);
  const revealWindow = durationInFrames * 0.8;

  return (
    <AbsoluteFill
      style={{
        background: bgColor,
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "0 10%",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: fontSize * 0.85, width: "100%" }}>
        {items.map((bullet, i) => {
          const revealAt = items.length > 1 ? (i / (items.length - 1)) * revealWindow : 0;
          const opacity = interpolate(frame, [revealAt, revealAt + 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const translateY = interpolate(frame, [revealAt, revealAt + 8], [12, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: fontSize * 0.5,
                opacity,
                transform: `translateY(${translateY}px)`,
              }}
            >
              <span
                style={{
                  fontFamily: resolvedFont,
                  fontSize,
                  fontWeight: 700,
                  color: highlightColor,
                  lineHeight: 1.35,
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                •
              </span>
              <div
                style={{
                  fontFamily: resolvedFont,
                  fontSize,
                  fontWeight: 600,
                  color: textColor,
                  lineHeight: 1.35,
                }}
              >
                {withHighlights(stripTags(bullet), highlightColor)}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const SplitLayout: React.FC<{
  image: string;
  caption: string;
  side: "left" | "right";
  fontFamily: string;
  captionFont?: CaptionFont;
  fontSize: number;
  secondaryFontSize: number;
  textColor: string;
  highlightColor: string;
  showBilingual: boolean;
  durationInFrames: number;
}> = ({
  image,
  caption,
  side,
  fontFamily,
  captionFont,
  fontSize,
  secondaryFontSize,
  textColor,
  highlightColor,
  showBilingual,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const resolvedFont = resolveCaptionFontFamily(captionFont, fontFamily);
  const primary = primaryLine(caption);
  const secondary = secondaryLine(caption);
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const drift = interpolate(frame, [0, durationInFrames], [0, 1.03], { extrapolateRight: "clamp" });

  const textBlock = (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 4%",
        opacity: fadeIn,
      }}
    >
      <div
        style={{
          fontFamily: resolvedFont,
          fontSize,
          fontWeight: 700,
          color: textColor,
          lineHeight: 1.35,
          textAlign: "center",
        }}
      >
        {withHighlights(primary, highlightColor)}
      </div>
      {showBilingual && secondary ? (
        <div
          style={{
            fontFamily: resolvedFont,
            fontSize: secondaryFontSize,
            fontWeight: 500,
            color: textColor,
            opacity: 0.62,
            lineHeight: 1.35,
            textAlign: "center",
            marginTop: fontSize * 0.35,
          }}
        >
          {secondary}
        </div>
      ) : null}
    </div>
  );

  const imageBlock = (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <Img
        src={resolveSrc(image)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transform: `scale(${drift})`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );

  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "stretch" }}>
      {side === "right" ? textBlock : imageBlock}
      {side === "right" ? imageBlock : textBlock}
    </AbsoluteFill>
  );
};

export const CaptionLeftOverlay: React.FC<{
  caption: string;
  fontFamily: string;
  captionFont?: CaptionFont;
  fontSize: number;
  secondaryFontSize: number;
  textColor: string;
  highlightColor: string;
  showBilingual: boolean;
}> = ({ caption, fontFamily, captionFont, fontSize, secondaryFontSize, textColor, highlightColor, showBilingual }) => {
  const frame = useCurrentFrame();
  const resolvedFont = resolveCaptionFontFamily(captionFont, fontFamily);
  const primary = primaryLine(caption);
  const secondary = secondaryLine(caption);
  if (!primary) return null;

  const p = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-start", padding: "0 0 7% 7%" }}>
      <div
        style={{
          maxWidth: "70%",
          opacity: p,
          transform: `translateY(${interpolate(p, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: resolvedFont,
            fontSize,
            fontWeight: 700,
            color: textColor,
            lineHeight: 1.3,
            textAlign: "left",
          }}
        >
          {withHighlights(primary, highlightColor)}
        </div>
        {showBilingual && secondary ? (
          <div
            style={{
              fontFamily: resolvedFont,
              fontSize: secondaryFontSize,
              fontWeight: 500,
              color: textColor,
              opacity: 0.62,
              lineHeight: 1.3,
              textAlign: "left",
              marginTop: fontSize * 0.28,
            }}
          >
            {secondary}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
