import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';

function stripEmotionTags(text: string): string {
  return text
    .split('\n')
    .map(l => l.replace(/\[[^\]]*\]/g, '').replace(/[ \t]+/g, ' ').trim())
    .join('\n');
}

// Tách cụm **được nhấn** ra khỏi phần chữ thường. Bắt buộc phải chạy cho MỌI dòng hiển thị: dòng
// nào bỏ qua hàm này sẽ in nguyên cặp dấu ** ra màn hình (lỗi từng thấy ở dòng phụ đề dịch).
function parseHighlight(line: string, highlightStyle: React.CSSProperties): React.ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <span key={i} style={highlightStyle}>
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export const GlassTextCard: React.FC<{
  subtitle: string;
  isPortrait: boolean;
  segmentProgress: number; // 0..1 within segment
  accentColor: string;
  enterFrame: number;       // frame within segment when card enters
  totalSegmentFrames: number;
}> = ({ subtitle, isPortrait, segmentProgress, accentColor, enterFrame, totalSegmentFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lines = stripEmotionTags(subtitle).split('\n').filter(Boolean);
  const primaryLine = lines[0] || '';
  const secondaryLine = lines[1] || '';

  // Fade in on entry, fade out in last 20 frames
  const fadeIn = spring({ frame: frame - enterFrame, fps, config: { damping: 20, stiffness: 120 }, durationInFrames: 18 });
  const fadeOut = interpolate(
    frame,
    [totalSegmentFrames - 25, totalSegmentFrames - 5],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const opacity = Math.min(fadeIn, fadeOut);
  const translateY = interpolate(fadeIn, [0, 1], [24, 0]);

  const cardWidth = isPortrait ? '88%' : '68%';
  const bottom = isPortrait ? '14%' : '12%';
  const primarySize = isPortrait ? 38 : 42;
  const secondarySize = isPortrait ? 22 : 24;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Bottom glass card */}
      <div style={{
        position: 'absolute',
        bottom,
        left: '50%',
        transform: `translateX(-50%) translateY(${translateY}px)`,
        width: cardWidth,
        opacity,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        alignItems: 'center',
      }}>
        {/* Primary text */}
        <div style={{
          background: 'rgba(15, 10, 30, 0.72)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: `1px solid ${accentColor}44`,
          borderRadius: 18,
          padding: isPortrait ? '22px 28px' : '18px 32px',
          textAlign: 'center',
          width: '100%',
          boxSizing: 'border-box',
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)`,
        }}>
          <p style={{
            margin: 0,
            fontSize: primarySize,
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.45,
            letterSpacing: '-0.3px',
            textShadow: '0 2px 12px rgba(0,0,0,0.8)',
            fontFamily: "'Be Vietnam Pro', 'Noto Sans', sans-serif",
          }}>
            {parseHighlight(primaryLine, { color: accentColor, fontWeight: 800 })}
          </p>
        </div>

        {/* Secondary / translation */}
        {secondaryLine ? (
          <div style={{
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: 10,
            padding: '8px 20px',
            textAlign: 'center',
          }}>
            <p style={{
              margin: 0,
              fontSize: secondarySize,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.4,
              fontStyle: 'italic',
              fontFamily: "'Be Vietnam Pro', 'Noto Sans', sans-serif",
            }}>
              {/* Dòng dịch giữ nguyên tông chữ mờ, chỉ làm rõ cụm được nhấn bằng độ sáng/độ đậm
                  thay vì màu nhấn — dùng màu nhấn ở đây sẽ chọi với dòng chính bên trên. */}
              {parseHighlight(secondaryLine, { color: 'rgba(255,255,255,0.85)', fontWeight: 700 })}
            </p>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
