'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import TimelineSegmentPopup from './TimelineSegmentPopup.js';
import { PlatformSelectorToolbar, PlatformMockupOverlay } from './PlatformOverlaySimulator.js';
import TransformGizmoOverlay from './TransformGizmoOverlay.js';

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
  onSceneIndexChange,
  onResult,
  resyncVoiceForSegments,
  checkAssets,
  bgMusicVersion,
  onUpdateRenderConfig
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

  const fontFamily = FONT_MAP[rc.font || rc.captionFont] || FONT_MAP['be-vietnam-pro'];

  const baseFontSize = Number(rc.fontSize || rc.captionFontSize || (effectiveIsPortrait ? 46 : 38));
  const fontScale = effectiveIsPortrait ? 0.52 : 0.48;
  const scaledFontSize = Math.max(14, Math.round(baseFontSize * fontScale));

  const textColor = rc.textColor || rc.captionTextColor || '#ffffff';
  const highlightColor = rc.highlightColor || '#FE2C55';
  const bgColor = rc.bgColor || rc.captionBgColor || '#000000';
  const bgOpacity = Number(rc.bgOpacity !== undefined ? rc.bgOpacity : 65) / 100;
  const isBgTransparent = Boolean(rc.isBgTransparent || rc.captionBgTransparent);
  const captionStyle = rc.captionStyle || 'classic';
  const captionPosition = rc.captionPosition || (
    ['moral_talk_slideshow', 'buddhist_wisdom', 'japanese_history'].includes(category)
      ? 'top'
      : (captionStyle === 'page' ? 'center' : 'bottom')
  );
  const captionMarginY = Number(rc.captionMarginY !== undefined && rc.captionMarginY !== null ? rc.captionMarginY : 0);
  const captionWidth = Math.max(30, Math.min(98, Number(rc.captionWidth !== undefined && rc.captionWidth !== null ? rc.captionWidth : 92)));
  const visualMarginY = Math.round(captionMarginY * (effectiveIsPortrait ? 0.28 : 0.22));
  const showChannelLogo = rc.channelLogo !== false;
  const logoTranslateX = Number(rc.logoTranslateX !== undefined && rc.logoTranslateX !== null ? rc.logoTranslateX : 0);
  const logoTranslateY = Number(rc.logoTranslateY !== undefined && rc.logoTranslateY !== null ? rc.logoTranslateY : 0);
  const logoScale = Number(rc.logoScale !== undefined && rc.logoScale !== null ? rc.logoScale : 1);

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

  const isControlled = typeof activeSceneIndex === 'number' && typeof onSceneIndexChange === 'function';
  const [internalSlideIndex, setInternalSlideIndex] = useState(typeof activeSceneIndex === 'number' ? activeSceneIndex : 0);

  useEffect(() => {
    if (!isControlled && typeof activeSceneIndex === 'number') {
      setInternalSlideIndex(activeSceneIndex);
    }
  }, [activeSceneIndex, isControlled]);

  const currentSlideIndex = isControlled ? activeSceneIndex : internalSlideIndex;

  const goToScene = useCallback(
    (val) => {
      const next = typeof val === 'function' ? val(currentSlideIndex) : val;
      const clamped = Math.max(0, Math.min(Math.max(0, totalScenes - 1), next));
      if (isControlled) {
        if (clamped !== activeSceneIndex) {
          onSceneIndexChange(clamped);
        }
      } else {
        setInternalSlideIndex(clamped);
        if (onSceneIndexChange && clamped !== activeSceneIndex) {
          onSceneIndexChange(clamped);
        }
      }
    },
    [currentSlideIndex, totalScenes, onSceneIndexChange, activeSceneIndex, isControlled]
  );

  const setCurrentSlideIndex = goToScene;
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

  const remotionCanvasWidth = effectiveIsPortrait ? 1080 : 1920;
  const currentContainerWidth = containerRef.current?.clientWidth || (effectiveIsPortrait ? 360 : 640);
  const remotionScale = currentContainerWidth / remotionCanvasWidth;
  const visualLogoX = Math.round(logoTranslateX * remotionScale);
  const visualLogoY = Math.round(logoTranslateY * remotionScale);

  const currentSegment = segments[currentSlideIndex] || segments[0] || {};
  const currentPaddedNum = String(currentSegment.segmentNumber || currentSlideIndex + 1).padStart(2, '0');
  const currentSceneNumber = Number(currentSegment.segmentNumber || currentSlideIndex + 1);
  const currentSceneDuration = sceneDurations[currentSlideIndex] || 3.5;

  const isPexelsTalk = category === 'pexels_talk_video';

  // Tránh gọi request ảnh nếu dự án chưa có ảnh hoặc cảnh này chưa sinh ảnh
  const hasSceneImage = useMemo(() => {
    if (assetCounts?.imageCount !== undefined && assetCounts.imageCount === 0) {
      return false;
    }
    if (Array.isArray(assetCounts?.existingImageNumbers)) {
      return assetCounts.existingImageNumbers.includes(currentSceneNumber);
    }
    if (typeof assetCounts?.imageCount === 'number') {
      return assetCounts.imageCount > 0;
    }
    return true;
  }, [assetCounts?.imageCount, assetCounts?.existingImageNumbers, currentSceneNumber]);

  const failedImagesRef = useRef(new Set());
  const isImageFailed = failedImagesRef.current.has(currentSceneNumber);
  const showImage = hasSceneImage && !imageError && !isImageFailed;

  const currentImageSrc = showImage
    ? `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=images/scene-${currentPaddedNum}.jpg&category=${encodeURIComponent(category)}&v=${currentSlideIndex}`
    : null;
  const currentVideoSrc = `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=bg/bg-${currentPaddedNum}.mp4&category=${encodeURIComponent(category)}`;
  const [audioVersion, setAudioVersion] = useState(0);
  const currentAudioSrc = `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=audio/scene-${currentPaddedNum}.mp3&category=${encodeURIComponent(category)}&v=${audioVersion}`;
  const bgMusicFile = assetCounts?.bgMusicFile || 'bg-music.mp3';
  const bgMusicVersionParam = bgMusicVersion || assetCounts?.updatedAt || 0;
  const bgMusicSrc = `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=audio/${encodeURIComponent(bgMusicFile)}&category=${encodeURIComponent(category)}&v=${bgMusicVersionParam}`;

  // State cho hover popup hiển thị lời đọc & sửa / đọc lại từng đoạn trên thanh tiến độ
  const [activePopupIndex, setActivePopupIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [popupMsg, setPopupMsg] = useState(null);
  const isPopupFocusedRef = useRef(false);
  const isMouseOverPopupRef = useRef(false);
  const isMouseOverSegmentRef = useRef(false);
  const playOnlySceneIndexRef = useRef(null);
  const closeTimerRef = useRef(null);

  // State cho bộ mô phỏng giao diện nền tảng ngắn (TikTok, YouTube Shorts, FB Reels, Zalo)
  const [activePlatform, setActivePlatform] = useState('none');
  const [showSafeZoneGrid, setShowSafeZoneGrid] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.85);

  // State quản lý thành phần đang được chọn để kéo di chuyển & thu phóng như Photoshop
  const [selectedElement, setSelectedElement] = useState('none'); // 'none' | 'caption' | 'image'

  // Nhấn Escape để bỏ chọn
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedElement('none');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Ấn vào vùng khác (vùng trống trên canvas hoặc bên ngoài) để bỏ chọn item đang chọn
  useEffect(() => {
    if (selectedElement === 'none') return;

    const handlePointerDownOutside = (e) => {
      const target = e.target;
      if (!target) return;

      // Không bỏ chọn nếu bấm vào chính item đang chọn (gizmo, 4 góc neo, badge, các nút trên badge)
      if (target.closest?.('[data-transform-gizmo="active"]')) {
        return;
      }

      // Không bỏ chọn nếu bấm vào thanh công cụ chọn thành phần (toolbar mini dưới video)
      if (target.closest?.('.element-selector-toolbar')) {
        return;
      }

      // Không bỏ chọn nếu bấm vào các nút/input điều khiển form (như kéo slider, chọn font, đổi tab ở VideoEditorPanel)
      if (target.closest?.('input') || target.closest?.('select') || target.closest?.('button')) {
        return;
      }

      // Bấm vào bất kỳ vùng khác nào (khoảng trống canvas, nền đen, xung quanh) -> Bỏ chọn vùng đang chọn
      setSelectedElement('none');
    };

    window.addEventListener('pointerdown', handlePointerDownOutside);
    return () => window.removeEventListener('pointerdown', handlePointerDownOutside);
  }, [selectedElement]);

  // Ref lưu giá trị gốc tại thời điểm bắt đầu kéo để tính toán chính xác tuyệt đối, không bị lệch hoặc làm tròn về 0
  const dragStartValuesRef = useRef({
    captionMarginY: 0,
    captionFontSize: 50,
    captionWidth: 92,
    imageScale: 1,
    imageTranslateY: 0,
    logoTranslateX: 0,
    logoTranslateY: 0,
    logoScale: 1
  });

  const handleCaptionDragStart = useCallback(() => {
    dragStartValuesRef.current = {
      captionMarginY,
      captionFontSize: baseFontSize,
      captionWidth,
      imageScale,
      imageTranslateY,
      logoTranslateX,
      logoTranslateY,
      logoScale
    };
  }, [captionMarginY, baseFontSize, captionWidth, imageScale, imageTranslateY, logoTranslateX, logoTranslateY, logoScale]);

  // Xử lý kéo di chuyển phụ đề trực tiếp trên màn hình video (tính độ dịch chuyển từ startMarginY)
  const handleCaptionDrag = useCallback(({ deltaY }) => {
    if (!onUpdateRenderConfig) return;
    const scaleFactor = effectiveIsPortrait ? 0.28 : 0.22;
    const nextMarginY = Math.round(dragStartValuesRef.current.captionMarginY - (deltaY / scaleFactor));
    onUpdateRenderConfig({ captionMarginY: Math.max(-500, Math.min(500, nextMarginY)) });
  }, [effectiveIsPortrait, onUpdateRenderConfig]);

  const handleCaptionScaleStart = useCallback(() => {
    dragStartValuesRef.current = {
      captionMarginY,
      captionFontSize: baseFontSize,
      captionWidth,
      imageScale,
      imageTranslateY,
      logoTranslateX,
      logoTranslateY,
      logoScale
    };
  }, [captionMarginY, baseFontSize, captionWidth, imageScale, imageTranslateY, logoTranslateX, logoTranslateY, logoScale]);

  // Xử lý kéo 4 góc neo để thu phóng cỡ chữ phụ đề trực tiếp (theo tỉ lệ ratio từ startFontSize)
  const handleCaptionScale = useCallback(({ ratio, deltaDistance }) => {
    if (!onUpdateRenderConfig) return;
    const startSize = dragStartValuesRef.current.captionFontSize || 50;
    // Cho phép phóng to/thu nhỏ mượt mà theo ratio kết hợp delta
    const nextFontSize = Math.max(16, Math.min(84, Math.round(startSize * ratio)));
    onUpdateRenderConfig({ captionFontSize: nextFontSize });
  }, [onUpdateRenderConfig]);

  const handleCaptionResizeWidthStart = useCallback(() => {
    dragStartValuesRef.current = {
      captionMarginY,
      captionFontSize: baseFontSize,
      captionWidth,
      imageScale,
      imageTranslateY,
      logoTranslateX,
      logoTranslateY,
      logoScale
    };
  }, [captionMarginY, baseFontSize, captionWidth, imageScale, imageTranslateY, logoTranslateX, logoTranslateY, logoScale]);

  // Xử lý kéo tay cầm trái/phải để co giãn độ rộng ngang của phụ đề trực tiếp
  const handleCaptionResizeWidth = useCallback(({ effectiveDeltaX }) => {
    if (!onUpdateRenderConfig) return;
    const containerW = containerRef.current?.clientWidth || 360;
    // Vì đối tượng căn giữa, việc kéo tay cầm 1 bên nới rộng deltaX tương ứng tăng độ rộng 2 bên: 2 * deltaX
    const percentDelta = ((effectiveDeltaX * 2) / containerW) * 100;
    const startWidth = dragStartValuesRef.current.captionWidth || 92;
    const nextWidth = Math.max(30, Math.min(98, Math.round(startWidth + percentDelta)));
    onUpdateRenderConfig({ captionWidth: nextWidth });
  }, [onUpdateRenderConfig]);

  const handleImageDragStart = useCallback(() => {
    dragStartValuesRef.current = {
      captionMarginY,
      captionFontSize: baseFontSize,
      captionWidth,
      imageScale,
      imageTranslateY,
      logoTranslateX,
      logoTranslateY,
      logoScale
    };
  }, [captionMarginY, baseFontSize, captionWidth, imageScale, imageTranslateY, logoTranslateX, logoTranslateY, logoScale]);

  // Xử lý kéo dịch chuyển ảnh nền trực tiếp (tính độ dịch chuyển từ startTranslateY)
  const handleImageDrag = useCallback(({ deltaY }) => {
    if (!onUpdateRenderConfig) return;
    const containerH = containerRef.current?.clientHeight || 550;
    const percentDelta = (deltaY / containerH) * 100;
    const nextTranslateY = Math.round(dragStartValuesRef.current.imageTranslateY + percentDelta);
    onUpdateRenderConfig({ imageTranslateY: Math.max(-60, Math.min(60, nextTranslateY)) });
  }, [onUpdateRenderConfig]);

  const handleImageScaleStart = useCallback(() => {
    dragStartValuesRef.current = {
      captionMarginY,
      captionFontSize: baseFontSize,
      captionWidth,
      imageScale,
      imageTranslateY,
      logoTranslateX,
      logoTranslateY,
      logoScale
    };
  }, [captionMarginY, baseFontSize, captionWidth, imageScale, imageTranslateY, logoTranslateX, logoTranslateY, logoScale]);

  // Xử lý kéo 4 góc neo để thu phóng kích thước ảnh nền (theo tỉ lệ ratio từ startScale)
  const handleImageScale = useCallback(({ ratio }) => {
    if (!onUpdateRenderConfig) return;
    const startScale = dragStartValuesRef.current.imageScale || 1;
    const nextScale = Math.max(0.4, Math.min(3.0, Number((startScale * ratio).toFixed(2))));
    onUpdateRenderConfig({ imageScale: nextScale });
  }, [onUpdateRenderConfig]);

  const handleLogoDragStart = useCallback(() => {
    dragStartValuesRef.current = {
      captionMarginY,
      captionFontSize: baseFontSize,
      captionWidth,
      imageScale,
      imageTranslateY,
      logoTranslateX,
      logoTranslateY,
      logoScale
    };
  }, [captionMarginY, baseFontSize, captionWidth, imageScale, imageTranslateY, logoTranslateX, logoTranslateY, logoScale]);

  // Xử lý kéo di chuyển Logo kênh thương hiệu tự do (X, Y) trực tiếp trên màn hình video
  const handleLogoDrag = useCallback(({ deltaX, deltaY }) => {
    if (!onUpdateRenderConfig) return;
    const canvasWidth = effectiveIsPortrait ? 1080 : 1920;
    const containerW = containerRef.current?.clientWidth || (effectiveIsPortrait ? 360 : 640);
    const rScale = containerW / canvasWidth;
    const deltaRemotionX = deltaX / rScale;
    const deltaRemotionY = deltaY / rScale;
    const nextX = Math.round(dragStartValuesRef.current.logoTranslateX + deltaRemotionX);
    const nextY = Math.round(dragStartValuesRef.current.logoTranslateY + deltaRemotionY);
    onUpdateRenderConfig({
      logoTranslateX: Math.max(-800, Math.min(800, nextX)),
      logoTranslateY: Math.max(-1600, Math.min(300, nextY))
    });
  }, [effectiveIsPortrait, onUpdateRenderConfig]);

  const handleLogoScaleStart = useCallback(() => {
    dragStartValuesRef.current = {
      captionMarginY,
      captionFontSize: baseFontSize,
      captionWidth,
      imageScale,
      imageTranslateY,
      logoTranslateX,
      logoTranslateY,
      logoScale
    };
  }, [captionMarginY, baseFontSize, captionWidth, imageScale, imageTranslateY, logoTranslateX, logoTranslateY, logoScale]);

  // Xử lý kéo 4 góc neo để thu phóng kích thước Logo trực tiếp
  const handleLogoScale = useCallback(({ ratio }) => {
    if (!onUpdateRenderConfig) return;
    const startScale = dragStartValuesRef.current.logoScale || 1;
    const nextScale = Math.max(0.3, Math.min(3.0, Number((startScale * ratio).toFixed(2))));
    onUpdateRenderConfig({ logoScale: nextScale });
  }, [onUpdateRenderConfig]);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const schedulePopupClose = (delay = 300) => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      if (!isPopupFocusedRef.current && !isMouseOverPopupRef.current && !isMouseOverSegmentRef.current && !isRegenerating) {
        setActivePopupIndex(null);
        setPopupMsg(null);
      }
    }, delay);
  };

  // Khi người dùng chọn/ấn vào item của mô phỏng (Phụ đề / Ảnh nền), lập tức đóng và tạm disable popup sửa voice
  useEffect(() => {
    if (selectedElement !== 'none') {
      setActivePopupIndex(null);
      setPopupMsg(null);
      isMouseOverSegmentRef.current = false;
      isMouseOverPopupRef.current = false;
      clearCloseTimer();
    }
  }, [selectedElement]);

  const handleSegmentMouseEnter = (idx) => {
    if (selectedElement !== 'none') return; // Tạm disable chức năng hover & popup sửa voice khi đang thao tác item mô phỏng
    isMouseOverSegmentRef.current = true;
    clearCloseTimer();
    if (!isRegenerating) {
      if (activePopupIndex !== idx) {
        setActivePopupIndex(idx);
        const seg = segments[idx];
        setEditText(seg?.dialogueOrNarration || seg?.subtitle || '');
        setPopupMsg(null);
      }
    }
  };

  const handleSegmentMouseLeave = () => {
    isMouseOverSegmentRef.current = false;
    if (isRegenerating || isPopupFocusedRef.current) return;
    schedulePopupClose(320);
  };

  const handlePopupMouseEnter = () => {
    isMouseOverPopupRef.current = true;
    clearCloseTimer();
  };

  const handlePopupMouseLeave = () => {
    isMouseOverPopupRef.current = false;
    if (isRegenerating || isPopupFocusedRef.current) return;
    schedulePopupClose(320);
  };

  const handlePopupFocus = () => {
    isPopupFocusedRef.current = true;
    clearCloseTimer();
  };

  const handlePopupBlur = () => {
    isPopupFocusedRef.current = false;
    schedulePopupClose(250);
  };

  const handleRegenerateVoice = async (sceneIndex, newText) => {
    const seg = segments[sceneIndex];
    if (!seg) return;
    const segNum = seg.segmentNumber || sceneIndex + 1;
    const originalText = (seg.dialogueOrNarration || seg.subtitle || '').trim();
    const textToRead = (newText !== undefined ? newText : originalText).trim();
    if (!textToRead) {
      setPopupMsg({ type: 'error', text: 'Cảnh này chưa có lời đọc để lồng tiếng.' });
      return;
    }

    setIsRegenerating(true);
    setPopupMsg({ type: 'loading', text: '🎙️ Đang tạo lại giọng đọc...' });

    try {
      let currentSegments = segments;
      const textChanged = newText !== undefined && newText.trim() !== originalText;

      if (textChanged) {
        const updateRes = await fetch('/api/prompts/update-segments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: result.id,
            folderPath: result.input?.folderPath || folderPath,
            category: result.category || category,
            segments: [
              {
                segmentNumber: segNum,
                subtitle: seg.subtitle === seg.dialogueOrNarration || !seg.subtitle ? newText.trim() : seg.subtitle,
                dialogueOrNarration: newText.trim()
              }
            ]
          })
        });
        const updateData = await updateRes.json();
        if (updateRes.ok && updateData.success) {
          currentSegments = updateData.segments;
          onResult?.({
            ...result,
            segments: updateData.segments,
            remotionConfig: updateData.remotionConfig ?? result.remotionConfig
          });
        } else {
          throw new Error(updateData.error || 'Không thể lưu nội dung mới.');
        }
      }

      if (resyncVoiceForSegments) {
        const r = await resyncVoiceForSegments([segNum], currentSegments, { onlyExistingAudio: false });
        if (r && r.error) {
          throw new Error(r.error);
        }
      } else {
        const res = await fetch('/api/prompts/voiceover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderPath: result.input?.folderPath || folderPath,
            title: result.title || '',
            category: result.category || category,
            imageExt: result.input?.imageExt || 'jpg',
            audioExt: assetCounts?.audioExt || result.input?.audioExt || 'mp3',
            onlyExistingAudio: false,
            reuseExistingVoice: true,
            scenes: [{ segmentNumber: segNum, dialogueOrNarration: textToRead }]
          })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Lỗi khi tạo lại giọng đọc.');
        }
      }

      setAudioVersion((v) => v + 1);
      checkAssets?.();

      const pad = String(segNum).padStart(2, '0');
      const probeSrc = `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=audio/scene-${pad}.mp3&category=${encodeURIComponent(category)}&v=${Date.now()}`;
      const probe = new Audio(probeSrc);
      probe.preload = 'metadata';
      probe.onloadedmetadata = () => {
        if (probe.duration && Number.isFinite(probe.duration) && probe.duration > 0) {
          setSceneDurations((prev) => {
            const next = [...prev];
            next[sceneIndex] = probe.duration;
            return next;
          });
        }
      };

      setPopupMsg({ type: 'success', text: '✓ Đã tạo lại giọng đọc thành công!' });

      playOnlySceneIndexRef.current = sceneIndex;
      goToScene(sceneIndex);
      setSlideCurrentTime(0);
      setIsPlaying(true);
    } catch (err) {
      setPopupMsg({ type: 'error', text: `Lỗi: ${err?.message || err}` });
    } finally {
      setIsRegenerating(false);
    }
  };

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
      if (playOnlySceneIndexRef.current !== null) {
        playOnlySceneIndexRef.current = null;
        setIsPlaying(false);
        setSlideCurrentTime(0);
        return;
      }
      if (currentSlideIndex < totalScenes - 1) {
        goToScene(currentSlideIndex + 1);
      } else {
        setIsPlaying(false);
        goToScene(0);
      }
    };
    const onErr = () => {
      // Fallback giữ nguyên thời lượng đã ước lượng
    };

    voiceAudio.addEventListener('loadedmetadata', onMeta);
    voiceAudio.addEventListener('timeupdate', onTime);
    voiceAudio.addEventListener('ended', onEnd);
    voiceAudio.addEventListener('error', onErr);

    if (isPlaying) voiceAudio.play().catch(() => { });

    return () => {
      voiceAudio.removeEventListener('loadedmetadata', onMeta);
      voiceAudio.removeEventListener('timeupdate', onTime);
      voiceAudio.removeEventListener('ended', onEnd);
      voiceAudio.removeEventListener('error', onErr);
    };
  }, [currentAudioSrc, currentSlideIndex, totalScenes, isPlaying, goToScene]);

  // Dùng requestAnimationFrame để mô phỏng chuyển động Ken Burns & tiến độ mượt mà chuẩn 60fps
  // (tránh hiện tượng giật do sự kiện timeupdate của audio chỉ bắn ~4 lần/giây)
  useEffect(() => {
    if (!isPlaying) return;

    let animId;
    let lastPerfTime = performance.now();

    const tick = () => {
      const va = voiceAudioRef.current;
      const isAudioActive = va && !va.paused && !va.error && va.readyState >= 2;

      if (isAudioActive) {
        const curTime = va.currentTime || 0;
        setSlideCurrentTime(curTime);

        // Chuyển cảnh chuẩn xác khi audio kết thúc
        if (va.duration && Number.isFinite(va.duration) && curTime >= va.duration - 0.05) {
          if (playOnlySceneIndexRef.current !== null) {
            playOnlySceneIndexRef.current = null;
            setIsPlaying(false);
            setSlideCurrentTime(0);
            return;
          }
          if (currentSlideIndex < totalScenes - 1) {
            goToScene(currentSlideIndex + 1);
          } else {
            setIsPlaying(false);
            goToScene(0);
          }
          return;
        }
      } else {
        const now = performance.now();
        const delta = Math.min(0.1, (now - lastPerfTime) / 1000);
        lastPerfTime = now;

        setSlideCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= currentSceneDuration) {
            if (playOnlySceneIndexRef.current !== null) {
              playOnlySceneIndexRef.current = null;
              setIsPlaying(false);
              return 0;
            }
            if (currentSlideIndex < totalScenes - 1) {
              goToScene(currentSlideIndex + 1);
            } else {
              setIsPlaying(false);
              goToScene(0);
            }
            return 0;
          }
          return next;
        });
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, currentSceneDuration, currentSlideIndex, totalScenes, goToScene]);

  useEffect(() => {
    const voiceAudio = voiceAudioRef.current;
    const bgAudio = bgMusicAudioRef.current;

    if (isPlaying) {
      if (voiceAudio) voiceAudio.play().catch(() => { });
      if (bgAudio && bgMusicEnabled) {
        bgAudio.volume = isMuted ? 0 : bgMusicVolume;
        bgAudio.play().catch(() => { });
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

  // Khi nhạc nền thay đổi (đổi bài hoặc tải bài mới), nạp ngay bản mới và phát nếu đang chạy
  useEffect(() => {
    const bgAudio = bgMusicAudioRef.current;
    if (!bgAudio) return;
    bgAudio.src = bgMusicSrc;
    bgAudio.load();
    if (isPlaying && bgMusicEnabled) {
      bgAudio.currentTime = 0;
      bgAudio.volume = isMuted ? 0 : bgMusicVolume;
      bgAudio.play().catch(() => { });
    }
  }, [bgMusicSrc]);

  const togglePlay = () => {
    playOnlySceneIndexRef.current = null;
    setIsPlaying((p) => !p);
  };
  const handlePrevSlide = () => {
    playOnlySceneIndexRef.current = null;
    setCurrentSlideIndex((p) => Math.max(0, p - 1));
  };
  const handleNextSlide = () => {
    playOnlySceneIndexRef.current = null;
    setCurrentSlideIndex((p) => Math.min(totalScenes - 1, p + 1));
  };

  const handlePlaySingleScene = (sceneIdx) => {
    if (isPlaying && currentSlideIndex === sceneIdx) {
      playOnlySceneIndexRef.current = null;
      setIsPlaying(false);
      if (voiceAudioRef.current) voiceAudioRef.current.pause();
      return;
    }

    playOnlySceneIndexRef.current = sceneIdx;
    setSlideCurrentTime(0);
    if (currentSlideIndex === sceneIdx) {
      if (voiceAudioRef.current) {
        voiceAudioRef.current.currentTime = 0;
        voiceAudioRef.current.play().catch(() => { });
      }
    } else {
      goToScene(sceneIdx);
    }
    setIsPlaying(true);
  };

  const handleReplay = () => {
    playOnlySceneIndexRef.current = null;
    setCurrentSlideIndex(0);
    setSlideCurrentTime(0);
    setIsPlaying(true);
    if (voiceAudioRef.current) {
      voiceAudioRef.current.currentTime = 0;
      voiceAudioRef.current.play().catch(() => { });
    }
    if (bgMusicAudioRef.current && bgMusicEnabled) {
      bgMusicAudioRef.current.currentTime = 0;
      bgMusicAudioRef.current.play().catch(() => { });
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
    playOnlySceneIndexRef.current = null;
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
      target.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
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
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: isFullscreen ? '0px' : '10px',
        background: isFullscreen ? '#000000' : 'transparent',
        borderRadius: 0,
        padding: isFullscreen ? 0 : (effectiveIsPortrait ? '14px 0 12px 0' : 0),
        border: 'none',
        boxShadow: 'none',
        overflow: 'visible'
      }}
      onClick={(e) => {
        if (e.target === stageRef.current) {
          setSelectedElement('none');
        }
      }}
    >
      {/* Vùng bọc giữa khung video và hàng nút mô phỏng bên phải */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          boxSizing: 'border-box'
        }}
        onClick={() => {
          if (selectedElement !== 'none') {
            setSelectedElement('none');
          }
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
          onClick={() => {
            if (selectedElement !== 'none') {
              setSelectedElement('none');
            }
          }}
        >
          <audio ref={voiceAudioRef} preload="auto" />
          <audio key={bgMusicSrc} ref={bgMusicAudioRef} src={bgMusicSrc} loop preload="auto" />

          {/* LỚP 1: ẢNH / VIDEO NỀN / BULLETS */}
          <div
            style={{ position: 'absolute', inset: 0, overflow: selectedElement === 'image' ? 'visible' : 'hidden' }}
            onClick={() => {
              if (selectedElement !== 'none') {
                setSelectedElement('none');
              }
            }}
          >
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
            ) : showImage && currentImageSrc ? (
              <TransformGizmoOverlay
                active={selectedElement === 'image' && !isPlaying}
                label="Ảnh nền"
                detail={`${Math.round(imageScale * 100)}% • Y: ${Math.round(imageTranslateY)}%`}
                boxInset="0px"
                counterScale={kbScale * imageScale}
                badgePosition={imageTranslateY < -20 ? 'inside-top' : 'outside-top'}
                onDragStart={handleImageDragStart}
                onDrag={handleImageDrag}
                onScaleStart={handleImageScaleStart}
                onScale={handleImageScale}
                onDeselect={() => setSelectedElement('none')}
                onReset={() => onUpdateRenderConfig?.({ imageScale: 1, imageTranslateY: 0 })}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  transform: `scale(${kbScale * imageScale}) translateX(${kbTranslateX}%) translateY(${imageTranslateY}%)`,
                  transformOrigin: 'center center',
                  willChange: 'transform',
                  transition: selectedElement === 'image' || isPlaying ? 'none' : 'transform 0.4s ease',
                  pointerEvents: isPlaying ? 'none' : 'auto'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  setSelectedElement('image');
                }}
              >
                <div
                  key={`img-${currentSlideIndex}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundImage: `url(${currentImageSrc})`,
                    backgroundSize: globalImageFit,
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  <img
                    src={currentImageSrc}
                    alt=""
                    style={{ display: 'none' }}
                    onError={() => {
                      failedImagesRef.current.add(currentSceneNumber);
                      setImageError(true);
                    }}
                  />
                </div>
              </TransformGizmoOverlay>
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
                ...(captionPosition === 'top' ? {
                  top: `${Math.max(16, 26 - visualMarginY)}px`
                } : captionPosition === 'center' || captionStyle === 'page' ? {
                  top: '50%',
                  transform: `translateY(calc(-50% - ${visualMarginY}px))`
                } : {
                  bottom: `${Math.max(12, 56 + visualMarginY)}px`
                }),
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                zIndex: 25,
                pointerEvents: 'none',
                transition: selectedElement === 'caption' ? 'none' : 'all 0.15s ease-out'
              }}
            >
              <TransformGizmoOverlay
                active={selectedElement === 'caption' && !isPlaying}
                label="Phụ đề"
                detail={`${baseFontSize}px • Rộng: ${captionWidth}% • Y: ${captionMarginY}px`}
                boxInset="-2px"
                enableHorizontalResize={true}
                onDragStart={handleCaptionDragStart}
                onDrag={handleCaptionDrag}
                onScaleStart={handleCaptionScaleStart}
                onScale={handleCaptionScale}
                onResizeWidthStart={handleCaptionResizeWidthStart}
                onResizeWidth={handleCaptionResizeWidth}
                onDeselect={() => setSelectedElement('none')}
                onReset={() => onUpdateRenderConfig?.({
                  captionMarginY: ['moral_talk_slideshow', 'buddhist_wisdom', 'japanese_history'].includes(category) ? -215 : 0,
                  captionFontSize: 50,
                  captionWidth: 92
                })}
                style={{
                  pointerEvents: isPlaying ? 'none' : 'auto',
                  width: `${captionWidth}%`,
                  maxWidth: '98%',
                  boxSizing: 'border-box'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  setSelectedElement('caption');
                }}
              >
                {captionStyle === 'hook' ? (
                  currentSlideIndex === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                      <div style={{ background: highlightColor, color: '#ffffff', fontFamily, fontSize: `${Math.max(11, Math.round(scaledFontSize * 0.72))}px`, fontWeight: 900, padding: '3px 12px', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: `0 4px 16px ${highlightColor}66` }}>
                        ★ {result?.title ? result.title.slice(0, 32) : 'BÀI HỌC CUỘC SỐNG'}
                      </div>
                      <div style={{ width: '100%', boxSizing: 'border-box', fontFamily, fontSize: `${Math.round(scaledFontSize * 1.22)}px`, fontWeight: 900, lineHeight: 1.3, color: textColor, textShadow: 'none', background: isBgTransparent ? 'transparent' : `rgba(${parseInt(bgColor.slice(1, 3) || '0', 16)}, ${parseInt(bgColor.slice(3, 5) || '0', 16)}, ${parseInt(bgColor.slice(5, 7) || '0', 16)}, ${bgOpacity})`, padding: isBgTransparent ? '2px' : '8px 16px', borderRadius: '12px' }}>
                        {renderWithHighlights(cleanPrimary, highlightColor)}
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: isBgTransparent ? '4px 10px' : '8px 18px', borderRadius: '12px', background: isBgTransparent ? 'transparent' : (bgColor && bgColor !== 'transparent' ? bgColor : 'rgba(8, 8, 11, 0.88)'), border: 'none', boxShadow: isBgTransparent ? 'none' : '0 4px 20px rgba(0,0,0,0.5)', fontFamily, fontSize: `${scaledFontSize}px`, lineHeight: 1.35, fontWeight: 800, color: textColor, textShadow: 'none' }}>
                      {renderWithHighlights(cleanPrimary, highlightColor)}
                    </div>
                  )
                ) : captionStyle === 'tiktok' ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px', width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '6px 12px', background: isBgTransparent ? 'transparent' : `rgba(${parseInt(bgColor.slice(1, 3) || '0', 16)}, ${parseInt(bgColor.slice(3, 5) || '0', 16)}, ${parseInt(bgColor.slice(5, 7) || '0', 16)}, ${bgOpacity * 0.8})`, borderRadius: '10px' }}>
                    {words.map((word, i) => {
                      const isActive = i === activeWordIdx && isPlaying;
                      return (
                        <span key={i} style={{ fontFamily, fontSize: `${scaledFontSize}px`, fontWeight: 800, color: isActive ? '#ffffff' : textColor, background: isActive ? highlightColor : 'transparent', borderRadius: isActive ? '6px' : '0', padding: isActive ? '1px 6px' : '1px 2px', transform: isActive ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.12s ease', textShadow: 'none' }}>
                          {word}
                        </span>
                      );
                    })}
                  </div>
                ) : captionStyle === 'karaoke' ? (
                  <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: isBgTransparent ? '4px' : '8px 16px', borderRadius: '10px', background: isBgTransparent ? 'transparent' : `rgba(${parseInt(bgColor.slice(1, 3) || '0', 16)}, ${parseInt(bgColor.slice(3, 5) || '0', 16)}, ${parseInt(bgColor.slice(5, 7) || '0', 16)}, ${bgOpacity})`, fontFamily, fontSize: `${scaledFontSize}px`, lineHeight: 1.35, fontWeight: 800 }}>
                    {words.map((word, i) => {
                      const hasSpoken = i <= activeWordIdx;
                      return (
                        <span key={i} style={{ color: hasSpoken ? highlightColor : 'rgba(255, 255, 255, 0.55)', textShadow: hasSpoken ? `0 0 12px ${highlightColor}88` : 'none', marginRight: '6px', transition: 'color 0.15s ease' }}>
                          {word}
                        </span>
                      );
                    })}
                  </div>
                ) : captionStyle === 'pill' ? (
                  <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '8px 24px', borderRadius: '9999px', background: isBgTransparent ? 'transparent' : `rgba(${parseInt(bgColor.slice(1, 3) || '0', 16)}, ${parseInt(bgColor.slice(3, 5) || '0', 16)}, ${parseInt(bgColor.slice(5, 7) || '0', 16)}, ${bgOpacity})`, border: isBgTransparent ? 'none' : '1px solid rgba(255,255,255,0.14)', backdropFilter: isBgTransparent ? 'none' : 'blur(6px)', fontFamily, fontSize: `${scaledFontSize}px`, lineHeight: 1.35, fontWeight: 800, color: textColor, textShadow: 'none' }}>
                    {renderWithHighlights(cleanPrimary, highlightColor)}
                  </div>
                ) : captionStyle === 'news' ? (
                  <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '8px 14px', background: isBgTransparent ? 'transparent' : `rgba(${parseInt(bgColor.slice(1, 3) || '0', 16)}, ${parseInt(bgColor.slice(3, 5) || '0', 16)}, ${parseInt(bgColor.slice(5, 7) || '0', 16)}, 0.88)`, borderLeft: 'none', textAlign: 'left', fontFamily, fontSize: `${scaledFontSize}px`, fontWeight: 700, color: textColor, boxShadow: isBgTransparent ? 'none' : '0 4px 20px rgba(0,0,0,0.5)', textShadow: 'none' }}>
                    {renderWithHighlights(cleanPrimary, highlightColor)}
                  </div>
                ) : captionStyle === 'box' ? (
                  <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '8px 16px', borderRadius: '8px', background: isBgTransparent ? 'transparent' : `rgba(${parseInt(bgColor.slice(1, 3) || '0', 16)}, ${parseInt(bgColor.slice(3, 5) || '0', 16)}, ${parseInt(bgColor.slice(5, 7) || '0', 16)}, 0.85)`, border: 'none', fontFamily, fontSize: `${scaledFontSize}px`, lineHeight: 1.35, fontWeight: 800, color: textColor, textShadow: 'none' }}>
                    {renderWithHighlights(cleanPrimary, highlightColor)}
                  </div>
                ) : (
                  <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: isBgTransparent || captionStyle === 'minimal' ? '4px 8px' : '8px 14px', borderRadius: isBgTransparent || captionStyle === 'minimal' ? '0' : '10px', background: isBgTransparent || captionStyle === 'minimal' ? 'transparent' : `rgba(${parseInt(bgColor.slice(1, 3) || '0', 16)}, ${parseInt(bgColor.slice(3, 5) || '0', 16)}, ${parseInt(bgColor.slice(5, 7) || '0', 16)}, ${bgOpacity})`, backdropFilter: isBgTransparent || captionStyle === 'minimal' ? 'none' : 'blur(4px)', boxShadow: isBgTransparent || captionStyle === 'minimal' ? 'none' : '0 4px 16px rgba(0,0,0,0.4)', fontFamily, fontSize: `${scaledFontSize}px`, lineHeight: 1.35, fontWeight: 800, color: textColor, textShadow: 'none' }}>
                    {renderWithHighlights(cleanPrimary, highlightColor)}
                  </div>
                )}
              </TransformGizmoOverlay>
            </div>
          )}

          {/* LỚP 4: LOGO KÊNH THƯƠNG HIỆU */}
          {showChannelLogo && (
            <div
              style={{
                position: 'absolute',
                bottom: effectiveIsPortrait ? '8%' : '7%',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                pointerEvents: 'none',
                opacity: selectedElement === 'logo' ? 1 : 0.75,
                zIndex: selectedElement === 'logo' ? 30 : 20,
                transition: selectedElement === 'logo' ? 'none' : 'all 0.2s ease'
              }}
            >
              <TransformGizmoOverlay
                active={selectedElement === 'logo' && !isPlaying}
                label="Logo thương hiệu"
                detail={`${Math.round(logoScale * 100)}% • X: ${Math.round(logoTranslateX)}px • Y: ${Math.round(logoTranslateY)}px`}
                boxInset="-4px"
                counterScale={logoScale}
                badgePosition={logoTranslateY < -1300 ? 'inside-top' : 'outside-top'}
                onDragStart={handleLogoDragStart}
                onDrag={handleLogoDrag}
                onScaleStart={handleLogoScaleStart}
                onScale={handleLogoScale}
                onDeselect={() => setSelectedElement('none')}
                onReset={() => onUpdateRenderConfig?.({ logoTranslateX: 0, logoTranslateY: 0, logoScale: 1 })}
                style={{
                  transform: `translate(${visualLogoX}px, ${visualLogoY}px) scale(${logoScale})`,
                  transformOrigin: 'center center',
                  pointerEvents: isPlaying ? 'none' : 'auto',
                  cursor: isPlaying ? 'default' : (selectedElement === 'logo' ? 'move' : 'pointer'),
                  transition: selectedElement === 'logo' || isPlaying ? 'none' : 'transform 0.2s ease'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  setSelectedElement('logo');
                }}
              >
                <img
                  src="/images/watermark/the-mind-logo.png"
                  alt="Logo thương hiệu"
                  style={{
                    width: effectiveIsPortrait ? (isFullscreen ? '115px' : '90px') : '75px',
                    maxWidth: '28%',
                    height: 'auto',
                    objectFit: 'contain',
                    mixBlendMode: 'screen',
                    filter: 'brightness(1.15) drop-shadow(0 2px 8px rgba(0,0,0,0.7))',
                    display: 'block',
                    userSelect: 'none',
                    pointerEvents: 'none'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </TransformGizmoOverlay>
            </div>
          )}

          {/* LỚP MÔ PHỎNG GIAO DIỆN NỀN TẢNG (TIKTOK / YOUTUBE SHORTS / FB REELS / ZALO) */}
          {(activePlatform !== 'none' || showSafeZoneGrid) && (
            <PlatformMockupOverlay
              platform={activePlatform}
              showSafeZoneGrid={showSafeZoneGrid}
              overlayOpacity={overlayOpacity}
              title={result?.title}
              channelName={rc.channelName || 'ATPOSTER'}
            />
          )}

        </div> {/* Đóng containerRef - khung video màn mô phỏng */}

        {/* HÀNG NÚT BÊN PHẢI KHUNG VIDEO ĐỂ CHỌN NỀN TẢNG MÔ PHỎNG */}
        {effectiveIsPortrait && !isFullscreen && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 35
            }}
          >
            <PlatformSelectorToolbar
              activePlatform={activePlatform}
              setActivePlatform={setActivePlatform}
              showSafeZoneGrid={showSafeZoneGrid}
              setShowSafeZoneGrid={setShowSafeZoneGrid}
              overlayOpacity={overlayOpacity}
              setOverlayOpacity={setOverlayOpacity}
            />
          </div>
        )}
      </div> {/* Đóng wrapper của video và thanh nút bên phải */}

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
        {/* Thanh tiến độ THEO TỪNG ĐOẠN (Segmented Timeline with Hover Preview & Quick Action) */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            padding: '4px 0'
          }}
        >
          {/* POPUP HOVER KHI RÊ CHUỘT VÀO TỪNG ĐOẠN (Chỉ hiển thị khi KHÔNG chọn item mô phỏng) */}
          {selectedElement === 'none' && activePopupIndex !== null && segments[activePopupIndex] && (
            <TimelineSegmentPopup
              segment={segments[activePopupIndex]}
              sceneIndex={activePopupIndex}
              totalScenes={totalScenes}
              duration={sceneDurations[activePopupIndex] || 3.5}
              sceneOffsets={sceneOffsets}
              totalDuration={totalDuration}
              editText={editText}
              setEditText={setEditText}
              isRegenerating={isRegenerating}
              popupMsg={popupMsg}
              isScenePlaying={isPlaying && currentSlideIndex === activePopupIndex}
              onClose={() => {
                setActivePopupIndex(null);
                setPopupMsg(null);
              }}
              onPlay={handlePlaySingleScene}
              onRegenerate={handleRegenerateVoice}
              onMouseEnter={handlePopupMouseEnter}
              onMouseLeave={handlePopupMouseLeave}
              onFocus={handlePopupFocus}
              onBlur={handlePopupBlur}
            />
          )}

          {/* Dãy các đoạn của thanh tiến độ */}
          <div
            style={{
              width: '100%',
              height: '8px',
              display: 'flex',
              gap: '2.5px',
              alignItems: 'center',
              borderRadius: '6px'
            }}
          >
            {segments.map((seg, idx) => {
              const dur = sceneDurations[idx] || 3.5;
              const isPast = idx < currentSlideIndex;
              const isCurrent = idx === currentSlideIndex;
              const segProgress = isPast
                ? 100
                : isCurrent
                  ? Math.min(100, Math.max(0, (slideCurrentTime / dur) * 100))
                  : 0;
              const isHovered = selectedElement === 'none' && activePopupIndex === idx;

              return (
                <div
                  key={idx}
                  onMouseEnter={selectedElement === 'none' ? () => handleSegmentMouseEnter(idx) : undefined}
                  onMouseLeave={selectedElement === 'none' ? handleSegmentMouseLeave : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    playOnlySceneIndexRef.current = null;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    const targetInSceneTime = ratio * dur;
                    goToScene(idx);
                    setSlideCurrentTime(targetInSceneTime);
                    if (voiceAudioRef.current) voiceAudioRef.current.currentTime = targetInSceneTime;
                  }}
                  style={{
                    flex: Math.max(0.1, dur),
                    height: isHovered ? '10px' : '7px',
                    background: isHovered ? 'rgba(255, 255, 255, 0.32)' : 'rgba(255, 255, 255, 0.18)',
                    borderRadius: '3px',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isHovered ? '0 0 8px rgba(37, 244, 238, 0.7)' : 'none',
                    border: isHovered ? '1px solid #25f4ee' : 'none',
                    boxSizing: 'border-box'
                  }}
                  title={selectedElement === 'none'
                    ? `Cảnh ${idx + 1}: ${dur.toFixed(1)}s (Rê chuột xem kịch bản / sửa / đọc lại)`
                    : `Cảnh ${idx + 1}: ${dur.toFixed(1)}s`}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${segProgress}%`,
                      background: 'linear-gradient(90deg, #10b981, #25f4ee)',
                      transition: isCurrent && isPlaying ? 'none' : 'width 0.15s ease'
                    }}
                  />
                </div>
              );
            })}
          </div>
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
            {/* CÔNG CỤ CHỌN THÀNH PHẦN ĐỂ KÉO / SCALE KIỂU PHOTOSHOP */}
            {!isPlaying && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(255,255,255,0.06)', padding: '2px 4px', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, padding: '0 2px' }}>✥ Kéo:</span>
                <button
                  type="button"
                  onClick={() => setSelectedElement(selectedElement === 'caption' ? 'none' : 'caption')}
                  style={{
                    background: selectedElement === 'caption' ? 'rgba(37, 244, 238, 0.25)' : 'transparent',
                    border: selectedElement === 'caption' ? '1px solid rgba(37, 244, 238, 0.6)' : '1px solid transparent',
                    color: selectedElement === 'caption' ? '#25f4ee' : 'rgba(255,255,255,0.75)',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    borderRadius: '4px',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                  title="Chọn Phụ đề để kéo di chuyển & scale trực tiếp"
                >
                  <span>📝</span> Phụ đề
                </button>
                {showImage && currentImageSrc && (
                  <button
                    type="button"
                    onClick={() => setSelectedElement(selectedElement === 'image' ? 'none' : 'image')}
                    style={{
                      background: selectedElement === 'image' ? 'rgba(37, 244, 238, 0.25)' : 'transparent',
                      border: selectedElement === 'image' ? '1px solid rgba(37, 244, 238, 0.6)' : '1px solid transparent',
                      color: selectedElement === 'image' ? '#25f4ee' : 'rgba(255,255,255,0.75)',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      borderRadius: '4px',
                      padding: '2px 6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="Chọn Ảnh nền để kéo di chuyển & scale trực tiếp"
                  >
                    <span>🖼️</span> Ảnh nền
                  </button>
                )}
                {showChannelLogo && (
                  <button
                    type="button"
                    onClick={() => setSelectedElement(selectedElement === 'logo' ? 'none' : 'logo')}
                    style={{
                      background: selectedElement === 'logo' ? 'rgba(37, 244, 238, 0.25)' : 'transparent',
                      border: selectedElement === 'logo' ? '1px solid rgba(37, 244, 238, 0.6)' : '1px solid transparent',
                      color: selectedElement === 'logo' ? '#25f4ee' : 'rgba(255,255,255,0.75)',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      borderRadius: '4px',
                      padding: '2px 6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="Chọn Logo để kéo di chuyển & scale trực tiếp"
                  >
                    <span>🏷️</span> Logo
                  </button>
                )}
                {selectedElement !== 'none' && (
                  <button
                    type="button"
                    onClick={() => setSelectedElement('none')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255,255,255,0.45)',
                      fontSize: '0.62rem',
                      padding: '2px 4px',
                      cursor: 'pointer'
                    }}
                    title="Bỏ chọn (hoặc phím Escape)"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
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
