import React from 'react';
import {useCurrentFrame} from 'remotion';

const WORDS_PER_CHUNK = 4;

function chunkWords(text: string, size: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(' '));
  }
  return chunks.length > 0 ? chunks : [''];
}

// No word-level timestamps are available (no forced alignment/TTS metadata),
// so chunks are shown for a duration proportional to their word count across
// the scene's total length. Approximate but stable, no extra tooling needed.
export const Captions: React.FC<{text: string; durationInFrames: number}> = ({
  text,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const chunks = chunkWords(text, WORDS_PER_CHUNK);
  const wordCounts = chunks.map((chunk) => chunk.split(/\s+/).filter(Boolean).length || 1);
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);

  let elapsed = 0;
  let activeChunk = chunks[chunks.length - 1];
  for (let i = 0; i < chunks.length; i++) {
    const chunkFrames = (wordCounts[i] / totalWords) * durationInFrames;
    if (frame < elapsed + chunkFrames || i === chunks.length - 1) {
      activeChunk = chunks[i];
      break;
    }
    elapsed += chunkFrames;
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 120px',
      }}
    >
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.65)',
          color: 'white',
          fontSize: 48,
          fontFamily: 'sans-serif',
          fontWeight: 600,
          padding: '16px 32px',
          borderRadius: 12,
          textAlign: 'center',
          maxWidth: '100%',
        }}
      >
        {activeChunk}
      </div>
    </div>
  );
};
