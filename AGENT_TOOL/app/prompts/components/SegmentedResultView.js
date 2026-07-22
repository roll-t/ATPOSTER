'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { EDGE_TTS_VOICES, DEFAULT_EDGE_MALE_VOICE, DEFAULT_EDGE_FEMALE_VOICE } from '@/lib/tts/edgeVoices.js';
import { GEMINI_TTS_VOICES, DEFAULT_GEMINI_MALE_VOICE, DEFAULT_GEMINI_FEMALE_VOICE } from '@/lib/tts/geminiVoices.js';

// Vòng tròn hiển thị % ký tự ElevenLabs ĐÃ DÙNG (phần tô màu đầy dần lên theo mức đã dùng,
// phần xám còn lại là số ký tự chưa dùng tới). Màu đổi xanh -> vàng -> đỏ khi sắp hết quota.
function QuotaRing({ percent, size = 15 }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color = clamped < 50 ? '#2ed573' : clamped < 80 ? '#f59e0b' : '#ff4757';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

// Thanh tiến độ dùng chung cho cả 3 bước của pipeline, có hiệu ứng vệt sáng lướt khi đang chạy
// (percent: 0-100, label: chữ hiển thị bên phải thanh, vd "3/12" hoặc "42%")
function StepProgressBar({ percent, label, color, showShimmer }) {
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

// Định nghĩa thông số mặc định chuẩn của từng Kiểu Phụ Đề
const CAPTION_STYLE_DEFAULTS = {
  box: {
    font: 'be-vietnam-pro',
    fontSize: '40',
    textColor: '#FFFFFF',
    bgColor: '#0A0A0E',
    bgTransparent: false
  },
  tiktok: {
    font: 'montserrat',
    fontSize: '48',
    textColor: '#FFFFFF',
    bgColor: '#000000',
    bgTransparent: true
  },
  karaoke: {
    font: 'be-vietnam-pro',
    fontSize: '44',
    textColor: '#FFFFFF',
    bgColor: '#0A0A0E',
    bgTransparent: false
  },
  page: {
    font: 'nunito',
    fontSize: '36',
    textColor: '#2A2118',
    bgColor: '#FBF3E3',
    bgTransparent: false
  },
  // Skill riêng reading-page-video (category 'reading_practice') — không có khái niệm
  // "Kiểu phụ đề" box/tiktok/karaoke, chỉ có 1 kiểu trang giấy karaoke duy nhất.
  readingPage: {
    font: 'montserrat',
    fontSize: '44',
    textColor: '#241C10',
    bgColor: '#F3EAD9',
    bgTransparent: false
  }
};

// Mẫu Video Preset Mặc Định Hệ Thống cho kịch bản Đọc Giấy Karaoke
const SYSTEM_READING_PRESETS = [
  {
    id: 'sys_reading_classic',
    name: 'Giấy Kem Classic',
    description: 'Trang giấy kem ấm áp, chữ nâu sẫm',
    isSystem: true,
    config: {
      textColor: '#241C10',
      bgColor: '#F3EAD9',
      isBgTransparent: false,
      font: 'be-vietnam-pro',
      fontSize: '44',
      bgMusicEnabled: true,
      bgMusicVolume: '6',
      bgMusicTrackId: 'track1'
    }
  },
  {
    id: 'sys_reading_dark_gold',
    name: 'Đọc Đêm Gold',
    description: 'Trang tối sang trọng, chữ vàng hoàng gia',
    isSystem: true,
    config: {
      textColor: '#FFCB4D',
      bgColor: '#181622',
      isBgTransparent: false,
      font: 'montserrat',
      fontSize: '44',
      bgMusicEnabled: true,
      bgMusicVolume: '6',
      bgMusicTrackId: 'track2'
    }
  },
  {
    id: 'sys_reading_white_modern',
    name: 'Trắng Hiện Đại',
    description: 'Nền trắng tinh tế, chữ xanh đen sắc nét',
    isSystem: true,
    config: {
      textColor: '#1E293B',
      bgColor: '#FFFFFF',
      isBgTransparent: false,
      font: 'be-vietnam-pro',
      fontSize: '44',
      bgMusicEnabled: true,
      bgMusicVolume: '6',
      bgMusicTrackId: 'track3'
    }
  }
];

// Hàm phát hiện các nhân vật / giọng đọc THỰC SỰ có trong kịch bản hiện tại
function detectActiveCharacters(result) {
  const characters = [];
  const seenKeys = new Set();
  const scenes = result?.scenes || [];

  if (result?.category === 'reading_practice') {
    return [{
      key: 'narrator',
      name: 'Người kể (Narrator)',
      gender: 'Dẫn chuyện',
      icon: '🎙️',
      defaultVoice: DEFAULT_EDGE_FEMALE_VOICE
    }];
  }

  for (const scene of scenes) {
    const text = (scene.dialogueOrNarration || scene.text || scene.content || '').trim();
    const match = text.match(/^([A-Za-z0-9\s]+):/i);
    if (match) {
      const rawName = match[1].trim();
      const lower = rawName.toLowerCase();
      let key = lower;
      let name = rawName;
      let gender = 'Dẫn chuyện';
      let icon = '🎙️';
      let defaultVoice = DEFAULT_EDGE_FEMALE_VOICE;

      if (['alex', 'man', 'male', 'boy', 'guy', 'nam'].includes(lower)) {
        key = 'alex';
        name = 'Alex';
        gender = 'Nam';
        icon = '👨';
        defaultVoice = DEFAULT_EDGE_MALE_VOICE;
      } else if (['mia', 'woman', 'female', 'girl', 'lady', 'nữ'].includes(lower)) {
        key = 'mia';
        name = 'Mia';
        gender = 'Nữ';
        icon = '👩';
        defaultVoice = DEFAULT_EDGE_FEMALE_VOICE;
      } else if (['leo'].includes(lower)) {
        key = 'leo';
        name = 'Leo';
        gender = 'Nam trẻ';
        icon = '👦';
        defaultVoice = DEFAULT_EDGE_MALE_VOICE;
      } else if (['narrator', 'người kể', 'reader'].includes(lower)) {
        key = 'narrator';
        name = 'Người kể (Narrator)';
        gender = 'Dẫn chuyện';
        icon = '🎙️';
        defaultVoice = DEFAULT_EDGE_FEMALE_VOICE;
      } else {
        if (/woman|female|mother|mom|girl|lady|bà|cụ nữ/i.test(lower)) {
          gender = 'Nữ';
          icon = '👩';
          defaultVoice = DEFAULT_EDGE_FEMALE_VOICE;
        } else if (/man|male|father|dad|boy|guy|ông|cụ nam/i.test(lower)) {
          gender = 'Nam';
          icon = '👨';
          defaultVoice = DEFAULT_EDGE_MALE_VOICE;
        }
      }

      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        characters.push({ key, name, gender, icon, defaultVoice });
      }
    }
  }

  if (characters.length === 0) {
    characters.push({
      key: 'narrator',
      name: 'Người kể (Narrator)',
      gender: 'Dẫn chuyện',
      icon: '🎙️',
      defaultVoice: DEFAULT_EDGE_FEMALE_VOICE
    });
  }

  return characters;
}

// Thẻ chọn dạng lưới có ảnh xem trước (thay cho dropdown) — dùng chung cho cả 2 bộ chọn
// kiểu phụ đề và kiểu chuyển cảnh bên dưới, để việc chọn trực quan hơn là đọc chữ trong <select>.
// Thẻ chọn dạng lưới có ảnh xem trước — hỗ trợ nút "Tùy chỉnh" trên thẻ đã chọn
function PickerCard({ selected, onClick, onCustomize, label, children, width, isLandscape = false, showCustomizeBtn = false }) {
  const cardWidth = width || (isLandscape ? 130 : 84);
  const aspectRatio = isLandscape ? '16 / 9' : '3 / 4';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        width: cardWidth,
        position: 'relative'
      }}
    >
      <div style={{
        width: '100%',
        aspectRatio,
        borderRadius: '10px',
        overflow: 'hidden',
        background: '#141419',
        border: selected ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.12)',
        boxShadow: selected ? '0 0 14px rgba(254, 44, 85, 0.4)' : 'none',
        position: 'relative',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
      }}>
        {children}

        {/* Nút "Tùy chỉnh" trực tiếp trên góc thẻ đã chọn */}
        {selected && showCustomizeBtn && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCustomize?.();
            }}
            title="Cuộn tới bảng Tùy chỉnh Style Phụ Đề"
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: 'linear-gradient(135deg, var(--secondary), #00f2fe)',
              color: '#000',
              borderRadius: '6px',
              padding: '2px 5px',
              fontSize: '0.6rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              zIndex: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              lineHeight: 1
            }}
          >
            ⚙️ Tùy chỉnh
          </button>
        )}
      </div>

      <div style={{ minHeight: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: selected ? 700 : 500, color: selected ? '#fff' : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.25 }}>
          {label}
        </span>
      </div>
    </div>
  );
}

// Ảnh xem trước kiểu phụ đề — cập nhật thời gian thực (Real-time live preview) theo Font, Cỡ chữ, Màu chữ & Màu nền đang nhập
// Ảnh xem trước kiểu phụ đề — cập nhật thời gian thực (Real-time live preview) theo Font, Cỡ chữ, Màu chữ & Màu nền đang nhập
function CaptionStylePreview({ style, isLandscape = false, textColor, bgColor, font, fontSize, isFullLiveScreen = false }) {
  const strokeShadow = '-1.5px -1.5px 0 #000, 0 -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 0 0 #000, 1.5px 0 0 #000, -1.5px 1.5px 0 #000, 0 1.5px 0 #000, 1.5px 1.5px 0 #000';

  // Tính cỡ chữ xem trước trực quan
  const defaultSize = isFullLiveScreen ? (isLandscape ? 16 : 15) : (isLandscape ? 12 : 11);
  const customPx = fontSize ? Number(fontSize) : null;
  const calcSize = customPx
    ? (isFullLiveScreen ? Math.min(26, Math.max(10, Math.round(customPx * 0.45))) : Math.min(17, Math.max(8, Math.round(customPx * 0.26))))
    : defaultSize;

  const mainFontSize = `${calcSize}px`;
  const subFontSize = `${Math.max(7, calcSize - 3)}px`;
  const padding = isLandscape ? '6px 12px' : '5px 8px';
  const isTransparentBg = bgColor === 'transparent';

  // Map font family xem trước
  const fontFamilyMap = {
    'be-vietnam-pro': "'Be Vietnam Pro', sans-serif",
    'roboto': "'Roboto', sans-serif",
    'montserrat': "'Montserrat', sans-serif",
    'nunito': "'Nunito', sans-serif",
    'inter': "'Inter', sans-serif",
    'oswald': "'Oswald', sans-serif"
  };
  const fontFamily = font && fontFamilyMap[font] ? fontFamilyMap[font] : 'inherit';

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: style === 'page' ? 'center' : 'flex-end',
      justifyContent: 'center',
      padding: isFullLiveScreen ? (isLandscape ? '0 12px 14px' : '0 10px 16px') : (isLandscape ? '0 8px 6px' : '0 8px 10px'),
      fontFamily
    }}>
      {style === 'tiktok' ? (
        <div style={{ textAlign: 'center', width: isFullLiveScreen ? '92%' : 'auto' }}>
          <div style={{ fontSize: mainFontSize, fontWeight: 700, color: textColor || '#fff', textShadow: strokeShadow, letterSpacing: '0.3px' }}>DON&apos;T</div>
          <div style={{ fontSize: subFontSize, fontWeight: 600, color: '#FFE14D', textShadow: strokeShadow, marginTop: '2px' }}>Đừng bỏ cuộc</div>
        </div>
      ) : style === 'karaoke' ? (
        <div style={{ background: isTransparentBg ? 'transparent' : (bgColor || 'rgba(10,10,14,0.85)'), borderRadius: '6px', padding, textAlign: 'center', width: isFullLiveScreen ? '90%' : 'auto', maxWidth: '95%' }}>
          <div style={{ fontSize: mainFontSize, fontWeight: 700, whiteSpace: 'nowrap' }}>
            <span style={{ background: '#FE2C55', color: '#fff', borderRadius: '3px', padding: '0 4px' }}>Don&apos;t</span>{' '}
            <span style={{ color: textColor || '#fff' }}>give up</span>
          </div>
          <div style={{ fontSize: subFontSize, fontWeight: 500, color: 'rgba(255,255,255,0.85)', marginTop: '2px', whiteSpace: 'nowrap' }}>Đừng bỏ cuộc</div>
        </div>
      ) : style === 'page' ? (
        <div style={{ background: isTransparentBg ? 'transparent' : (bgColor || '#FBF3E3'), border: isTransparentBg ? 'none' : '1px solid rgba(42,33,24,0.08)', borderRadius: '8px', padding, textAlign: 'center', width: isFullLiveScreen ? '88%' : 'auto', maxWidth: '92%' }}>
          <div style={{ fontSize: mainFontSize, fontWeight: 700, color: textColor || '#2A2118', lineHeight: 1.4 }}>
            Don&apos;t{' '}
            <span style={{ background: '#FFCB4D', color: '#2A2118', borderRadius: '3px', padding: '0 4px' }}>give</span>{' '}
            up.
          </div>
          <div style={{ fontSize: subFontSize, fontWeight: 500, color: 'rgba(42,33,24,0.65)', marginTop: '2px' }}>Đừng bỏ cuộc.</div>
        </div>
      ) : (
        <div style={{ background: isTransparentBg ? 'transparent' : (bgColor || 'rgba(10,10,14,0.85)'), borderRadius: '6px', padding, textAlign: 'center', width: isFullLiveScreen ? '90%' : 'auto', maxWidth: '95%' }}>
          <div style={{ fontSize: mainFontSize, fontWeight: 700, color: textColor || '#fff', whiteSpace: 'nowrap' }}>Don&apos;t give up</div>
          <div style={{ fontSize: subFontSize, fontWeight: 500, color: 'rgba(255,255,255,0.85)', marginTop: '2px', whiteSpace: 'nowrap' }}>Đừng bỏ cuộc</div>
        </div>
      )}
    </div>
  );
}

// Ảnh xem trước kiểu chuyển cảnh — 2 khối màu chạy animation CSS lặp vô hạn mô phỏng đúng
// chuyển động thật (hòa tan/trượt/phóng to), để thấy hiệu ứng chuyển động chứ không chỉ đọc tên.
function TransitionStylePreview({ style }) {
  const frameBase = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  return (
    <>
      <div style={{ ...frameBase, background: '#1f2937', animation: `prev-${style}-a 1.6s ease-in-out infinite alternate` }}>
        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(37,244,238,0.55)' }} />
      </div>
      <div style={{ ...frameBase, background: '#3a1f2e', animation: `prev-${style}-b 1.6s ease-in-out infinite alternate` }}>
        <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'rgba(254,44,85,0.6)' }} />
      </div>
    </>
  );
}

// Ảnh xem trước LAYOUT thật của skill reading-page-video (hero ảnh / tiêu đề / nội dung / khoảng
// trống) — mô phỏng đúng cấu trúc ReadingCard.tsx (25/10/40/25% mặc định), cập nhật trực tiếp
// theo % đang kéo, để có trải nghiệm chỉnh kiểu CapCut thấy ngay kết quả trước khi render thật.
function ReadingPageLivePreview({
  isLandscape,
  heroPercent: heroPercentProps,
  titlePercent,
  bodyPercent,
  titleFontSize,
  bodyFontSize,
  textColor,
  bgColor,
  isBgTransparent,
  highlightColor,
  titleGap,
  contentPaddingPercent,
  bodyAlign,
  heroImageUrl,
  realTitle,
  realBodyPrimary,
  realBodySecondary,
  showBilingual,
  bgOpacity,
  imageMode = 'hero',
  level
}) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.25);

  const nativeWidth = isLandscape ? 1920 : 1080;
  const nativeHeight = isLandscape ? 1080 : 1920;

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const scaleX = rect.width / nativeWidth;
        const scaleY = rect.height / nativeHeight;
        setScale(Math.min(scaleX, scaleY));
      }
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isLandscape, nativeWidth, nativeHeight]);

  const heroPercent = imageMode === 'none' ? 0 : heroPercentProps;
  const restPercent = Math.max(1, 100 - heroPercent);
  const titleFlex = (titlePercent / restPercent) * 100;
  const bodyFlex = (bodyPercent / restPercent) * 100;
  const bottomFlex = Math.max(0, 100 - titleFlex - bodyFlex);
  const paddingPercent = contentPaddingPercent ?? 10;
  const resolvedBodyFontSize = bodyFontSize || 36;
  const secondaryFontSize = Math.round(resolvedBodyFontSize * 0.7);
  const resolvedTitleFontSize = titleFontSize || 70;
  const opacityVal = bgOpacity !== undefined && bgOpacity !== '' ? Math.max(0, Math.min(1, Number(bgOpacity) / 100)) : 1;

  const displayTitle = realTitle || 'Tiêu đề video';
  const displayPrimary = realBodyPrimary || 'Leo sat alone in his bedroom. He was only seven years old. The room was very dark, with just a little light coming from under the door.';
  const displaySecondary = realBodySecondary || 'Leo ngồi một mình trong phòng ngủ. Cậu bé mới bảy tuổi. Căn phòng rất tối, chỉ có một chút ánh sáng lọt qua khe cửa.';

  const words = displayPrimary.split(/\s+/).filter(Boolean);
  const keywordIdx = words.findIndex(w => w.replace(/[^a-zA-ZÀ-ỹ]/g, '').length >= 5);

  const levelText = (() => {
    if (!level) return '';
    const str = String(level).trim();
    const match = str.match(/([a-c][1-2])/i);
    if (match) return `LEVEL: ${match[1].toUpperCase()}`;
    return `LEVEL: ${str.toUpperCase()}`;
  })();

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Màn hình Canvas chuẩn độ phân giải gốc 1080x1920 (Màn dọc) hoặc 1920x1080 (Màn ngang) */}
      <div
        style={{
          width: `${nativeWidth}px`,
          height: `${nativeHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Badge Trình độ (Level) ở góc phải bên trên */}
        {levelText && (
          <div style={{
            position: 'absolute',
            top: '32px',
            right: '32px',
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            border: '1.5px solid rgba(255, 255, 255, 0.3)',
            color: '#FFFFFF',
            padding: '8px 22px',
            borderRadius: '24px',
            fontSize: '24px',
            fontWeight: 900,
            letterSpacing: '0.6px',
            boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'none'
          }}>
            <span style={{ color: '#FFCB4D' }}>⚡</span>
            <span>{levelText}</span>
          </div>
        )}
        {/* Full-screen background image layer (phủ 100% full màn hình phía sau để luôn hiển thị ảnh khi hạ opacity màu nền) */}
        {heroImageUrl && imageMode !== 'none' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url("${heroImageUrl}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              zIndex: 0
            }}
          />
        )}

        {/* Chế độ 'hero' (Ảnh nằm ngang): Băng Hero hiển thị ảnh sắc nét ở phần trên */}
        {imageMode === 'hero' && (
          <div style={{
            flex: `0 0 ${heroPercent}%`,
            position: 'relative',
            zIndex: 1,
            backgroundImage: `url("${heroImageUrl}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }} />
        )}

        {/* Chế độ 'full_bg': Màn hình trống phía trên để ảnh nền lộ ra tự nhiên */}
        {imageMode === 'full_bg' && heroPercent > 0 && (
          <div style={{ flex: `0 0 ${heroPercent}%`, position: 'relative', zIndex: 1 }} />
        )}
        <div style={{ flex: `0 0 ${restPercent}%`, position: 'relative', zIndex: 1 }}>
          {!isBgTransparent && (
            <div style={{ position: 'absolute', inset: 0, background: bgColor, opacity: opacityVal }} />
          )}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{
              flex: `0 0 ${titleFlex}%`,
              position: 'relative',
              display: 'flex',
              alignItems: titleGap === 0 ? 'flex-end' : 'center',
              justifyContent: 'center',
              padding: `10px ${paddingPercent}% 0`
            }}>
              <span style={{
                fontSize: `${resolvedTitleFontSize}px`,
                fontWeight: 800,
                color: textColor,
                textAlign: 'center',
                lineHeight: 1.05,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {displayTitle}
              </span>
            </div>
            <div style={{
              flex: `0 0 ${bodyFlex}%`,
              position: 'relative',
              padding: `${titleGap}px ${paddingPercent}% 0`,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <span style={{
                fontSize: `${resolvedBodyFontSize}px`,
                fontWeight: 700,
                color: textColor,
                textAlign: bodyAlign === 'justify' ? 'justify' : bodyAlign === 'center' ? 'center' : 'left',
                lineHeight: 1.4
              }}>
                {words.map((w, idx) => {
                  const isKeyword = idx === (keywordIdx >= 0 ? keywordIdx : 4);
                  return (
                    <span key={idx}>
                      {isKeyword ? (
                        <span style={{ background: highlightColor, color: '#222', borderRadius: 6, padding: '0 8px' }}>
                          {w}
                        </span>
                      ) : (
                        w
                      )}
                      {' '}
                    </span>
                  );
                })}
              </span>

              {/* Bản dịch tiếng Việt — tô màu chữ theo từng câu hoàn chỉnh (không tô ô nền từng từ) */}
              {showBilingual && (
                <div style={{
                  fontSize: `${secondaryFontSize}px`,
                  lineHeight: 1.4,
                  textAlign: bodyAlign === 'justify' ? 'justify' : bodyAlign === 'center' ? 'center' : 'left'
                }}>
                  {(() => {
                    const rawSentences = displaySecondary.match(/[^.!?\n]+[.!?\n]+/g) || [displaySecondary];
                    const sentences = rawSentences.map(s => s.trim()).filter(Boolean);
                    const activeColor = highlightColor || '#D97706';
                    return sentences.map((sentence, idx) => (
                      <span
                        key={idx}
                        style={{
                          color: idx === 0 ? activeColor : textColor,
                          fontWeight: 600,
                          opacity: idx === 0 ? 1 : 0.4,
                          transition: 'color 0.25s ease, opacity 0.25s ease'
                        }}
                      >
                        {sentence}{' '}
                      </span>
                    ));
                  })()}
                </div>
              )}
            </div>
            <div style={{ flex: `0 0 ${bottomFlex}%`, position: 'relative' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Tóm tắt trạng thái chạy hàng đợi Google Flow (từ extension), đối chiếu với đúng kịch bản
// đang hiển thị (khớp theo title) — trả về null nếu không có gì để hiển thị.
function getFlowQueueStatus(extQueueState, resultTitle) {
  const queue = extQueueState?.queue;
  if (!queue || queue.title !== resultTitle) {
    return null;
  }
  const segments = queue.segments || [];
  const total = segments.length;
  const completed = segments.filter(s => s.status === 'completed').length;
  const processing = segments.filter(s => s.status === 'processing').length;
  const isRunning = processing > 0 || extQueueState.autoRunActive === true;

  let label, color, phase;
  if (total > 0 && completed === total) {
    label = `✅ Hoàn thành ${completed}/${total} ảnh`;
    color = '#2ed573';
    phase = 'completed';
  } else if (isRunning) {
    label = `⏳ Đang chạy ${completed}/${total} ảnh`;
    color = '#f59e0b';
    phase = 'running';
  } else if (completed > 0) {
    label = `⏸ Tạm dừng ${completed}/${total} ảnh`;
    color = '#f59e0b';
    phase = 'paused';
  } else {
    label = `○ Đã gửi, chưa bắt đầu tạo (${total} ảnh)`;
    color = 'rgba(255,255,255,0.5)';
    phase = 'not_started';
  }
  return { label, color, phase, completed, total };
}

export default function SegmentedResultView({ result, copiedKey, onCopy, activeTab = 'process', onResult, onHistoryRefresh }) {
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState('');
  const [isTranslatingSubtitles, setIsTranslatingSubtitles] = useState(false);
  const [subtitleMsg, setSubtitleMsg] = useState('');
  const [extQueueState, setExtQueueState] = useState(null);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [renderMsg, setRenderMsg] = useState('');
  // Phá cache trình duyệt cho khung xem trước video sau khi render lại — cùng vấn đề/cách xử lý
  // như heroImageVersion cho ảnh minh hoạ: URL /api/prompts/video-stream không đổi giữa các lần
  // render (cùng folderPath), nên nếu không có tham số phân biệt, thẻ <video> vẫn giữ nguyên
  // bytes video CŨ đã tải trước đó thay vì tải lại bản vừa render xong.
  const [videoVersion, setVideoVersion] = useState(0);
  const isReadingPractice = result.category === 'reading_practice';
  // Tốc độ đọc gửi qua ElevenLabs (voice_settings.speed) khi tạo lồng tiếng — đây là NƠI DUY
  // NHẤT chọn tốc độ đọc (cố tình không lặp lại ở form tạo kịch bản ban đầu nữa, vì 2 chỗ độc
  // lập dễ lệch trạng thái nhau và gây rối cho người dùng), đổi thoải mái trước khi lồng tiếng
  // lại mà không cần viết lại kịch bản.
  const [renderReadingSpeed, setRenderReadingSpeed] = useState('medium');
  // reading_practice không có khái niệm "Kiểu phụ đề" để chọn — luôn là kiểu trang giấy
  // karaoke duy nhất (khớp preview 'page' đã có sẵn), chỉ có phần tuỳ chỉnh font/màu/cỡ chữ.
  const initialStyle = isReadingPractice ? 'page' : (result.remotionConfig?.captionStyle || 'box');
  const initialDefaults = isReadingPractice
    ? {
      ...CAPTION_STYLE_DEFAULTS.readingPage,
      textColor: result.remotionConfig?.captionTextColor || CAPTION_STYLE_DEFAULTS.readingPage.textColor,
      bgColor: result.remotionConfig?.captionBgColor || CAPTION_STYLE_DEFAULTS.readingPage.bgColor
    }
    : (CAPTION_STYLE_DEFAULTS[initialStyle] || CAPTION_STYLE_DEFAULTS.box);

  const [renderCaptionStyle, setRenderCaptionStyle] = useState(initialStyle);
  const [renderTransitionStyle, setRenderTransitionStyle] = useState('crossfade');
  const [renderBilingual, setRenderBilingual] = useState(true);
  const [showRenderConfig, setShowRenderConfig] = useState(false);

  // Tuỳ chỉnh phụ đề kiểu CapCut — tự động đồng bộ theo thông số mặc định của kiểu phụ đề được chọn
  const [renderCaptionFont, setRenderCaptionFont] = useState(initialDefaults.font);
  const [renderCaptionFontSize, setRenderCaptionFontSize] = useState(initialDefaults.fontSize);
  const [renderCaptionTextColor, setRenderCaptionTextColor] = useState(initialDefaults.textColor);
  const [renderCaptionBgColor, setRenderCaptionBgColor] = useState(initialDefaults.bgColor);
  const [renderCaptionBgOpacity, setRenderCaptionBgOpacity] = useState('100');
  const [renderCaptionBgTransparent, setRenderCaptionBgTransparent] = useState(initialDefaults.bgTransparent);
  const [showCustomCapCut, setShowCustomCapCut] = useState(false);
  const [capcutPreviewRatio, setCapcutPreviewRatio] = useState('9:16');
  const [customScreenBg, setCustomScreenBg] = useState('#252538');
  const [customTab, setCustomTab] = useState('style'); // 'style' | 'layout' | 'typography'

  // Tuỳ chỉnh LAYOUT kiểu CapCut (chỉ dùng cho reading_practice) — để trống ('') nghĩa là
  // giữ nguyên mặc định của skill reading-page-video (25% / 10% / 40%, phần còn lại là bottom space).
  const [renderHeroHeightPercent, setRenderHeroHeightPercent] = useState('25');
  const [renderTitleHeightPercent, setRenderTitleHeightPercent] = useState('10');
  const [renderBodyHeightPercent, setRenderBodyHeightPercent] = useState('40');
  const [renderTitleFontSize, setRenderTitleFontSize] = useState('44');
  const [renderTitleBodyGap, setRenderTitleBodyGap] = useState('18');
  const [renderContentPaddingPercent, setRenderContentPaddingPercent] = useState('10');
  const [renderBodyAlign, setRenderBodyAlign] = useState('left');
  const [renderImageMode, setRenderImageMode] = useState('hero'); // 'hero' | 'full_bg' | 'none'
  const [heroImageVersion, setHeroImageVersion] = useState(0); // bump để bust cache ảnh preview sau khi đổi ảnh
  const [isUploadingHeroImage, setIsUploadingHeroImage] = useState(false);
  // Nhạc nền nhẹ (tuỳ chọn) — không đóng gói sẵn nhạc theo skill (tránh vấn đề bản quyền),
  // người dùng tự tải file của mình lên. renderBgMusicEnabled chỉ quyết định có DÙNG file đã
  // tải hay không lúc render — tắt đi không xoá file, bật lại dùng ngay không cần tải lại.
  const [renderBgMusicEnabled, setRenderBgMusicEnabled] = useState(true);
  const [renderBgMusicVolume, setRenderBgMusicVolume] = useState('6');
  const [selectedBgMusicTrackId, setSelectedBgMusicTrackId] = useState(result.remotionConfig?.bgMusicTrackId || 'track1');
  const [showCustomBgMusicVolume, setShowCustomBgMusicVolume] = useState(false);
  const [isUploadingBgMusic, setIsUploadingBgMusic] = useState(false);
  const [bgMusicUploadError, setBgMusicUploadError] = useState('');
  const [bgMusicVersion, setBgMusicVersion] = useState(0); // bump để phá cache khi nghe thử sau khi đổi nhạc
  // Tên file ảnh hero khớp với bố cục đang chọn: "Hero Top" (dải ngang) dùng bản landscape,
  // "Full Nền Sau" (nền dọc toàn khung) dùng bản portrait - xem buildSegmentedPrompts.js/
  // content-flow.js's generateSecondaryVariant (sinh cả 2 bản, cùng gam màu, từ 1 ảnh hero).
  // route image-stream tự lùi về "scene-01.<ext>" gốc nếu dự án chưa có bản tách (cũ hơn tính
  // năng này), nên dùng tên này ở mọi nơi là an toàn, không cần tự kiểm tra tồn tại trước.
  const heroFileBase = `scene-01-${renderImageMode === 'full_bg' ? 'portrait' : 'landscape'}`;

  // assetCounts khai báo ở đây (thay vì gần các state khác phía dưới) vì useEffect ngay dưới
  // đây tham chiếu tới nó — const là block-scoped, tham chiếu trước dòng khai báo thật sẽ ném
  // "Cannot access 'assetCounts' before initialization" (temporal dead zone), không phải lỗi
  // logic app.
  const [assetCounts, setAssetCounts] = useState({
    imageCount: 0,
    audioCount: 0,
    videoCreated: false,
    hasBgMusic: false
  });

  // Tự động phát hiện tỉ lệ ảnh (Ảnh nằm ngang -> mode 'hero', Ảnh nằm dọc -> mode 'full_bg')
  useEffect(() => {
    if (assetCounts.imageCount === 0 && heroImageVersion === 0) return;
    const isLandscape = result.remotionConfig?.orientation === 'landscape' || result.input?.aspectRatio === '16:9';
    const folder = result.input?.folderPath || 'example';
    const cacheBust = heroImageVersion > 0 ? `&v=${heroImageVersion}` : '';
    // Xin bản "-landscape" trước - route image-stream tự lùi về file scene-01.<ext> gốc (chưa
    // tách bản ngang/dọc) cho các dự án tạo trước khi có tính năng tách 2 tỉ lệ, nên xác định
    // orientation qua kích thước ảnh thật vẫn đúng trong cả 2 trường hợp.
    const currentHeroUrl = `/api/prompts/image-stream?folderPath=${encodeURIComponent(folder)}&file=images/scene-01-landscape.${result.input?.imageExt || 'jpg'}${cacheBust}&category=${encodeURIComponent(result.category || '')}`;

    const img = new Image();
    img.src = currentHeroUrl;
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        if (img.naturalWidth >= img.naturalHeight) {
          setRenderImageMode('hero');
        } else {
          setRenderImageMode('full_bg');
        }
      }
    };
  }, [heroImageVersion, assetCounts.imageCount, result.input?.folderPath, result.category, result.remotionConfig?.orientation, result.input?.aspectRatio, result.input?.imageExt]);
  const [heroImageUploadError, setHeroImageUploadError] = useState('');

  const [userPresets, setUserPresets] = useState([]);
  const [activePresetId, setActivePresetId] = useState(null);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [presetMsg, setPresetMsg] = useState('');
  // Chỉ tự áp dụng preset mặc định MỘT LẦN duy nhất (lần đầu load kịch bản này) — fetchPresets
  // còn được gọi lại mỗi lần mở/đóng modal tuỳ chỉnh, không muốn ghi đè lên các chỉnh sửa tay
  // người dùng đã thực hiện trong lúc đó.
  const hasAppliedDefaultPresetRef = useRef(false);
  // SegmentedResultView không được gắn `key` theo result.id ở page.js (component instance dùng
  // chung cho mọi kịch bản trong 1 phiên, chỉ đổi prop `result`) — nếu không theo dõi id kịch
  // bản đang xem, hasAppliedDefaultPresetRef ở trên sẽ chỉ "dùng hết lượt" ở kịch bản ĐẦU TIÊN
  // xem trong phiên, khiến mọi kịch bản khác mở sau đó (kể cả kịch bản hoàn toàn mới, chưa từng
  // tuỳ chỉnh) không còn được tự động áp preset mặc định nữa.
  const lastResultIdRef = useRef(result?.id);

  // Load Presets từ API + localStorage
  const fetchPresets = async () => {
    const category = isReadingPractice ? 'reading_practice' : 'caption_style';
    try {
      const local = localStorage.getItem(`custom_presets_${category}`);
      if (local) {
        setUserPresets(JSON.parse(local));
      }
      const res = await fetch(`/api/prompts/presets?category=${category}`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.presets)) {
        setUserPresets(data.presets);
        localStorage.setItem(`custom_presets_${category}`, JSON.stringify(data.presets));

        if (!hasAppliedDefaultPresetRef.current) {
          hasAppliedDefaultPresetRef.current = true;
          // Chỉ tự áp preset mặc định cho kịch bản CHƯA TỪNG lưu tuỳ chỉnh riêng — cùng điều
          // kiện (bgMusicEnabled !== undefined) mà fetchSettings() đã dùng để quyết định có áp
          // mặc định bilingual/nhạc nền hay không, vì handleSaveAndApply LUÔN ghi bgMusicEnabled
          // mỗi lần lưu, bất kể người dùng đổi gì. Thiếu điều kiện này, mỗi lần mở lại 1 kịch
          // bản ĐÃ tự chỉnh (vd đổi nhạc nền qua "Lưu & Áp dụng") sẽ bị preset mặc định chung
          // ghi đè ngược lại, xoá mất tuỳ chỉnh riêng của đúng kịch bản đó.
          const scriptAlreadyCustomized = result.remotionConfig?.bgMusicEnabled !== undefined;
          if (!scriptAlreadyCustomized) {
            const defaultPreset = data.presets.find(p => p.isDefault);
            if (defaultPreset) applyPreset(defaultPreset);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching presets:', err);
    }
  };

  useEffect(() => {
    if (lastResultIdRef.current !== result?.id) {
      lastResultIdRef.current = result?.id;
      hasAppliedDefaultPresetRef.current = false;
    }
    fetchPresets();
  }, [showCustomCapCut, isReadingPractice, result?.id]);

  const handleSavePreset = async () => {
    if (!newPresetName || !newPresetName.trim()) {
      alert('Vui lòng nhập tên cho Mẫu Preset.');
      return;
    }
    const category = isReadingPractice ? 'reading_practice' : 'caption_style';
    const config = {
      font: renderCaptionFont,
      fontSize: renderCaptionFontSize,
      textColor: renderCaptionTextColor,
      bgColor: renderCaptionBgColor,
      bgOpacity: renderCaptionBgOpacity,
      isBgTransparent: renderCaptionBgTransparent,
      heroPercent: renderHeroHeightPercent,
      titlePercent: renderTitleHeightPercent,
      bodyPercent: renderBodyHeightPercent,
      titleFontSize: renderTitleFontSize,
      titleBodyGap: renderTitleBodyGap,
      paddingPercent: renderContentPaddingPercent,
      bodyAlign: renderBodyAlign,
      imageMode: renderImageMode,
      bilingual: renderBilingual,
      bgMusicEnabled: renderBgMusicEnabled,
      bgMusicVolume: renderBgMusicVolume,
      bgMusicTrackId: selectedBgMusicTrackId
    };

    try {
      const res = await fetch('/api/prompts/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPresetName.trim(), category, config })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updated = [data.preset, ...userPresets];
        setUserPresets(updated);
        setActivePresetId(data.preset.id);
        localStorage.setItem(`custom_presets_${category}`, JSON.stringify(updated));
        setIsSavingPreset(false);
        setNewPresetName('');
        setPresetMsg('✓ Đã lưu Mẫu Preset thành công!');
        setTimeout(() => setPresetMsg(''), 3000);
      } else {
        alert(`Lỗi lưu preset: ${data.error}`);
      }
    } catch (err) {
      alert('Lỗi kết nối khi lưu preset.');
    }
  };

  const handleDeletePreset = async (presetId) => {
    if (!confirm('Bạn có chắc chắn muốn xóa mẫu Preset này?')) return;
    const category = isReadingPractice ? 'reading_practice' : 'caption_style';
    try {
      const res = await fetch(`/api/prompts/presets?id=${presetId}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = userPresets.filter(p => p.id !== presetId);
        setUserPresets(updated);
        if (activePresetId === presetId) setActivePresetId(null);
        localStorage.setItem(`custom_presets_${category}`, JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Error deleting preset:', err);
    }
  };

  // Bật/tắt preset làm "mặc định" — preset mặc định tự áp dụng ngay khi mở màn cấu hình render
  // của một kịch bản MỚI (xem hasAppliedDefaultPresetRef ở fetchPresets). Chỉ 1 preset được là
  // mặc định tại 1 thời điểm mỗi category, nên bật mặc định cho preset này sẽ tự tắt mặc định ở
  // mọi preset khác. Cập nhật lạc quan (optimistic) trên UI trước, refetch lại nếu API lỗi.
  const handleToggleDefaultPreset = async (preset) => {
    const category = isReadingPractice ? 'reading_practice' : 'caption_style';
    let target = preset;

    // Nếu là Mẫu hệ thống chưa có trong userPresets — tạo 1 bản ghi ẩn (isSystemClone) chỉ để
    // giữ trạng thái "mặc định" (isDefault chỉ lưu được trên 1 document customPresets thật),
    // KHÔNG phải preset người dùng tự tạo nên bị lọc khỏi danh sách "Custom Presets" hiển thị
    // (xem userPresets.filter(p => !p.isSystemClone) ở phần render bên dưới).
    const existing = userPresets.find(p => p.id === preset.id || p.name === preset.name);
    if (!existing && preset.isSystem) {
      try {
        const res = await fetch('/api/prompts/presets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: preset.name, category, config: preset.config, isSystemClone: true })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          target = data.preset;
        }
      } catch (e) {
        console.error(e);
      }
    } else if (existing) {
      target = existing;
    }

    const nextIsDefault = !target.isDefault;
    const updated = userPresets.map(p => ({
      ...p,
      isDefault: p.id === target.id ? nextIsDefault : (nextIsDefault ? false : p.isDefault)
    }));

    if (!userPresets.some(p => p.id === target.id)) {
      updated.unshift({ ...target, isDefault: nextIsDefault });
    }

    setUserPresets(updated);
    localStorage.setItem(`custom_presets_${category}`, JSON.stringify(updated));

    try {
      const res = await fetch('/api/prompts/presets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: target.id, isDefault: nextIsDefault })
      });
      if (!res.ok) fetchPresets();
    } catch (err) {
      console.error('Error updating default preset:', err);
      fetchPresets();
    }
  };

  const applyPreset = (preset) => {
    if (preset?.id) setActivePresetId(preset.id);
    const c = preset.config || {};
    if (c.font !== undefined) setRenderCaptionFont(c.font);
    if (c.fontSize !== undefined) setRenderCaptionFontSize(c.fontSize);
    if (c.textColor !== undefined) setRenderCaptionTextColor(c.textColor);
    if (c.bgColor !== undefined) setRenderCaptionBgColor(c.bgColor);
    if (c.bgOpacity !== undefined) setRenderCaptionBgOpacity(c.bgOpacity);
    if (c.isBgTransparent !== undefined) setRenderCaptionBgTransparent(c.isBgTransparent);
    if (c.heroPercent !== undefined) setRenderHeroHeightPercent(c.heroPercent);
    if (c.titlePercent !== undefined) setRenderTitleHeightPercent(c.titlePercent);
    if (c.bodyPercent !== undefined) setRenderBodyHeightPercent(c.bodyPercent);
    if (c.titleFontSize !== undefined) setRenderTitleFontSize(c.titleFontSize);
    if (c.titleBodyGap !== undefined) setRenderTitleBodyGap(c.titleBodyGap);
    if (c.paddingPercent !== undefined) setRenderContentPaddingPercent(c.paddingPercent);
    if (c.bodyAlign !== undefined) setRenderBodyAlign(c.bodyAlign);
    if (c.imageMode !== undefined) setRenderImageMode(c.imageMode);
    if (c.bilingual !== undefined) setRenderBilingual(c.bilingual);
    if (c.bgMusicEnabled !== undefined) setRenderBgMusicEnabled(c.bgMusicEnabled);
    if (c.bgMusicVolume !== undefined) setRenderBgMusicVolume(String(c.bgMusicVolume));
    if (c.bgMusicTrackId !== undefined) {
      setSelectedBgMusicTrackId(c.bgMusicTrackId);
      if (c.bgMusicEnabled && c.bgMusicTrackId) {
        handleSelectDefaultMusic(c.bgMusicTrackId);
      }
    }
  };

  const isConfigMatch = (preset) => {
    if (!preset) return false;
    const c = preset.config || {};
    const pairs = [
      [c.font, renderCaptionFont],
      [c.fontSize, renderCaptionFontSize],
      [c.textColor, renderCaptionTextColor],
      [c.bgColor, renderCaptionBgColor],
      [c.bgOpacity, renderCaptionBgOpacity],
      [c.isBgTransparent, renderCaptionBgTransparent],
      [c.heroPercent, renderHeroHeightPercent],
      [c.titlePercent, renderTitleHeightPercent],
      [c.bodyPercent, renderBodyHeightPercent],
      [c.titleFontSize, renderTitleFontSize],
      [c.titleBodyGap, renderTitleBodyGap],
      [c.paddingPercent, renderContentPaddingPercent],
      [c.bodyAlign, renderBodyAlign],
      [c.imageMode, renderImageMode],
      [c.bilingual, renderBilingual],
      [c.bgMusicEnabled, renderBgMusicEnabled],
      [c.bgMusicVolume, renderBgMusicVolume]
    ];
    const definedPairs = pairs.filter(([saved]) => saved !== undefined);
    if (definedPairs.length === 0) return false;
    return definedPairs.every(([saved, current]) => String(saved) === String(current));
  };

  // Preset nào đang active: phải khớp toàn bộ thông số cấu hình và khớp ID được chọn (nếu có activePresetId)
  const isPresetActive = (preset) => {
    if (!preset) return false;
    if (!isConfigMatch(preset)) return false;
    if (activePresetId) {
      return preset.id === activePresetId;
    }
    const firstMatching = userPresets.find(p => isConfigMatch(p));
    return firstMatching?.id === preset.id;
  };

  const activePreset = userPresets.find(p => isPresetActive(p));

  // Hàm chọn kiểu phụ đề — Tự động cập nhật toàn bộ thông số mặc định của type đó vào form tùy chỉnh
  const handleSelectCaptionStyle = (styleType) => {
    setRenderCaptionStyle(styleType);
    const defaults = isReadingPractice
      ? CAPTION_STYLE_DEFAULTS.readingPage
      : (CAPTION_STYLE_DEFAULTS[styleType] || CAPTION_STYLE_DEFAULTS.box);
    setRenderCaptionFont(defaults.font);
    setRenderCaptionFontSize(defaults.fontSize);
    setRenderCaptionTextColor(defaults.textColor);
    setRenderCaptionBgColor(defaults.bgColor);
    setRenderCaptionBgTransparent(defaults.bgTransparent);
  };
  const capcutPanelRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState(0);
  const [renderProgress, setRenderProgress] = useState(0);
  const [isOpeningFolder, setIsOpeningFolder] = useState(false);
  const [openFolderError, setOpenFolderError] = useState('');

  const [showVoiceConfig, setShowVoiceConfig] = useState(false);
  const [settings, setSettings] = useState({ voiceMappings: {}, ttsProvider: 'elevenlabs', edgeVoiceMappings: {} });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [quota, setQuota] = useState(null);
  const [loadingQuota, setLoadingQuota] = useState(false);
  const [quotaError, setQuotaError] = useState('');
  const [previewingKey, setPreviewingKey] = useState('');
  const [previewError, setPreviewError] = useState('');

  const flowStatus = getFlowQueueStatus(extQueueState, result.title);
  // Cả 2 chủ đề đều dùng chung quy trình 3 bước (Google Flow ảnh -> ElevenLabs giọng ->
  // Remotion render) thay vì luồng "Video phân đoạn Veo3" cổ điển của các chủ đề khác.
  const isSlideshowPipeline = result.category === 'stick_figure_slideshow' || isReadingPractice;

  const checkAssets = async () => {
    try {
      const res = await fetch('/api/prompts/check-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: result.input?.folderPath || 'example',
          category: result.category
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAssetCounts({
          imageCount: data.imageCount,
          audioCount: data.audioCount,
          videoCreated: data.videoCreated,
          hasBgMusic: data.hasBgMusic || false
        });
      }
    } catch (err) {
      console.error('Error checking assets:', err);
    }
  };

  const [isPinningRenderConfig, setIsPinningRenderConfig] = useState(false);
  const [pinRenderMsg, setPinRenderMsg] = useState('');

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        const s = data.settings;
        if (s.defaultCaptionStyle && !isReadingPractice && !result.remotionConfig?.captionStyle) {
          setRenderCaptionStyle(s.defaultCaptionStyle);
        }
        if (s.defaultTransitionStyle && !result.remotionConfig?.transitionEffect) {
          setRenderTransitionStyle(s.defaultTransitionStyle);
        }
        if (s.defaultBilingual !== undefined && result.remotionConfig?.bilingual === undefined) {
          setRenderBilingual(s.defaultBilingual);
        }
        // ĐÃ BỎ: khối tự áp "mặc định nhạc nền" từ settings.readingPracticeConfig/defaultBgMusicVolume
        // từng nằm ở đây. Đây là 1 cơ chế "mặc định" THỨ HAI, độc lập và chồng lấn với việc ghim
        // preset (fetchPresets ở trên) — cả 2 cùng ghi vào renderBgMusicVolume/renderBgMusicEnabled/
        // selectedBgMusicTrackId cho cùng điều kiện "kịch bản chưa tuỳ chỉnh", nên tuỳ effect nào
        // resolve sau sẽ ghi đè effect kia, khiến preset đang ghim (📌 Mặc định) không tự active
        // đúng như hiển thị — đây chính là bug đã gặp. Giờ preset đang ghim (qua fetchPresets/
        // applyPreset) là NGUỒN SỰ THẬT DUY NHẤT cho nhạc nền mặc định của kịch bản mới.
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  const handlePinDefaultRenderConfig = async () => {
    setIsPinningRenderConfig(true);
    setPinRenderMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          defaultCaptionStyle: renderCaptionStyle,
          defaultTransitionStyle: renderTransitionStyle,
          defaultBilingual: renderBilingual
        })
      });
      if (res.ok) {
        setPinRenderMsg('Đã ghim cấu hình mặc định thành công!');
        setTimeout(() => setPinRenderMsg(''), 3500);
        await fetchSettings();
      } else {
        alert('Lỗi khi lưu ghim mặc định.');
      }
    } catch (err) {
      alert('Lỗi kết nối khi ghim mặc định.');
    } finally {
      setIsPinningRenderConfig(false);
    }
  };

  const fetchQuota = async () => {
    if (settings.ttsProvider !== 'elevenlabs') return;
    setLoadingQuota(true);
    setQuotaError('');
    try {
      const res = await fetch('/api/prompts/voiceover');
      const data = await res.json();
      if (res.ok) {
        setQuota(data);
      } else {
        setQuota(null);
        setQuotaError(data.error || `Không thể tải quota (HTTP ${res.status}).`);
      }
    } catch (err) {
      console.error('Error fetching quota:', err);
      setQuota(null);
      setQuotaError('Lỗi kết nối khi tải quota.');
    } finally {
      setLoadingQuota(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (showVoiceConfig) {
      fetchSettings();
    }
  }, [showVoiceConfig]);

  // "Nghe thử" — tạo 1 đoạn mẫu ngắn bằng chính giọng đang cấu hình cho nhân vật `key` và phát
  // ngay trên trình duyệt, không ghi ra đĩa/không đụng project nào.
  const handlePreviewVoice = async (provider, voiceId, key) => {
    setPreviewingKey(key);
    setPreviewError('');

    try {
      const res = await fetch('/api/prompts/voice-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, voiceId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const audio = new Audio(`data:${data.mime || 'audio/wav'};base64,${data.audioBase64}`);
        await audio.play();
      } else {
        setPreviewError(data.error || 'Không tạo được giọng mẫu.');
      }
    } catch (err) {
      setPreviewError(err.message || 'Lỗi phát âm thanh mẫu.');
    } finally {
      setPreviewingKey('');
    }
  };

  const flowButtonLabel = (status) => {
    if (!status) return '🚀 Đẩy sang Google Flow';
    if (status.phase === 'completed') return `✅ Đã xong (${status.completed}/${status.total}) — Đẩy lại`;
    if (status.phase === 'running') return `⏳ Đang chạy (${status.completed}/${status.total}) — Đẩy lại`;
    if (status.phase === 'paused') return `⏸ Tạm dừng (${status.completed}/${status.total}) — Đẩy lại`;
    return '🚀 Đẩy sang Google Flow';
  };

  const pushToFlow = (status) => {
    if (status) {
      const confirmed = window.confirm(
        `Kịch bản này đang có tiến độ trên Google Flow (${status.completed}/${status.total} ảnh).\n\n` +
        `Bấm OK để tạo lại hàng đợi từ đầu (sẽ mất tiến độ đang có, các ảnh đã tải vẫn còn nguyên trong thư mục).\n` +
        `Bấm Cancel để không làm gì cả.`
      );
      if (!confirmed) return;
    }
    window.postMessage({
      type: 'START_FLOW_GENERATION',
      segments: result.segments,
      title: result.title,
      isImage: isSlideshowPipeline || result.category === 'image_slideshow',
      folderPath: result.input?.folderPath || 'example',
      imageExt: result.input?.imageExt || 'jpg',
      category: result.category,
      aspectRatio: result.input?.aspectRatio || (result.remotionConfig?.orientation === 'landscape' ? '16:9' : '9:16'),
      orientation: result.remotionConfig?.orientation || (result.input?.aspectRatio === '16:9' ? 'landscape' : 'portrait')
    }, '*');
  };

  const handleGenerateVoice = async () => {
    setIsGeneratingVoice(true);
    setVoiceMsg('');
    try {
      const res = await fetch('/api/prompts/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: result.input?.folderPath || 'example',
          imageExt: result.input?.imageExt || 'jpg',
          audioExt: result.input?.audioExt || 'mp3',
          category: result.category,
          readingSpeed: isReadingPractice ? renderReadingSpeed : undefined,
          ttsProvider: settings.ttsProvider || 'elevenlabs',
          scenes: result.segments.map(seg => ({
            segmentNumber: seg.segmentNumber,
            dialogueOrNarration: seg.dialogueOrNarration
          }))
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVoiceMsg(`✓ Đã tạo thành công! Lưu tại: ${data.targetDirectory}`);
        fetchQuota();
        checkAssets();
      } else {
        setVoiceMsg(`Lỗi: ${data.error || 'Không thể tạo âm thanh.'}`);
      }
    } catch (err) {
      setVoiceMsg('Lỗi: Không thể kết nối tới server.');
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleOpenVideoFolder = async () => {
    setIsOpeningFolder(true);
    setOpenFolderError('');
    try {
      const res = await fetch('/api/prompts/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: result.input?.folderPath || 'example' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setOpenFolderError(data.error || 'Không thể mở thư mục.');
      }
    } catch (err) {
      setOpenFolderError('Lỗi kết nối khi mở thư mục.');
    } finally {
      setIsOpeningFolder(false);
    }
  };

  const handleRenderVideo = async () => {
    setIsRenderingVideo(true);
    setRenderMsg('');
    try {
      const isLandscape = result.remotionConfig?.orientation === 'landscape' || result.input?.aspectRatio === '16:9';
      const orientation = isLandscape ? 'landscape' : 'portrait';

      const res = await fetch('/api/prompts/render-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: result.input?.folderPath || 'example',
          category: result.category,
          captionStyle: renderCaptionStyle,
          transitionStyle: renderTransitionStyle,
          bilingual: renderBilingual,
          orientation: orientation,
          level: result.input?.level || result.level || undefined,
          captionFont: renderCaptionFont || undefined,
          captionFontSize: renderCaptionFontSize ? Number(renderCaptionFontSize) : undefined,
          captionTextColor: renderCaptionTextColor || undefined,
          captionBgColor: renderCaptionBgTransparent ? 'transparent' : (renderCaptionBgColor || undefined),
          captionBgOpacity: isReadingPractice && renderCaptionBgOpacity ? Number(renderCaptionBgOpacity) : undefined,
          heroHeightPercent: isReadingPractice && renderHeroHeightPercent ? Number(renderHeroHeightPercent) : undefined,
          titleHeightPercent: isReadingPractice && renderTitleHeightPercent ? Number(renderTitleHeightPercent) : undefined,
          bodyHeightPercent: isReadingPractice && renderBodyHeightPercent ? Number(renderBodyHeightPercent) : undefined,
          titleFontSize: isReadingPractice && renderTitleFontSize ? Number(renderTitleFontSize) : undefined,
          titleBodyGap: isReadingPractice && renderTitleBodyGap ? Number(renderTitleBodyGap) : undefined,
          contentPaddingPercent: isReadingPractice && renderContentPaddingPercent ? Number(renderContentPaddingPercent) : undefined,
          bodyAlign: isReadingPractice ? renderBodyAlign : undefined,
          imageMode: isReadingPractice ? renderImageMode : undefined,
          bgMusicEnabled: isReadingPractice ? renderBgMusicEnabled : undefined,
          bgMusicVolume: isReadingPractice && renderBgMusicVolume ? Number(renderBgMusicVolume) / 100 : undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRenderMsg(`✓ Đã tạo video thành công!`);
        setVideoVersion(v => v + 1);
        checkAssets();
      } else {
        setRenderMsg(`Lỗi: ${data.error || 'Không thể render video.'}`);
        alert(`Lỗi render video:\n${data.details || data.error}`);
      }
    } catch (err) {
      setRenderMsg('Lỗi: Không thể kết nối tới server.');
    } finally {
      setIsRenderingVideo(false);
    }
  };

  // Đổi ảnh minh hoạ đầu trang (Hero Illustration) — ghi đè đúng bản ảnh khớp với bố cục ĐANG
  // XEM (heroFileBase: "-landscape" cho Hero Top, "-portrait" cho Full Nền Sau), để không xoá
  // mất bản còn lại Google Flow đã sinh — mỗi bố cục có thể tự thay ảnh riêng của nó. Dùng lại
  // đúng API save-image mà Google Flow vẫn dùng để ghi ảnh, nên không cần hạ tầng riêng. Sau khi
  // ghi xong, bump heroImageVersion để phá cache ảnh preview.
  const handleUploadHeroImage = async (file) => {
    if (!file) return;
    setIsUploadingHeroImage(true);
    setHeroImageUploadError('');
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const res = await fetch('/api/prompts/save-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: result.input?.folderPath || 'example',
          filename: `images/${heroFileBase}.${ext}`,
          dataUrl,
          category: result.category
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHeroImageVersion(v => v + 1);
      } else {
        setHeroImageUploadError(data.error || 'Không thể lưu ảnh.');
      }
    } catch (err) {
      setHeroImageUploadError('Lỗi kết nối khi tải ảnh lên.');
    } finally {
      setIsUploadingHeroImage(false);
    }
  };

  // Tải lên nhạc nền — ghi đè audio/bg-music.<ext> của project (dùng lại đúng route save-image,
  // route đó chỉ ghi byte theo filename, không quan tâm nội dung là ảnh hay audio). Không đóng
  // gói sẵn nhạc theo skill để tránh vấn đề bản quyền — người dùng tự chọn file của mình (nên
  // dùng nhạc không lời, royalty-free, vd từ YouTube Audio Library/Pixabay Music).
  const handleUploadBgMusic = async (file) => {
    if (!file) return;
    setIsUploadingBgMusic(true);
    setBgMusicUploadError('');
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const ext = (file.name.split('.').pop() || 'mp3').toLowerCase();
      const res = await fetch('/api/prompts/save-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: result.input?.folderPath || 'example',
          filename: `audio/bg-music.${ext}`,
          dataUrl,
          category: result.category
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBgMusicVersion(v => v + 1);
        setRenderBgMusicEnabled(true);
        checkAssets();
      } else {
        setBgMusicUploadError(data.error || 'Không thể lưu nhạc nền.');
      }
    } catch (err) {
      setBgMusicUploadError('Lỗi kết nối khi tải nhạc nền lên.');
    } finally {
      setIsUploadingBgMusic(false);
    }
  };

  const [isSelectingDefaultMusic, setIsSelectingDefaultMusic] = useState(false);
  const handleSelectDefaultMusic = async (trackId) => {
    setIsSelectingDefaultMusic(true);
    setBgMusicUploadError('');
    try {
      const res = await fetch('/api/prompts/select-default-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: result.input?.folderPath || 'example',
          trackId,
          category: result.category
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedBgMusicTrackId(trackId);
        setBgMusicVersion(Date.now());
        setRenderBgMusicEnabled(true);
        checkAssets();
      } else {
        setBgMusicUploadError(data.error || 'Không thể chọn nhạc mặc định.');
      }
    } catch (err) {
      setBgMusicUploadError('Lỗi kết nối khi chọn nhạc mặc định.');
    } finally {
      setIsSelectingDefaultMusic(false);
    }
  };

  const [playingPreviewTrackId, setPlayingPreviewTrackId] = useState(null);
  const previewAudioRef = useRef(null);

  const togglePreviewTrack = (trackId, trackFile) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }

    if (playingPreviewTrackId === trackId) {
      setPlayingPreviewTrackId(null);
      return;
    }

    const audio = new Audio(trackFile);
    previewAudioRef.current = audio;
    setPlayingPreviewTrackId(trackId);
    audio.play().catch(() => setPlayingPreviewTrackId(null));
    audio.onended = () => setPlayingPreviewTrackId(null);
  };

  const handleSaveAndApply = async () => {
    if (renderBgMusicEnabled && !assetCounts.hasBgMusic) {
      try {
        await handleSelectDefaultMusic('track1');
      } catch (e) {
        console.warn('Auto select track1 error:', e);
      }
    }

    const configObj = {
      font: renderCaptionFont,
      fontSize: renderCaptionFontSize,
      textColor: renderCaptionTextColor,
      bgColor: renderCaptionBgColor,
      bgOpacity: renderCaptionBgOpacity,
      isBgTransparent: renderCaptionBgTransparent,
      heroPercent: renderHeroHeightPercent,
      titlePercent: renderTitleHeightPercent,
      bodyPercent: renderBodyHeightPercent,
      titleFontSize: renderTitleFontSize,
      titleBodyGap: renderTitleBodyGap,
      paddingPercent: renderContentPaddingPercent,
      bodyAlign: renderBodyAlign,
      imageMode: renderImageMode,
      bilingual: renderBilingual,
      bgMusicEnabled: renderBgMusicEnabled,
      bgMusicVolume: renderBgMusicVolume,
      bgMusicTrackId: selectedBgMusicTrackId
    };

    const mergedRemotionConfig = {
      ...(result.remotionConfig || {}),
      ...configObj
    };

    if (onResult && result) {
      onResult({
        ...result,
        remotionConfig: mergedRemotionConfig
      });
    }

    try {
      // Lưu remotionConfig đã tuỳ chỉnh (nhạc nền, font, bố cục %, ...) xuống ĐÚNG bản ghi
      // lịch sử của kịch bản này — nếu không, onResult() ở trên chỉ cập nhật state React cho
      // phiên hiện tại, mất ngay khi rời trang rồi mở lại từ "Lịch sử đã tạo" (trang luôn tải
      // lại remotionConfig gốc lúc mới tạo kịch bản từ DB). Bỏ qua nếu chưa có result.id (kịch
      // bản chưa từng lưu vào lịch sử, ví dụ đang xem preview trước khi tạo).
      if (result.id) {
        await fetch('/api/prompts/history', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: result.id, remotionConfig: mergedRemotionConfig })
        });
      }
    } catch (err) {
      console.warn('Lỗi lưu remotionConfig vào lịch sử:', err);
    }

    try {
      // CHỈ lưu làm "mặc định cho kịch bản mới sau này" (bảng settings) — KHÔNG tạo preset
      // trong danh sách "Custom Presets". Trước đây có gọi thêm POST /api/prompts/presets ở
      // đây, nhưng route đó luôn insertOne 1 dòng MỚI (không update-in-place), nên mỗi lần bấm
      // "Lưu & Áp dụng" lại đẻ thêm 1 preset thừa tên "Mặc định hiện tại". Preset chỉ nên được
      // tạo khi người dùng chủ động bấm "Lưu thành Preset mới..." (xem handleSavePreset).
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          defaultBilingual: renderBilingual,
          defaultBgMusicEnabled: renderBgMusicEnabled,
          defaultBgMusicVolume: renderBgMusicVolume,
          readingPracticeConfig: configObj
        })
      });
    } catch (err) {
      console.warn('Lỗi tự động lưu ghim mặc định:', err);
    }

    setShowCustomCapCut(false);
  };

  const alreadyBilingual = result.segments.length > 0 && result.segments.every(seg => (seg.subtitle || '').includes('\n'));

  const handleTranslateSubtitles = async () => {
    setIsTranslatingSubtitles(true);
    setSubtitleMsg('');
    try {
      const res = await fetch('/api/prompts/translate-subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: result.id,
          folderPath: result.input?.folderPath || '',
          segments: result.segments
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updatedRemotionConfig = result.remotionConfig?.scenes
          ? {
            ...result.remotionConfig,
            scenes: result.remotionConfig.scenes.map((scene, idx) => ({
              ...scene,
              caption: data.segments[idx]?.subtitle ?? scene.caption
            }))
          }
          : result.remotionConfig;
        onResult?.({ ...result, segments: data.segments, remotionConfig: updatedRemotionConfig });
        if (result.id) onHistoryRefresh?.();
        setSubtitleMsg(
          data.manifestUpdated
            ? '✓ Đã cập nhật phụ đề song ngữ! Nhấn "Tạo Lại Video" ở Bước 3 để video mới hiển thị phụ đề song ngữ.'
            : '✓ Đã cập nhật phụ đề song ngữ!'
        );
      } else {
        setSubtitleMsg(`Lỗi: ${data.error || 'Không thể dịch phụ đề.'}`);
      }
    } catch (err) {
      setSubtitleMsg('Lỗi: Không thể kết nối tới server.');
    } finally {
      setIsTranslatingSubtitles(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);



  // Bước 2 (ElevenLabs) chạy 1 lệnh xử lý tuần tự từng slide phía server, không có tiến trình
  // real-time gửi về - nên mô phỏng đếm dần "n/tổng" theo ước tính ~1.3s/slide để đồng bộ hiệu
  // ứng với Bước 1, dừng lại ở tổng-1 chờ API trả về thật rồi mới coi là xong (assetCounts.audioCount).
  useEffect(() => {
    if (!isGeneratingVoice) {
      setVoiceProgress(0);
      return;
    }
    const total = result.segments.length;
    const timer = setInterval(() => {
      setVoiceProgress(prev => (prev < total - 1 ? prev + 1 : prev));
    }, 1300);
    return () => clearInterval(timer);
  }, [isGeneratingVoice, result.segments.length]);

  // Bước 3 (Remotion render) cũng chỉ là 1 lệnh chạy 1 lần, không có % thật - mô phỏng thanh %
  // tăng dần theo đường cong ease-out (nhanh lúc đầu, chậm dần) dựa trên thời lượng ước tính theo
  // số slide, dừng ở mức 92% chờ API render thật trả về xong mới nhảy lên 100%.
  useEffect(() => {
    if (!isRenderingVideo) {
      setRenderProgress(0);
      return;
    }
    const startTime = Date.now();
    const estimatedDurationMs = Math.max(8000, result.segments.length * 2500);
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const eased = 1 - Math.pow(1 - Math.min(elapsed / estimatedDurationMs, 1), 2);
      setRenderProgress(Math.min(92, Math.round(eased * 100)));
    }, 300);
    return () => clearInterval(timer);
  }, [isRenderingVideo, result.segments.length]);

  useEffect(() => {
    checkAssets();
  }, [result.input?.folderPath, result.category]);

  useEffect(() => {
    if (extQueueState && extQueueState.queue && extQueueState.queue.title === result.title) {
      checkAssets();
    }
  }, [extQueueState?.queue?.completed, extQueueState?.queue?.phase]);

  // Lắng nghe trạng thái hàng đợi được content-bridge.js của extension đẩy ngược lại (nếu có
  // cài extension), để hiển thị tiến độ chạy thật ngay trên trang thay vì phải mở side panel.
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.source !== window) return;
      if (event.data && event.data.type === 'FLOW_QUEUE_STATE') {
        setExtQueueState({ queue: event.data.queue, autoRunActive: event.data.autoRunActive });
      }
    };
    window.addEventListener('message', handleMessage);
    // Xin trạng thái hiện tại ngay khi mount, vì bridge có thể đã broadcast trước khi component này tồn tại
    window.postMessage({ type: 'REQUEST_FLOW_QUEUE_STATE' }, '*');
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const isLandscape = result.remotionConfig?.orientation === 'landscape' || result.input?.aspectRatio === '16:9';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '12px', flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🎬</span>
          <span>Kịch bản: {result.title}</span>
        </h3>
        {!isSlideshowPipeline && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                flexShrink: 0,
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                boxShadow: '0 4px 15px rgba(254, 44, 85, 0.3)',
                borderRadius: '8px',
                fontWeight: 700
              }}
              onClick={() => pushToFlow(flowStatus)}
            >
              {flowButtonLabel(flowStatus)}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', flexShrink: 0, borderRadius: '8px', fontWeight: 700 }}
              onClick={() => {
                const allPrompts = result.segments.map(s => `--- Slide ${s.segmentNumber} ---\nPrompt Ảnh:\n${s.textPrompt}\n\nThoại: ${s.dialogueOrNarration}\nPhụ đề: ${s.subtitle}`).join('\n\n');
                onCopy(allPrompts, 'all_segments');
              }}
            >
              {copiedKey === 'all_segments' ? '✓ Đã sao chép!' : '📋 Sao chép toàn bộ'}
            </button>
          </div>
        )}
      </div>



      {activeTab === 'process' && isSlideshowPipeline && (
        <div style={{
          background: 'rgba(37, 244, 238, 0.03)',
          border: '1px solid rgba(37, 244, 238, 0.15)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 800, marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚙️</span> Quy trình sản xuất video (3 Bước)
          </h4>

          {/* Steps Pipeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>

            {/* Bước 1: Sinh & tải ảnh */}
            {(() => {
              const total = result.segments.length;
              const completedFlow = flowStatus ? flowStatus.completed : 0;
              const isFlowDone = flowStatus && flowStatus.phase === 'completed';
              const hasAllImages = assetCounts.imageCount >= total;
              const isStep1Done = isFlowDone || hasAllImages;
              const isStep1Running = !isStep1Done && flowStatus && flowStatus.phase === 'running';

              return (
                <div className={isStep1Running ? 'running-glow-card' : ''} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: isStep1Running ? '1.5px solid transparent' : isStep1Done ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isStep1Done ? '#10b981' : 'linear-gradient(135deg, #FE2C55, #ff5a79)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        flexShrink: 0,
                        animation: isStep1Running ? 'pulse-ring 1.6s ease-in-out infinite' : 'none'
                      }}>
                        {isStep1Done ? '✓' : '1'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                          Bước 1: Sinh & tải ảnh tự động (Google Flow)
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '7px 14px',
                        fontSize: '0.76rem',
                        borderRadius: '8px',
                        fontWeight: 700,
                        background: isStep1Done ? 'rgba(46, 213, 115, 0.15)' : 'linear-gradient(135deg, var(--primary), var(--accent))',
                        color: isStep1Done ? '#2ed573' : '#fff',
                        border: isStep1Done ? '1px solid rgba(46, 213, 115, 0.3)' : 'none',
                        boxShadow: isStep1Done ? 'none' : '0 4px 15px rgba(254, 44, 85, 0.25)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                      onClick={() => pushToFlow(flowStatus)}
                    >
                      {flowButtonLabel(flowStatus)}
                    </button>
                  </div>

                  {/* Dòng tiến độ dạng thanh - chỉ hiện TRONG lúc đang chạy, ẩn ngay khi xong */}
                  {isStep1Running && flowStatus && flowStatus.total > 0 && (
                    <StepProgressBar
                      percent={(flowStatus.completed / flowStatus.total) * 100}
                      label={`${flowStatus.completed}/${flowStatus.total}`}
                      color={flowStatus.color}
                      showShimmer={true}
                    />
                  )}
                </div>
              );
            })()}

            {/* Bước 2: Tạo giọng nói */}
            {(() => {
              const total = result.segments.length;
              const isStep1Done = (flowStatus && flowStatus.phase === 'completed') || (assetCounts.imageCount >= total);
              const isStep2Done = assetCounts.audioCount >= total;

              return (
                <div className={isGeneratingVoice ? 'running-glow-card' : ''} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: isGeneratingVoice ? '1.5px solid transparent' : isStep2Done ? '1px solid rgba(16, 185, 129, 0.25)' : isStep1Done ? '1px solid rgba(0, 242, 254, 0.2)' : '1px solid rgba(255, 255, 255, 0.03)',
                  borderRadius: '10px',
                  opacity: isStep1Done ? 1 : 0.5,
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isStep2Done ? '#10b981' : isStep1Done ? 'linear-gradient(135deg, #FE2C55, #ff5a79)' : 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        flexShrink: 0,
                        animation: isGeneratingVoice ? 'pulse-ring 1.6s ease-in-out infinite' : 'none'
                      }}>
                        {isStep2Done ? '✓' : '2'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                          Bước 2: Tạo giọng lồng tiếng (Edge TTS - Miễn phí)
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        title="Cấu hình giọng đọc (Edge TTS)"
                        style={{ padding: '7px 10px', fontSize: '0.76rem', borderRadius: '8px', fontWeight: 700, whiteSpace: 'nowrap' }}
                        onClick={() => setShowVoiceConfig(!showVoiceConfig)}
                        disabled={!isStep1Done || isGeneratingVoice || isRenderingVideo}
                      >
                        ⚙️
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{
                          padding: '7px 14px',
                          fontSize: '0.76rem',
                          borderRadius: '8px',
                          fontWeight: 700,
                          background: isStep2Done ? 'rgba(46, 213, 115, 0.15)' : isStep1Done ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'rgba(255, 255, 255, 0.05)',
                          color: isStep2Done ? '#2ed573' : isStep1Done ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                          border: isStep2Done ? '1px solid rgba(46, 213, 115, 0.3)' : isStep1Done ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                          boxShadow: isStep2Done || !isStep1Done ? 'none' : '0 4px 15px rgba(254, 44, 85, 0.25)',
                          cursor: (!isStep1Done || isGeneratingVoice) ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                        onClick={handleGenerateVoice}
                        disabled={!isStep1Done || isGeneratingVoice || isRenderingVideo}
                      >
                        {isGeneratingVoice ? '⏳ Đang tạo...' : isStep2Done ? '🎙️ Lồng Tiếng Lại' : '🎙️ Tạo Lồng Tiếng'}
                      </button>
                    </div>
                  </div>

                  {/* Tốc độ đọc — chỉ cho reading_practice, vì skill này đọc nguyên 1 đoạn văn
                      dài liên tục nên tốc độ giọng đọc ảnh hưởng trực tiếp tới trải nghiệm luyện
                      đọc/nghe. Gửi sang ElevenLabs (voice_settings.speed) khi bấm Tạo Lồng Tiếng. */}
                  {isReadingPractice && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, flexShrink: 0 }}>🗣️ Tốc độ đọc:</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[
                          { value: 'slow', label: '🐢 Chậm' },
                          { value: 'medium', label: '🚶 Vừa' },
                          { value: 'fast', label: '🐇 Nhanh' }
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setRenderReadingSpeed(opt.value)}
                            disabled={isGeneratingVoice || isRenderingVideo}
                            title={`Đặt tốc độ giọng đọc: ${opt.label}`}
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              borderRadius: '7px',
                              cursor: (isGeneratingVoice || isRenderingVideo) ? 'not-allowed' : 'pointer',
                              border: renderReadingSpeed === opt.value ? '1px solid var(--secondary)' : '1px solid rgba(255,255,255,0.1)',
                              background: renderReadingSpeed === opt.value ? 'rgba(37,244,238,0.12)' : 'rgba(0,0,0,0.3)',
                              color: renderReadingSpeed === opt.value ? 'var(--secondary)' : '#fff'
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dòng tiến độ dạng thanh - chỉ hiện TRONG lúc đang tạo giọng đọc */}
                  {isGeneratingVoice && (
                    <StepProgressBar
                      percent={(voiceProgress / total) * 100}
                      label={`${voiceProgress}/${total}`}
                      color="#00f2fe"
                      showShimmer={true}
                    />
                  )}
                </div>
              );
            })()}

            {/* Bước 3: Render video */}
            {(() => {
              const total = result.segments.length;
              const isStep2Done = assetCounts.audioCount >= total;
              const isStep3Done = assetCounts.videoCreated;

              return (
                <div className={isRenderingVideo ? 'running-glow-card' : ''} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: isRenderingVideo ? '1.5px solid transparent' : isStep3Done ? '1px solid rgba(16, 185, 129, 0.25)' : isStep2Done ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255, 255, 255, 0.03)',
                  borderRadius: '10px',
                  opacity: isStep2Done ? 1 : 0.5,
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isStep3Done ? '#10b981' : isStep2Done ? 'linear-gradient(135deg, #FE2C55, #ff5a79)' : 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        flexShrink: 0,
                        animation: isRenderingVideo ? 'pulse-ring 1.6s ease-in-out infinite' : 'none'
                      }}>
                        {isStep3Done ? '✓' : '3'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                          Bước 3: Biên tập & Xuất Video (Remotion)
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        title="Cấu hình kiểu render (phụ đề, chuyển cảnh, song ngữ)"
                        style={{ padding: '7px 10px', fontSize: '0.76rem', borderRadius: '8px', fontWeight: 700, whiteSpace: 'nowrap' }}
                        onClick={() => setShowRenderConfig(!showRenderConfig)}
                        disabled={!isStep2Done || isRenderingVideo || isGeneratingVoice}
                      >
                        ⚙️
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{
                          padding: '7px 14px',
                          fontSize: '0.76rem',
                          borderRadius: '8px',
                          fontWeight: 700,
                          background: isStep3Done ? 'rgba(46, 213, 115, 0.15)' : isStep2Done ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'rgba(255, 255, 255, 0.05)',
                          color: isStep3Done ? '#2ed573' : isStep2Done ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                          border: isStep3Done ? '1px solid rgba(46, 213, 115, 0.3)' : isStep2Done ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                          boxShadow: isStep3Done || !isStep2Done ? 'none' : '0 4px 15px rgba(254, 44, 85, 0.25)',
                          cursor: (!isStep2Done || isRenderingVideo) ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                        onClick={handleRenderVideo}
                        disabled={!isStep2Done || isRenderingVideo || isGeneratingVoice}
                      >
                        {isRenderingVideo ? '⏳ Đang render...' : isStep3Done ? '🎥 Tạo Lại Video' : '🎥 Tạo Video (Render)'}
                      </button>
                    </div>
                  </div>

                  {/* Nút chọn nhanh Nhạc nền trực tiếp ngoài Process */}
                  {isReadingPractice && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '2px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, flexShrink: 0 }}>🎵 Nhạc nền:</span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {[
                          { id: 'off', label: '🔇 Tắt nhạc' },
                          { id: 'track1', label: '🎵 Soft Ambient' },
                          { id: 'track2', label: '🎸 Gentle Acoustic' },
                          { id: 'track3', label: '🕊 Moment of Peace' }
                        ].map(opt => {
                          const active = opt.id === 'off' ? !renderBgMusicEnabled : (renderBgMusicEnabled && selectedBgMusicTrackId === opt.id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                if (opt.id === 'off') {
                                  setRenderBgMusicEnabled(false);
                                } else {
                                  setRenderBgMusicEnabled(true);
                                  handleSelectDefaultMusic(opt.id);
                                }
                              }}
                              disabled={isRenderingVideo || isGeneratingVoice}
                              title={opt.id === 'off' ? 'Tắt nhạc nền khi render' : `Chọn nhạc nền: ${opt.label}`}
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                borderRadius: '7px',
                                cursor: (isRenderingVideo || isGeneratingVoice) ? 'not-allowed' : 'pointer',
                                border: active ? '1px solid var(--secondary)' : '1px solid rgba(255,255,255,0.1)',
                                background: active ? 'rgba(37,244,238,0.12)' : 'rgba(0,0,0,0.3)',
                                color: active ? 'var(--secondary)' : '#fff',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Dòng tiến độ ước tính (Remotion không có % thật) - đồng bộ hiệu ứng với Bước 1/2 */}
                  {isRenderingVideo && (
                    <StepProgressBar
                      percent={renderProgress}
                      label={`${renderProgress}%`}
                      color="#10b981"
                      showShimmer={true}
                    />
                  )}
                </div>
              );
            })()}

          </div>



          {/* Video Player Preview */}
          {assetCounts.videoCreated && (
            <div style={{
              marginTop: '12px',
              marginBottom: '20px',
              padding: '16px',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <h5 style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎬</span> Review Video Thành Phẩm
                </h5>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 12px', fontSize: '0.74rem', borderRadius: '6px', fontWeight: 700 }}
                  onClick={handleOpenVideoFolder}
                  disabled={isOpeningFolder}
                >
                  {isOpeningFolder ? '⏳ Đang mở...' : '📂 Mở thư mục chứa video'}
                </button>
              </div>
              {openFolderError && (
                <p style={{ margin: '-6px 0 12px 0', fontSize: '0.74rem', color: 'var(--danger)' }}>
                  ⚠️ {openFolderError}
                </p>
              )}
              <video
                key={`${result.input?.folderPath || 'video'}-${videoVersion}`}
                src={`/api/prompts/video-stream?folderPath=${result.input?.folderPath || 'example'}&v=${videoVersion}`}
                controls
                style={{
                  width: '100%',
                  maxHeight: '480px',
                  borderRadius: '6px',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
                  outline: 'none',
                  background: '#000'
                }}
              />
            </div>
          )}



          {/* ADVANCED REMOTION CONFIG DETAILS (COLLAPSIBLE) */}
          <details style={{ marginTop: '16px', outline: 'none' }}>
            <summary style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', fontWeight: 700, userSelect: 'none' }}>
              🛠️ Xem cấu hình Remotion nâng cao (JSON & Copy)
            </summary>
            <div style={{ marginTop: '12px', background: 'rgba(0, 0, 0, 0.15)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 600 }}>Cấu hình Remotion JSON (configs/ của skill):</span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '6px', fontWeight: 700 }}
                  onClick={() => {
                    const configToCopy = result.remotionConfig || {
                      title: result.title || "slideshow-video",
                      captionPosition: "bottom",
                      imageFit: "cover",
                      kenBurns: true,
                      transitionSeconds: 0.5,
                      bgColor: "#0E0F13",
                      fontFamily: "'Be Vietnam Pro','Noto Sans',Arial,sans-serif",
                      captionMode: "chunked",
                      captionWordsPerChunk: 4,
                      audioPaddingSeconds: 0.4,
                      bgMusicVolume: 0.12,
                      scenes: result.segments.map(seg => {
                        const folder = result.input?.folderPath || 'example';
                        const imgExt = result.input?.imageExt || 'jpg';
                        const audExt = result.input?.audioExt || 'mp3';
                        const paddedNum = String(seg.segmentNumber).padStart(2, '0');
                        return {
                          image: `${folder}/images/scene-${paddedNum}.${imgExt}`,
                          audio: `${folder}/audio/scene-${paddedNum}.${audExt}`,
                          caption: seg.subtitle || seg.dialogueOrNarration || ""
                        };
                      })
                    };
                    onCopy(JSON.stringify(configToCopy, null, 2), 'remotion_config');
                  }}
                >
                  {copiedKey === 'remotion_config' ? '✓ Đã chép!' : '📋 Sao chép cấu hình'}
                </button>
              </div>
              <pre style={{
                margin: 0,
                fontSize: '0.78rem',
                lineHeight: 1.45,
                color: 'rgba(255, 255, 255, 0.85)',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '12px',
                borderRadius: '8px',
                maxHeight: '180px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {JSON.stringify(result.remotionConfig || {
                  title: result.title || "slideshow-video",
                  captionPosition: "bottom",
                  imageFit: "cover",
                  kenBurns: true,
                  transitionSeconds: 0.5,
                  bgColor: "#0E0F13",
                  fontFamily: "'Be Vietnam Pro','Noto Sans',Arial,sans-serif",
                  captionMode: "chunked",
                  captionWordsPerChunk: 4,
                  audioPaddingSeconds: 0.4,
                  bgMusicVolume: 0.12,
                  scenes: result.segments.map(seg => {
                    const folder = result.input?.folderPath || 'example';
                    const imgExt = result.input?.imageExt || 'jpg';
                    const audExt = result.input?.audioExt || 'mp3';
                    const paddedNum = String(seg.segmentNumber).padStart(2, '0');
                    return {
                      image: `${folder}/images/scene-${paddedNum}.${imgExt}`,
                      audio: `${folder}/audio/scene-${paddedNum}.${audExt}`,
                      caption: seg.subtitle || seg.dialogueOrNarration || ""
                    };
                  })
                }, null, 2)}
              </pre>
            </div>
          </details>

          {/* Status Message Alerts (Only show error messages, since success is already shown in the step pipeline status above) */}
          {voiceMsg && !voiceMsg.startsWith('✓') && (
            <div style={{
              fontSize: '0.78rem',
              color: 'var(--danger)',
              background: 'rgba(255, 71, 87, 0.08)',
              border: '1px solid rgba(255, 71, 87, 0.15)',
              padding: '8px 12px',
              borderRadius: '6px',
              marginTop: '12px',
              fontWeight: 500
            }}>
              {voiceMsg}
            </div>
          )}

          {renderMsg && !renderMsg.startsWith('✓') && (
            <div style={{
              fontSize: '0.78rem',
              color: 'var(--danger)',
              background: 'rgba(255, 71, 87, 0.08)',
              border: '1px solid rgba(255, 71, 87, 0.15)',
              padding: '8px 12px',
              borderRadius: '6px',
              marginTop: '12px',
              fontWeight: 500
            }}>
              {renderMsg}
            </div>
          )}
        </div>
      )}

      {/* Toàn bộ lời thuyết minh gộp lại - bản dự phòng để dán tay, bổ trợ cho nút tự động lồng tiếng bên dưới */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <strong style={{ color: 'var(--warning)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            <span>🎙️</span>
            <span>Toàn bộ lời thuyết minh</span>
          </strong>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '6px', fontWeight: 700, flexShrink: 0 }}
            onClick={() => {
              const fullSpeech = result.segments
                .filter(s => !s.isThumbnail && !s.dialogueOrNarration.includes('Thumbnail'))
                .map(s => {
                  // Loại bỏ tiền tố tên nhân vật (như Alex:, Mia:) nếu có để đọc liền mạch
                  return s.dialogueOrNarration.replace(/^[A-Za-z0-9\s]+:\s*/, '').trim();
                })
                .join(' ');
              onCopy(fullSpeech, 'full_speech_only');
            }}
          >
            {copiedKey === 'full_speech_only' ? '✓ Đã chép!' : '📋 Copy giọng đọc'}
          </button>
        </div>
        <p style={{ margin: '0 0 8px 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Bản dự phòng để dán tay vào công cụ TTS khác (CapCut...) — nếu muốn tự động, dùng nút &quot;🎙️ Tạo Lồng Tiếng&quot; bên dưới.
        </p>
        <p style={{
          margin: 0,
          fontSize: '0.85rem',
          lineHeight: 1.6,
          color: 'rgba(255, 255, 255, 0.85)',
          whiteSpace: 'pre-wrap',
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '12px',
          borderRadius: '8px',
          fontStyle: 'italic'
        }}>
          {result.segments.filter(s => !s.isThumbnail && !s.dialogueOrNarration.includes('Thumbnail')).map(s => s.dialogueOrNarration.replace(/^[A-Za-z0-9\s]+:\s*/, '').trim()).join(' ')}
        </p>
      </div>

      {activeTab === 'script' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5, flex: 1 }}>
              Dưới đây là kịch bản thoại đã được chia nhỏ thành các slide. Hãy sao chép lần lượt từng prompt ảnh phía dưới để sinh ảnh (bằng Midjourney/Flux) hoặc nhấn <strong>🚀 Đẩy sang Google Flow</strong> để chạy tự động qua Chrome Extension.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.78rem', flexShrink: 0, borderRadius: '8px', fontWeight: 700 }}
              onClick={() => {
                const allPrompts = result.segments.map(s => `--- Slide ${s.segmentNumber} ---\nPrompt Ảnh:\n${s.textPrompt}\n\nThoại: ${s.dialogueOrNarration}\nPhụ đề: ${s.subtitle}`).join('\n\n');
                onCopy(allPrompts, 'all_segments');
              }}
            >
              {copiedKey === 'all_segments' ? '✓ Đã sao chép!' : '📋 Sao chép toàn bộ'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {result.segments.map((seg, idx) => {
              const isThumb = seg.isThumbnail || (seg.dialogueOrNarration && seg.dialogueOrNarration.includes('Thumbnail'));
              return (
                <div key={idx} className="timeline-card" style={isThumb ? { border: '1.5px solid var(--secondary)', background: 'rgba(37, 244, 238, 0.04)', boxShadow: '0 4px 20px rgba(37, 244, 238, 0.15)' } : undefined}>
                  <div className="timeline-meta">
                    <strong style={{ color: isThumb ? 'var(--secondary)' : 'var(--primary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{isThumb ? '🖼️' : '🎬'}</span>
                      <span>{isThumb ? 'Slot Cuối: Ảnh Thu Nhỏ YouTube (Thumbnail)' : `Slide ${seg.segmentNumber}`}</span>
                    </strong>
                    {isThumb && (
                      <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: '6px', background: 'rgba(37, 244, 238, 0.15)', color: 'var(--secondary)', border: '1px solid rgba(37, 244, 238, 0.3)', fontWeight: 700 }}>
                        📌 Tóm tắt nội dung video &amp; Tăng tỷ lệ nhấp xem (CTR)
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '6px', fontWeight: 700 }}
                      onClick={() => onCopy(seg.textPrompt, `seg_${seg.segmentNumber}`)}
                    >
                      {copiedKey === `seg_${seg.segmentNumber}` ? '✓ Đã chép prompt!' : '📋 Copy Prompt Ảnh'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🖼️</span> <span>Mô tả hoạt cảnh (Visual Description)</span>
                      </span>
                      <p className="timeline-field timeline-field-visual" style={{ color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', margin: '4px 0 0 0' }}>
                        {seg.visualDescription}
                      </p>
                    </div>

                    {seg.dialogueOrNarration && (
                      <div>
                        <span style={{ color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>🎙️</span> <span>Lời thoại / Lời kể (Audio)</span>
                        </span>
                        <p className="timeline-field timeline-field-audio" style={{ color: 'var(--warning)', fontWeight: 600, margin: '4px 0 0 0' }}>
                          {seg.dialogueOrNarration}
                        </p>
                      </div>
                    )}

                    {seg.subtitle && (
                      <div>
                        <span style={{ color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>📝</span> <span>Phụ đề hiển thị</span>
                        </span>
                        <p className="timeline-field timeline-field-subtitle" style={{ whiteSpace: 'pre-line', color: '#2ed573', fontWeight: 500, margin: '4px 0 0 0' }}>
                          {seg.subtitle}
                        </p>
                      </div>
                    )}

                    <div style={{ marginTop: '8px' }}>
                      <details style={{ width: '100%' }}>
                        <summary style={{ cursor: 'pointer', color: 'var(--secondary)', fontSize: '0.78rem', fontWeight: 700, userSelect: 'none' }}>
                          Xem câu lệnh tạo ảnh đầy đủ (Midjourney/Flux Prompt)
                        </summary>
                        <div style={{
                          background: '#0a0912',
                          padding: '12px',
                          borderRadius: '8px',
                          fontSize: '0.76rem',
                          fontFamily: 'monospace',
                          marginTop: '8px',
                          whiteSpace: 'pre-wrap',
                          border: '1px solid rgba(255,255,255,0.05)',
                          color: 'rgba(255,255,255,0.65)',
                          lineHeight: 1.45
                        }}>
                          {seg.textPrompt}
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Voiceover setting block (Modal Dialog via Portal) */}
      {showVoiceConfig && mounted && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes quota-spin { to { transform: rotate(360deg); } }
          `}</style>
          <div style={{
            width: '92%',
            maxWidth: '740px',
            background: '#1a1924',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎙️</span> Cấu hình Giọng đọc theo Nhân vật
              </h4>
              <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                🆓 Edge TTS Miễn phí
              </span>
            </div>

            {previewError && (
              <p style={{ margin: '-8px 0 16px 0', fontSize: '0.74rem', color: 'var(--danger)', lineHeight: 1.5 }}>
                ⚠️ {previewError}
              </p>
            )}

            {(() => {
              const activeCharacters = detectActiveCharacters(result);
              const activeCount = activeCharacters.length;

              return (
                <>
                  <div style={{
                    background: 'rgba(37, 244, 238, 0.08)',
                    border: '1px solid rgba(37, 244, 238, 0.25)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    fontSize: '0.8rem',
                    color: '#fff'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                      <span style={{ fontSize: '1.1rem' }}>💡</span>
                      <span>
                        Kịch bản này có <strong style={{ color: 'var(--secondary)' }}>{activeCount} người đọc</strong>: {activeCharacters.map(c => `${c.icon} ${c.name} (${c.gender})`).join(', ')}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '24px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
                    {activeCharacters.map(char => {
                      const currentVal = settings.edgeVoiceMappings?.[char.key] || char.defaultVoice;

                      return (
                        <div
                          key={char.key}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1.5px solid var(--secondary)',
                            boxShadow: '0 0 16px rgba(37, 244, 238, 0.12)',
                            borderRadius: '14px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '1.4rem' }}>{char.icon}</span>
                              <div>
                                <span style={{ fontSize: '0.92rem', color: '#fff', fontWeight: 800, display: 'block' }}>
                                  {char.name}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  Nhân vật trong kịch bản
                                </span>
                              </div>
                            </div>

                            <span style={{
                              fontSize: '0.72rem',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              background: char.gender.includes('Nam') ? 'rgba(37, 244, 238, 0.15)' : char.gender.includes('Nữ') ? 'rgba(254, 44, 85, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                              color: char.gender.includes('Nam') ? 'var(--secondary)' : char.gender.includes('Nữ') ? 'var(--primary)' : '#fff',
                              border: char.gender.includes('Nam') ? '1px solid rgba(37, 244, 238, 0.3)' : char.gender.includes('Nữ') ? '1px solid rgba(254, 44, 85, 0.3)' : '1px solid rgba(255, 255, 255, 0.2)',
                              fontWeight: 700
                            }}>
                              Giới tính: {char.gender}
                            </span>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                              Chọn giọng đọc cho {char.name}:
                            </span>

                            {/* Lưới chọn giọng đọc trực quan — BỎ HOÀN TOÀN DROPDOWN <select> */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '8px' }}>
                              {EDGE_TTS_VOICES.map(v => {
                                const isSelected = currentVal === v.id;
                                const isPreviewing = previewingKey === `${char.key}_${v.id}`;

                                return (
                                  <div
                                    key={v.id}
                                    onClick={() => {
                                      setSettings(prev => ({
                                        ...prev,
                                        edgeVoiceMappings: { ...prev.edgeVoiceMappings, [char.key]: v.id }
                                      }));
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '8px',
                                      padding: '9px 12px',
                                      borderRadius: '10px',
                                      border: isSelected ? '1.5px solid var(--secondary)' : '1px solid rgba(255, 255, 255, 0.08)',
                                      background: isSelected ? 'rgba(37, 244, 238, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                                      boxShadow: isSelected ? '0 2px 12px rgba(37, 244, 238, 0.2)' : 'none',
                                      cursor: 'pointer',
                                      userSelect: 'none',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                      <span style={{ fontSize: '1.15rem', flexShrink: 0 }}>{v.icon}</span>
                                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isSelected ? 'var(--secondary)' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {v.name} {isSelected && '✓'}
                                        </span>
                                        <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {v.genderText} • {v.desc}
                                        </span>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      title={`Nghe thử giọng ${v.name}`}
                                      disabled={isPreviewing}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePreviewVoice('edge', v.id, `${char.key}_${v.id}`);
                                      }}
                                      style={{
                                        flexShrink: 0,
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        background: isPreviewing ? 'rgba(255,255,255,0.2)' : 'rgba(37, 244, 238, 0.15)',
                                        color: 'var(--secondary)',
                                        cursor: isPreviewing ? 'wait' : 'pointer',
                                        fontSize: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                    >
                                      {isPreviewing ? '⏳' : '🔊'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: 700 }}
                onClick={async () => {
                  setIsSavingSettings(true);
                  try {
                    const res = await fetch('/api/settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        geminiApiKey: settings.geminiApiKey,
                        elevenlabsApiKey: settings.elevenlabsApiKey,
                        mongodbUri: settings.mongodbUri,
                        voiceMappings: settings.voiceMappings,
                        ttsProvider: settings.ttsProvider || 'edge',
                        edgeVoiceMappings: settings.edgeVoiceMappings || {}
                      })
                    });
                    if (res.ok) {
                      alert('✓ Đã cập nhật cấu hình giọng đọc thành công!');
                      setShowVoiceConfig(false);
                      await fetchSettings();
                    } else {
                      alert('Lỗi khi lưu cấu hình.');
                    }
                  } catch (err) {
                    alert('Lỗi kết nối khi lưu.');
                  } finally {
                    setIsSavingSettings(false);
                  }
                }}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? 'Đang lưu...' : 'Lưu cấu hình giọng'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: 700 }}
                onClick={() => setShowVoiceConfig(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Cấu hình kiểu render (Modal Dialog via Portal) - phụ đề, chuyển cảnh, song ngữ.
          Chỉ áp dụng cho lần bấm "Tạo (Lại) Video" tiếp theo, không cần tạo lại kịch bản. */}
      {showRenderConfig && mounted && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes prev-crossfade-a { 0% { opacity: 1; } 100% { opacity: 0; } }
            @keyframes prev-crossfade-b { 0% { opacity: 0; } 100% { opacity: 1; } }
            @keyframes prev-slide-left-a { 0% { transform: translateX(0%); } 100% { transform: translateX(-100%); } }
            @keyframes prev-slide-left-b { 0% { transform: translateX(100%); } 100% { transform: translateX(0%); } }
            @keyframes prev-slide-right-a { 0% { transform: translateX(0%); } 100% { transform: translateX(100%); } }
            @keyframes prev-slide-right-b { 0% { transform: translateX(-100%); } 100% { transform: translateX(0%); } }
            @keyframes prev-slide-up-a { 0% { transform: translateY(0%); } 100% { transform: translateY(-100%); } }
            @keyframes prev-slide-up-b { 0% { transform: translateY(100%); } 100% { transform: translateY(0%); } }
            @keyframes prev-zoom-a { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.3); opacity: 0; } }
            @keyframes prev-zoom-b { 0% { transform: scale(0.7); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          `}</style>
          <div style={{
            width: '94%',
            maxWidth: isLandscape ? '1050px' : '920px',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            background: '#1a1924',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px 24px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚙️</span> Cấu hình kiểu render (Remotion)
              </h4>
              <span style={{
                fontSize: '0.73rem',
                padding: '4px 10px',
                borderRadius: '8px',
                background: isLandscape ? 'rgba(37, 244, 238, 0.12)' : 'rgba(254, 44, 85, 0.12)',
                color: isLandscape ? 'var(--secondary)' : 'var(--primary)',
                border: isLandscape ? '1px solid rgba(37, 244, 238, 0.3)' : '1px solid rgba(254, 44, 85, 0.3)',
                fontWeight: 700
              }}>
                {isLandscape ? '💻 Màn ngang 16:9' : '📱 Màn dọc 9:16'}
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px', display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '12px' }}>
              {isReadingPractice ? (
                // Skill reading-page-video: 2 nhóm Item (Mẫu hệ thống & Custom Presets)
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Nhóm 1: Mẫu Video Hệ Thống */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.025)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🎬</span> Mẫu Video Hệ Thống:
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>
                        Mẫu mặc định chuẩn của hệ thống
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '12px' }}>
                      {SYSTEM_READING_PRESETS.map(sysP => {
                        const active = (activePresetId === sysP.id) || (!activePresetId && isConfigMatch(sysP));
                        const matchedUserPreset = userPresets.find(p => p.name === sysP.name || p.id === sysP.id);
                        const isDefaultSys = matchedUserPreset?.isDefault || false;
                        const c = sysP.config;
                        return (
                          <div
                            key={sysP.id}
                            onClick={() => applyPreset(sysP)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '10px 8px',
                              background: active ? 'rgba(37, 244, 238, 0.12)' : 'rgba(0, 0, 0, 0.35)',
                              border: active ? '2px solid var(--secondary)' : '1px solid rgba(255,255,255,0.12)',
                              borderRadius: '14px',
                              cursor: 'pointer',
                              boxShadow: active ? '0 0 16px rgba(37,244,238,0.25)' : 'none',
                              position: 'relative',
                              transition: 'all 0.18s ease'
                            }}
                          >
                            <div style={{
                              width: '100%',
                              aspectRatio: isLandscape ? '16 / 9' : '3 / 4',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              position: 'relative',
                              background: '#141419',
                              border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                              {isDefaultSys && (
                                <div style={{
                                  position: 'absolute',
                                  top: '4px',
                                  left: '4px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(255, 203, 77, 0.95)',
                                  color: '#000',
                                  fontSize: '0.58rem',
                                  fontWeight: 900,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                                  zIndex: 2
                                }}>
                                  📌 Mặc định
                                </div>
                              )}

                              <CaptionStylePreview
                                style="page"
                                isLandscape={isLandscape}
                                textColor={c.textColor}
                                bgColor={c.bgColor}
                                font={c.font}
                                fontSize={c.fontSize}
                              />
                              {active && (
                                <div style={{
                                  position: 'absolute',
                                  top: '6px',
                                  right: '6px',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  background: 'var(--secondary)',
                                  color: '#000',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.7rem',
                                  fontWeight: 900,
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                                  zIndex: 2
                                }}>
                                  ✓
                                </div>
                              )}
                            </div>

                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: active ? 'var(--secondary)' : '#fff', textAlign: 'center' }}>
                              {sysP.name}
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '-2px' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  applyPreset(sysP);
                                  setShowRenderConfig(false);
                                  setShowCustomCapCut(true);
                                }}
                                title="Vào Studio tùy chỉnh dựa trên mẫu mặc định này"
                                style={{
                                  background: 'rgba(255,255,255,0.08)',
                                  border: '1px solid rgba(255,255,255,0.18)',
                                  color: '#fff',
                                  borderRadius: '6px',
                                  fontSize: '0.68rem',
                                  padding: '2px 6px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                ✏️ Edit
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleDefaultPreset(matchedUserPreset || sysP);
                                }}
                                title={isDefaultSys ? 'Đang làm Mặc định cho kịch bản mới (Bấm để bỏ ghim)' : 'Bấm để ghim làm preset Mặc định cho kịch bản mới'}
                                style={{
                                  background: isDefaultSys ? 'rgba(255, 203, 77, 0.25)' : 'rgba(255,255,255,0.06)',
                                  border: isDefaultSys ? '1px solid #FFCB4D' : '1px solid rgba(255,255,255,0.15)',
                                  color: isDefaultSys ? '#FFCB4D' : 'rgba(255,255,255,0.7)',
                                  borderRadius: '6px',
                                  fontSize: '0.68rem',
                                  padding: '2px 6px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                📌
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Nhóm 2: Mẫu Custom Presets */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.025)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⭐</span> Custom Presets (Mẫu Đã Lưu):
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>
                        Nhấn ✏️ để chỉnh sửa, 📌 để đặt Mặc định cho kịch bản mới
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '12px' }}>
                      {/* Dấu + Tự Tạo Mẫu Video Mới */}
                      <div
                        onClick={() => {
                          setShowRenderConfig(false);
                          setShowCustomCapCut(true);
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '12px 8px',
                          background: 'linear-gradient(135deg, rgba(37, 244, 238, 0.08), rgba(0, 242, 254, 0.03))',
                          border: '2px dashed rgba(37, 244, 238, 0.4)',
                          borderRadius: '14px',
                          cursor: 'pointer',
                          transition: 'all 0.18s ease',
                          minHeight: '160px'
                        }}
                        title="Mở Studio để thiết kế và tự tạo mẫu video mới"
                      >
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--secondary), #00f2fe)',
                          color: '#000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          fontWeight: 900,
                          boxShadow: '0 2px 10px rgba(37,244,238,0.3)'
                        }}>
                          +
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--secondary)', textAlign: 'center' }}>
                          + Tạo Mẫu Mới
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.2 }}>
                          Thiết kế mẫu mới trong Studio
                        </span>
                      </div>

                      {/* Các Preset mẫu người dùng đã lưu — lọc bỏ các bản ghi isSystemClone
                          (chỉ là chỗ giữ trạng thái ghim mặc định cho 1 Mẫu Hệ Thống, không
                          phải preset người dùng tự tạo, xem handleToggleDefaultPreset) */}
                      {userPresets.filter(p => !p.isSystemClone).map(p => {
                        const active = isPresetActive(p);
                        const c = p.config || {};
                        return (
                          <div
                            key={p.id}
                            onClick={() => applyPreset(p)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '10px 8px',
                              background: active ? 'rgba(37, 244, 238, 0.12)' : 'rgba(0, 0, 0, 0.35)',
                              border: active ? '2px solid var(--secondary)' : '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '14px',
                              cursor: 'pointer',
                              boxShadow: active ? '0 0 16px rgba(37,244,238,0.25)' : 'none',
                              position: 'relative',
                              transition: 'all 0.18s ease'
                            }}
                          >
                            <div style={{
                              width: '100%',
                              aspectRatio: isLandscape ? '16 / 9' : '3 / 4',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              position: 'relative',
                              background: '#141419',
                              border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                              {p.isDefault && (
                                <div style={{
                                  position: 'absolute',
                                  top: '4px',
                                  left: '4px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(255, 203, 77, 0.95)',
                                  color: '#000',
                                  fontSize: '0.58rem',
                                  fontWeight: 900,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                                  zIndex: 2
                                }}>
                                  📌 Mặc định
                                </div>
                              )}

                              <CaptionStylePreview
                                style="page"
                                isLandscape={isLandscape}
                                textColor={c.textColor || undefined}
                                bgColor={c.isBgTransparent ? 'transparent' : (c.bgColor || undefined)}
                                font={c.font || undefined}
                                fontSize={c.fontSize || undefined}
                              />

                              {active && (
                                <div style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  background: 'var(--secondary)',
                                  color: '#000',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.7rem',
                                  fontWeight: 900,
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                                  zIndex: 2
                                }}>
                                  ✓
                                </div>
                              )}
                            </div>

                            <span style={{
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              color: active ? 'var(--secondary)' : '#fff',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '100%'
                            }}>
                              {p.name}
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '-2px' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  applyPreset(p);
                                  setShowRenderConfig(false);
                                  setShowCustomCapCut(true);
                                }}
                                title="Vào Studio tùy chỉnh dựa trên preset này"
                                style={{
                                  background: 'rgba(255,255,255,0.08)',
                                  border: '1px solid rgba(255,255,255,0.18)',
                                  color: '#fff',
                                  borderRadius: '6px',
                                  fontSize: '0.68rem',
                                  padding: '2px 6px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                ✏️ Edit
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleDefaultPreset(p);
                                }}
                                title={p.isDefault ? 'Đang làm Mặc định cho kịch bản mới (Bấm để bỏ ghim)' : 'Bấm để ghim làm preset Mặc định cho kịch bản mới'}
                                style={{
                                  background: p.isDefault ? 'rgba(255, 203, 77, 0.25)' : 'rgba(255,255,255,0.06)',
                                  border: p.isDefault ? '1px solid #FFCB4D' : '1px solid rgba(255,255,255,0.15)',
                                  color: p.isDefault ? '#FFCB4D' : 'rgba(255,255,255,0.7)',
                                  borderRadius: '6px',
                                  fontSize: '0.68rem',
                                  padding: '2px 6px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                📌
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePreset(p.id);
                                }}
                                title={`Xóa vĩnh viễn preset "${p.name}"`}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'rgba(255,255,255,0.4)',
                                  fontSize: '0.72rem',
                                  cursor: 'pointer',
                                  padding: '1px'
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Kiểu phụ đề</span>
                      {settings?.defaultCaptionStyle && (
                        <span style={{ fontSize: '0.68rem', color: '#FFCB4D', fontWeight: 600 }}>
                          📌 Đang ghim: {settings.defaultCaptionStyle === 'box' ? 'Hộp bo tròn' : settings.defaultCaptionStyle === 'tiktok' ? 'Viền chữ TikTok' : 'Karaoke tô màu từ'}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {[
                        { value: 'box', label: 'Hộp bo tròn' },
                        { value: 'tiktok', label: 'Viền chữ TikTok' },
                        { value: 'karaoke', label: 'Karaoke tô màu từ' }
                      ].map(opt => {
                        const isPinned = settings?.defaultCaptionStyle === opt.value;
                        return (
                          <PickerCard
                            key={opt.value}
                            isLandscape={isLandscape}
                            selected={renderCaptionStyle === opt.value}
                            showCustomizeBtn={true}
                            onClick={() => handleSelectCaptionStyle(opt.value)}
                            onCustomize={() => {
                              handleSelectCaptionStyle(opt.value);
                              setShowCustomCapCut(true);
                            }}
                            label={isPinned ? `${opt.label} 📌` : opt.label}
                          >
                            <CaptionStylePreview
                              style={opt.value}
                              isLandscape={isLandscape}
                            />
                          </PickerCard>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Kiểu chuyển cảnh</span>
                      {settings?.defaultTransitionStyle && (
                        <span style={{ fontSize: '0.68rem', color: '#FFCB4D', fontWeight: 600 }}>
                          📌 Đang ghim: {settings.defaultTransitionStyle === 'crossfade' ? 'Hòa tan' : settings.defaultTransitionStyle === 'slide-left' ? 'Trượt trái' : settings.defaultTransitionStyle === 'slide-right' ? 'Trượt phải' : settings.defaultTransitionStyle === 'slide-up' ? 'Trượt lên' : 'Phóng to'}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {[
                        { value: 'crossfade', label: 'Hòa tan' },
                        { value: 'slide-left', label: 'Trượt trái' },
                        { value: 'slide-right', label: 'Trượt phải' },
                        { value: 'slide-up', label: 'Trượt lên' },
                        { value: 'zoom', label: 'Phóng to' }
                      ].map(opt => {
                        const isPinned = settings?.defaultTransitionStyle === opt.value;
                        return (
                          <PickerCard
                            key={opt.value}
                            isLandscape={isLandscape}
                            width={isLandscape ? 116 : 88}
                            selected={renderTransitionStyle === opt.value}
                            onClick={() => setRenderTransitionStyle(opt.value)}
                            label={isPinned ? `${opt.label} 📌` : opt.label}
                          >
                            <TransitionStylePreview style={opt.value} />
                          </PickerCard>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Hiển thị phụ đề song ngữ (Card Container với Toggle Switch xịn) */}
              <div
                onClick={() => setRenderBilingual(!renderBilingual)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: renderBilingual ? '1.5px solid var(--secondary)' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: renderBilingual ? 'rgba(37, 244, 238, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  boxShadow: renderBilingual ? '0 4px 20px rgba(37, 244, 238, 0.15)' : 'none',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: renderBilingual ? 'rgba(37, 244, 238, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    flexShrink: 0
                  }}>
                    🌐
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Hiện phụ đề song ngữ
                      {settings?.defaultBilingual !== undefined && settings.defaultBilingual === renderBilingual && (
                        <span style={{ fontSize: '0.66rem', color: '#FFCB4D', fontWeight: 600 }}>📌 Mặc định</span>
                      )}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      Hiển thị 2 dòng: Tiếng Anh (trên) &amp; Dịch tiếng Việt (dưới)
                    </span>
                  </div>
                </div>

                <label className="custom-switch" onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0, margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={renderBilingual}
                    onChange={(e) => setRenderBilingual(e.target.checked)}
                  />
                  <span className="switch-slider" style={{
                    backgroundColor: renderBilingual ? 'var(--secondary)' : 'rgba(255, 255, 255, 0.1)'
                  }}></span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', flexShrink: 0 }}>
              {pinRenderMsg && (
                <span style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 700, marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ✓ {pinRenderMsg}
                </span>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '8px 14px',
                  fontSize: '0.78rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activePreset?.isDefault ? 'rgba(255, 203, 77, 0.15)' : 'rgba(255,255,255,0.06)',
                  border: activePreset?.isDefault ? '1px solid #FFCB4D' : '1px solid rgba(255,255,255,0.15)',
                  color: activePreset?.isDefault ? '#FFCB4D' : '#fff',
                  cursor: isPinningRenderConfig ? 'wait' : 'pointer'
                }}
                disabled={isPinningRenderConfig}
                onClick={() => {
                  if (activePreset) {
                    handleToggleDefaultPreset(activePreset);
                  } else {
                    handlePinDefaultRenderConfig();
                  }
                }}
                title={activePreset ? `Đặt preset "${activePreset.name}" làm mặc định cho lần tạo kịch bản tiếp theo` : 'Lưu kiểu phụ đề và cấu hình làm MẶC ĐỊNH hệ thống'}
              >
                <span>📌</span> {isPinningRenderConfig ? 'Đang ghim...' : (
                  activePreset 
                    ? (activePreset.isDefault ? `"${activePreset.name}" đang Mặc định` : `Ghim "${activePreset.name}" làm Mặc định`) 
                    : 'Ghim mặc định'
                )}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.8rem', borderRadius: '8px', fontWeight: 700 }}
                onClick={() => setShowRenderConfig(false)}
              >
                Xong
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Sub-Dialog Modal riêng biệt dành cho Tuỳ chỉnh Style Phụ Đề & Bố Cục (CapCut / Reading Practice) */}
      {showCustomCapCut && mounted && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          backdropFilter: 'blur(14px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            width: '96%',
            maxWidth: '1150px',
            height: '92vh',
            maxHeight: '92vh',
            background: '#16151f',
            border: '1.5px solid var(--secondary)',
            borderRadius: '20px',
            padding: '20px 24px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 40px rgba(37, 244, 238, 0.25)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--secondary), #00f2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#000', fontWeight: 900 }}>
                  🎨
                </div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    Studio Thiết Kế Trang Đọc Video
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                    Tùy chỉnh bố cục, font chữ, màu sắc &amp; phụ đề song ngữ trực quan
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleSelectCaptionStyle(renderCaptionStyle)}
                  style={{
                    background: 'rgba(37, 244, 238, 0.08)',
                    border: '1px solid rgba(37, 244, 238, 0.25)',
                    color: 'var(--secondary)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                    transition: 'all 0.15s ease'
                  }}
                  title="Khôi phục về thông số mặc định ban đầu"
                >
                  ↺ Mặc định gốc
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomCapCut(false)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.8)',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>



            {/* Main Content Grid: Left Phone Live Preview & Right Studio Tabs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: capcutPreviewRatio === '16:9' ? '430px 1fr' : '350px 1fr',
              gap: '20px',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden'
            }}>
              {/* LEFT COLUMN: Live Screen Preview */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '12px',
                padding: '16px',
                background: 'rgba(0,0,0,0.45)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                height: '100%',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      type="button"
                      onClick={() => setCapcutPreviewRatio('9:16')}
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.75rem',
                        borderRadius: '7px',
                        border: capcutPreviewRatio === '9:16' ? '1px solid var(--primary)' : '1px solid transparent',
                        background: capcutPreviewRatio === '9:16' ? 'rgba(254, 44, 85, 0.2)' : 'transparent',
                        color: capcutPreviewRatio === '9:16' ? 'var(--primary)' : 'rgba(255,255,255,0.6)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      📱 9:16 Màn Dọc
                    </button>
                    <button
                      type="button"
                      onClick={() => setCapcutPreviewRatio('16:9')}
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.75rem',
                        borderRadius: '7px',
                        border: capcutPreviewRatio === '16:9' ? '1px solid var(--secondary)' : '1px solid transparent',
                        background: capcutPreviewRatio === '16:9' ? 'rgba(37, 244, 238, 0.2)' : 'transparent',
                        color: capcutPreviewRatio === '16:9' ? 'var(--secondary)' : 'rgba(255,255,255,0.6)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      💻 16:9 Màn Ngang
                    </button>
                  </div>
                </div>

                <div style={{
                  flex: 1,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 0,
                  padding: '4px 0'
                }}>
                  <div style={{
                    height: capcutPreviewRatio === '16:9' ? 'auto' : '100%',
                    width: capcutPreviewRatio === '16:9' ? '100%' : 'auto',
                    aspectRatio: capcutPreviewRatio === '16:9' ? '16 / 9' : '9 / 16',
                    maxHeight: '100%',
                    maxWidth: '100%',
                    position: 'relative',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: customScreenBg,
                    border: capcutPreviewRatio === '16:9' ? '2px solid var(--secondary)' : '2px solid var(--primary)',
                    boxShadow: capcutPreviewRatio === '16:9' ? '0 0 30px rgba(37,244,238,0.3)' : '0 0 30px rgba(254,44,85,0.3)'
                  }}>
                    {isReadingPractice ? (
                      <ReadingPageLivePreview
                        isLandscape={capcutPreviewRatio === '16:9'}
                        heroPercent={renderHeroHeightPercent !== undefined && renderHeroHeightPercent !== '' ? Number(renderHeroHeightPercent) : 25}
                        titlePercent={Number(renderTitleHeightPercent) || 10}
                        bodyPercent={Number(renderBodyHeightPercent) || 40}
                        titleFontSize={Number(renderTitleFontSize) || 44}
                        bodyFontSize={Number(renderCaptionFontSize) || 44}
                        titleGap={renderTitleBodyGap !== undefined && renderTitleBodyGap !== '' ? Number(renderTitleBodyGap) : 18}
                        contentPaddingPercent={Number(renderContentPaddingPercent) || 10}
                        bodyAlign={renderBodyAlign}
                        textColor={renderCaptionTextColor || '#1A1A1A'}
                        bgColor={renderCaptionBgColor || '#F5F2EB'}
                        isBgTransparent={renderCaptionBgTransparent}
                        highlightColor="#D8B07A"
                        heroImageUrl={`/api/prompts/image-stream?folderPath=${encodeURIComponent(result.input?.folderPath || 'example')}&file=images/${heroFileBase}.${result.input?.imageExt || 'jpg'}&v=${heroImageVersion}&category=${encodeURIComponent(result.category || '')}`}
                        realTitle={result.title || result.input?.topic || result.input?.headline}
                        realBodyPrimary={(() => {
                          const segs = result.segments || result.prompts || [];
                          if (Array.isArray(segs) && segs.length > 0) {
                            const textArr = segs
                              .filter(s => !s.isThumbnail)
                              .map(s => {
                                const txt = s.text || s.originalText || s.caption || s.subtitle || '';
                                return txt.includes('\n') ? txt.split('\n')[0] : txt;
                              })
                              .filter(Boolean);
                            if (textArr.length > 0) return textArr.join(' ');
                          }
                          return '';
                        })()}
                        realBodySecondary={(() => {
                          const segs = result.segments || result.prompts || [];
                          if (Array.isArray(segs) && segs.length > 0) {
                            const textArr = segs
                              .filter(s => !s.isThumbnail)
                              .map(s => {
                                const txt = s.subtitle || s.translation || s.text || s.caption || '';
                                return txt.includes('\n') ? txt.split('\n')[1] : (s.translation || s.subtitle || '');
                              })
                              .filter(Boolean);
                            if (textArr.length > 0) return textArr.join(' ');
                          }
                          return '';
                        })()}
                        showBilingual={renderBilingual}
                        bgOpacity={renderCaptionBgOpacity}
                        imageMode={renderImageMode}
                        level={result.input?.level || result.level}
                      />
                    ) : (
                      <CaptionStylePreview
                        style={renderCaptionStyle}
                        isLandscape={capcutPreviewRatio === '16:9'}
                        textColor={renderCaptionTextColor || undefined}
                        bgColor={renderCaptionBgTransparent ? 'transparent' : (renderCaptionBgColor || undefined)}
                        font={renderCaptionFont || undefined}
                        fontSize={renderCaptionFontSize || undefined}
                        isFullLiveScreen={true}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Tabbed Customization Panel */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden'
              }}>
                {/* Sticky Tab Navigation Bar */}
                <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                  {[
                    { key: 'style', label: '🎨 Màu & Giao diện' },
                    { key: 'layout', label: '📐 Bố cục % & Vị trí' },
                    { key: 'typography', label: '🔤 Font & Cỡ chữ' },
                    ...(isReadingPractice ? [{ key: 'music', label: '🎵 Nhạc nền' }] : [])
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setCustomTab(tab.key)}
                      style={{
                        flex: 1,
                        padding: '8px 6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        borderRadius: '9px',
                        border: customTab === tab.key ? '1px solid var(--secondary)' : '1px solid transparent',
                        background: customTab === tab.key ? 'rgba(37, 244, 238, 0.15)' : 'transparent',
                        color: customTab === tab.key ? 'var(--secondary)' : 'rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Scrollable Tab Panel Container */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* TAB 1: MÀU SẮC & GIAO DIỆN */}
                  {customTab === 'style' && (
                    <>
                      {/* Ảnh minh họa & Chế độ vị trí */}
                      {isReadingPractice && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>📷 Ảnh minh hoạ &amp; Bố cục hiển thị</span>
                            <label
                              className="btn btn-secondary"
                              style={{ padding: '5px 12px', fontSize: '0.72rem', borderRadius: '8px', fontWeight: 700, cursor: isUploadingHeroImage ? 'wait' : 'pointer' }}
                            >
                              {isUploadingHeroImage ? '⏳ Đang tải...' : '📤 Đổi ảnh minh họa'}
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                disabled={isUploadingHeroImage}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  handleUploadHeroImage(file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            {[
                              { mode: 'hero', icon: '🖼️', title: 'Hero Top', desc: '(Ảnh nằm ngang)' },
                              { mode: 'full_bg', icon: '📱', title: 'Full Nền Sau', desc: '(Ảnh nằm dọc)' },
                              { mode: 'none', icon: '🎨', title: 'Không dùng ảnh', desc: '(Nền màu/giấy)' }
                            ].map(item => (
                              <button
                                key={item.mode}
                                type="button"
                                onClick={() => setRenderImageMode(item.mode)}
                                style={{
                                  padding: '10px 8px',
                                  borderRadius: '10px',
                                  border: renderImageMode === item.mode ? '1.5px solid var(--secondary)' : '1px solid rgba(255,255,255,0.08)',
                                  background: renderImageMode === item.mode ? 'rgba(37, 244, 238, 0.14)' : 'rgba(0,0,0,0.3)',
                                  color: renderImageMode === item.mode ? '#fff' : 'rgba(255,255,255,0.7)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '2px',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                                <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>{item.title}</span>
                                <span style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.5)' }}>{item.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bảng màu có sẵn 1-Click (Color Swatches) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>🌈 Palette màu sắc nhanh (1-Click)</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                          {[
                            { name: '📜 Vintage', bg: '#F5F2EB', text: '#1A1A1A' },
                            { name: '🌙 Dark Mode', bg: '#0A0A0E', text: '#FFFFFF' },
                            { name: '☁️ Clean White', bg: '#FFFFFF', text: '#111827' },
                            { name: '🫐 Pastel Blue', bg: '#EBF3FA', text: '#1E293B' }
                          ].map(swatch => (
                            <button
                              key={swatch.name}
                              type="button"
                              onClick={() => {
                                setRenderCaptionBgColor(swatch.bg);
                                setRenderCaptionTextColor(swatch.text);
                                setRenderCaptionBgTransparent(false);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: (renderCaptionBgColor === swatch.bg && renderCaptionTextColor === swatch.text) ? '1.5px solid var(--secondary)' : '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(0,0,0,0.3)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: swatch.bg, border: '1px solid rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: swatch.text, fontWeight: 900 }}>
                                A
                              </div>
                              <span style={{ fontSize: '0.74rem', color: '#fff', fontWeight: 600 }}>{swatch.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Color Pickers Tùy chỉnh */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>🖍️ Màu chữ</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="color"
                              value={renderCaptionTextColor || '#FFFFFF'}
                              onChange={(e) => setRenderCaptionTextColor(e.target.value)}
                              style={{ width: '38px', height: '38px', padding: '2px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', cursor: 'pointer' }}
                            />
                            <input
                              type="text"
                              value={renderCaptionTextColor || '#FFFFFF'}
                              onChange={(e) => setRenderCaptionTextColor(e.target.value)}
                              style={{ flex: 1, fontSize: '0.78rem', padding: '6px 10px', height: '38px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>🖼️ Màu nền trang giấy</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="color"
                              value={renderCaptionBgColor || '#F5F2EB'}
                              onChange={(e) => setRenderCaptionBgColor(e.target.value)}
                              style={{ width: '38px', height: '38px', padding: '2px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', cursor: 'pointer' }}
                            />
                            <input
                              type="text"
                              value={renderCaptionBgColor || '#F5F2EB'}
                              onChange={(e) => setRenderCaptionBgColor(e.target.value)}
                              style={{ flex: 1, fontSize: '0.78rem', padding: '6px 10px', height: '38px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Tùy chọn Switch Phụ đề song ngữ & Nền trong suốt */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div
                          onClick={() => setRenderCaptionBgTransparent(!renderCaptionBgTransparent)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: renderCaptionBgTransparent ? 'rgba(37, 244, 238, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                            border: renderCaptionBgTransparent ? '1px solid rgba(37, 244, 238, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600 }}>
                            👁️ Nền trang trong suốt (bỏ khung giấy, chỉ giữ lại chữ trên ảnh)
                          </span>
                          <label className="custom-switch" onClick={(e) => e.stopPropagation()} style={{ margin: 0, transform: 'scale(0.85)' }}>
                            <input
                              type="checkbox"
                              checked={renderCaptionBgTransparent}
                              onChange={(e) => setRenderCaptionBgTransparent(e.target.checked)}
                            />
                            <span className="switch-slider" style={{ backgroundColor: renderCaptionBgTransparent ? 'var(--secondary)' : 'rgba(255, 255, 255, 0.1)' }}></span>
                          </label>
                        </div>

                        <div
                          onClick={() => setRenderBilingual(!renderBilingual)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: renderBilingual ? 'rgba(37, 244, 238, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                            border: renderBilingual ? '1px solid rgba(37, 244, 238, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600 }}>
                            🌐 Hiện phụ đề song ngữ (hiện bản dịch tiếng Việt bên dưới)
                          </span>
                          <label className="custom-switch" onClick={(e) => e.stopPropagation()} style={{ margin: 0, transform: 'scale(0.85)' }}>
                            <input
                              type="checkbox"
                              checked={renderBilingual}
                              onChange={(e) => setRenderBilingual(e.target.checked)}
                            />
                            <span className="switch-slider" style={{ backgroundColor: renderBilingual ? 'var(--secondary)' : 'rgba(255, 255, 255, 0.1)' }}></span>
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  {/* TAB 2: BỐ CỤC % & VỊ TRÍ */}
                  {customTab === 'layout' && (
                    <>
                      {isReadingPractice ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>📐 Điều chỉnh tỷ lệ % khung hình</span>

                          {[
                            { label: 'Ảnh minh hoạ (Hero)', value: renderHeroHeightPercent, set: setRenderHeroHeightPercent, min: 0, max: 60 },
                            { label: 'Tiêu đề bài viết', value: renderTitleHeightPercent, set: setRenderTitleHeightPercent, min: 4, max: 30 },
                            { label: 'Khung nội dung chính', value: renderBodyHeightPercent, set: setRenderBodyHeightPercent, min: 15, max: 75 }
                          ].map(field => (
                            <div key={field.label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{field.label}</span>
                                <span style={{ fontSize: '0.74rem', color: 'var(--secondary)', fontWeight: 800, background: 'rgba(37,244,238,0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                                  {field.value !== undefined && field.value !== '' ? `${field.value}%` : '0%'}
                                </span>
                              </div>
                              <input
                                type="range"
                                min={field.min}
                                max={field.max}
                                step={1}
                                value={field.value !== undefined && field.value !== '' ? field.value : 0}
                                onChange={(e) => field.set(e.target.value)}
                                style={{ width: '100%', cursor: 'pointer' }}
                              />
                            </div>
                          ))}

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)' }}>Khoảng trống dưới trang (Bottom gap):</span>
                            <span style={{ fontSize: '0.76rem', color: '#4ade80', fontWeight: 800 }}>
                              {Math.max(0, 100 - (Number(renderHeroHeightPercent) || 25) - (Number(renderTitleHeightPercent) || 10) - (Number(renderBodyHeightPercent) || 40))}% (tự động)
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Padding xung quanh (%)</span>
                                <span style={{ fontSize: '0.74rem', color: 'var(--secondary)', fontWeight: 800 }}>{renderContentPaddingPercent || 0}%</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={30}
                                step={1}
                                value={renderContentPaddingPercent || 0}
                                onChange={(e) => setRenderContentPaddingPercent(e.target.value)}
                                style={{ width: '100%', cursor: 'pointer' }}
                              />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>📃 Căn lề văn bản</span>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {[
                                  { value: 'left', label: '⬅️ Trái' },
                                  { value: 'center', label: '↔️ Giữa' },
                                  { value: 'justify', label: '↕️ Đều' }
                                ].map(opt => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setRenderBodyAlign(opt.value)}
                                    style={{
                                      flex: 1,
                                      padding: '6px 4px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      border: renderBodyAlign === opt.value ? '1px solid var(--secondary)' : '1px solid rgba(255,255,255,0.1)',
                                      background: renderBodyAlign === opt.value ? 'rgba(37,244,238,0.15)' : 'rgba(0,0,0,0.3)',
                                      color: renderBodyAlign === opt.value ? 'var(--secondary)' : 'rgba(255,255,255,0.7)'
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>Bố cục % chỉ áp dụng cho dạng bài trang đọc Reading Practice.</p>
                      )}
                    </>
                  )}

                  {/* TAB 3: FONT CHỮ & CỠ CHỮ */}
                  {customTab === 'typography' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>🔤 Kiểu chữ &amp; Phông chữ (Typography)</span>

                      {/* Font chữ Selector */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Phông chữ (Font Family)</label>
                        <select
                          className="form-control"
                          value={renderCaptionFont}
                          onChange={(e) => setRenderCaptionFont(e.target.value)}
                          style={{ fontSize: '0.8rem', padding: '8px 12px', height: '40px', background: 'rgba(0,0,0,0.35)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px' }}
                        >
                          <option value="" style={{ background: '#16151f' }}>✨ Mặc định tiêu chuẩn</option>
                          <option value="be-vietnam-pro" style={{ background: '#16151f' }}>Be Vietnam Pro (Chuẩn Việt Nam)</option>
                          <option value="nunito" style={{ background: '#16151f' }}>Nunito (Tròn ấm, thân thiện)</option>
                          <option value="montserrat" style={{ background: '#16151f' }}>Montserrat (Sang trọng, nổi bật)</option>
                          <option value="lexend" style={{ background: '#16151f' }}>Lexend (Dễ đọc cho giáo dục)</option>
                          <option value="roboto" style={{ background: '#16151f' }}>Roboto</option>
                          <option value="inter" style={{ background: '#16151f' }}>Inter</option>
                        </select>
                      </div>

                      {/* Cỡ chữ tiêu đề & Cỡ chữ nội dung */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {isReadingPractice && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Cỡ chữ tiêu đề (px)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setRenderTitleFontSize(Math.max(20, (Number(renderTitleFontSize) || 44) - 2))}
                                style={{ width: '32px', height: '36px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                className="form-control"
                                value={renderTitleFontSize}
                                onChange={(e) => setRenderTitleFontSize(e.target.value)}
                                style={{ textAlign: 'center', fontSize: '0.8rem', padding: '6px', height: '36px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
                              />
                              <button
                                type="button"
                                onClick={() => setRenderTitleFontSize(Math.min(80, (Number(renderTitleFontSize) || 44) + 2))}
                                style={{ width: '32px', height: '36px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Cỡ chữ nội dung (px)</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setRenderCaptionFontSize(Math.max(16, (Number(renderCaptionFontSize) || 20) - 2))}
                              style={{ width: '32px', height: '36px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              className="form-control"
                              value={renderCaptionFontSize}
                              onChange={(e) => setRenderCaptionFontSize(e.target.value)}
                              style={{ textAlign: 'center', fontSize: '0.8rem', padding: '6px', height: '36px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
                            />
                            <button
                              type="button"
                              onClick={() => setRenderCaptionFontSize(Math.min(120, (Number(renderCaptionFontSize) || 20) + 2))}
                              style={{ width: '32px', height: '36px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {isReadingPractice && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Khoảng cách tiêu đề - nội dung (px)</label>
                          <input
                            type="range"
                            min={0}
                            max={60}
                            value={renderTitleBodyGap}
                            onChange={(e) => setRenderTitleBodyGap(e.target.value)}
                            style={{ width: '100%', cursor: 'pointer' }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: NHẠC NỀN (Dành riêng cho Reading Practice) */}
                  {customTab === 'music' && isReadingPractice && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      padding: '16px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                        <div>
                          <h4 style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 800, margin: '0 0 2px 0' }}>
                            🎵 Nhạc nền hòa âm (Phát nhỏ dưới giọng đọc)
                          </h4>
                          <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)' }}>
                            Tự động hòa âm phát xuyên suốt video ở âm lượng nhỏ, làm video thêm cảm xúc.
                          </span>
                        </div>
                        {assetCounts.hasBgMusic && (
                          <label className="custom-switch" style={{ margin: 0, transform: 'scale(0.9)', flexShrink: 0 }}>
                            <input
                              type="checkbox"
                              checked={renderBgMusicEnabled}
                              onChange={(e) => setRenderBgMusicEnabled(e.target.checked)}
                            />
                            <span className="switch-slider" style={{
                              backgroundColor: renderBgMusicEnabled ? 'var(--secondary)' : 'rgba(255, 255, 255, 0.1)'
                            }}></span>
                          </label>
                        )}
                      </div>

                      {/* Kho Nhạc Nền Mặc Định Hệ Thống (3 bản nhạc) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          ⚡ Kho nhạc nền mặc định hệ thống (3 bản nhạc nhẹ)
                        </span>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                          {[
                            { id: 'track1', name: 'Andriig Soft Ambient', desc: 'Êm ái, thư thái', file: '/default-bg-music/track1.mp3' },
                            { id: 'track2', name: 'Andriig Gentle Acoustic', desc: 'Sâu lắng, ấm áp', file: '/default-bg-music/track2.mp3' },
                            { id: 'track3', name: 'Moment of Peace', desc: 'Du dương, chữa lành', file: '/default-bg-music/track3.mp3' }
                          ].map(track => {
                            const isSelected = selectedBgMusicTrackId === track.id && assetCounts.hasBgMusic;
                            return (
                              <div
                                key={track.id}
                                style={{
                                  padding: '10px',
                                  borderRadius: '8px',
                                  background: isSelected ? 'rgba(37, 244, 238, 0.1)' : 'rgba(0,0,0,0.35)',
                                  border: isSelected ? '2px solid var(--secondary)' : '1px solid rgba(255,255,255,0.08)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                  transition: 'all 0.18s ease'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: isSelected ? 'var(--secondary)' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    🎵 {track.name}
                                  </span>
                                  {isSelected && (
                                    <span style={{ fontSize: '0.62rem', background: 'var(--secondary)', color: '#000', padding: '1px 5px', borderRadius: '4px', fontWeight: 900, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                      ✓ Đang chọn
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.5)' }}>{track.desc}</span>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => togglePreviewTrack(track.id, track.file)}
                                    style={{
                                      padding: '6px 8px',
                                      borderRadius: '6px',
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      border: playingPreviewTrackId === track.id ? '1px solid var(--secondary)' : '1px solid rgba(255,255,255,0.15)',
                                      cursor: 'pointer',
                                      background: playingPreviewTrackId === track.id ? 'rgba(37,244,238,0.15)' : 'rgba(255,255,255,0.06)',
                                      color: playingPreviewTrackId === track.id ? 'var(--secondary)' : '#fff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px',
                                      transition: 'all 0.15s'
                                    }}
                                  >
                                    {playingPreviewTrackId === track.id ? '⏸ Dừng' : '▶ Nghe thử'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleSelectDefaultMusic(track.id)}
                                    disabled={isSelectingDefaultMusic}
                                    style={{
                                      padding: '6px 8px',
                                      borderRadius: '6px',
                                      fontSize: '0.7rem',
                                      fontWeight: 800,
                                      border: 'none',
                                      cursor: isSelectingDefaultMusic ? 'wait' : 'pointer',
                                      background: isSelected ? 'rgba(37, 244, 238, 0.25)' : 'linear-gradient(135deg, var(--secondary), #4ade80)',
                                      color: isSelected ? 'var(--secondary)' : '#000',
                                      transition: 'all 0.15s',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {isSelectingDefaultMusic ? '⏳...' : (isSelected ? '✓ Đã chọn' : '✓ Chọn ngay')}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {!assetCounts.hasBgMusic ? (
                        <div style={{ padding: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.6rem' }}>🎼</span>
                          <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, maxWidth: '380px' }}>
                            Hoặc bạn cũng có thể tải lên tệp nhạc MP3/M4A tùy chỉnh riêng bên dưới.
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4ade80' }}>✓ Đã áp dụng nhạc nền (bg-music.mp3)</span>
                            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>Trạng thái: {renderBgMusicEnabled ? 'Đang bật' : 'Tắt'}</span>
                          </div>
                          <audio
                            key={bgMusicVersion}
                            controls
                            src={`/api/prompts/image-stream?folderPath=${encodeURIComponent(result.input?.folderPath || 'example')}&file=audio/bg-music.mp3&v=${bgMusicVersion}&category=${encodeURIComponent(result.category || '')}`}
                            style={{ width: '100%', height: '36px' }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: renderBgMusicEnabled ? 1 : 0.5, paddingTop: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>🔊 Âm lượng nhạc nền:</span>
                                <span style={{
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  color: 'var(--secondary)',
                                  background: 'rgba(37,244,238,0.12)',
                                  border: '1px solid rgba(37,244,238,0.3)',
                                  padding: '2px 8px',
                                  borderRadius: '6px'
                                }}>
                                  {renderBgMusicVolume}% {String(renderBgMusicVolume) === '6' ? '(Mặc định chuẩn 6%)' : ''}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => setShowCustomBgMusicVolume(!showCustomBgMusicVolume)}
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: showCustomBgMusicVolume ? 'var(--secondary)' : 'rgba(255,255,255,0.7)',
                                  background: showCustomBgMusicVolume ? 'rgba(37,244,238,0.1)' : 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                                }}
                              >
                                {showCustomBgMusicVolume ? '▲ Ẩn thanh chỉnh' : '⚙️ Tùy chỉnh âm lượng'}
                              </button>
                            </div>

                            {showCustomBgMusicVolume && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px', animation: 'fadeIn 0.2s ease-out' }}>
                                <input
                                  type="range"
                                  min={0}
                                  max={40}
                                  value={renderBgMusicVolume}
                                  disabled={!renderBgMusicEnabled}
                                  onChange={(e) => setRenderBgMusicVolume(e.target.value)}
                                  style={{ width: '100%', cursor: renderBgMusicEnabled ? 'pointer' : 'not-allowed' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'rgba(255,255,255,0.4)' }}>
                                  <span>0% (Tắt)</span>
                                  <span>6% (Tiêu chuẩn)</span>
                                  <span>40% (Tối đa)</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {bgMusicUploadError && (
                        <span style={{ fontSize: '0.74rem', color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', padding: '8px 12px', borderRadius: '6px' }}>⚠️ {bgMusicUploadError}</span>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label
                          className="btn btn-secondary"
                          style={{
                            padding: '8px 16px',
                            fontSize: '0.78rem',
                            borderRadius: '8px',
                            fontWeight: 700,
                            cursor: isUploadingBgMusic ? 'wait' : 'pointer',
                            textAlign: 'center',
                            alignSelf: 'flex-start',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {isUploadingBgMusic ? '⏳ Đang tải tệp nhạc...' : '📤 Tải nhạc từ máy tính lên (MP3 / M4A)'}
                          <input
                            type="file"
                            accept="audio/*"
                            style={{ display: 'none' }}
                            disabled={isUploadingBgMusic}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              handleUploadBgMusic(file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sub-Dialog Footer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', flexShrink: 0 }}>
              {isSavingPreset && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  background: 'rgba(37, 244, 238, 0.08)',
                  border: '1px solid rgba(37, 244, 238, 0.3)',
                  borderRadius: '10px'
                }}>
                  <input
                    type="text"
                    placeholder="Nhập tên Mẫu Preset mới (vd: Đọc Sáng Gold, Card Tối, Chuẩn CapCut...)"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSavePreset(); }}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '6px',
                      color: '#fff'
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSavePreset}
                    style={{ padding: '6px 14px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: 700 }}
                  >
                    Lưu Preset
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setIsSavingPreset(false); setNewPresetName(''); }}
                    style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                  >
                    Hủy
                  </button>
                </div>
              )}

              {presetMsg && (
                <div style={{ fontSize: '0.76rem', color: '#2ed573', fontWeight: 700, padding: '2px 4px' }}>
                  {presetMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsSavingPreset(!isSavingPreset)}
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.78rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'linear-gradient(135deg, rgba(37, 244, 238, 0.15), rgba(0, 242, 254, 0.15))',
                      border: '1px solid rgba(37, 244, 238, 0.4)',
                      color: 'var(--secondary)',
                      cursor: 'pointer'
                    }}
                    title="Lưu toàn bộ thông số đang chỉnh sửa hiện tại thành 1 Preset mẫu mới"
                  >
                    <span>💾</span> {isSavingPreset ? 'Đóng form lưu' : 'Lưu thành Preset mới...'}
                  </button>

                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '8px 22px', fontSize: '0.82rem', borderRadius: '8px', fontWeight: 700, background: 'linear-gradient(135deg, var(--secondary), #00f2fe)', color: '#000', border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(37,244,238,0.3)' }}
                  onClick={handleSaveAndApply}
                >
                  Lưu &amp; Áp dụng
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
