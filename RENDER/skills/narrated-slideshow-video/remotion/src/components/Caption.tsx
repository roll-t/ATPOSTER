import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { SlideshowVideoProps, Scene } from "../schema";

type WordTiming = NonNullable<Scene["wordTimings"]>[number];

// A reliable cross-renderer way to fake a text outline: draw the same glyph
// 8 times, offset in a ring, all in the stroke color, then the real
// (colored) text renders on top via normal paint order. `-webkit-text-stroke`
// renders inconsistently in Remotion's headless-Chrome pipeline (the outline
// can pick up the wrong color at small sizes) — text-shadow does not have
// that problem.
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

// Splits text into exactly `count` chunks (by word count, as evenly as
// possible) rather than by a fixed words-per-chunk size — used for the
// secondary (translation) line so it always has the same number of chunks
// as the primary line, keeping the two languages switching in lockstep
// even though a translation rarely has the same word count as the original.
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

/**
 * Picks which WORD of `words` should be "active" right now — the one
 * currently being spoken. There's no word-level transcript/timestamp for
 * the narration (no forced alignment step in this pipeline), so each
 * word's on-screen time is weighted by its own character length (longer
 * words linger a little longer) across the scene's duration — a stable
 * approximation of "the caption follows the voice" that needs no extra
 * tooling. Also used to derive which chunk (of captionWordsPerChunk words)
 * should be showing, so chunk switching is paced by the same per-word
 * timing instead of a coarser per-chunk average.
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
 * (seconds, relative to the scene's own audio start) instead of a
 * character-length estimate — used whenever a scene has `wordTimings` from
 * the TTS provider's alignment API, for exact sync between the highlighted
 * word and the actual spoken audio.
 */
function activeWordIndexFromTimings(timings: WordTiming[], timeSeconds: number): number {
  if (timings.length === 0) return 0;
  if (timeSeconds <= timings[0].start) return 0;
  for (let i = 0; i < timings.length; i++) {
    if (timeSeconds < timings[i].end || i === timings.length - 1) return i;
  }
  return timings.length - 1;
}

const CaptionLine: React.FC<{
  words: string[];
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  strokeColor?: string;
  highlightIndex?: number;
  highlightColor?: string;
}> = ({ words, fontFamily, fontSize, fontWeight, color, strokeColor, highlightIndex, highlightColor }) => (
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "baseline",
      rowGap: 2,
      columnGap: 10,
      fontFamily,
      lineHeight: 1.35,
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
            color: isActive && highlightColor ? "#FFFFFF" : color,
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
  position: "top" | "bottom";
  fontFamily: string;
  mode: "chunked" | "full";
  wordsPerChunk: number;
  style: SlideshowVideoProps["captionStyle"];
  showBilingual: boolean;
  durationInFrames: number;
  wordTimings?: WordTiming[];
  opacity: number;
}> = ({ text, position, fontFamily, mode, wordsPerChunk, style, showBilingual, durationInFrames, wordTimings, opacity }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!text) return null;

  // Bilingual captions are authored as a single string: the primary
  // (e.g. English) line, a literal "\n", then the secondary (e.g.
  // Vietnamese) translation line. A caption with no "\n" behaves exactly
  // as before — single line, no schema/config changes needed to opt in.
  const [primaryTextRaw, secondaryTextRaw] = text.split("\n").map((s) => s.trim());
  const hasSecondary = showBilingual && Boolean(secondaryTextRaw);

  const allWords = splitWords(primaryTextRaw);

  // Real timestamps only make sense if they line up 1:1 with the caption's
  // own words (they're captured from the narration text, which is usually
  // but not always identical to the on-screen caption) — otherwise silently
  // fall back to the word-length estimate rather than risk highlighting the
  // wrong word.
  const useRealTimings = Boolean(wordTimings && wordTimings.length === allWords.length);
  const activeIdx =
    mode === "full"
      ? -1
      : useRealTimings
        ? activeWordIndexFromTimings(wordTimings as WordTiming[], frame / fps)
        : activeWordIndex(allWords, durationInFrames, frame);

  // In "chunked" mode, show the wordsPerChunk-sized slice that contains
  // the active word — chunk boundaries are the same as before, only the
  // timing of when to switch chunks now comes from per-word weighting.
  const chunkStart = mode === "full" ? 0 : Math.floor(activeIdx / wordsPerChunk) * wordsPerChunk;
  const primaryWords = mode === "full" ? allWords : allWords.slice(chunkStart, chunkStart + wordsPerChunk);
  const localActiveIndex = mode === "full" ? -1 : activeIdx - chunkStart;

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

  const isKaraoke = style === "karaoke";
  const isTiktok = style === "tiktok";

  const primaryLine = (
    <CaptionLine
      words={primaryWords}
      fontFamily={fontFamily}
      fontSize={40}
      fontWeight={700}
      color="#FFFFFF"
      strokeColor={isTiktok ? "#000000" : undefined}
      highlightIndex={isKaraoke ? localActiveIndex : undefined}
      highlightColor={isKaraoke ? "#FE2C55" : undefined}
    />
  );

  const secondaryLine = hasSecondary ? (
    <CaptionLine
      words={secondaryWords}
      fontFamily={fontFamily}
      fontSize={26}
      fontWeight={500}
      color={isTiktok ? "#FFE14D" : "rgba(255, 255, 255, 0.82)"}
      strokeColor={isTiktok ? "#000000" : undefined}
    />
  ) : null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: position === "bottom" ? "flex-end" : "flex-start",
        alignItems: "center",
        padding: "0 90px",
        opacity,
      }}
    >
      {isTiktok ? (
        <div
          style={{
            marginTop: position === "top" ? 64 : 0,
            marginBottom: position === "bottom" ? 64 : 0,
            maxWidth: "88%",
            textAlign: "center",
          }}
        >
          {primaryLine}
          {secondaryLine && <div style={{ marginTop: 9 }}>{secondaryLine}</div>}
        </div>
      ) : (
        <div
          style={{
            marginTop: position === "top" ? 64 : 0,
            marginBottom: position === "bottom" ? 64 : 0,
            maxWidth: "82%",
            background: "rgba(10, 10, 14, 0.72)",
            borderRadius: 18,
            padding: "22px 40px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
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
