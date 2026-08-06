'use client';

// Thanh tiến độ dùng chung cho cả 3 bước của pipeline, có hiệu ứng vệt sáng lướt khi đang chạy
// (percent: 0-100, label: chữ hiển thị bên phải thanh, vd "3/12" hoặc "42%")
export default function StepProgressBar({ percent, label, color, showShimmer }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '40px' }}>
      <div style={{ flex: 1, maxWidth: '320px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          width: `${clamped}%`,
          height: '100%',
          background: color,
          transition: 'width 0.4s ease'
        }}>
          {showShimmer && (
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '-100%',
              width: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)',
              animation: 'progress-shimmer 1.3s linear infinite'
            }} />
          )}
        </div>
      </div>
      <span style={{ fontSize: '0.7rem', color, fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}
