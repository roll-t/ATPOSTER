import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { CaptionStyle, CaptionFont, WordTiming } from "../types";
import { resolveCaptionFontFamily } from "../captionFonts";

function strokeShadow(color: string, width = 2.5): string {
  const steps = 14;
  const shadows: string[] = [];
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const x = Math.round(Math.cos(angle) * width * 10) / 10;
    const y = Math.round(Math.sin(angle) * width * 10) / 10;
    shadows.push(`${x}px ${y}px 0 ${color}`);
  }
  return shadows.join(", ");
}

function splitWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function stripEmotionTags(text: string): string {
  return text.replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
}

function stripHighlightMarkers(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1");
}

function renderWithHighlights(text: string, highlightColor: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((p) => p.length > 0);
  return parts.map((part, i) => {
    const match = /^\*\*([^*]+)\*\*$/.exec(part);
    if (match) {
      return (
        <span key={i} style={{ color: highlightColor }}>
          {match[1]}
        </span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function stripListNumber(text: string): string {
  return text.replace(/^\s*\d+[.):]\s*/, "").trim();
}

function chunkIntoCount(text: string, count: number): string[] {
  const words = splitWords(text);
  if (count <= 0) return [""];
  if (words.length === 0) return new Array(count).fill("");
  const base = Math.floor(words.length / count);
  const extra = words.length % count;
  const chunks: string[] = [];
  let idx = 0;
  for (let i = 0; i < count; i++) {
    const size = base + (i < extra ? 1 : 0);
    chunks.push(words.slice(idx, idx + size).join(" "));
    idx += size;
  }
  return chunks;
}

function activeWordIndex(words: string[], durationInFrames: number, frame: number): number {
  if (words.length === 0) return 0;
  const weights = words.map((w) => w.length + 2);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let elapsed = 0;
  for (let i = 0; i < words.length; i++) {
    const wordFrames = (weights[i] / totalWeight) * durationInFrames;
    if (frame < elapsed + wordFrames || i === words.length - 1) return i;
    elapsed += wordFrames;
  }
  return words.length - 1;
}

function activeWordIndexFromTimings(timings: WordTiming[], timeSeconds: number): number {
  if (timings.length === 0) return 0;
  if (timeSeconds <= timings[0].start) return 0;
  for (let i = 0; i < timings.length; i++) {
    if (timeSeconds < timings[i].end) return i;
    if (i + 1 < timings.length && timeSeconds < timings[i + 1].start) return i;
  }
  return timings.length - 1;
}

function resolveActiveWordIndex(
  words: string[],
  wordTimings: WordTiming[] | undefined,
  durationInFrames: number,
  fps: number,
  frame: number
): number {
  if (words.length === 0) return 0;
  if (!wordTimings || wordTimings.length === 0) {
    return activeWordIndex(words, durationInFrames, frame);
  }
  const timingIdx = activeWordIndexFromTimings(wordTimings, frame / fps);
  if (wordTimings.length === words.length) return timingIdx;
  const ratio = timingIdx / Math.max(1, wordTimings.length - 1);
  return Math.min(words.length - 1, Math.round(ratio * (words.length - 1)));
}

const CaptionLine: React.FC<{
  words: string[];
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  lineHeight?: number;
  strokeColor?: string;
  highlightIndex?: number;
  highlightColor?: string;
  highlightTextColor?: string;
}> = ({ words, fontFamily, fontSize, fontWeight, color, lineHeight = 1.35, strokeColor, highlightIndex, highlightColor, highlightTextColor = "#FFFFFF" }) => (
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "baseline",
      rowGap: 2,
      columnGap: 10,
      fontFamily,
      lineHeight,
      textWrap: "balance" as any,
    }}
  >
    {words.map((word, i) => {
      const isActive = highlightIndex === i;
      return (
        <span
          key={i}
          style={{
            fontSize: isActive ? Math.round(fontSize * 1.16) : fontSize,
            fontWeight,
            color: isActive && highlightColor ? highlightTextColor : color,
            background: isActive && highlightColor ? highlightColor : "transparent",
            borderRadius: isActive && highlightColor ? 6 : 0,
            padding: isActive && highlightColor ? "1px 8px" : 0,
            textShadow: strokeColor && !(isActive && highlightColor) ? strokeShadow(strokeColor) : undefined,
          }}
        >
          {word}
        </span>
      );
    })}
  </div>
);

export const Caption: React.FC<{
  text: string;
  sceneIndex?: number;
  videoTitle?: string;
  position: "top" | "bottom" | "center";
  captionMarginY?: number;
  fontFamily: string;
  mode: "chunked" | "full";
  wordsPerChunk: number;
  style: CaptionStyle;
  captionFont?: CaptionFont;
  captionFontSize?: number;
  captionSecondaryFontSize?: number;
  captionTextColor?: string;
  captionBgColor?: string;
  highlightColor?: string;
  showBilingual: boolean;
  durationInFrames: number;
  wordTimings?: WordTiming[];
  opacity: number;
}> = ({
  text,
  sceneIndex = 0,
  videoTitle,
  position,
  captionMarginY = 0,
  fontFamily,
  mode,
  wordsPerChunk,
  style,
  captionFont,
  captionFontSize,
  captionSecondaryFontSize,
  captionTextColor,
  captionBgColor,
  highlightColor: highlightColorOverride,
  showBilingual,
  durationInFrames,
  wordTimings,
  opacity,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (style === "hook") {
    return (
      <HookCaption
        text={text}
        sceneIndex={sceneIndex}
        videoTitle={videoTitle}
        captionMarginY={captionMarginY}
        fontFamily={fontFamily}
        captionFont={captionFont}
        captionFontSize={captionFontSize}
        captionSecondaryFontSize={captionSecondaryFontSize}
        captionTextColor={captionTextColor}
        captionBgColor={captionBgColor}
        highlightColor={highlightColorOverride}
        showBilingual={showBilingual}
        durationInFrames={durationInFrames}
        opacity={opacity}
      />
    );
  }

  if (!text) return null;

  const [primaryTextRaw, secondaryTextRaw] = text.split("\n").map((s) => stripHighlightMarkers(stripEmotionTags(s)));
  const hasSecondary = showBilingual && Boolean(secondaryTextRaw);

  const allWords = splitWords(primaryTextRaw);

  const isKaraoke = style === "karaoke";
  const isPage = style === "page";
  const isTiktok = style === "tiktok";
  const highlightsWords = isKaraoke || isPage;

  const activeIdx =
    mode === "full" && !highlightsWords
      ? -1
      : resolveActiveWordIndex(allWords, wordTimings, durationInFrames, fps, frame);

  const chunkStart = mode === "full" ? 0 : Math.floor(activeIdx / wordsPerChunk) * wordsPerChunk;
  const primaryWords = mode === "full" ? allWords : allWords.slice(chunkStart, chunkStart + wordsPerChunk);
  const localActiveIndex = mode === "full" ? activeIdx : activeIdx - chunkStart;

  let secondaryWords: string[] = [];
  if (hasSecondary) {
    if (mode === "full") {
      secondaryWords = splitWords(secondaryTextRaw);
    } else {
      const totalChunks = Math.max(1, Math.ceil(allWords.length / wordsPerChunk));
      const chunkIndex = Math.floor(chunkStart / wordsPerChunk);
      secondaryWords = splitWords(chunkIntoCount(secondaryTextRaw, totalChunks)[chunkIndex] ?? "");
    }
  }

  const resolvedFontFamily = resolveCaptionFontFamily(captionFont, fontFamily);
  const basePrimaryFontSize = isPage ? 32 : 40;
  const primaryFontSize = captionFontSize ?? basePrimaryFontSize;
  const secondaryFontSize = captionSecondaryFontSize ?? Math.round(primaryFontSize * (isPage ? 0.69 : 0.65));
  const primaryColor = captionTextColor || (isPage ? "#2A2118" : "#FFFFFF");
  const isTransparentBg = captionBgColor === "transparent";
  const boxBgColor = captionBgColor || (isPage ? "#FBF3E3" : "rgba(10, 10, 14, 0.72)");
  const resolvedHighlightColor = highlightColorOverride || (isKaraoke ? "#FE2C55" : isPage ? "#FFCB4D" : undefined);

  const primaryLine = (
    <CaptionLine
      words={primaryWords}
      fontFamily={resolvedFontFamily}
      fontSize={primaryFontSize}
      fontWeight={isPage ? 600 : 700}
      color={primaryColor}
      lineHeight={isPage ? 1.55 : 1.35}
      strokeColor={isTiktok ? "#000000" : undefined}
      highlightIndex={highlightsWords ? localActiveIndex : undefined}
      highlightColor={resolvedHighlightColor}
      highlightTextColor={isPage ? "#2A2118" : "#FFFFFF"}
    />
  );

  const secondaryLine = hasSecondary ? (
    <CaptionLine
      words={secondaryWords}
      fontFamily={resolvedFontFamily}
      fontSize={secondaryFontSize}
      fontWeight={500}
      color={isTiktok ? "#FFE14D" : isPage ? "rgba(42, 33, 24, 0.65)" : "rgba(255, 255, 255, 0.82)"}
      strokeColor={isTiktok ? "#000000" : undefined}
    />
  ) : null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: position === "bottom" ? "flex-end" : position === "top" ? "flex-start" : "center",
        alignItems: "center",
        padding: "0 90px",
        opacity,
      }}
    >
      {isTiktok ? (
        <div
          style={{
            marginTop: position === "top" ? 64 - captionMarginY : 0,
            marginBottom: position === "bottom" ? 64 + captionMarginY : 0,
            transform: position === "center" && captionMarginY !== 0 ? `translateY(${-captionMarginY}px)` : "none",
            maxWidth: "88%",
            textAlign: "center",
          }}
        >
          {primaryLine}
          {secondaryLine && <div style={{ marginTop: 9 }}>{secondaryLine}</div>}
        </div>
      ) : isPage ? (
        <div
          style={{
            marginTop: position === "top" ? 64 - captionMarginY : 0,
            marginBottom: position === "bottom" ? 64 + captionMarginY : 0,
            transform: position === "center" && captionMarginY !== 0 ? `translateY(${-captionMarginY}px)` : "none",
            maxWidth: "84%",
            background: boxBgColor,
            border: isTransparentBg ? "none" : "1px solid rgba(42, 33, 24, 0.08)",
            borderRadius: 28,
            padding: "56px 64px",
            boxShadow: isTransparentBg ? "none" : "0 20px 60px rgba(0,0,0,0.35)",
            textAlign: "center",
          }}
        >
          {primaryLine}
          {secondaryLine && <div style={{ marginTop: 18 }}>{secondaryLine}</div>}
        </div>
      ) : (
        <div
          style={{
            marginTop: position === "top" ? 64 - captionMarginY : 0,
            marginBottom: position === "bottom" ? 64 + captionMarginY : 0,
            transform: position === "center" && captionMarginY !== 0 ? `translateY(${-captionMarginY}px)` : "none",
            maxWidth: "82%",
            background: boxBgColor,
            borderRadius: 18,
            padding: "22px 40px",
            boxShadow: isTransparentBg ? "none" : "0 8px 30px rgba(0,0,0,0.35)",
            textAlign: "center",
          }}
        >
          {primaryLine}
          {secondaryLine && <div style={{ marginTop: 9 }}>{secondaryLine}</div>}
        </div>
      )}
    </AbsoluteFill>
  );
};

const HOOK_ANIM_FRAMES = 12;

const HookCaption: React.FC<{
  text: string;
  sceneIndex: number;
  videoTitle?: string;
  captionMarginY?: number;
  fontFamily: string;
  captionFont?: CaptionFont;
  captionFontSize?: number;
  captionSecondaryFontSize?: number;
  captionTextColor?: string;
  captionBgColor?: string;
  highlightColor?: string;
  showBilingual: boolean;
  durationInFrames: number;
  opacity: number;
}> = ({
  text,
  sceneIndex,
  videoTitle,
  captionMarginY = 0,
  fontFamily,
  captionFont,
  captionFontSize,
  captionSecondaryFontSize,
  captionTextColor,
  captionBgColor,
  highlightColor,
  showBilingual,
  durationInFrames,
  opacity,
}) => {
  const frame = useCurrentFrame();
  const isFirstScene = sceneIndex === 0;

  const rawText = isFirstScene && videoTitle ? videoTitle : text;
  if (!rawText) return null;

  const [primaryTextRaw, secondaryTextRaw] = rawText.split("\n").map((s) => stripEmotionTags(s));
  const primaryText = isFirstScene ? primaryTextRaw.toUpperCase() : stripListNumber(primaryTextRaw);
  const hasSecondary = !isFirstScene && showBilingual && Boolean(secondaryTextRaw);
  const secondaryText = hasSecondary ? stripHighlightMarkers(stripListNumber(secondaryTextRaw)) : "";

  if (!stripHighlightMarkers(primaryText)) return null;

  const resolvedHighlightColor = highlightColor || "#FE2C55";
  const resolvedFontFamily = resolveCaptionFontFamily(captionFont, fontFamily);
  const basePrimaryFontSize = isFirstScene ? 52 : 46;
  const primaryFontSize = captionFontSize
    ? Math.round(isFirstScene ? captionFontSize * 1.3 : captionFontSize)
    : basePrimaryFontSize;
  const secondaryFontSize = captionSecondaryFontSize ?? Math.round(primaryFontSize * 0.6);
  const primaryColor = captionTextColor || "#FFFFFF";
  const isTransparentBg = captionBgColor === "transparent";
  const boxBgColor = captionBgColor && !isTransparentBg ? captionBgColor : "rgba(8, 8, 11, 0.88)";

  const inProgress = Math.min(1, frame / HOOK_ANIM_FRAMES);
  const outStart = durationInFrames - HOOK_ANIM_FRAMES;
  const outProgress = frame >= outStart ? Math.min(1, Math.max(0, (frame - outStart) / HOOK_ANIM_FRAMES)) : 0;
  const animProgress = outProgress > 0 ? 1 - outProgress : inProgress;
  const animOpacity = animProgress;
  const animTranslateY = interpolate(animProgress, [0, 1], [-28, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        padding: "0 56px",
        opacity: opacity * animOpacity,
      }}
    >
      <div
        style={{
          marginTop: (isFirstScene ? 48 : 96) - captionMarginY,
          maxWidth: "90%",
          background: isTransparentBg ? "transparent" : boxBgColor,
          borderRadius: 24,
          padding: isFirstScene ? "32px 40px" : "20px 32px",
          boxShadow: isTransparentBg ? "none" : "0 12px 40px rgba(0,0,0,0.45)",
          textAlign: "center",
          transform: `translateY(${animTranslateY}px)`,
        }}
      >
        <div
          style={{
            fontFamily: resolvedFontFamily,
            fontSize: primaryFontSize,
            fontWeight: 800,
            lineHeight: 1.3,
            color: primaryColor,
            letterSpacing: isFirstScene ? "0.5px" : "normal",
          }}
        >
          {renderWithHighlights(primaryText, resolvedHighlightColor)}
        </div>
        {hasSecondary && (
          <div
            style={{
              fontFamily: resolvedFontFamily,
              fontSize: secondaryFontSize,
              fontWeight: 500,
              color: "rgba(255,255,255,0.75)",
              marginTop: 8,
            }}
          >
            {secondaryText}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
