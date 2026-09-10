'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

function strokeShadow(color = '#000000', width = 2.5) {
  const steps = 12;
  const shadows = [];
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const x = Math.round(Math.cos(angle) * width * 10) / 10;
    const y = Math.round(Math.sin(angle) * width * 10) / 10;
    shadows.push(`${x}px ${y}px 0 ${color}`);
  }
  return shadows.join(', ');
}

function renderWithHighlights(text, highlightColor = '#FE2C55') {
  if (!text) return null;
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g).filter((p) => p.length > 0);
  return parts.map((part, i) => {
    const match = /^\*\*([^*]+)\*\*$/.exec(part);
    if (match) {
      return (
        <span key={i} style={{ color: highlightColor, fontWeight: 900 }}>
          {match[1]}
        </span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function stripTags(text) {
  return String(text || '').replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
}

function stripMarkers(text) {
  return String(text || '').replace(/\*\*([^*]+)\*\*/g, '$1');
}

function formatTime(sec) {
  const totalSec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const FONT_MAP = {
  'be-vietnam-pro': "'Be Vietnam Pro', sans-serif",
  'paytone-one': "'Paytone One', sans-serif",
  'itim': "'Itim', cursive, sans-serif",
  'roboto': "'Roboto', sans-serif",
  'montserrat': "'Montserrat', sans-serif",
  'nunito': "'Nunito', sans-serif",
  'inter': "'Inter', sans-serif",
  'oswald': "'Oswald', sans-serif",
  'poppins': "'Poppins', sans-serif",
};

export default function LiveVideoSimulator({
  result = {},
  assetCounts = {},
  isPortrait = true,
  category = '',
  folderPath = 'example',
  activeSceneIndex,
  onSceneIndexChange
}) {
  const segments = useMemo(() => result?.segments || [], [result?.segments]);
  const totalScenes = segments.length;

  const rc = useMemo(() => result?.remotionConfig || {}, [result?.remotionConfig]);
  const effectiveIsPortrait = useMemo(() => {
    if (rc.aspectRatio) return rc.aspectRatio === '9:16';
    if (rc.orientation) return rc.orientation === 'portrait';
    if (result?.input?.aspectRatio) return result.input.aspectRatio === '9:16';
    if (result?.aspectRatio) return result.aspectRatio === '9:16';
    return Boolean(isPortrait);
  }, [rc, result, isPortrait]);

  const fontFamily = FONT_MAP[rc.captionFont || rc.font] || FONT_MAP['be-vietnam-pro'];

  const baseFontSize = Number(rc.captionFontSize || rc.fontSize || (effectiveIsPortrait ? 38 : 34));
  const fontScale = effectiveIsPortrait ? 0.52 : 0.48;
  const scaledFontSize = Math.max(14, Math.round(baseFontSize * fontScale));

  const textColor = rc.captionTextColor || rc.textColor || '#ffffff';
  const highlightColor = rc.highlightColor || '#FE2C55';
  const bgColor = rc.captionBgColor || rc.bgColor || '#000000';
  const bgOpacity = Number(rc.bgOpacity !== undefined ? rc.bgOpacity : 65) / 100;
  const isBgTransparent = Boolean(rc.isBgTransparent);
  const captionPosition = rc.captionPosition || 'bottom';
  const captionStyle = rc.captionStyle || 'classic';
  const captionMarginY = Number(rc.captionMarginY || 0);

  const globalKenBurns = rc.kenBurns || rc.globalKenBurns !== false;
  const globalImageFit = rc.globalImageFit || 'cover';
  const imageScale = Number(rc.imageScale || 1);
  const imageTranslateY = Number(rc.imageTranslateY || 0);

  const bgMusicEnabled = rc.bgMusicEnabled !== false;
  const bgMusicVolume = Number(rc.bgMusicVolume !== undefined ? rc.bgMusicVolume : 35) / 100;

  // Quản lý mảng thời lượng của từng cảnh (cộng dồn để có tổng thời lượng toàn video)
  const initialDurations = useMemo(() => {
    return segments.map((seg) => {
      if (Number.isFinite(seg?.durationSeconds) && seg.durationSeconds > 0) {
        return Number(seg.durationSeconds);
      }
      const text = seg?.dialogueOrNarration || seg?.subtitle || '';
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      return Math.max(2.8, Math.min(12, Math.round(words * 0.35) || 3.5));
    });
  }, [segments]);

  const [sceneDurations, setSceneDurations] = useState(initialDurations);

  // Cập nhật khi danh sách segments thay đổi
  useEffect(() => {
    setSceneDurations(initialDurations);
  }, [initialDurations]);

  // Pre-load thời lượng audio của tất cả các cảnh để tính tổng thời lượng chuẩn xác ngay từ đầu
  useEffect(() => {
    if (!folderPath || !segments.length) return;
    segments.forEach((seg, idx) => {
      const pad = String(seg.segmentNumber || idx + 1).padStart(2, '0');
      const audioSrc = `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=audio/scene-${pad}.mp3&category=${encodeURIComponent(category)}`;
      const probeAudio = new Audio();
      probeAudio.src = audioSrc;
      probeAudio.preload = 'metadata';
      probeAudio.onloadedmetadata = () => {
        const dur = probeAudio.duration;
        if (dur && Number.isFinite(dur) && dur > 0) {
          setSceneDurations((prev) => {
            const next = [...prev];
            next[idx] = dur;
            return next;
          });
        }
      };
    });
  }, [folderPath, category, segments]);

  // Tính thời điểm bắt đầu (offset) của từng cảnh và tổng thời lượng toàn video
  const { sceneOffsets, totalDuration } = useMemo(() => {
    const offsets = [];
    let currentOffset = 0;
    for (let i = 0; i < totalScenes; i++) {
      offsets.push(currentOffset);
      currentOffset += sceneDurations[i] || 3.5;
    }
    return { sceneOffsets: offsets, totalDuration: Math.max(0.1, currentOffset) };
  }, [sceneDurations, totalScenes]);

  const [currentSlideIndex, setCurrentSlideIndexState] = useState(activeSceneIndex || 0);

  useEffect(() => {
    if (activeSceneIndex !== undefined && activeSceneIndex !== currentSlideIndex) {
      setCurrentSlideIndexState(activeSceneIndex);
    }
  }, [activeSceneIndex]);

  const setCurrentSlideIndex = (val) => {
    setCurrentSlideIndexState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (onSceneIndexChange && next !== prev) {
        onSceneIndexChange(next);
      }
      return next;
    });
  };
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [slideCurrentTime, setSlideCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const voiceAudioRef = useRef(null);
  const bgMusicAudioRef = useRef(null);
  const hideControlsTimerRef = useRef(null);

  const currentSegment = segments[currentSlideIndex] || segments[0] || {};
  const currentPaddedNum = String(currentSegment.segmentNumber || currentSlideIndex + 1).padStart(2, '0');
  const currentSceneDuration = sceneDurations[currentSlideIndex] || 3.5;

  const isPexelsTalk = category === 'pexels_talk_video';
  const currentImageSrc = `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=images/scene-${currentPaddedNum}.jpg&category=${encodeURIComponent(category)}&v=${currentSlideIndex}`;
  const currentVideoSrc = `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=bg/bg-${currentPaddedNum}.mp4&category=${encodeURIComponent(category)}`;
  const currentAudioSrc = `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=audio/scene-${currentPaddedNum}.mp3&category=${encodeURIComponent(category)}`;
  const bgMusicSrc = `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=audio/bg-music.mp3&category=${encodeURIComponent(category)}`;

  useEffect(() => {
    setSlideCurrentTime(0);
    setImageError(false);
  }, [currentSlideIndex]);

  useEffect(() => {
    const voiceAudio = voiceAudioRef.current;
    if (!voiceAudio) return;

    voiceAudio.src = currentAudioSrc;
    voiceAudio.load();

    const onMeta = () => {
      const dur = voiceAudio.duration;
      if (dur && Number.isFinite(dur) && dur > 0) {
        setSceneDurations((prev) => {
          const next = [...prev];
          next[currentSlideIndex] = dur;
          return next;
        });
      }
    };
    const onTime = () => setSlideCurrentTime(voiceAudio.currentTime || 0);
    const onEnd = () => {
      if (currentSlideIndex < totalScenes - 1) {
        setCurrentSlideIndex((prev) => prev + 1);
      } else {
        setIsPlaying(false);
        setCurrentSlideIndex(0);
      }
    };
    const onErr = () => {
      // Fallback giữ nguyên thời lượng đã ước lượng
    };

    voiceAudio.addEventListener('loadedmetadata', onMeta);
    voiceAudio.addEventListener('timeupdate', onTime);
    voiceAudio.addEventListener('ended', onEnd);
    voiceAudio.addEventListener('error', onErr);

    if (isPlaying) voiceAudio.play().catch(() => {});

    return () => {
      voiceAudio.removeEventListener('loadedmetadata', onMeta);
      voiceAudio.removeEventListener('timeupdate', onTime);
      voiceAudio.removeEventListener('ended', onEnd);
      voiceAudio.removeEventListener('error', onErr);
    };
  }, [currentAudioSrc, currentSlideIndex, totalScenes, isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    const voiceAudio = voiceAudioRef.current;
    if (voiceAudio && voiceAudio.readyState >= 2 && !voiceAudio.paused && !voiceAudio.error) return;

    const interval = setInterval(() => {
      setSlideCurrentTime((prev) => {
        const next = prev + 0.1;
        if (next >= currentSceneDuration) {
          if (currentSlideIndex < totalScenes - 1) {
            setCurrentSlideIndex((s) => s + 1);
          } else {
            setIsPlaying(false);
            setCurrentSlideIndex(0);
          }
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, currentSceneDuration, currentSlideIndex, totalScenes]);

  useEffect(() => {
    const voiceAudio = voiceAudioRef.current;
    const bgAudio = bgMusicAudioRef.current;

    if (isPlaying) {
      if (voiceAudio) voiceAudio.play().catch(() => {});
      if (bgAudio && bgMusicEnabled) {
        bgAudio.volume = isMuted ? 0 : bgMusicVolume;
        bgAudio.play().catch(() => {});
      }
    } else {
      if (voiceAudio) voiceAudio.pause();
      if (bgAudio) bgAudio.pause();
    }
  }, [isPlaying, bgMusicEnabled, bgMusicVolume, isMuted]);

  useEffect(() => {
    if (voiceAudioRef.current) voiceAudioRef.current.muted = isMuted;
    if (bgMusicAudioRef.current) {
      bgMusicAudioRef.current.muted = isMuted || !bgMusicEnabled;
      bgMusicAudioRef.current.volume = isMuted ? 0 : bgMusicVolume;
    }
  }, [isMuted, bgMusicEnabled, bgMusicVolume]);

  const togglePlay = () => setIsPlaying((p) => !p);
  const handlePrevSlide = () => setCurrentSlideIndex((p) => Math.max(0, p - 1));
  const handleNextSlide = () => setCurrentSlideIndex((p) => Math.min(totalScenes - 1, p + 1));

  const handleReplay = () => {
    setCurrentSlideIndex(0);
    setSlideCurrentTime(0);
    setIsPlaying(true);
    if (voiceAudioRef.current) {
      voiceAudioRef.current.currentTime = 0;
      voiceAudioRef.current.play().catch(() => {});
    }
    if (bgMusicAudioRef.current && bgMusicEnabled) {
      bgMusicAudioRef.current.currentTime = 0;
      bgMusicAudioRef.current.play().catch(() => {});
    }
  };

  // Tính thời gian tích lũy toàn video (cộng dồn từ cảnh 1 đến thời điểm hiện tại)
  const totalElapsedTime = Math.min(
    totalDuration,
    (sceneOffsets[currentSlideIndex] || 0) + slideCurrentTime
  );
  const totalProgressPercent = Math.min(100, Math.max(0, (totalElapsedTime / totalDuration) * 100));

  // Tua trực tiếp trên TOÀN BỘ VIDEO (bấm vào bất kỳ đâu trên thanh để nhảy đến cảnh và giây tương ứng)
  const handleSeekTotalTimeline = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTotalTime = clickRatio * totalDuration;

    // Tìm xem thời điểm bấm thuộc về cảnh nào
    let targetSceneIdx = 0;
    for (let i = 0; i < totalScenes; i++) {
      const start = sceneOffsets[i] || 0;
      const end = start + (sceneDurations[i] || 3.5);
      if (targetTotalTime >= start && (i === totalScenes - 1 || targetTotalTime < end)) {
        targetSceneIdx = i;
        break;
      }
    }

    const inSceneTime = Math.max(0, targetTotalTime - (sceneOffsets[targetSceneIdx] || 0));

    if (targetSceneIdx !== currentSlideIndex) {
      setCurrentSlideIndex(targetSceneIdx);
    }
    setSlideCurrentTime(inSceneTime);

    if (voiceAudioRef.current) {
      voiceAudioRef.current.currentTime = inSceneTime;
    }
  };

  const toggleFullscreen = () => {
    const target = stageRef.current || containerRef.current;
    if (!target) return;
    if (!document.fullscreenElement) {
      target.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    hideControlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2800);
  };

  const sceneProgress = currentSceneDuration > 0 ? Math.min(1, Math.max(0, slideCurrentTime / currentSceneDuration)) : 0;

  const kenBurnsDir = currentSegment.kenBurns || (globalKenBurns ? (currentSlideIndex % 2 === 0 ? 'in' : 'out') : 'none');
  let kbScale = 1;
  let kbTranslateX = 0;
  if (kenBurnsDir === 'in') kbScale = 1 + 0.12 * sceneProgress;
  else if (kenBurnsDir === 'out') kbScale = 1.12 - 0.12 * sceneProgress;
  else if (kenBurnsDir === 'pan-left') { kbScale = 1.1; kbTranslateX = 3 - 6 * sceneProgress; }
  else if (kenBurnsDir === 'pan-right') { kbScale = 1.1; kbTranslateX = -3 + 6 * sceneProgress; }

  const rawSub = String(currentSegment?.subtitle || currentSegment?.dialogueOrNarration || '').split('\n')[0];
  const cleanPrimary = stripTags(rawSub);
  const words = useMemo(() => stripMarkers(cleanPrimary).trim().split(/\s+/).filter(Boolean), [cleanPrimary]);
  const activeWordIdx = words.length > 0 ? Math.min(words.length - 1, Math.floor(sceneProgress * words.length)) : 0;

  const hasBullets = currentSegment?.layout === 'bullets' || (Array.isArray(currentSegment?.bullets) && currentSegment.bullets.length > 0);
  const bullets = currentSegment?.bullets || [];

  return (
    <div
      ref={stageRef}
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: isFullscreen ? '0px' : '10px',
        background: isFullscreen ? '#000000' : 'transparent',
        borderRadius: 0,
        padding: isFullscreen ? 0 : (effectiveIsPortrait ? '14px 10px 12px 10px' : 0),
        border: 'none',
        boxShadow: 'none',
        overflow: 'hidden'
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: isFullscreen
            ? (effectiveIsPortrait ? 'calc(100vh * 9 / 16)' : '100vw')
            : (effectiveIsPortrait ? 'calc(min(620px, calc(100vh - 240px)) * 9 / 16)' : '100%'),
          height: isFullscreen
            ? '100vh'
            : (effectiveIsPortrait ? 'min(620px, calc(100vh - 240px))' : 'auto'),
          aspectRatio: effectiveIsPortrait ? '9 / 16' : '16 / 9',
          maxHeight: isFullscreen ? '100vh' : (effectiveIsPortrait ? '620px' : '400px'),
          maxWidth: '100%',
          flexShrink: 0,
          borderRadius: 0,
          overflow: 'hidden',
          background: '#07060e',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none'
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
      <audio ref={voiceAudioRef} preload="auto" />
      <audio ref={bgMusicAudioRef} src={bgMusicSrc} loop preload="auto" />

      {/* LỚP 1: ẢNH / VIDEO NỀN / BULLETS */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {hasBullets ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: rc.slideBgColor || '#0a0914',
              padding: '24px 10%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: `${scaledFontSize * 0.8}px`
            }}
          >
            {bullets.map((bullet, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontFamily, fontSize: `${scaledFontSize * 1.1}px`, fontWeight: 800, color: highlightColor, flexShrink: 0 }}>•</span>
                <div style={{ fontFamily, fontSize: `${scaledFontSize}px`, fontWeight: 600, color: textColor, lineHeight: 1.35 }}>
                  {renderWithHighlights(bullet, highlightColor)}
                </div>
              </div>
            ))}
          </div>
        ) : isPexelsTalk ? (
          <video key={`bg-vid-${currentSlideIndex}`} src={currentVideoSrc} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: globalImageFit }} />
        ) : !imageError ? (
          <div
            key={`img-${currentSlideIndex}`}
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: `url(${currentImageSrc})`,
              backgroundSize: globalImageFit,
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              transform: `scale(${kbScale * imageScale}) translateX(${kbTranslateX}%) translateY(${imageTranslateY}%)`,
              transformOrigin: 'center center',
              transition: isPlaying ? 'none' : 'transform 0.4s ease'
            }}
          >
            <img src={currentImageSrc} alt="" style={{ display: 'none' }} onError={() => setImageError(true)} />
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle at 50% 40%, rgba(99, 102, 241, 0.25) 0%, rgba(10, 8, 24, 0.95) 75%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              textAlign: 'center'
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.4), rgba(168, 85, 247, 0.4))', border: '1px solid rgba(168, 85, 247, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', marginBottom: '10px' }}>🎬</div>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cảnh {currentSlideIndex + 1}: Bản Thảo</span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{currentSegment?.visualDescription || 'Chưa sinh ảnh cho cảnh này'}</span>
          </div>
        )}

        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 25%, transparent 68%, rgba(0,0,0,0.78) 100%)', pointerEvents: 'none' }} />
      </div>



      {/* LỚP 3: PHỤ ĐỀ MÔ PHỎNG CHUẨN XÁC REMOTION */}
      {!hasBullets && cleanPrimary && (
        <div
          key={`sub-${currentSlideIndex}`}
          style={{
            position: 'absolute',
            left: '12px',
            right: '12px',
            bottom: captionPosition === 'bottom' ? `${Math.max(60, 75 + captionMarginY * 0.48)}px` : captionPosition === 'center' ? '45%' : `${Math.max(50, 60 - captionMarginY * 0.48)}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            zIndex: 6,
            pointerEvents: 'none'
          }}
        >
          {captionStyle === 'hook' && currentSlideIndex === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', maxWidth: '92%' }}>
              <div style={{ background: highlightColor, color: '#ffffff', fontFamily, fontSize: `${Math.max(11, Math.round(scaledFontSize * 0.72))}px`, fontWeight: 900, padding: '3px 12px', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: `0 4px 16px ${highlightColor}66` }}>
                ★ {result?.title ? result.title.slice(0, 32) : 'BÀI HỌC CUỘC SỐNG'}
              </div>
              <div style={{ fontFamily, fontSize: `${Math.round(scaledFontSize * 1.22)}px`, fontWeight: 900, lineHeight: 1.3, color: textColor, textShadow: strokeShadow('#000000', 2.5), background: isBgTransparent ? 'transparent' : `rgba(${parseInt(bgColor.slice(1,3)||'0',16)}, ${parseInt(bgColor.slice(3,5)||'0',16)}, ${parseInt(bgColor.slice(5,7)||'0',16)}, ${bgOpacity})`, padding: isBgTransparent ? '2px' : '8px 16px', borderRadius: '12px' }}>
                {renderWithHighlights(cleanPrimary, highlightColor)}
              </div>
            </div>
          ) : captionStyle === 'tiktok' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px', maxWidth: '94%', padding: '6px 12px', background: isBgTransparent ? 'transparent' : `rgba(${parseInt(bgColor.slice(1,3)||'0',16)}, ${parseInt(bgColor.slice(3,5)||'0',16)}, ${parseInt(bgColor.slice(5,7)||'0',16)}, ${bgOpacity * 0.8})`, borderRadius: '10px' }}>
              {words.map((word, i) => {
                const isActive = i === activeWordIdx && isPlaying;
                return (
                  <span key={i} style={{ fontFamily, fontSize: `${scaledFontSize}px`, fontWeight: 800, color: isActive ? '#ffffff' : textColor, background: isActive ? highlightColor : 'transparent', borderRadius: isActive ? '6px' : '0', padding: isActive ? '1px 6px' : '1px 2px', transform: isActive ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.12s ease', textShadow: isActive ? `0 2px 10px ${highlightColor}` : strokeShadow('#000000', 2) }}>
                    {word}
                  </span>
                );
              })}
            </div>
          ) : captionStyle === 'karaoke' ? (
            <div style={{ maxWidth: '92%', padding: isBgTransparent ? '4px' : '8px 16px', borderRadius: '10px', background: isBgTransparent ? 'transparent' : `rgba(${parseInt(bgColor.slice(1,3)||'0',16)}, ${parseInt(bgColor.slice(3,5)||'0',16)}, ${parseInt(bgColor.slice(5,7)||'0',16)}, ${bgOpacity})`, fontFamily, fontSize: `${scaledFontSize}px`, lineHeight: 1.35, fontWeight: 800 }}>
              {words.map((word, i) => {
                const hasSpoken = i <= activeWordIdx;
                return (
                  <span key={i} style={{ color: hasSpoken ? highlightColor : 'rgba(255, 255, 255, 0.55)', textShadow: hasSpoken ? `0 0 12px ${highlightColor}88, ${strokeShadow('#000000', 2)}` : strokeShadow('#000000', 1.5), marginRight: '6px', transition: 'color 0.15s ease' }}>
                    {word}
                  </span>
                );
              })}
            </div>
          ) : captionStyle === 'pill' ? (
            <div style={{ maxWidth: '92%', padding: '8px 22px', borderRadius: '9999px', background: isBgTransparent ? 'transparent' : `rgba(${parseInt(bgColor.slice(1,3)||'0',16)}, ${parseInt(bgColor.slice(3,5)||'0',16)}, ${parseInt(bgColor.slice(5,7)||'0',16)}, ${bgOpacity})`, border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)', fontFamily, fontSize: `${scaledFontSize}px`, lineHeight: 1.35, fontWeight: 800, color: textColor, textShadow: strokeShadow('#000000', 2) }}>
              {renderWithHighlights(cleanPrimary, highlightColor)}
            </div>
          ) : captionStyle === 'news' ? (
            <div style={{ width: '100%', padding: '8px 14px', background: `rgba(${parseInt(bgColor.slice(1,3)||'0',16)}, ${parseInt(bgColor.slice(3,5)||'0',16)}, ${parseInt(bgColor.slice(5,7)||'0',16)}, 0.88)`, borderLeft: `5px solid ${highlightColor}`, textAlign: 'left', fontFamily, fontSize: `${scaledFontSize}px`, fontWeight: 700, color: textColor, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
              {renderWithHighlights(cleanPrimary, highlightColor)}
            </div>
          ) : (
            <div style={{ maxWidth: '92%', padding: isBgTransparent || captionStyle === 'minimal' ? '4px 8px' : '8px 14px', borderRadius: isBgTransparent || captionStyle === 'minimal' ? '0' : '10px', background: isBgTransparent || captionStyle === 'minimal' ? 'transparent' : `rgba(${parseInt(bgColor.slice(1,3)||'0',16)}, ${parseInt(bgColor.slice(3,5)||'0',16)}, ${parseInt(bgColor.slice(5,7)||'0',16)}, ${bgOpacity})`, backdropFilter: isBgTransparent || captionStyle === 'minimal' ? 'none' : 'blur(4px)', boxShadow: isBgTransparent || captionStyle === 'minimal' ? 'none' : '0 4px 16px rgba(0,0,0,0.4)', fontFamily, fontSize: `${scaledFontSize}px`, lineHeight: 1.35, fontWeight: 800, color: textColor, textShadow: strokeShadow('#000000', 2.2) }}>
              {renderWithHighlights(cleanPrimary, highlightColor)}
            </div>
          )}
        </div>
      )}



      </div> {/* Đóng containerRef - khung video màn mô phỏng */}

      {/* LỚP 5: THANH TIẾN ĐỘ TỔNG HỢP TOÀN BỘ VIDEO & NÚT ĐIỀU KHIỂN ĐẶT BÊN DƯỚI KHUNG MÔ PHỎNG */}
      <div
        style={isFullscreen ? {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '10px 14px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 75%, transparent 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '7px',
          zIndex: 20,
          opacity: showControls || !isPlaying ? 1 : 0,
          transform: showControls || !isPlaying ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.25s ease'
        } : {
          position: 'relative',
          width: '100%',
          padding: '10px 16px',
          background: 'rgba(0, 0, 0, 0.45)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 10,
          boxSizing: 'border-box'
        }}
      >
        {/* Thanh tiến độ CỘNG DỒN TOÀN BỘ VIDEO — dài từ đầu này qua đầu kia như TikTok */}
        <div
          onClick={handleSeekTotalTimeline}
          style={{
            width: '100%',
            height: '6px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '999px',
            overflow: 'hidden',
            cursor: 'pointer',
            position: 'relative'
          }}
          title="Bấm bất kỳ đâu trên thanh để tua toàn bộ video"
        >
          {/* Vạch tiến độ đã phát trên toàn video */}
          <div
            style={{
              height: '100%',
              width: `${totalProgressPercent}%`,
              background: 'linear-gradient(90deg, #10b981, #25f4ee)',
              transition: isPlaying ? 'width 0.1s linear' : 'none'
            }}
          />

          {/* Các vạch phân cách chia ranh giới từng cảnh (Scene chapters) */}
          {sceneOffsets.map((offset, i) => {
            if (i === 0) return null;
            const leftPercent = (offset / totalDuration) * 100;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${leftPercent}%`,
                  width: '1.5px',
                  background: 'rgba(0, 0, 0, 0.65)',
                  pointerEvents: 'none',
                  zIndex: 2
                }}
              />
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" onClick={togglePlay} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.05rem', cursor: 'pointer', padding: '4px 6px' }} title={isPlaying ? 'Tạm dừng' : 'Phát tiếp'}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button type="button" onClick={handlePrevSlide} disabled={currentSlideIndex === 0} style={{ background: 'none', border: 'none', color: currentSlideIndex === 0 ? 'rgba(255,255,255,0.25)' : '#fff', fontSize: '0.9rem', cursor: currentSlideIndex === 0 ? 'not-allowed' : 'pointer', padding: '4px' }} title="Cảnh trước">
              ⏮
            </button>
            <button type="button" onClick={handleNextSlide} disabled={currentSlideIndex >= totalScenes - 1} style={{ background: 'none', border: 'none', color: currentSlideIndex >= totalScenes - 1 ? 'rgba(255,255,255,0.25)' : '#fff', fontSize: '0.9rem', cursor: currentSlideIndex >= totalScenes - 1 ? 'not-allowed' : 'pointer', padding: '4px' }} title="Cảnh tiếp theo">
              ⏭
            </button>
            <button type="button" onClick={handleReplay} style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.85rem', cursor: 'pointer', padding: '4px' }} title="Phát lại từ đầu">
              🔄
            </button>

            {/* HIỂN THỊ TỔNG THỜI LƯỢNG CỘNG DỒN TOÀN BỘ VIDEO */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginLeft: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: '#25f4ee', fontWeight: 700 }}>
                {formatTime(totalElapsedTime)}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)' }}>/</span>
              <span style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 700 }}>
                {formatTime(totalDuration)}
              </span>
              {!effectiveIsPortrait && (
                <span style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.5)', marginLeft: '4px' }}>
                  ({totalElapsedTime.toFixed(1)}s / {totalDuration.toFixed(1)}s)
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" onClick={() => setIsMuted((m) => !m)} style={{ background: 'none', border: 'none', color: isMuted ? '#f87171' : 'rgba(255,255,255,0.85)', fontSize: '0.95rem', cursor: 'pointer', padding: '4px' }} title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}>
              {isMuted ? '🔇' : '🔊'}
            </button>
            <button type="button" onClick={toggleFullscreen} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', cursor: 'pointer', padding: '4px' }} title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}>
              {isFullscreen ? '⤦' : '⛶'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
