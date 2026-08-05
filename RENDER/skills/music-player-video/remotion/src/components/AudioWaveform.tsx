import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

// Procedural waveform — sine-based, no audio analysis needed.
// Mimics a real voice waveform: center bars taller, edges shorter, gentle rhythmic motion.
export const AudioWaveform: React.FC<{
  accentColor: string;
  isPortrait: boolean;
}> = ({ accentColor, isPortrait }) => {
  const frame = useCurrentFrame();
  const BAR_COUNT = 36;
  const barWidth = isPortrait ? 5 : 6;
  const gap = isPortrait ? 3 : 4;
  const maxHeight = isPortrait ? 52 : 58;
  const minHeight = 4;

  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const center = (BAR_COUNT - 1) / 2;
    // Gaussian envelope: taller in center, shorter at edges (voice-like shape)
    const envelope = Math.exp(-0.06 * Math.pow(i - center, 2));

    // Layered sine waves for organic motion
    const t = frame * 0.04;
    const wave =
      Math.abs(Math.sin(t * 1.7 + i * 0.4)) * 0.5 +
      Math.abs(Math.sin(t * 2.3 + i * 0.25)) * 0.3 +
      Math.abs(Math.sin(t * 0.9 + i * 0.6)) * 0.2;

    const h = minHeight + (maxHeight - minHeight) * envelope * wave;
    return Math.max(minHeight, h);
  });

  const totalWidth = BAR_COUNT * barWidth + (BAR_COUNT - 1) * gap;
  const containerHeight = maxHeight + 8;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute',
        // Positioned just above the glass text card
        bottom: isPortrait ? 'calc(14% + 175px)' : 'calc(12% + 145px)',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'flex-end',
        gap,
        width: totalWidth,
        height: containerHeight,
        opacity: 0.75,
      }}>
        {bars.map((h, i) => {
          const progress = i / (BAR_COUNT - 1);
          // Color gradient from center (bright accent) to edges (dim)
          const brightness = 0.4 + 0.6 * Math.exp(-0.06 * Math.pow(i - (BAR_COUNT - 1) / 2, 2));
          return (
            <div
              key={i}
              style={{
                width: barWidth,
                height: h,
                borderRadius: barWidth / 2,
                background: accentColor,
                opacity: brightness,
                flexShrink: 0,
                alignSelf: 'center',
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
