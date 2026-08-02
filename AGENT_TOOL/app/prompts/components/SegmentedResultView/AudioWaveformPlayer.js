'use client';

import { useState, useRef, useMemo } from 'react';

// Component Trình Phát Nhạc Đồ Thị Sóng Âm (Waveform Display - Đồng bộ phát từ các thẻ ở trên)
export default function AudioWaveformPlayer({
  src,
  externalAudioRef,
  externalCurrentTime,
  externalDuration,
  externalOnSeek
}) {
  const internalAudioRef = useRef(null);
  const [internalCurrentTime, setInternalCurrentTime] = useState(0);
  const [internalDuration, setInternalDuration] = useState(0);

  const audioRef = externalAudioRef || internalAudioRef;
  const currentTime = externalCurrentTime !== undefined ? externalCurrentTime : internalCurrentTime;
  const duration = externalDuration !== undefined ? externalDuration : internalDuration;

  const barHeights = useMemo(() => {
    // 65 thanh đồ thị sóng âm nhấp nhô chân thực
    return [
      15, 25, 42, 60, 85, 70, 50, 32, 20, 15, 28, 55, 78, 92, 68, 42, 25, 18,
      32, 60, 82, 98, 72, 52, 30, 22, 40, 68, 88, 74, 56, 38, 20, 35, 62, 85,
      100, 82, 60, 42, 28, 48, 72, 94, 76, 52, 32, 18, 36, 64, 86, 70, 48, 28,
      40, 68, 82, 62, 42, 25, 18
    ];
  }, []);

  const handleSeek = (e) => {
    const targetDuration = duration;
    if (!targetDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percent * targetDuration;

    if (externalOnSeek) {
      externalOnSeek(newTime);
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setInternalCurrentTime(newTime);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      background: 'rgba(0,0,0,0.35)',
      border: '1px solid rgba(255,255,255,0.08)',
      padding: '10px 16px',
      borderRadius: '12px',
      width: '100%'
    }}>
      {!externalAudioRef && src && (
        <audio
          ref={internalAudioRef}
          src={src}
          onTimeUpdate={() => internalAudioRef.current && setInternalCurrentTime(internalAudioRef.current.currentTime)}
          onLoadedMetadata={() => internalAudioRef.current && setInternalDuration(internalAudioRef.current.duration)}
          onEnded={() => setInternalCurrentTime(0)}
        />
      )}

      {/* Đồ thị sóng âm thanh Waveform (Interactive) */}
      <div
        onClick={handleSeek}
        title="Bấm hoặc kéo để tua nhạc"
        style={{
          flex: 1,
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          cursor: 'pointer',
          position: 'relative',
          padding: '0 2px'
        }}
      >
        {barHeights.map((h, i) => {
          const barPercent = (i / barHeights.length) * 100;
          const isPlayed = barPercent <= progressPercent;

          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h}%`,
                maxHeight: '100%',
                borderRadius: '2px',
                background: isPlayed ? 'var(--secondary)' : 'rgba(255, 255, 255, 0.22)',
                boxShadow: isPlayed ? '0 0 4px rgba(37, 244, 238, 0.35)' : 'none',
                transition: 'background 0.1s ease'
              }}
            />
          );
        })}
      </div>

      {/* Hiển thị thời gian */}
      <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700, minWidth: '65px', textAlign: 'right', flexShrink: 0 }}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}
