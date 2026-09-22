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

function getNewsTagConfig(brandText) {
  const text = (brandText || 'TIN TỨC').trim();
  const lower = text.toLowerCase();

  let icon = '⚡';
  if (lower.includes('kiến thức') || lower.includes('khoa học') || lower.includes('học tập')) {
    icon = '💡';
  } else if (lower.includes('sự thật') || lower.includes('thú vị') || lower.includes('bất ngờ')) {
    icon = '✨';
  } else if (lower.includes('bí ẩn') || lower.includes('khám phá') || lower.includes('kỳ lạ') || lower.includes('tâm linh')) {
    icon = '🔮';
  } else if (lower.includes('chưa biết') || lower.includes('bạn có biết') || lower.includes('có thể bạn')) {
    icon = '🧠';
  } else if (lower.includes('tin tức') || lower.includes('tin nóng') || lower.includes('thời sự')) {
    icon = '🔴';
  }

  // Đồng bộ 1 màu Primary Red thống nhất với màu chủ đạo của banner, cách điệu sang trọng
  return {
    icon,
    text: text.toUpperCase(),
    gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(185, 28, 28, 0.98) 100%)',
    border: '1.5px solid rgba(255, 255, 255, 0.45)',
    shadow: '0 4px 16px rgba(185, 28, 28, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
  };
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

function renderCaptionContent(text, highlightColor, captionTextAlign = "center") {
  if (!text) return null;
  const raw = String(text).trim();
  if (raw.includes('\n')) {
    const lines = raw.split('\n').filter(Boolean);
    return lines.map((line, idx) => (
      <div key={idx} style={{ textAlign: captionTextAlign, width: '100%', wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
        {renderWithHighlights(line, highlightColor)}
      </div>
    ));
  }
  return (
    <div style={{ textAlign: captionTextAlign, width: "100%", wordBreak: "keep-all", overflowWrap: 'break-word' }}>
      {renderWithHighlights(raw, highlightColor)}
    </div>
  );
}

function hexToRgba(hex, alpha = 0.15) {
  if (!hex || typeof hex !== 'string') return `rgba(254, 44, 85, ${alpha})`;
  if (hex.startsWith('rgb')) return hex;
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(254, 44, 85, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function stripSceneTag(text) {
  return String(text || '')
    .replace(/\s*\((?:cảnh|scene)\s*[\d\s,.-]*\)/gi, '')
    .trim();
}

function stripTags(text) {
  return stripSceneTag(String(text || '').replace(/\[[^\]]*\]/g, ' ')).replace(/\s+/g, ' ').trim();
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
  selectedElement: controlledSelectedElement,
  onSelectedElementChange,
  onResult,
  resyncVoiceForSegments,
  checkAssets,
  bgMusicVersion,
  logoVersion,
  imageVersion,
  onInteractionStart,
  onInteractionEnd,
  historyToast,
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

  const textColor = rc.captionTextColor || rc.textColor || '#ffffff';
  const highlightColor = rc.highlightColor || '#FE2C55';
  const videoBgColor = rc.videoBgColor || '#000000';
  const rawBgColor = rc.captionBgColor || rc.bgColor || '#000000';
  const bgColor = (typeof rawBgColor === 'string' && rawBgColor.startsWith('#') && rawBgColor.length >= 7)
    ? rawBgColor
    : '#000000';
  const bgOpacity = Number(rc.captionBgOpacity !== undefined ? rc.captionBgOpacity : (rc.bgOpacity !== undefined ? rc.bgOpacity : 65)) / 100;
  const isBgTransparent = Boolean(rc.captionBgTransparent || rc.isBgTransparent || rc.captionBgColor === 'transparent');
  const captionStyle = rc.captionStyle || 'classic';
  const captionEnabled = rc.captionEnabled !== false && rc.showCaption !== false && captionStyle !== 'none';
  const captionTextAlign = rc.captionTextAlign || rc.textAlign || 'center';
  const captionAnimation = rc.captionAnimation || (captionStyle === 'news' ? 'none' : 'zoom');
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

  const showOpeningComment = rc.showOpeningComment !== false;
  const openingCommentAuthor = rc.openingCommentAuthor || 'Trả lời bình luận';
  const openingCommentText = rc.openingCommentText || '';
  const openingCommentTranslateY = Number(rc.openingCommentTranslateY !== undefined && rc.openingCommentTranslateY !== null ? rc.openingCommentTranslateY : 0);
  const openingCommentScale = Number(rc.openingCommentScale !== undefined && rc.openingCommentScale !== null ? rc.openingCommentScale : 1);

  const showOpeningNewsBanner = Boolean(rc.showOpeningNewsBanner);
  const rawHeadline = (rc.openingNewsHeadline || result?.title || segments[0]?.dialogueOrNarration || segments[0]?.subtitle || '').trim();
  const openingNewsHeadline = stripSceneTag(rawHeadline);
  const openingNewsBrand = (rc.openingNewsBrand || rc.channelName || 'TIN TỨC').trim();
  const openingNewsLikes = (rc.openingNewsLikes || '27.1K').trim();
  const openingNewsBannerTranslateY = Number(rc.openingNewsBannerTranslateY !== undefined && rc.openingNewsBannerTranslateY !== null ? rc.openingNewsBannerTranslateY : 0);
  const openingNewsBannerScale = Number(rc.openingNewsBannerScale !== undefined && rc.openingNewsBannerScale !== null ? rc.openingNewsBannerScale : 1);
  const openingNewsTitleColor = rc.openingNewsTitleColor || '#FFE24A';
  const openingNewsTitleSize = Number(rc.openingNewsTitleSize || 0);
  const openingNewsHeadlineWidth = Math.max(30, Math.min(100, Number(rc.openingNewsHeadlineWidth !== undefined && rc.openingNewsHeadlineWidth !== null ? rc.openingNewsHeadlineWidth : 82)));

  const globalKenBurnsMode = rc.kenBurnsMode;
  const globalKenBurns = rc.kenBurns !== false && rc.globalKenBurns !== false && globalKenBurnsMode !== 'none';
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

  const audioFilesSignature = JSON.stringify(assetCounts?.audioFiles || {});
  const segmentNumbersSignature = segments
    .map((seg, idx) => Number(seg.segmentNumber || idx + 1))
    .join(',');

  // Chỉ probe những file audio mà check-assets xác nhận đang tồn tại. Cảnh chưa tạo voice
  // tiếp tục dùng thời lượng ước tính, tránh tạo hàng loạt request 404 mỗi lần ảnh thay đổi.
  useEffect(() => {
    if (!folderPath || !segments.length) return;
    const audioFiles = assetCounts?.audioFiles || {};
    const probes = [];
    segments.forEach((seg, idx) => {
      const sceneNumber = Number(seg.segmentNumber || idx + 1);
      const audioFile = audioFiles[sceneNumber];
      if (!audioFile) return;
      const audioSrc = `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=${encodeURIComponent(`audio/${audioFile}`)}&category=${encodeURIComponent(category)}`;
      const probeAudio = new Audio();
      probes.push(probeAudio);
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

    return () => {
      for (const probeAudio of probes) {
        probeAudio.onloadedmetadata = null;
        probeAudio.removeAttribute('src');
        probeAudio.load();
      }
    };
  }, [folderPath, category, audioFilesSignature, segmentNumbersSignature]);

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
  const slideCurrentTimeRef = useRef(slideCurrentTime);
  slideCurrentTimeRef.current = slideCurrentTime;
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const voiceAudioRef = useRef(null);
  const sceneVideoRef = useRef(null);
  const bgMusicAudioRef = useRef(null);
  const hideControlsTimerRef = useRef(null);

  // Tính thời gian tích lũy toàn video (cộng dồn từ cảnh 1 đến thời điểm hiện tại)
  const totalElapsedTime = Math.min(
    totalDuration,
    (sceneOffsets[currentSlideIndex] || 0) + slideCurrentTime
  );
  const totalProgressPercent = Math.min(100, Math.max(0, (totalElapsedTime / totalDuration) * 100));
  const totalElapsedTimeRef = useRef(totalElapsedTime);
  totalElapsedTimeRef.current = totalElapsedTime;

  // Đồng bộ nhạc nền chuẩn xác theo mốc thời gian của video (rhythm / timeline sync)
  const syncBgMusicToTime = useCallback((targetTotalTime = totalElapsedTimeRef.current, force = false) => {
    const bgAudio = bgMusicAudioRef.current;
    if (!bgAudio) return;
    const dur = bgAudio.duration;
    let seekTime = 0;
    if (Number.isFinite(dur) && dur > 0) {
      seekTime = targetTotalTime % dur;
    } else {
      seekTime = Math.max(0, targetTotalTime);
    }
    if (force || Math.abs(bgAudio.currentTime - seekTime) > 0.35) {
      try {
        bgAudio.currentTime = seekTime;
      } catch (_) { }
    }
  }, []);

  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      if (el.clientWidth > 0) {
        setContainerWidth(el.clientWidth);
      }
    };
    updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateSize);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [effectiveIsPortrait, isFullscreen]);

  const remotionCanvasWidth = effectiveIsPortrait ? 1080 : 1920;
  const currentContainerWidth = containerWidth || containerRef.current?.clientWidth || (effectiveIsPortrait ? 360 : 640);
  const remotionScale = currentContainerWidth / remotionCanvasWidth;
  const visualLogoX = Math.round(logoTranslateX * remotionScale);
  const visualLogoY = Math.round(logoTranslateY * remotionScale);
  const visualCommentY = Math.round(openingCommentTranslateY * remotionScale);
  const visualNewsBannerY = Math.round(openingNewsBannerTranslateY * remotionScale);

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

  const isSceneVideo = currentSegment?.mediaType === 'video' ||
    currentSegment?.type === 'video' ||
    assetCounts?.mediaTypes?.[currentSceneNumber] === 'video' ||
    (Array.isArray(assetCounts?.existingVideoNumbers) && assetCounts.existingVideoNumbers.includes(currentSceneNumber)) ||
    Boolean(currentSegment?.mediaFile?.match(/\.(mp4|webm)$/i)) ||
    Boolean(currentSegment?.image?.match(/\.(mp4|webm)$/i)) ||
    Boolean(currentSegment?.video);
  const currentMediaFile = isSceneVideo ? `images/scene-${currentPaddedNum}.mp4` : `images/scene-${currentPaddedNum}.jpg`;

  const currentImageSrc = showImage
    ? `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=${currentMediaFile}&category=${encodeURIComponent(category)}&v=${currentSlideIndex}-${imageVersion || 0}`
    : null;

  // Đồng bộ video cảnh nền với trạng thái play/pause của mô phỏng
  useEffect(() => {
    const vid = sceneVideoRef.current;
    if (!vid || !isSceneVideo) return;
    if (isPlaying) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [isPlaying, isSceneVideo, currentSlideIndex]);

  // Đặt lại thời gian video cảnh nền về 0 khi đổi cảnh
  useEffect(() => {
    const vid = sceneVideoRef.current;
    if (vid && isSceneVideo) {
      try { vid.currentTime = 0; } catch (_) {}
    }
  }, [currentSlideIndex, isSceneVideo]);

  // Khi phiên bản ảnh thay đổi hoặc chuyển cảnh, xoá cờ lỗi cũ để ảnh mới vừa tạo được nạp lại ngay lập tức
  useEffect(() => {
    failedImagesRef.current.delete(currentSceneNumber);
    setImageError(false);
  }, [imageVersion, currentSceneNumber]);
  const currentVideoSrc = `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=bg/bg-${currentPaddedNum}.mp4&category=${encodeURIComponent(category)}`;
  const [audioVersion, setAudioVersion] = useState(0);
  const currentAudioFile = assetCounts?.audioFiles?.[currentSceneNumber] || null;
  const currentAudioSrc = currentAudioFile
    ? `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=${encodeURIComponent(`audio/${currentAudioFile}`)}&category=${encodeURIComponent(category)}&v=${audioVersion}`
    : null;
  const bgMusicFile = assetCounts?.bgMusicFile || null;
  const bgMusicVersionParam = bgMusicVersion || assetCounts?.updatedAt || 0;
  const bgMusicSrc = bgMusicFile
    ? `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=audio/${encodeURIComponent(bgMusicFile)}&category=${encodeURIComponent(category)}&v=${bgMusicVersionParam}`
    : null;

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
  const [internalSelectedElement, setInternalSelectedElement] = useState('none');
  const selectedElement = controlledSelectedElement !== undefined ? controlledSelectedElement : internalSelectedElement;
  const setSelectedElement = useCallback((val) => {
    const nextVal = typeof val === 'function' ? val(selectedElement) : val;
    setInternalSelectedElement(nextVal);
    onSelectedElementChange?.(nextVal);
  }, [selectedElement, onSelectedElementChange]);
  const [isLogoHovered, setIsLogoHovered] = useState(false); // 'none' | 'caption' | 'image'

  // Nhấn Escape để bỏ chọn
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedElement('none');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedElement]);

  // Ấn vào vùng khác (vùng trống trên canvas hoặc bên ngoài) để bỏ chọn item đang chọn
  useEffect(() => {
    if (selectedElement === 'none') return;

    const handlePointerDownOutside = (e) => {
      const target = e.target;
      if (!target) return;

      // Không bỏ chọn nếu bấm vào chính item đang chọn (gizmo, 4 góc neo, badge, các nút trên badge, banner tin tức)
      if (target.closest?.('[data-transform-gizmo]') || target.closest?.('[data-news-banner]')) {
        return;
      }

      // Không bỏ chọn nếu bấm vào thanh công cụ chọn thành phần (toolbar mini dưới video)
      if (target.closest?.('.element-selector-toolbar')) {
        return;
      }

      // Không bỏ chọn nếu bấm vào panel chỉnh sửa bên phải (VideoEditorPanel)
      if (target.closest?.('[data-video-editor-panel]') || target.closest?.('.video-editor-panel')) {
        return;
      }

      // Không bỏ chọn nếu bấm vào các nút/input điều khiển form (như kéo slider, chọn font, đổi tab ở VideoEditorPanel)
      if (target.closest?.('input') || target.closest?.('select') || target.closest?.('button') || target.closest?.('textarea') || target.closest?.('label')) {
        return;
      }

      // Bấm vào bất kỳ vùng khác nào (khoảng trống canvas, nền đen, xung quanh) -> Bỏ chọn vùng đang chọn
      setSelectedElement('none');
    };

    window.addEventListener('pointerdown', handlePointerDownOutside);
    return () => window.removeEventListener('pointerdown', handlePointerDownOutside);
  }, [selectedElement, setSelectedElement]);

  // Ref lưu giá trị gốc tại thời điểm bắt đầu kéo để tính toán chính xác tuyệt đối, không bị lệch hoặc làm tròn về 0
  const dragStartValuesRef = useRef({
    captionMarginY: 0,
    captionFontSize: 50,
    captionWidth: 92,
    imageScale: 1,
    imageTranslateY: 0,
    logoTranslateX: 0,
    logoTranslateY: 0,
    logoScale: 1,
    commentTranslateY: 0,
    commentScale: 1
  });

  const notifyInteractionStart = useCallback((extra = {}) => {
    onInteractionStart?.();
    dragStartValuesRef.current = {
      captionMarginY,
      captionFontSize: baseFontSize,
      captionWidth,
      imageScale,
      imageTranslateY,
      logoTranslateX,
      logoTranslateY,
      logoScale,
      commentTranslateY: openingCommentTranslateY,
      commentScale: openingCommentScale,
      newsBannerTranslateY: openingNewsBannerTranslateY,
      newsBannerScale: openingNewsBannerScale,
      newsHeadlineWidth: openingNewsHeadlineWidth,
      newsTitleSize: openingNewsTitleSize > 0 ? openingNewsTitleSize : (openingNewsHeadline.length > 70 ? 44 : 54),
      ...extra
    };
  }, [
    onInteractionStart, captionMarginY, baseFontSize, captionWidth, imageScale,
    imageTranslateY, logoTranslateX, logoTranslateY, logoScale, openingCommentTranslateY,
    openingCommentScale, openingNewsBannerTranslateY, openingNewsBannerScale,
    openingNewsHeadlineWidth, openingNewsTitleSize, openingNewsHeadline
  ]);

  const handleCaptionDragStart = useCallback(() => {
    notifyInteractionStart();
  }, [notifyInteractionStart]);

  // Xử lý kéo di chuyển phụ đề trực tiếp trên màn hình video (tính độ dịch chuyển từ startMarginY)
  const handleCaptionDrag = useCallback(({ deltaY }) => {
    if (!onUpdateRenderConfig) return;
    const scaleFactor = effectiveIsPortrait ? 0.28 : 0.22;
    const nextMarginY = Math.round(dragStartValuesRef.current.captionMarginY - (deltaY / scaleFactor));
    onUpdateRenderConfig({ captionMarginY: Math.max(-1600, Math.min(1600, nextMarginY)) });
  }, [effectiveIsPortrait, onUpdateRenderConfig]);

  const handleCaptionScaleStart = useCallback(() => {
    notifyInteractionStart();
  }, [notifyInteractionStart]);

  // Xử lý kéo 4 góc neo để thu phóng cỡ chữ phụ đề trực tiếp (theo tỉ lệ ratio từ startFontSize)
  const handleCaptionScale = useCallback(({ ratio, deltaDistance }) => {
    if (!onUpdateRenderConfig) return;
    const startSize = dragStartValuesRef.current.captionFontSize || 50;
    // Cho phép phóng to/thu nhỏ mượt mà theo ratio kết hợp delta
    const nextFontSize = Math.max(16, Math.min(84, Math.round(startSize * ratio)));
    onUpdateRenderConfig({ captionFontSize: nextFontSize });
  }, [onUpdateRenderConfig]);

  const handleCaptionResizeWidthStart = useCallback(() => {
    notifyInteractionStart();
  }, [notifyInteractionStart]);

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
    notifyInteractionStart();
  }, [notifyInteractionStart]);

  // Xử lý kéo dịch chuyển ảnh nền trực tiếp (tính độ dịch chuyển từ startTranslateY)
  const handleImageDrag = useCallback(({ deltaY }) => {
    if (!onUpdateRenderConfig) return;
    const containerH = containerRef.current?.clientHeight || 550;
    const percentDelta = (deltaY / containerH) * 100;
    const nextTranslateY = Math.round(dragStartValuesRef.current.imageTranslateY + percentDelta);
    onUpdateRenderConfig({ imageTranslateY: Math.max(-60, Math.min(60, nextTranslateY)) });
  }, [onUpdateRenderConfig]);

  const handleImageScaleStart = useCallback(() => {
    notifyInteractionStart();
  }, [notifyInteractionStart]);

  // Xử lý kéo 4 góc neo để thu phóng kích thước ảnh nền (theo tỉ lệ ratio từ startScale)
  const handleImageScale = useCallback(({ ratio }) => {
    if (!onUpdateRenderConfig) return;
    const startScale = dragStartValuesRef.current.imageScale || 1;
    const nextScale = Math.max(0.4, Math.min(3.0, Number((startScale * ratio).toFixed(2))));
    onUpdateRenderConfig({ imageScale: nextScale });
  }, [onUpdateRenderConfig]);

  const handleLogoDragStart = useCallback(() => {
    notifyInteractionStart();
  }, [notifyInteractionStart]);

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
      logoTranslateY: Math.max(-1600, Math.min(600, nextY))
    });
  }, [effectiveIsPortrait, onUpdateRenderConfig]);

  const handleLogoScaleStart = useCallback(() => {
    notifyInteractionStart();
  }, [notifyInteractionStart]);

  // Xử lý kéo 4 góc neo để thu phóng kích thước Logo trực tiếp
  const handleLogoScale = useCallback(({ ratio }) => {
    if (!onUpdateRenderConfig) return;
    const startScale = dragStartValuesRef.current.logoScale || 1;
    const nextScale = Math.max(0.3, Math.min(3.5, Number((startScale * ratio).toFixed(2))));
    onUpdateRenderConfig({ logoScale: nextScale });
  }, [onUpdateRenderConfig]);

  const handleCommentDragStart = useCallback(() => {
    notifyInteractionStart();
  }, [notifyInteractionStart]);

  // Xử lý kéo di chuyển Hộp bình luận mở đầu trên trục Y trực tiếp
  const handleCommentDrag = useCallback(({ deltaY }) => {
    if (!onUpdateRenderConfig) return;
    const canvasWidth = effectiveIsPortrait ? 1080 : 1920;
    const containerW = containerRef.current?.clientWidth || (effectiveIsPortrait ? 360 : 640);
    const rScale = containerW / canvasWidth;
    const deltaRemotionY = deltaY / rScale;
    const nextY = Math.round((dragStartValuesRef.current.commentTranslateY || 0) + deltaRemotionY);
    onUpdateRenderConfig({
      openingCommentTranslateY: Math.max(-600, Math.min(800, nextY))
    });
  }, [effectiveIsPortrait, onUpdateRenderConfig]);

  const handleCommentScaleStart = useCallback(() => {
    notifyInteractionStart();
  }, [notifyInteractionStart]);

  // Xử lý kéo 4 góc neo để thu phóng kích thước Hộp bình luận trực tiếp
  const handleCommentScale = useCallback(({ ratio }) => {
    if (!onUpdateRenderConfig) return;
    const startScale = dragStartValuesRef.current.commentScale || 1;
    const nextScale = Math.max(0.4, Math.min(2.5, Number((startScale * ratio).toFixed(2))));
    onUpdateRenderConfig({ openingCommentScale: nextScale });
  }, [onUpdateRenderConfig]);

  const handleHeadlineDragStart = useCallback(() => {
    notifyInteractionStart();
  }, [notifyInteractionStart]);

  const handleHeadlineDrag = useCallback(({ deltaY }) => {
    if (!onUpdateRenderConfig) return;
    const canvasWidth = effectiveIsPortrait ? 1080 : 1920;
    const containerW = containerRef.current?.clientWidth || (effectiveIsPortrait ? 360 : 640);
    const rScale = containerW / canvasWidth;
    const deltaRemotionY = deltaY / rScale;
    const startY = dragStartValuesRef.current.newsBannerTranslateY !== undefined
      ? dragStartValuesRef.current.newsBannerTranslateY
      : openingNewsBannerTranslateY;
    const nextY = Math.round(startY + deltaRemotionY);
    onUpdateRenderConfig({
      openingNewsBannerTranslateY: Math.max(-600, Math.min(600, nextY))
    });
  }, [effectiveIsPortrait, openingNewsBannerTranslateY, onUpdateRenderConfig]);

  const handleHeadlineScaleStart = useCallback(() => {
    notifyInteractionStart();
  }, [notifyInteractionStart]);

  const handleHeadlineScale = useCallback(({ ratio }) => {
    if (!onUpdateRenderConfig) return;
    const startSize = dragStartValuesRef.current.newsTitleSize !== undefined
      ? dragStartValuesRef.current.newsTitleSize
      : (openingNewsTitleSize > 0 ? openingNewsTitleSize : (openingNewsHeadline.length > 70 ? 44 : 54));
    const nextSize = Math.max(20, Math.min(84, Math.round(startSize * ratio)));
    onUpdateRenderConfig({ openingNewsTitleSize: nextSize });
  }, [openingNewsTitleSize, openingNewsHeadline, onUpdateRenderConfig]);

  const handleHeadlineResizeWidthStart = useCallback(() => {
    notifyInteractionStart();
  }, [notifyInteractionStart]);

  const handleHeadlineResizeWidth = useCallback(({ effectiveDeltaX }) => {
    if (!onUpdateRenderConfig) return;
    const containerW = containerRef.current?.clientWidth || (effectiveIsPortrait ? 360 : 640);
    const percentDelta = (effectiveDeltaX / containerW) * 100;
    const startW = dragStartValuesRef.current.newsHeadlineWidth !== undefined
      ? dragStartValuesRef.current.newsHeadlineWidth
      : openingNewsHeadlineWidth;
    const nextW = Math.max(35, Math.min(100, Math.round(startW + percentDelta)));
    onUpdateRenderConfig({ openingNewsHeadlineWidth: nextW });
  }, [effectiveIsPortrait, openingNewsHeadlineWidth, onUpdateRenderConfig]);

  const handleNewsBannerDragStart = handleHeadlineDragStart;
  const handleNewsBannerDrag = handleHeadlineDrag;
  const handleNewsBannerScaleStart = handleHeadlineScaleStart;
  const handleNewsBannerScale = useCallback(({ ratio }) => {
    if (!onUpdateRenderConfig) return;
    const startScale = dragStartValuesRef.current.newsBannerScale !== undefined
      ? dragStartValuesRef.current.newsBannerScale
      : openingNewsBannerScale;
    const nextScale = Number(Math.max(0.4, Math.min(2.5, startScale * ratio)).toFixed(2));
    onUpdateRenderConfig({ openingNewsBannerScale: nextScale });
  }, [openingNewsBannerScale, onUpdateRenderConfig]);

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
    slideCurrentTimeRef.current = 0;
    setSlideCurrentTime(0);
    setImageError(false);
    const sceneStart = sceneOffsets[currentSlideIndex] || 0;
    syncBgMusicToTime(sceneStart, !isPlaying);
  }, [currentSlideIndex, sceneOffsets, isPlaying, syncBgMusicToTime]);

  useEffect(() => {
    const voiceAudio = voiceAudioRef.current;
    if (!voiceAudio) return;

    if (!currentAudioSrc) {
      voiceAudio.pause();
      voiceAudio.removeAttribute('src');
      voiceAudio.load();
      return;
    }

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
    const onTime = () => {
      const cur = voiceAudio.currentTime || 0;
      slideCurrentTimeRef.current = cur;
      setSlideCurrentTime(cur);
    };
    const onEnd = () => {
      if (playOnlySceneIndexRef.current !== null) {
        playOnlySceneIndexRef.current = null;
        setIsPlaying(false);
        slideCurrentTimeRef.current = 0;
        setSlideCurrentTime(0);
        return;
      }
      if (currentSlideIndex < totalScenes - 1) {
        slideCurrentTimeRef.current = 0;
        setSlideCurrentTime(0);
        goToScene(currentSlideIndex + 1);
      } else {
        setIsPlaying(false);
        goToScene(0);
        slideCurrentTimeRef.current = 0;
        setSlideCurrentTime(0);
        if (voiceAudioRef.current) voiceAudioRef.current.currentTime = 0;
        if (bgMusicAudioRef.current) {
          bgMusicAudioRef.current.pause();
          try { bgMusicAudioRef.current.currentTime = 0; } catch (_) { }
        }
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
        slideCurrentTimeRef.current = curTime;
        setSlideCurrentTime(curTime);

        // Giữ nhạc nền khớp nhịp theo thời gian thực của video (tự sửa nếu bị trôi nhịp)
        const bg = bgMusicAudioRef.current;
        if (bg && !bg.paused && Number.isFinite(bg.duration) && bg.duration > 0) {
          const curTotal = (sceneOffsets[currentSlideIndex] || 0) + curTime;
          const expectedBgTime = curTotal % bg.duration;
          if (Math.abs(bg.currentTime - expectedBgTime) > 0.45) {
            try { bg.currentTime = expectedBgTime; } catch (_) { }
          }
        }

        // Chuyển cảnh chuẩn xác khi audio kết thúc
        if (va.duration && Number.isFinite(va.duration) && curTime >= va.duration - 0.05) {
          if (playOnlySceneIndexRef.current !== null) {
            playOnlySceneIndexRef.current = null;
            setIsPlaying(false);
            slideCurrentTimeRef.current = 0;
            setSlideCurrentTime(0);
            return;
          }
          if (currentSlideIndex < totalScenes - 1) {
            slideCurrentTimeRef.current = 0;
            setSlideCurrentTime(0);
            goToScene(currentSlideIndex + 1);
          } else {
            setIsPlaying(false);
            goToScene(0);
            slideCurrentTimeRef.current = 0;
            setSlideCurrentTime(0);
            if (voiceAudioRef.current) voiceAudioRef.current.currentTime = 0;
            if (sceneVideoRef.current) {
              sceneVideoRef.current.pause();
              try { sceneVideoRef.current.currentTime = 0; } catch (_) {}
            }
            if (bgMusicAudioRef.current) {
              bgMusicAudioRef.current.pause();
              try { bgMusicAudioRef.current.currentTime = 0; } catch (_) { }
            }
          }
          return;
        }
      } else {
        const now = performance.now();
        const delta = Math.min(0.1, (now - lastPerfTime) / 1000);
        lastPerfTime = now;

        const next = slideCurrentTimeRef.current + delta;
        const bg = bgMusicAudioRef.current;
        if (bg && !bg.paused && Number.isFinite(bg.duration) && bg.duration > 0) {
          const curTotal = (sceneOffsets[currentSlideIndex] || 0) + next;
          const expectedBgTime = curTotal % bg.duration;
          if (Math.abs(bg.currentTime - expectedBgTime) > 0.45) {
            try { bg.currentTime = expectedBgTime; } catch (_) { }
          }
        }

        if (next >= currentSceneDuration) {
          if (playOnlySceneIndexRef.current !== null) {
            playOnlySceneIndexRef.current = null;
            setIsPlaying(false);
            slideCurrentTimeRef.current = 0;
            setSlideCurrentTime(0);
            return;
          }
          if (currentSlideIndex < totalScenes - 1) {
            slideCurrentTimeRef.current = 0;
            setSlideCurrentTime(0);
            goToScene(currentSlideIndex + 1);
          } else {
            setIsPlaying(false);
            goToScene(0);
            slideCurrentTimeRef.current = 0;
            setSlideCurrentTime(0);
            if (voiceAudioRef.current) voiceAudioRef.current.currentTime = 0;
            if (sceneVideoRef.current) {
              sceneVideoRef.current.pause();
              try { sceneVideoRef.current.currentTime = 0; } catch (_) {}
            }
            if (bgMusicAudioRef.current) {
              bgMusicAudioRef.current.pause();
              try { bgMusicAudioRef.current.currentTime = 0; } catch (_) { }
            }
          }
          return;
        }

        slideCurrentTimeRef.current = next;
        setSlideCurrentTime(next);
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
      syncBgMusicToTime(totalElapsedTimeRef.current, true);
      if (voiceAudio) voiceAudio.play().catch(() => { });
      if (bgAudio && bgMusicEnabled) {
        bgAudio.volume = isMuted ? 0 : bgMusicVolume;
        bgAudio.play().catch(() => { });
      }
    } else {
      if (voiceAudio) voiceAudio.pause();
      if (bgAudio) bgAudio.pause();
    }
  }, [isPlaying, bgMusicEnabled, bgMusicVolume, isMuted, syncBgMusicToTime]);

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
    if (!bgMusicSrc) {
      bgAudio.pause();
      bgAudio.removeAttribute('src');
      bgAudio.load();
      return;
    }
    bgAudio.src = bgMusicSrc;
    bgAudio.load();
    if (isPlaying && bgMusicEnabled) {
      syncBgMusicToTime(totalElapsedTimeRef.current, true);
      bgAudio.volume = isMuted ? 0 : bgMusicVolume;
      bgAudio.play().catch(() => { });
    }
  }, [bgMusicSrc, isPlaying, bgMusicEnabled, isMuted, bgMusicVolume, syncBgMusicToTime]);

  const togglePlay = () => {
    playOnlySceneIndexRef.current = null;
    setIsPlaying((p) => !p);
  };
  const handlePrevSlide = () => {
    playOnlySceneIndexRef.current = null;
    const prevIdx = Math.max(0, currentSlideIndex - 1);
    setCurrentSlideIndex(prevIdx);
    setSlideCurrentTime(0);
    if (voiceAudioRef.current) voiceAudioRef.current.currentTime = 0;
    if (sceneVideoRef.current) {
      try { sceneVideoRef.current.currentTime = 0; } catch (_) {}
    }
    syncBgMusicToTime(sceneOffsets[prevIdx] || 0, true);
  };
  const handleNextSlide = () => {
    playOnlySceneIndexRef.current = null;
    const nextIdx = Math.min(totalScenes - 1, currentSlideIndex + 1);
    setCurrentSlideIndex(nextIdx);
    setSlideCurrentTime(0);
    if (voiceAudioRef.current) voiceAudioRef.current.currentTime = 0;
    if (sceneVideoRef.current) {
      try { sceneVideoRef.current.currentTime = 0; } catch (_) {}
    }
    syncBgMusicToTime(sceneOffsets[nextIdx] || 0, true);
  };

  const handlePlaySingleScene = (sceneIdx) => {
    if (isPlaying && currentSlideIndex === sceneIdx) {
      playOnlySceneIndexRef.current = null;
      setIsPlaying(false);
      if (voiceAudioRef.current) voiceAudioRef.current.pause();
      if (bgMusicAudioRef.current) bgMusicAudioRef.current.pause();
      return;
    }

    playOnlySceneIndexRef.current = sceneIdx;
    setSlideCurrentTime(0);
    const sceneStartTime = sceneOffsets[sceneIdx] || 0;
    syncBgMusicToTime(sceneStartTime, true);
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
      try { bgMusicAudioRef.current.currentTime = 0; } catch (_) { }
      bgMusicAudioRef.current.play().catch(() => { });
    }
  };

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
    if (sceneVideoRef.current) {
      try { sceneVideoRef.current.currentTime = inSceneTime; } catch (_) {}
    }
    syncBgMusicToTime(targetTotalTime, true);
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
  // Video vốn đã có chuyển động tự nhiên; không add hiệu ứng animation / Ken Burns cho cảnh là video
  const kenBurnsDir = isSceneVideo
    ? 'none'
    : (currentSegment.kenBurns || globalKenBurnsMode || (globalKenBurns ? (currentSlideIndex % 2 === 0 ? 'in' : 'out') : 'none'));
  let kbScale = 1;
  let kbTranslateX = 0;
  if (!isSceneVideo) {
    if (kenBurnsDir === 'in') kbScale = 1 + 0.12 * sceneProgress;
    else if (kenBurnsDir === 'out') kbScale = 1.12 - 0.12 * sceneProgress;
    else if (kenBurnsDir === 'pan-left') { kbScale = 1.1; kbTranslateX = 3 - 6 * sceneProgress; }
    else if (kenBurnsDir === 'pan-right') { kbScale = 1.1; kbTranslateX = -3 + 6 * sceneProgress; }
  }

  // Hiệu ứng animation cho tiêu đề / phụ đề:
  // Cảnh là video: giữ phụ đề đứng yên tuyệt đối, không zoom/rung/trượt
  let captionAnimScale = 1;
  let captionAnimOpacity = 1;
  let captionAnimTranslateY = 0;

  if (selectedElement !== 'caption' && !isSceneVideo) {
    const effectiveAnim = captionAnimation || (captionStyle === 'news' ? 'none' : 'zoom');
    if (effectiveAnim === 'zoom') {
      captionAnimScale = kenBurnsDir === 'out' ? 1.055 - 0.055 * sceneProgress : 1 + 0.055 * sceneProgress;
    } else if (effectiveAnim === 'fade') {
      captionAnimOpacity = Math.min(1, sceneProgress / 0.12);
    } else if (effectiveAnim === 'slide-up') {
      const enterP = Math.min(1, sceneProgress / 0.14);
      const eased = 1 - Math.pow(1 - enterP, 3);
      captionAnimOpacity = enterP;
      captionAnimTranslateY = Math.round((1 - eased) * 16);
    }
  }

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
            background: videoBgColor,
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
          <audio
            key={bgMusicSrc || 'no-bg-music'}
            ref={bgMusicAudioRef}
            src={bgMusicSrc || undefined}
            loop
            preload={bgMusicSrc ? 'auto' : 'none'}
            onLoadedMetadata={() => {
              syncBgMusicToTime(totalElapsedTimeRef.current, true);
            }}
          />

          {/* LỚP 1: ẢNH / VIDEO NỀN / BULLETS */}
          <div
            style={{ position: 'absolute', inset: 0, overflow: selectedElement === 'image' ? 'visible' : 'hidden', background: videoBgColor }}
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
                  background: rc.slideBgColor || videoBgColor,
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
                    <div style={{ fontFamily, fontSize: `${scaledFontSize}px`, fontWeight: 600, color: textColor, lineHeight: 1.35, letterSpacing: dynamicLetterSpacing }}>
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
                label={isSceneVideo ? "Video nền" : "Ảnh nền"}
                detail={`${Math.round(imageScale * 100)}% • Y: ${Math.round(imageTranslateY)}%`}
                boxInset="0px"
                counterScale={isSceneVideo ? 1 : kbScale * imageScale}
                badgePosition={imageTranslateY < -20 ? 'inside-top' : 'outside-top'}
                onDragStart={handleImageDragStart}
                onDrag={handleImageDrag}
                onDragEnd={onInteractionEnd}
                onScaleStart={handleImageScaleStart}
                onScale={handleImageScale}
                onScaleEnd={onInteractionEnd}
                onDeselect={() => setSelectedElement('none')}
                onReset={() => onUpdateRenderConfig?.({ imageScale: 1, imageTranslateY: 0 })}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  transform: isSceneVideo
                    ? (imageScale !== 1 || imageTranslateY !== 0 ? `scale(${imageScale}) translateY(${imageTranslateY}%)` : 'none')
                    : `scale(${kbScale * imageScale}) translateX(${kbTranslateX}%) translateY(${imageTranslateY}%)`,
                  alignItems: captionTextAlign === 'left' ? 'flex-start' : (captionTextAlign === 'right' ? 'flex-end' : 'center'),
                  transformOrigin: captionTextAlign === 'left' ? 'left center' : (captionTextAlign === 'right' ? 'right center' : 'center center'),
                  willChange: isSceneVideo ? 'auto' : 'transform',
                  transition: selectedElement === 'image' || isPlaying || isSceneVideo ? 'none' : 'transform 0.4s ease',
                  pointerEvents: isPlaying ? 'none' : 'auto'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  setSelectedElement('image');
                }}
              >
                {isSceneVideo ? (
                  <video
                    ref={sceneVideoRef}
                    key={`vid-${currentSlideIndex}-${imageVersion || 0}`}
                    src={currentImageSrc}
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: globalImageFit,
                      display: 'block',
                      transform: 'none',
                      willChange: 'auto'
                    }}
                    onLoadedData={() => {
                      failedImagesRef.current.delete(currentSceneNumber);
                      setImageError(false);
                    }}
                    onError={() => {
                      failedImagesRef.current.add(currentSceneNumber);
                      setImageError(true);
                    }}
                  />
                ) : (
                  <div
                    key={`img-${currentSlideIndex}-${imageVersion || 0}`}
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
                      key={`img-probe-${currentSlideIndex}-${imageVersion || 0}`}
                      src={currentImageSrc}
                      alt=""
                      style={{ display: 'none' }}
                      onLoad={() => {
                        failedImagesRef.current.delete(currentSceneNumber);
                        setImageError(false);
                      }}
                      onError={() => {
                        failedImagesRef.current.add(currentSceneNumber);
                        setImageError(true);
                      }}
                    />
                  </div>
                )}
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

            {/* Pexels Remotion uses one exact 55% black veil. Slideshow skills do not add a
                full-frame gradient, so drawing one only in the simulator made their MP4 brighter
                and less contrasty than the preview. */}
            {isPexelsTalk ? (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', pointerEvents: 'none' }} />
            ) : null}
          </div>



          {/* LỚP 3: PHỤ ĐỀ MÔ PHỎNG CHUẨN XÁC REMOTION */}
          {!hasBullets && cleanPrimary && captionEnabled && !(currentSlideIndex === 0 && showOpeningNewsBanner) && (
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
                alignItems: captionTextAlign === 'left' ? 'flex-start' : (captionTextAlign === 'right' ? 'flex-end' : 'center'),
                justifyContent: 'center',
                textAlign: captionTextAlign,
                zIndex: 25,
                pointerEvents: 'none',
                transition: selectedElement === 'caption' || isPlaying ? 'none' : 'all 0.15s ease-out'
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
                onDragEnd={onInteractionEnd}
                onScaleStart={handleCaptionScaleStart}
                onScale={handleCaptionScale}
                onScaleEnd={onInteractionEnd}
                onResizeWidthStart={handleCaptionResizeWidthStart}
                onResizeWidth={handleCaptionResizeWidth}
                onResizeWidthEnd={onInteractionEnd}
                onDeselect={() => setSelectedElement('none')}
                onReset={() => onUpdateRenderConfig?.({
                  captionMarginY: ['moral_talk_slideshow', 'buddhist_wisdom', 'japanese_history'].includes(category) ? -215 : 0,
                  captionFontSize: 50,
                  captionWidth: 92
                })}
                style={{
                  pointerEvents: isPlaying ? 'none' : 'auto',
                  width: 'fit-content',
                  maxWidth: `${captionWidth}%`,
                  boxSizing: 'border-box',
                  opacity: captionAnimOpacity,
                  transform: `translateY(${captionAnimTranslateY}px) scale(${captionAnimScale})`,
                  transformOrigin: 'center center',
                  transition: isPlaying ? 'none' : 'transform 0.15s ease',
                  willChange: isPlaying ? 'transform' : 'auto'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  setSelectedElement('caption');
                }}
              >
                {captionStyle === 'hook' ? (
                  currentSlideIndex === 0 ? (
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: captionTextAlign === 'left' ? 'flex-start' : (captionTextAlign === 'right' ? 'flex-end' : 'center'), gap: '8px', width: 'fit-content', maxWidth: '100%', boxSizing: 'border-box' }}>
                      <div style={{ background: highlightColor, color: '#ffffff', fontFamily, fontSize: `${Math.max(11, Math.round(scaledFontSize * 0.72))}px`, fontWeight: 900, padding: '3px 12px', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: `0 4px 16px ${highlightColor}66`, whiteSpace: 'nowrap' }}>
                        ★ {stripSceneTag(result?.title ? result.title.slice(0, 32) : 'BÀI HỌC CUỘC SỐNG')}
                      </div>
                      <div style={{ width: 'fit-content', maxWidth: '100%', boxSizing: 'border-box', fontFamily, fontSize: `${Math.round(scaledFontSize * 1.22)}px`, fontWeight: 900, lineHeight: 1.3, color: textColor, letterSpacing: '0.02em', textShadow: 'none', background: isBgTransparent ? 'transparent' : `rgba(${parseInt(bgColor.slice(1, 3) || '0', 16)}, ${parseInt(bgColor.slice(3, 5) || '0', 16)}, ${parseInt(bgColor.slice(5, 7) || '0', 16)}, ${bgOpacity})`, padding: isBgTransparent ? '2px' : '8px 16px', borderRadius: '12px', textAlign: captionTextAlign }}>
                        {renderCaptionContent(cleanPrimary, highlightColor, captionTextAlign)}
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: 'fit-content', maxWidth: '100%', boxSizing: 'border-box', padding: isBgTransparent ? '4px 10px' : '8px 18px', borderRadius: '12px', background: isBgTransparent ? 'transparent' : (bgColor && bgColor !== 'transparent' ? bgColor : 'rgba(8, 8, 11, 0.88)'), border: 'none', boxShadow: isBgTransparent ? 'none' : '0 4px 20px rgba(0,0,0,0.5)', fontFamily, fontSize: `${scaledFontSize}px`, lineHeight: 1.35, fontWeight: 800, color: textColor, letterSpacing: '0.02em', textShadow: 'none', textAlign: captionTextAlign, alignSelf: captionTextAlign === 'left' ? 'flex-start' : (captionTextAlign === 'right' ? 'flex-end' : 'center') }}>
                      {renderCaptionContent(cleanPrimary, highlightColor, captionTextAlign)}
                    </div>
                  )
                ) : captionStyle === 'tiktok' ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: captionTextAlign === 'left' ? 'flex-start' : (captionTextAlign === 'right' ? 'flex-end' : 'center'), gap: '6px', width: 'fit-content', maxWidth: '100%', boxSizing: 'border-box', padding: '6px 12px', letterSpacing: '0.02em', background: isBgTransparent ? 'transparent' : `rgba(${parseInt(bgColor.slice(1, 3) || '0', 16)}, ${parseInt(bgColor.slice(3, 5) || '0', 16)}, ${parseInt(bgColor.slice(5, 7) || '0', 16)}, ${bgOpacity * 0.8})`, borderRadius: '10px' }}>
                    {words.map((word, i) => {
                      const isActive = i === activeWordIdx && isPlaying;
                      return (
                        <span key={i} style={{ fontFamily, fontSize: `${scaledFontSize}px`, fontWeight: 800, color: isActive ? '#ffffff' : textColor, background: isActive ? highlightColor : 'transparent', borderRadius: isActive ? '6px' : '0', padding: isActive ? '1px 6px' : '1px 2px', transform: isActive ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.12s ease', letterSpacing: '0.02em', textShadow: 'none', whiteSpace: 'nowrap' }}>
                          {word}
                        </span>
                      );
                    })}
                  </div>
                ) : captionStyle === 'karaoke' ? (
                  <div style={{ width: 'fit-content', maxWidth: '100%', boxSizing: 'border-box', padding: isBgTransparent ? '4px' : '8px 16px', borderRadius: '10px', letterSpacing: '0.02em', background: isBgTransparent ? 'transparent' : `rgba(${parseInt(bgColor.slice(1, 3) || '0', 16)}, ${parseInt(bgColor.slice(3, 5) || '0', 16)}, ${parseInt(bgColor.slice(5, 7) || '0', 16)}, ${bgOpacity})`, fontFamily, fontSize: `${scaledFontSize}px`, lineHeight: 1.35, fontWeight: 800, display: 'flex', flexWrap: 'wrap', justifyContent: captionTextAlign === 'left' ? 'flex-start' : (captionTextAlign === 'right' ? 'flex-end' : 'center'), textAlign: captionTextAlign }}>
                    {words.map((word, i) => {
                      const hasSpoken = i <= activeWordIdx;
                      return (
                        <span key={i} style={{ color: hasSpoken ? highlightColor : textColor, opacity: hasSpoken ? 1 : 0.68, textShadow: hasSpoken ? `0 0 12px ${highlightColor}88` : 'none', marginRight: '6px', letterSpacing: '0.02em', transition: 'color 0.15s ease, opacity 0.15s ease', whiteSpace: 'nowrap' }}>
                          {word}
                        </span>
                      );
                    })}
                  </div>
                ) : captionStyle === 'pill' ? (
                  <div style={{ width: 'fit-content', maxWidth: '100%', boxSizing: 'border-box', padding: '8px 24px', borderRadius: '9999px', letterSpacing: '0.02em', background: isBgTransparent ? 'transparent' : `rgba(${parseInt(bgColor.slice(1, 3) || '0', 16)}, ${parseInt(bgColor.slice(3, 5) || '0', 16)}, ${parseInt(bgColor.slice(5, 7) || '0', 16)}, ${bgOpacity})`, border: isBgTransparent ? 'none' : '1px solid rgba(255,255,255,0.14)', backdropFilter: isBgTransparent ? 'none' : 'blur(6px)', fontFamily, fontSize: `${scaledFontSize}px`, lineHeight: 1.35, fontWeight: 800, color: textColor, textShadow: 'none', textAlign: captionTextAlign, alignSelf: captionTextAlign === 'left' ? 'flex-start' : (captionTextAlign === 'right' ? 'flex-end' : 'center') }}>
                    {renderCaptionContent(cleanPrimary, highlightColor, captionTextAlign)}
                  </div>
                ) : captionStyle === 'news' ? (
                  <div style={{
                    width: 'fit-content',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 22px',
                    letterSpacing: '0.02em',
                    background: `linear-gradient(135deg, ${hexToRgba(highlightColor, 0.25)} 0%, rgba(10, 12, 22, 0.72) 100%)`,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: 'none',
                    borderLeft: `4.5px solid ${highlightColor || '#FE2C55'}`,
                    borderRadius: captionTextAlign === 'left' ? '2px 8px 8px 2px' : (captionTextAlign === 'right' ? '8px 2px 2px 8px' : '6px'),
                    alignSelf: captionTextAlign === 'left' ? 'flex-start' : (captionTextAlign === 'right' ? 'flex-end' : 'center'),
                    textAlign: captionTextAlign,
                    fontFamily,
                    fontSize: `${scaledFontSize}px`,
                    lineHeight: 1.35,
                    fontWeight: 700,
                    color: textColor,
                    boxShadow: `0 8px 28px rgba(0, 0, 0, 0.6), 0 0 16px ${hexToRgba(highlightColor, 0.15)}`,
                    textShadow: 'none'
                  }}>
                    {renderCaptionContent(cleanPrimary, highlightColor, captionTextAlign)}
                  </div>
                ) : captionStyle === 'box' ? (
                  <div style={{ width: 'fit-content', maxWidth: '100%', boxSizing: 'border-box', padding: '8px 16px', borderRadius: '8px', letterSpacing: '0.02em', background: isBgTransparent ? 'transparent' : `rgba(${parseInt(bgColor.slice(1, 3) || '0', 16)}, ${parseInt(bgColor.slice(3, 5) || '0', 16)}, ${parseInt(bgColor.slice(5, 7) || '0', 16)}, 0.85)`, border: 'none', fontFamily, fontSize: `${scaledFontSize}px`, lineHeight: 1.35, fontWeight: 800, color: textColor, textShadow: 'none', textAlign: captionTextAlign, alignSelf: captionTextAlign === 'left' ? 'flex-start' : (captionTextAlign === 'right' ? 'flex-end' : 'center') }}>
                    {renderCaptionContent(cleanPrimary, highlightColor, captionTextAlign)}
                  </div>
                ) : (
                  <div style={{ width: 'fit-content', maxWidth: '100%', boxSizing: 'border-box', padding: isBgTransparent || captionStyle === 'minimal' ? '4px 8px' : '8px 14px', borderRadius: isBgTransparent || captionStyle === 'minimal' ? '0' : '10px', background: isBgTransparent || captionStyle === 'minimal' ? 'transparent' : `rgba(${parseInt(bgColor.slice(1, 3) || '0', 16)}, ${parseInt(bgColor.slice(3, 5) || '0', 16)}, ${parseInt(bgColor.slice(5, 7) || '0', 16)}, ${bgOpacity})`, backdropFilter: isBgTransparent || captionStyle === 'minimal' ? 'none' : 'blur(4px)', boxShadow: isBgTransparent || captionStyle === 'minimal' ? 'none' : '0 4px 16px rgba(0,0,0,0.4)', fontFamily, fontSize: `${scaledFontSize}px`, lineHeight: 1.35, fontWeight: 800, color: textColor, letterSpacing: '0.02em', textShadow: 'none', textAlign: captionTextAlign, alignSelf: captionTextAlign === 'left' ? 'flex-start' : (captionTextAlign === 'right' ? 'flex-end' : 'center') }}>
                    {renderCaptionContent(cleanPrimary, highlightColor, captionTextAlign)}
                  </div>
                )}
              </TransformGizmoOverlay>
            </div>
          )}

          {/* LỚP 3.5: HỘP BÌNH LUẬN MỞ ĐẦU (TIKTOK COMMENT STICKER) TRÊN CẢNH 1 */}
          {currentSlideIndex === 0 && showOpeningComment && (
            <div
              style={{
                position: 'absolute',
                top: effectiveIsPortrait ? '11%' : '7%',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                pointerEvents: 'none',
                zIndex: selectedElement === 'comment' ? 46 : 30,
                transition: selectedElement === 'comment' ? 'none' : 'all 0.2s ease'
              }}
            >
              <TransformGizmoOverlay
                active={selectedElement === 'comment' && !isPlaying}
                label="Hộp bình luận (Cảnh 1)"
                detail={`${Math.round(openingCommentScale * 100)}% • Y: ${Math.round(openingCommentTranslateY)}px`}
                boxInset="-2px"
                counterScale={openingCommentScale}
                badgePosition={openingCommentTranslateY < -200 ? 'inside-top' : 'outside-top'}
                onDragStart={handleCommentDragStart}
                onDrag={handleCommentDrag}
                onDragEnd={onInteractionEnd}
                onScaleStart={handleCommentScaleStart}
                onScale={handleCommentScale}
                onScaleEnd={onInteractionEnd}
                onDeselect={() => setSelectedElement('none')}
                onReset={() => onUpdateRenderConfig?.({ openingCommentTranslateY: 0, openingCommentScale: 1 })}
                style={{
                  transform: `translateY(${visualCommentY}px) scale(${openingCommentScale})`,
                  transformOrigin: 'center top',
                  pointerEvents: isPlaying ? 'none' : 'auto',
                  cursor: isPlaying ? 'default' : (selectedElement === 'comment' ? 'move' : 'pointer'),
                  maxWidth: '88%',
                  width: 'fit-content',
                  transition: selectedElement === 'comment' || isPlaying ? 'none' : 'transform 0.2s ease'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  setSelectedElement('comment');
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    background: '#FFFFFF',
                    borderRadius: `${Math.round(28 * remotionScale)}px`,
                    padding: `${Math.round(18 * remotionScale)}px ${Math.round(26 * remotionScale)}px`,
                    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35), 0 3px 12px rgba(0, 0, 0, 0.16)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: `${Math.round(14 * remotionScale)}px`,
                    userSelect: 'none'
                  }}
                >
                  {/* Mấu nhọn speech bubble */}
                  <div
                    style={{
                      position: 'absolute',
                      top: `${Math.round(-9 * remotionScale)}px`,
                      left: `${Math.round(30 * remotionScale)}px`,
                      width: `${Math.round(18 * remotionScale)}px`,
                      height: `${Math.round(18 * remotionScale)}px`,
                      background: '#FFFFFF',
                      transform: 'rotate(45deg)',
                      borderRadius: '2px',
                      boxShadow: '-2px -2px 4px rgba(0,0,0,0.04)'
                    }}
                  />

                  {/* Avatar icon */}
                  <div
                    style={{
                      width: `${Math.max(28, Math.round(52 * remotionScale))}px`,
                      height: `${Math.max(28, Math.round(52 * remotionScale))}px`,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: `${Math.max(14, Math.round(24 * remotionScale))}px`,
                      fontWeight: 800,
                      flexShrink: 0,
                      boxShadow: '0 3px 10px rgba(59, 130, 246, 0.35)',
                      border: '1.5px solid #ffffff'
                    }}
                  >
                    💬
                  </div>

                  {/* Text */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: `${Math.max(10, Math.round(20 * remotionScale))}px`,
                          fontWeight: 700,
                          color: '#6b7280',
                          letterSpacing: '0.01em',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {openingCommentAuthor || 'Trả lời bình luận'}
                      </span>
                      <span style={{ fontSize: `${Math.max(9, Math.round(17 * remotionScale))}px`, color: '#9ca3af' }}>• Khán giả</span>
                    </div>
                    <div
                      style={{
                        fontFamily: "'Be Vietnam Pro', 'Noto Sans', Arial, sans-serif",
                        fontSize: `${Math.max(11, Math.round(26 * remotionScale))}px`,
                        fontWeight: 700,
                        lineHeight: 1.35,
                        color: '#111827',
                        letterSpacing: '0.01em',
                        wordBreak: 'break-word'
                      }}
                    >
                      {stripSceneTag(openingCommentText || segments[0]?.dialogueOrNarration || segments[0]?.subtitle || result?.title || '')}
                    </div>
                  </div>
                </div>
              </TransformGizmoOverlay>
            </div>
          )}

          {/* LỚP 3.6: BANNER TIN TỨC 50% MÀN HÌNH DƯỚI (CẢNH 1) */}
          {currentSlideIndex === 0 && showOpeningNewsBanner && (
            <div
              data-news-banner="container"
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: effectiveIsPortrait ? '50%' : '58%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                pointerEvents: 'none',
                zIndex: (selectedElement === 'news_headline' || selectedElement === 'news_banner' || selectedElement === 'news_tag') ? 47 : 32,
                transform: `translateY(${visualNewsBannerY}px) scale(${openingNewsBannerScale})`,
                transformOrigin: 'center bottom',
                transition: (selectedElement === 'news_headline' || selectedElement === 'news_banner' || selectedElement === 'news_tag') || isPlaying ? 'none' : 'transform 0.2s ease'
              }}
            >
              <TransformGizmoOverlay
                active={selectedElement === 'news_banner'}
                label="Nền banner mở đầu"
                detail={`Vị trí: ${openingNewsBannerTranslateY}px • Tỉ lệ: ${Math.round(openingNewsBannerScale * 100)}%`}
                counterScale={openingNewsBannerScale}
                badgePosition="outside-top"
                enableHorizontalResize={false}
                onDragStart={handleNewsBannerDragStart}
                onDrag={handleNewsBannerDrag}
                onDragEnd={onInteractionEnd}
                onScaleStart={handleNewsBannerScaleStart}
                onScale={handleNewsBannerScale}
                onScaleEnd={onInteractionEnd}
                onDeselect={() => setSelectedElement('none')}
                onReset={() => onUpdateRenderConfig?.({
                  openingNewsBannerTranslateY: 0,
                  openingNewsBannerScale: 1
                })}
                style={{
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'auto',
                  cursor: selectedElement === 'news_banner' ? 'move' : 'pointer',
                  position: 'relative'
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  setSelectedElement('news_banner');
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  setSelectedElement('news_banner');
                }}
              >
                <div
                  data-news-banner="body"
                  data-transform-gizmo="news_banner"
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(180deg, rgba(185, 28, 28, 0) 0%, rgba(200, 30, 30, 0.45) 16%, rgba(220, 38, 38, 0.88) 34%, rgba(185, 28, 28, 0.96) 55%, rgba(127, 29, 29, 0.98) 80%, rgba(69, 10, 10, 1) 100%)',
                    padding: `${Math.max(12, Math.round(38 * remotionScale))}px ${Math.round(18 * remotionScale)}px ${Math.round(18 * remotionScale)}px`,
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    gap: `${Math.max(15, Math.round(50 * remotionScale))}px`,
                    userSelect: 'none',
                    overflow: (selectedElement === 'news_headline' || selectedElement === 'news_banner' || selectedElement === 'news_tag') ? 'visible' : 'hidden',
                    pointerEvents: 'auto',
                    cursor: selectedElement === 'news_banner' ? 'move' : 'pointer'
                  }}
                >
                  {/* Vầng sáng radial vàng & đỏ nhẹ sau tiêu đề */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-10%',
                      top: '25%',
                      width: `${Math.round(280 * remotionScale)}px`,
                      height: `${Math.round(280 * remotionScale)}px`,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(254, 240, 138, 0.12) 0%, rgba(220, 38, 38, 0) 70%)',
                      pointerEvents: 'none'
                    }}
                  />

                  {/* Hoạ tiết sóng radar mờ góc dưới phải */}
                  <div
                    style={{
                      position: 'absolute',
                      right: `-${Math.round(10 * remotionScale)}px`,
                      bottom: `${Math.round(10 * remotionScale)}px`,
                      width: `${Math.round(140 * remotionScale)}px`,
                      height: `${Math.round(140 * remotionScale)}px`,
                      borderRadius: '50%',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      pointerEvents: 'none'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: `${Math.round(10 * remotionScale)}px`,
                      bottom: `${Math.round(20 * remotionScale)}px`,
                      width: `${Math.round(90 * remotionScale)}px`,
                      height: `${Math.round(90 * remotionScale)}px`,
                      borderRadius: '50%',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      pointerEvents: 'none'
                    }}
                  />

                  {/* HÀNG 1: THƯƠNG HIỆU / CHUYÊN MỤC TAG */}
                  {(() => {
                    const tagCfg = getNewsTagConfig(openingNewsBrand);
                    return (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          position: 'relative',
                          zIndex: 15
                        }}
                      >
                        <TransformGizmoOverlay
                          active={selectedElement === 'news_tag'}
                          label="Tag thể loại"
                          detail={tagCfg.text}
                          boxInset="-4px"
                          counterScale={openingNewsBannerScale}
                          badgePosition="outside-top"
                          enableHorizontalResize={false}
                          enableScale={false}
                          enableDrag={false}
                          onDeselect={() => setSelectedElement('none')}
                          style={{
                            display: 'inline-flex',
                            pointerEvents: 'auto',
                            cursor: 'pointer'
                          }}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setIsPlaying(false);
                            setSelectedElement('news_tag');
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsPlaying(false);
                            setSelectedElement('news_tag');
                          }}
                        >
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: `${Math.round(10 * remotionScale)}px`,
                              background: tagCfg.gradient,
                              border: '1.5px solid rgba(255, 255, 255, 0.5)',
                              padding: `${Math.round(5 * remotionScale)}px ${Math.round(16 * remotionScale)}px ${Math.round(5 * remotionScale)}px ${Math.round(7 * remotionScale)}px`,
                              borderRadius: `${Math.round(24 * remotionScale)}px`,
                              boxShadow: '0 6px 20px rgba(185, 28, 28, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.45)'
                            }}
                          >
                            {/* Vòng tròn cách điệu ôm icon */}
                            <div
                              style={{
                                width: `${Math.max(22, Math.round(30 * remotionScale))}px`,
                                height: `${Math.max(22, Math.round(30 * remotionScale))}px`,
                                borderRadius: '50%',
                                background: 'rgba(0, 0, 0, 0.32)',
                                border: '1.2px solid rgba(255, 255, 255, 0.45)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: `${Math.max(12, Math.round(16 * remotionScale))}px`
                              }}
                            >
                              {tagCfg.icon}
                            </div>
                            <span
                              style={{
                                color: '#FFFFFF',
                                fontFamily: "'Montserrat', 'Be Vietnam Pro', sans-serif",
                                fontSize: `${Math.max(12, Math.round(18 * remotionScale))}px`,
                                fontWeight: 900,
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase',
                                textShadow: '0 2px 6px rgba(0,0,0,0.6)'
                              }}
                            >
                              {tagCfg.text}
                            </span>
                          </div>
                        </TransformGizmoOverlay>
                      </div>
                    );
                  })()}

                  {/* HÀNG 2: SHOW TIÊU ĐỀ KHỦNG VỚI GIZMO ĐIỀU CHỈNH GIỚI HẠN HIỂN THỊ */}
                  <TransformGizmoOverlay
                    active={selectedElement === 'news_headline'}
                    label="Tiêu đề banner"
                    detail={`Rộng: ${openingNewsHeadlineWidth}% • ${openingNewsTitleSize > 0 ? `${openingNewsTitleSize}px` : 'Auto'}`}
                    boxInset="-6px"
                    counterScale={openingNewsBannerScale}
                    badgePosition="outside-bottom"
                    enableHorizontalResize={true}
                    onDragStart={handleHeadlineDragStart}
                    onDrag={handleHeadlineDrag}
                    onDragEnd={onInteractionEnd}
                    onScaleStart={handleHeadlineScaleStart}
                    onScale={handleHeadlineScale}
                    onScaleEnd={onInteractionEnd}
                    onResizeWidthStart={handleHeadlineResizeWidthStart}
                    onResizeWidth={handleHeadlineResizeWidth}
                    onResizeWidthEnd={onInteractionEnd}
                    onDeselect={() => setSelectedElement('none')}
                    onReset={() => onUpdateRenderConfig?.({
                      openingNewsHeadlineWidth: 82,
                      openingNewsTitleSize: 0,
                      openingNewsBannerTranslateY: 0
                    })}
                    style={{
                      width: `${openingNewsHeadlineWidth}%`,
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                      pointerEvents: 'auto',
                      cursor: selectedElement === 'news_headline' ? 'move' : 'pointer',
                      position: 'relative',
                      zIndex: 15,
                      alignItems: 'flex-start'
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setIsPlaying(false);
                      setSelectedElement('news_headline');
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPlaying(false);
                      setSelectedElement('news_headline');
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'stretch',
                        gap: `${Math.max(12, Math.round(28 * remotionScale))}px`,
                        width: '100%',
                        boxSizing: 'border-box',
                        pointerEvents: 'none',
                        userSelect: 'none'
                      }}
                    >
                      {/* Vertical Gold Neon Accent */}
                      <div
                        style={{
                          width: `${Math.max(4, Math.round(6 * remotionScale))}px`,
                          borderRadius: '3px',
                          background: 'linear-gradient(180deg, #FDE047 0%, #F59E0B 70%, #EA580C 100%)',
                          boxShadow: '0 0 12px rgba(250, 204, 21, 0.85)',
                          flexShrink: 0
                        }}
                      />

                      {/* Big Headline */}
                      <div
                        style={{
                          fontFamily: "'Montserrat', 'Be Vietnam Pro', Arial, sans-serif",
                          fontSize: openingNewsTitleSize > 0
                            ? `${Math.max(12, Math.round(openingNewsTitleSize * remotionScale))}px`
                            : `${Math.max(14, Math.round((openingNewsHeadline.length > 70 ? 44 : 54) * remotionScale))}px`,
                          fontWeight: 900,
                          lineHeight: 1.25,
                          color: openingNewsTitleColor,
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                          textShadow: 'none',
                          wordBreak: 'break-word',
                          flex: 1,
                          minWidth: 0
                        }}
                      >
                        {openingNewsHeadline}
                      </div>
                    </div>
                  </TransformGizmoOverlay>
                </div>
              </TransformGizmoOverlay>
            </div>
          )}

          {/* LỚP 4: LOGO KÊNH THƯƠNG HIỆU */}
          {showChannelLogo && (
            <div
              style={{
                position: 'absolute',
                bottom: `${Math.round(130 * remotionScale)}px`,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                pointerEvents: 'none',
                opacity: selectedElement === 'logo' ? 1 : 0.82,
                zIndex: selectedElement === 'logo' ? 45 : 35,
                transition: selectedElement === 'logo' ? 'none' : 'all 0.2s ease'
              }}
            >
              <TransformGizmoOverlay
                active={selectedElement === 'logo' && !isPlaying}
                label="Logo thương hiệu"
                detail={`${Math.round(logoScale * 100)}% • X: ${Math.round(logoTranslateX)}px • Y: ${Math.round(logoTranslateY)}px`}
                boxInset="-1px"
                counterScale={logoScale}
                badgePosition={logoTranslateY < -1300 ? 'inside-top' : 'outside-top'}
                onDragStart={handleLogoDragStart}
                onDrag={handleLogoDrag}
                onDragEnd={onInteractionEnd}
                onScaleStart={handleLogoScaleStart}
                onScale={handleLogoScale}
                onScaleEnd={onInteractionEnd}
                onDeselect={() => setSelectedElement('none')}
                onReset={() => onUpdateRenderConfig?.({ logoTranslateX: 0, logoTranslateY: 0, logoScale: 1 })}
                onMouseEnter={() => setIsLogoHovered(true)}
                onMouseLeave={() => setIsLogoHovered(false)}
                style={{
                  transform: `translate(${visualLogoX}px, ${visualLogoY}px) scale(${logoScale})`,
                  transformOrigin: 'center center',
                  pointerEvents: isPlaying ? 'none' : 'auto',
                  cursor: isPlaying ? 'default' : (selectedElement === 'logo' ? 'move' : 'pointer'),
                  transition: selectedElement === 'logo' || isPlaying ? 'none' : 'transform 0.2s ease',
                  padding: 0,
                  margin: 0,
                  outline: (!isPlaying && selectedElement !== 'logo' && isLogoHovered) ? '1.5px dashed rgba(37, 244, 238, 0.75)' : 'none',
                  outlineOffset: '2px',
                  borderRadius: '2px'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  setSelectedElement('logo');
                }}
              >
                <img
                  src={`/images/watermark/nexora-video-logo.png?v=${logoVersion || 1}`}
                  alt="Logo thương hiệu"
                  style={{
                    width: `${Math.max(24, Math.round(220 * remotionScale))}px`,
                    height: 'auto',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))',
                    display: 'block',
                    margin: 0,
                    padding: 0,
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
              channelName={rc.channelName || 'Nexora Video'}
            />
          )}

          {/* TOAST THÔNG BÁO HOÀN TÁC / LÀM LẠI (PHOTOSHOP / CAPCUT STYLE) */}
          {historyToast && (
            <div
              style={{
                position: 'absolute',
                top: '14px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 999,
                display: 'inline-flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: '9999px',
                background: 'rgba(11, 15, 25, 0.92)',
                border: '1px solid rgba(37, 244, 238, 0.4)',
                color: '#fff',
                fontSize: '0.68rem',
                fontWeight: 600,
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6), 0 0 10px rgba(37, 244, 238, 0.25)',
                backdropFilter: 'blur(8px)',
                pointerEvents: 'none',
                animation: 'fadeIn 0.15s ease-out'
              }}
            >
              <span style={{ color: '#25f4ee', fontSize: '0.75rem', lineHeight: 1 }}>{historyToast.icon}</span>
              <span style={{ lineHeight: 1, whiteSpace: 'nowrap' }}>{historyToast.message}</span>
              <span style={{ fontSize: '0.58rem', color: 'rgba(255, 255, 255, 0.65)', background: 'rgba(255, 255, 255, 0.1)', padding: '1px 5px', borderRadius: '4px', lineHeight: 1, whiteSpace: 'nowrap' }}>
                {historyToast.icon === '↩' ? 'Ctrl+Z' : 'Ctrl+Y'}
              </span>
            </div>
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
          zIndex: 60,
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
                    const targetTotalTime = (sceneOffsets[idx] || 0) + targetInSceneTime;
                    goToScene(idx);
                    setSlideCurrentTime(targetInSceneTime);
                    if (voiceAudioRef.current) voiceAudioRef.current.currentTime = targetInSceneTime;
                    if (sceneVideoRef.current) {
                      try { sceneVideoRef.current.currentTime = targetInSceneTime; } catch (_) {}
                    }
                    syncBgMusicToTime(targetTotalTime, true);
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
