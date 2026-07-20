import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ReadingPageVideoProps } from "../schema";
import { resolveCaptionFontFamily } from "../captionFonts";

type WordTiming = NonNullable<ReadingPageVideoProps["wordTimings"]>[number];

function splitWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

/**
 * Picks which WORD of `words` should be "active" right now — the one
 * currently being spoken. There's no word-level transcript/timestamp unless
 * `wordTimings` is supplied (see below), so each word's on-screen time is
 * weighted by its own character length (longer words linger a little
 * longer) across the video's total duration — a stable approximation that
 * needs no extra tooling.
 */
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

/**
 * Same job as activeWordIndex(), but from REAL per-word start/end timestamps
 * (seconds, relative to the audio's own start) instead of a character-length
 * estimate — used whenever `wordTimings` is supplied, for exact sync between
 * the highlighted word and the actual spoken audio.
 */
function activeWordIndexFromTimings(timings: WordTiming[], timeSeconds: number): number {
  if (timings.length === 0) return 0;
  if (timeSeconds <= timings[0].start) return 0;
  for (let i = 0; i < timings.length; i++) {
    if (timeSeconds < timings[i].end || i === timings.length - 1) return i;
  }
  return timings.length - 1;
}

// Common short function words that are never worth calling out as a
// "keyword" even when long enough by length alone (mostly moot at length
// >= 5, but a few common ones — "their", "would", "should" — clear that bar).
const STOPWORDS = new Set([
  "their", "would", "should", "could", "which", "there", "where", "these",
  "those", "about", "after", "before", "being", "still", "while", "every",
]);

// Selects up to `maxCount` "keyword" word indices from the body — content
// words (length >= 5, not a common stopword), evenly spread across the
// whole text — matching the design spec's "highlight_count: 5-8 keywords":
// only these words ever get the highlight pill treatment when their turn
// comes, instead of every single word flashing highlighted in sequence
// (which reads as noisy over a full paragraph). Memoized by the caller
// since it only needs to run once per body text, not every frame.
function pickKeywordIndices(words: string[], maxCount = 8): Set<number> {
  const candidates: number[] = [];
  words.forEach((w, i) => {
    const clean = w.replace(/[^a-zA-ZÀ-ỹ]/g, "");
    if (clean.length >= 5 && !STOPWORDS.has(clean.toLowerCase())) {
      candidates.push(i);
    }
  });
  if (candidates.length <= maxCount) return new Set(candidates);

  const picked = new Set<number>();
  const step = candidates.length / maxCount;
  for (let k = 0; k < maxCount; k++) {
    picked.add(candidates[Math.floor(k * step)]);
  }
  return picked;
}

// Auto-fits the body's base font size to its word count (a few size tiers,
// not a continuous scale) so a short line and a full paragraph both
// comfortably fit the fixed-height content band without hand-tuning.
function autoBodyFontSize(wordCount: number): number {
  if (wordCount <= 25) return 24;
  if (wordCount <= 50) return 22;
  if (wordCount <= 80) return 20;
  if (wordCount <= 120) return 18;
  return 16;
}

const DEFAULT_TITLE_FONT_SIZE = 44;
const DEFAULT_TITLE_BODY_GAP = 18;
// Horizontal breathing room around the title/body text, as % of frame width
// on EACH side (matches schema.ts's contentPaddingPercent contract).
const DEFAULT_CONTENT_PADDING_PERCENT = 10;
// Defaults expressed as % of the TOTAL frame (matching schema.ts's
// heroHeightPercent/titleHeightPercent/bodyHeightPercent contract) — the
// hero illustration's default share lives in ReadingPageVideo.tsx.
const DEFAULT_TITLE_OF_FRAME_PERCENT = 10;
const DEFAULT_BODY_OF_FRAME_PERCENT = 40;

const WordLine: React.FC<{
  words: string[];
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  lineHeight: number;
  align: "center" | "left" | "justify";
  highlightIndex?: number;
  highlightSet?: Set<number>;
  highlightColor?: string;
  highlightTextColor?: string;
}> = ({
  words,
  fontFamily,
  fontSize,
  fontWeight,
  color,
  lineHeight,
  align,
  highlightIndex,
  highlightSet,
  highlightColor,
  highlightTextColor = "#222222",
}) => {
  const wordSpan = (word: string, i: number) => {
    const isActive = highlightIndex === i && (!highlightSet || highlightSet.has(i));
    return (
      <span
        key={i}
        style={{
          fontSize,
          fontWeight,
          color: isActive && highlightColor ? highlightTextColor : color,
          background: isActive && highlightColor ? highlightColor : "transparent",
          borderRadius: isActive && highlightColor ? 5 : 0,
          padding: isActive && highlightColor ? "2px 6px" : 0,
        }}
      >
        {word}
      </span>
    );
  };

  // "justify" (CapCut-style "canh đều") needs normal inline text flow —
  // CSS text-align: justify has no effect on a flex container, which is
  // what the center/left rendering below uses (needed there so each word's
  // highlight pill sits cleanly on its own baseline with consistent gaps).
  // So this branch renders words as plain inline spans separated by literal
  // space characters instead, letting the browser's own line-breaking +
  // justification stretch inter-word spacing per line. Matches normal
  // justified-text behavior: the last line of the paragraph is NOT
  // stretched (stays left-aligned), same as any justified body of text.
  if (align === "justify") {
    return (
      <div style={{ fontFamily, lineHeight, textAlign: "justify" }}>
        {words.map((word, i) => (
          <React.Fragment key={i}>
            {wordSpan(word, i)}
            {i < words.length - 1 ? " " : ""}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        alignItems: "baseline",
        rowGap: 4,
        columnGap: 6,
        fontFamily,
        lineHeight,
        textAlign: align,
      }}
    >
      {words.map((word, i) => wordSpan(word, i))}
    </div>
  );
};

// A believable "paper" texture built entirely from CSS/SVG — no external
// image asset to bundle or go stale. Layers a few soft creases under a fine
// SVG feTurbulence grain. Fills its parent edge-to-edge (no rounded card
// here — the whole area below the hero illustration is this texture).
//
// IMPORTANT: this is an AbsoluteFill (position: absolute). Per CSS painting
// order, positioned elements always paint AFTER static ones in the same
// stacking context, regardless of DOM order — so every sibling meant to
// show on top of this (Title/Body/BottomSpace below) MUST also have a
// non-static `position` (we use `relative`), otherwise this texture's
// opaque background silently paints over them even though it comes first
// in the JSX.
const PaperTexture: React.FC<{ baseColor: string }> = ({ baseColor }) => (
  <AbsoluteFill
    style={{
      background: baseColor,
      backgroundImage: [
        "repeating-linear-gradient(115deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 90px)",
        "repeating-linear-gradient(25deg, rgba(0,0,0,0.025) 0px, rgba(0,0,0,0.025) 1px, transparent 1px, transparent 130px)",
      ].join(", "),
    }}
  >
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.45, mixBlendMode: "multiply" }}>
      <filter id="paperGrain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="noise" />
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.045 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#paperGrain)" />
    </svg>
  </AbsoluteFill>
);

/**
 * Everything below the hero illustration: the paper background, the title
 * (centered), and the body text (left-aligned, 80%-width column) with
 * selected keywords highlighted karaoke-style as they're spoken. Band
 * proportions default to the design spec (10% title / 40% body / 25%
 * bottom space, all %-of-frame) but are overridable per-render — see
 * titleHeightPercent/bodyHeightPercent in schema.ts.
 */
export const ReadingCard: React.FC<{
  title: string;
  body: string;
  fontFamily: string;
  captionFont?: ReadingPageVideoProps["captionFont"];
  captionFontSize?: ReadingPageVideoProps["captionFontSize"];
  captionTextColor?: ReadingPageVideoProps["captionTextColor"];
  captionBgColor?: ReadingPageVideoProps["captionBgColor"];
  highlightColor?: ReadingPageVideoProps["highlightColor"];
  showBilingual: boolean;
  durationInFrames: number;
  wordTimings?: WordTiming[];
  // This component's OWN container is `restOfFramePercent`% of the total
  // frame height (whatever's left below the hero illustration) — needed to
  // convert titleHeightPercent/bodyHeightPercent (both %-of-TOTAL-frame,
  // per schema.ts) into flex-basis percentages relative to THIS container.
  restOfFramePercent: number;
  titleHeightPercent?: ReadingPageVideoProps["titleHeightPercent"];
  bodyHeightPercent?: ReadingPageVideoProps["bodyHeightPercent"];
  titleFontSize?: ReadingPageVideoProps["titleFontSize"];
  titleBodyGap?: ReadingPageVideoProps["titleBodyGap"];
  contentPaddingPercent?: ReadingPageVideoProps["contentPaddingPercent"];
  bodyAlign?: ReadingPageVideoProps["bodyAlign"];
}> = ({
  title,
  body,
  fontFamily,
  captionFont,
  captionFontSize,
  captionTextColor,
  captionBgColor,
  highlightColor,
  showBilingual,
  durationInFrames,
  wordTimings,
  restOfFramePercent,
  titleHeightPercent,
  bodyHeightPercent,
  titleFontSize,
  titleBodyGap,
  contentPaddingPercent,
  bodyAlign,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const [primaryTextRaw, secondaryTextRaw] = body.split("\n").map((s) => s.trim());
  const hasSecondary = showBilingual && Boolean(secondaryTextRaw);
  const primaryWords = useMemo(() => splitWords(primaryTextRaw), [primaryTextRaw]);
  const secondaryWords = useMemo(() => (hasSecondary ? splitWords(secondaryTextRaw) : []), [hasSecondary, secondaryTextRaw]);
  const keywordSet = useMemo(() => pickKeywordIndices(primaryWords), [primaryWords]);

  const useRealTimings = Boolean(wordTimings && wordTimings.length === primaryWords.length);
  const activeIdx = useRealTimings
    ? activeWordIndexFromTimings(wordTimings as WordTiming[], frame / fps)
    : activeWordIndex(primaryWords, durationInFrames, frame);

  const resolvedFontFamily = resolveCaptionFontFamily(captionFont, fontFamily);
  const bodyFontSize = captionFontSize ?? autoBodyFontSize(primaryWords.length);
  const secondaryFontSize = Math.round(bodyFontSize * 0.85);
  const textColor = captionTextColor || "#1A1A1A";
  const isTransparentPaper = captionBgColor === "transparent";
  const paperColor = captionBgColor || "#F5F2EB";
  const pillColor = highlightColor || "#D8B07A";
  const resolvedTitleFontSize = titleFontSize ?? DEFAULT_TITLE_FONT_SIZE;
  const resolvedTitleBodyGap = titleBodyGap ?? DEFAULT_TITLE_BODY_GAP;
  const resolvedContentPadding = contentPaddingPercent ?? DEFAULT_CONTENT_PADDING_PERCENT;
  const resolvedBodyAlign = bodyAlign ?? "left";

  // Convert %-of-TOTAL-frame (the schema's public contract) into flex-basis
  // %-of-THIS-container (restOfFramePercent% of the frame) — e.g. a 10%
  // title on a 75%-tall container is 10/75 ≈ 13.3% of that container.
  const safeRest = Math.max(1, restOfFramePercent);
  const titleOfFrame = titleHeightPercent ?? DEFAULT_TITLE_OF_FRAME_PERCENT;
  const bodyOfFrame = bodyHeightPercent ?? DEFAULT_BODY_OF_FRAME_PERCENT;
  const titleFlexPercent = (titleOfFrame / safeRest) * 100;
  const bodyFlexPercent = (bodyOfFrame / safeRest) * 100;
  // Bottom space is never set directly — always whatever's left, clamped to
  // >= 0 so an aggressive title+body combo never overflows into negative.
  const bottomFlexPercent = Math.max(0, 100 - titleFlexPercent - bodyFlexPercent);

  return (
    <AbsoluteFill style={{ flexDirection: "column" }}>
      {!isTransparentPaper && <PaperTexture baseColor={paperColor} />}

      {/* Title — position: relative so it paints ABOVE PaperTexture (see
          that component's comment) despite coming after it in the
          stacking-order rules. */}
      <div
        style={{
          flex: `0 0 ${titleFlexPercent}%`,
          position: "relative",
          display: "flex",
          alignItems: resolvedTitleBodyGap === 0 ? "flex-end" : "center",
          justifyContent: "center",
          padding: `10px ${resolvedContentPadding}% 0`,
        }}
      >
        {title ? (
          <div
            style={{
              fontFamily: resolvedFontFamily,
              fontSize: resolvedTitleFontSize,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
              color: textColor,
              textAlign: "center",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as any,
              overflow: "hidden",
            }}
          >
            {title}
          </div>
        ) : null}
      </div>

      {/* Body — 80%-wide left-aligned column */}
      <div
        style={{
          flex: `0 0 ${bodyFlexPercent}%`,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          padding: `${resolvedTitleBodyGap}px ${resolvedContentPadding}% 0`,
          gap: 16,
        }}
      >
        <WordLine
          words={primaryWords}
          fontFamily={resolvedFontFamily}
          fontSize={bodyFontSize}
          fontWeight={700}
          color={textColor}
          lineHeight={1.45}
          align={resolvedBodyAlign}
          highlightIndex={activeIdx}
          highlightSet={keywordSet}
          highlightColor={pillColor}
        />
        {hasSecondary && (
          <div style={{ opacity: 0.7 }}>
            <WordLine
              words={secondaryWords}
              fontFamily={resolvedFontFamily}
              fontSize={secondaryFontSize}
              fontWeight={500}
              color={textColor}
              lineHeight={1.4}
              align={resolvedBodyAlign}
            />
          </div>
        )}
      </div>

      {/* Bottom Space — whatever's left, intentionally empty */}
      <div style={{ flex: `0 0 ${bottomFlexPercent}%`, position: "relative" }} />
    </AbsoluteFill>
  );
};
