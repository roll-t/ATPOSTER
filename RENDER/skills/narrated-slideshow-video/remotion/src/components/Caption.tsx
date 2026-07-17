import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

function chunkWords(text: string, size: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(" "));
  }
  return chunks.length > 0 ? chunks : [""];
}

/**
 * Picks which chunk of the caption should be showing right now. There's no
 * word-level transcript/timestamp for the narration (no forced alignment
 * step in this pipeline), so chunks are shown for a share of the scene's
 * duration proportional to their own word count — a stable approximation
 * of "captions following the voice" that needs no extra tooling.
 */
function activeChunk(chunks: string[], durationInFrames: number, frame: number): string {
  const wordCounts = chunks.map((c) => c.split(/\s+/).filter(Boolean).length || 1);
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);

  let elapsed = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunkFrames = (wordCounts[i] / totalWords) * durationInFrames;
    if (frame < elapsed + chunkFrames || i === chunks.length - 1) {
      return chunks[i];
    }
    elapsed += chunkFrames;
  }
  return chunks[chunks.length - 1];
}

export const Caption: React.FC<{
  text: string;
  position: "top" | "bottom";
  fontFamily: string;
  mode: "chunked" | "full";
  wordsPerChunk: number;
  durationInFrames: number;
  opacity: number;
}> = ({ text, position, fontFamily, mode, wordsPerChunk, durationInFrames, opacity }) => {
  const frame = useCurrentFrame();

  if (!text) return null;

  const shown =
    mode === "full" ? text : activeChunk(chunkWords(text, wordsPerChunk), durationInFrames, frame);

  return (
    <AbsoluteFill
      style={{
        justifyContent: position === "bottom" ? "flex-end" : "flex-start",
        alignItems: "center",
        padding: "0 90px",
        opacity,
      }}
    >
      <div
        style={{
          marginTop: position === "top" ? 64 : 0,
          marginBottom: position === "bottom" ? 64 : 0,
          maxWidth: "82%",
          background: "rgba(10, 10, 14, 0.72)",
          borderRadius: 18,
          padding: "22px 40px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily,
            fontSize: 40,
            lineHeight: 1.35,
            fontWeight: 600,
            color: "#FFFFFF",
            textAlign: "center",
            textWrap: "balance" as any,
          }}
        >
          {shown}
        </p>
      </div>
    </AbsoluteFill>
  );
};
