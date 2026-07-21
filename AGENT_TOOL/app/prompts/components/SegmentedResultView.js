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
    font: '',
    fontSize: '',
    textColor: '#241C10',
    bgColor: '#F3EAD9',
    bgTransparent: false
  }
};

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
  imageMode = 'hero'
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

              {/* Bản dịch tiếng Việt — chỉ hiển thị khi bật tùy chọn Song Ngữ */}
              {showBilingual && (
                <span style={{
                  fontSize: `${secondaryFontSize}px`,
                  fontWeight: 500,
                  color: textColor,
                  opacity: 0.78,
                  textAlign: bodyAlign === 'justify' ? 'justify' : bodyAlign === 'center' ? 'center' : 'left',
                  lineHeight: 1.4
                }}>
                  {displaySecondary}
                </span>
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
    videoCreated: false
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
    const currentHeroUrl = `/api/prompts/image-stream?folderPath=${encodeURIComponent(folder)}&file=images/scene-01-landscape.${result.input?.imageExt || 'jpg'}${cacheBust}`;

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
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [presetMsg, setPresetMsg] = useState('');
  // Chỉ tự áp dụng preset mặc định MỘT LẦN duy nhất (lần đầu load kịch bản này) — fetchPresets
  // còn được gọi lại mỗi lần mở/đóng modal tuỳ chỉnh, không muốn ghi đè lên các chỉnh sửa tay
  // người dùng đã thực hiện trong lúc đó.
  const hasAppliedDefaultPresetRef = useRef(false);

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
          const defaultPreset = data.presets.find(p => p.isDefault);
          if (defaultPreset) applyPreset(defaultPreset);
        }
      }
    } catch (err) {
      console.error('Error fetching presets:', err);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, [showCustomCapCut, isReadingPractice]);

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
      bilingual: renderBilingual
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
    const nextIsDefault = !preset.isDefault;
    const category = isReadingPractice ? 'reading_practice' : 'caption_style';
    const updated = userPresets.map(p => ({
      ...p,
      isDefault: p.id === preset.id ? nextIsDefault : (nextIsDefault ? false : p.isDefault)
    }));
    setUserPresets(updated);
    localStorage.setItem(`custom_presets_${category}`, JSON.stringify(updated));

    try {
      const res = await fetch('/api/prompts/presets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: preset.id, isDefault: nextIsDefault })
      });
      if (!res.ok) fetchPresets();
    } catch (err) {
      console.error('Error updating default preset:', err);
      fetchPresets();
    }
  };

  const applyPreset = (preset) => {
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
  };

  // Preset nào đang khớp với TOÀN BỘ thông số hiện tại trên form -> coi là preset "đang chọn",
  // để hiện rõ trạng thái active thay vì mọi preset trông giống hệt nhau. Chỉ so các trường
  // preset đó thực sự có lưu (bỏ qua field undefined), đúng như cách applyPreset() áp dụng.
  const isPresetActive = (preset) => {
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
      [c.bilingual, renderBilingual]
    ];
    return pairs.every(([saved, current]) => saved === undefined || String(saved) === String(current));
  };

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
          videoCreated: data.videoCreated
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
          imageMode: isReadingPractice ? renderImageMode : undefined
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
                          Bước 2: Tạo giọng lồng tiếng ({settings.ttsProvider === 'elevenlabs' ? 'ElevenLabs' : 'Edge TTS - Miễn phí'})
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        title={`Cấu hình giọng đọc (${settings.ttsProvider === 'elevenlabs' ? 'ElevenLabs' : 'Edge TTS'})`}
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
            width: '90%',
            maxWidth: '640px',
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
                <span>🎙️</span> Cấu hình Giọng đọc
              </h4>
              {settings.ttsProvider === 'edge' || !settings.ttsProvider ? (
                <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  🆓 Miễn phí, không giới hạn ký tự
                </span>
              ) : loadingQuota ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span className="quota-spinner" style={{
                    width: '13px', height: '13px', borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'var(--secondary)',
                    animation: 'quota-spin 0.7s linear infinite'
                  }} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Đang tải...</span>
                </span>
              ) : quota ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }} title={`Còn lại ${quota.remaining?.toLocaleString()} / ${quota.characterLimit?.toLocaleString()} ký tự miễn phí`}>
                  <QuotaRing percent={quota.characterLimit ? (quota.characterCount / quota.characterLimit) * 100 : 0} />
                  <span style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#00f2fe', fontWeight: 600 }}>{quota.remaining?.toLocaleString()}</span>
                    <span style={{ color: 'var(--text-muted)' }}>/{quota.characterLimit?.toLocaleString()} còn lại</span>
                  </span>
                </span>
              ) : quotaError ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }} title={quotaError}>⚠️ Lỗi quota</span>
                  <button
                    type="button"
                    onClick={fetchQuota}
                    style={{ background: 'none', border: 'none', color: 'var(--secondary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, padding: 0, whiteSpace: 'nowrap' }}
                  >
                    Thử lại
                  </button>
                </span>
              ) : null}
            </div>

            {/* Chọn nhà cung cấp lồng tiếng — Edge TTS (miễn phí) hoặc ElevenLabs (chất lượng cao) */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
              {[
                { value: 'edge', label: '🆓 Edge TTS (miễn phí)', hint: 'Không giới hạn, không cần API key' },
                { value: 'elevenlabs', label: '💎 ElevenLabs', hint: 'Chất lượng cao, giới hạn theo ký tự' }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, ttsProvider: opt.value }))}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    border: (settings.ttsProvider || 'edge') === opt.value ? '1.5px solid var(--secondary)' : '1px solid rgba(255,255,255,0.1)',
                    background: (settings.ttsProvider || 'edge') === opt.value ? 'rgba(37,244,238,0.1)' : 'rgba(255,255,255,0.02)'
                  }}
                >
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: (settings.ttsProvider || 'edge') === opt.value ? 'var(--secondary)' : '#fff' }}>{opt.label}</span>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)' }}>{opt.hint}</span>
                </button>
              ))}
            </div>

            {previewError && (
              <p style={{ margin: '-8px 0 16px 0', fontSize: '0.74rem', color: 'var(--danger)', lineHeight: 1.5 }}>
                ⚠️ {previewError}
              </p>
            )}

            {settings.ttsProvider === 'edge' || !settings.ttsProvider ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                {[
                  { key: 'alex', label: 'Giọng Alex', gender: 'Nam' },
                  { key: 'mia', label: 'Giọng Mia', gender: 'Nữ' },
                  { key: 'leo', label: 'Giọng Leo', gender: 'Nam' },
                  { key: 'narrator', label: 'Giọng Người kể (Narrator)', gender: null }
                ].map(char => {
                  const defaultId = char.gender === 'Nam' ? DEFAULT_EDGE_MALE_VOICE : DEFAULT_EDGE_FEMALE_VOICE;
                  const currentVal = settings.edgeVoiceMappings?.[char.key] || defaultId;
                  const isPreviewing = previewingKey === char.key;

                  return (
                    <div
                      key={char.key}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <label style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <span>🎙️</span> {char.label}
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select
                          className="form-control"
                          value={currentVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSettings(prev => ({
                              ...prev,
                              edgeVoiceMappings: { ...prev.edgeVoiceMappings, [char.key]: val }
                            }));
                          }}
                          style={{
                            flex: 1,
                            fontSize: '0.76rem',
                            padding: '8px 10px',
                            height: '36px',
                            background: 'rgba(0, 0, 0, 0.35)',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '8px'
                          }}
                        >
                          {EDGE_TTS_VOICES.map(v => (
                            <option key={v.id} value={v.id} style={{ background: '#1a1924' }}>{v.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          title="Nghe thử giọng này"
                          disabled={isPreviewing}
                          onClick={() => handlePreviewVoice('edge', currentVal, char.key)}
                          style={{
                            flexShrink: 0,
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(37, 244, 238, 0.12)',
                            color: 'var(--secondary)',
                            cursor: isPreviewing ? 'wait' : 'pointer',
                            fontSize: '0.9rem'
                          }}
                        >
                          {isPreviewing ? '⏳' : '🔊'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                {quotaError && (
                  <p style={{ margin: '-10px 0 16px 0', fontSize: '0.74rem', color: 'var(--danger)', lineHeight: 1.5 }}>
                    ⚠️ {quotaError}
                  </p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              {[
                { key: 'alex', label: 'Giọng Alex', gender: 'Nam', defaultId: 'wJSBXsvChUQrylZvDzav' },
                { key: 'mia', label: 'Giọng Mia', gender: 'Nữ', defaultId: '4IQqf6fVNeEFbqnSbVxb' },
                { key: 'leo', label: 'Giọng Leo', gender: 'Nam', defaultId: 'wJSBXsvChUQrylZvDzav' },
                { key: 'narrator', label: 'Giọng Người kể (Narrator)', gender: null, defaultId: '4IQqf6fVNeEFbqnSbVxb' }
              ].map(char => {
                const currentVal = settings.voiceMappings?.[char.key] || char.defaultId;
                const femaleId = '4IQqf6fVNeEFbqnSbVxb';
                const maleId = 'wJSBXsvChUQrylZvDzav';

                return (
                  <div
                    key={char.key}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <span>🎙️</span> {char.label}
                      </label>

                      {/* Hiển thị Badge giới tính cố định cho Alex (Nam), Mia (Nữ), Leo (Nam) 
                          Giữ nút chọn Nam/Nữ cho Giọng Người kể (Narrator) */}
                      {char.gender ? (
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: char.gender === 'Nam' ? 'rgba(37, 244, 238, 0.12)' : 'rgba(254, 44, 85, 0.12)',
                          color: char.gender === 'Nam' ? 'var(--secondary)' : 'var(--primary)',
                          border: char.gender === 'Nam' ? '1px solid rgba(37, 244, 238, 0.25)' : '1px solid rgba(254, 44, 85, 0.25)',
                          fontWeight: 700
                        }}>
                          {char.gender === 'Nam' ? '👨 Nam' : '👩 Nữ'}
                        </span>
                      ) : (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            title="Chọn Nhanh Giọng Nam"
                            onClick={() => setSettings(prev => ({ ...prev, voiceMappings: { ...prev.voiceMappings, [char.key]: maleId } }))}
                            style={{
                              padding: '3px 8px',
                              fontSize: '0.68rem',
                              borderRadius: '6px',
                              border: currentVal === maleId ? '1px solid var(--secondary)' : '1px solid rgba(255,255,255,0.1)',
                              background: currentVal === maleId ? 'rgba(37, 244, 238, 0.15)' : 'rgba(255,255,255,0.03)',
                              color: currentVal === maleId ? 'var(--secondary)' : 'rgba(255,255,255,0.6)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            👨 Nam
                          </button>
                          <button
                            type="button"
                            title="Chọn Nhanh Giọng Nữ"
                            onClick={() => setSettings(prev => ({ ...prev, voiceMappings: { ...prev.voiceMappings, [char.key]: femaleId } }))}
                            style={{
                              padding: '3px 8px',
                              fontSize: '0.68rem',
                              borderRadius: '6px',
                              border: currentVal === femaleId ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                              background: currentVal === femaleId ? 'rgba(254, 44, 85, 0.15)' : 'rgba(255,255,255,0.03)',
                              color: currentVal === femaleId ? 'var(--primary)' : 'rgba(255,255,255,0.6)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            👩 Nữ
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Single Input Field for ElevenLabs Voice ID + nút nghe thử */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Dán ElevenLabs Voice ID vào đây..."
                        style={{
                          flex: 1,
                          fontSize: '0.78rem',
                          padding: '8px 12px',
                          height: '36px',
                          background: 'rgba(0, 0, 0, 0.35)',
                          color: '#fff',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '8px',
                          fontFamily: 'monospace',
                          letterSpacing: '0.3px'
                        }}
                        value={currentVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings(prev => ({
                            ...prev,
                            voiceMappings: {
                              ...prev.voiceMappings,
                              [char.key]: val
                            }
                          }));
                        }}
                      />
                      <button
                        type="button"
                        title="Nghe thử giọng này"
                        disabled={previewingKey === char.key || !currentVal}
                        onClick={() => handlePreviewVoice('elevenlabs', currentVal, char.key)}
                        style={{
                          flexShrink: 0,
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: 'rgba(37, 244, 238, 0.12)',
                          color: 'var(--secondary)',
                          cursor: previewingKey === char.key ? 'wait' : 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        {previewingKey === char.key ? '⏳' : '🔊'}
                      </button>
                    </div>
                  </div>
                );
              })}
                </div>
              </>
            )}

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
            width: '90%',
            maxWidth: isLandscape ? '700px' : '580px',
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
                // Skill reading-page-video chỉ có 1 kiểu trang giấy karaoke duy nhất
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    onClick={() => setShowCustomCapCut(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(37, 244, 238, 0.25)',
                      background: 'rgba(37, 244, 238, 0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{
                      width: '110px',
                      aspectRatio: isLandscape ? '16 / 9' : '3 / 4',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      position: 'relative',
                      background: '#141419',
                      border: '2px solid rgba(255,255,255,0.12)',
                      flexShrink: 0
                    }}>
                      <CaptionStylePreview
                        style="page"
                        isLandscape={isLandscape}
                        textColor={renderCaptionTextColor || undefined}
                        bgColor={renderCaptionBgTransparent ? 'transparent' : (renderCaptionBgColor || undefined)}
                        font={renderCaptionFont || undefined}
                        fontSize={renderCaptionFontSize || undefined}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>🎨 Tuỳ chỉnh chi tiết trang đọc...</span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        Font chữ, cỡ chữ, màu chữ, bố cục &amp; màu nền trang giấy
                      </span>
                    </div>
                  </div>

                  {/* Preset Mẫu đã lưu (Hiển thị chọn nhanh trực tiếp tại đây) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.76rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>⭐</span> Preset mẫu đã lưu:
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>
                        Nhấn 📌 trên 1 preset để đặt mặc định cho lần tạo kịch bản tiếp theo
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {userPresets.map(p => {
                        const active = isPresetActive(p);
                        const c = p.config || {};
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => applyPreset(p)}
                            title={active ? `Đang dùng preset "${p.name}"` : `Nhấp để chọn ngay mẫu preset "${p.name}"`}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '6px',
                              width: '78px',
                              padding: '6px',
                              background: active ? 'rgba(37, 244, 238, 0.14)' : 'rgba(255,255,255,0.03)',
                              border: active ? '1.5px solid var(--secondary)' : '1px solid rgba(255,255,255,0.12)',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              boxShadow: active ? '0 0 12px rgba(37,244,238,0.3)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{
                              width: '100%',
                              aspectRatio: isLandscape ? '16 / 9' : '3 / 4',
                              borderRadius: '7px',
                              overflow: 'hidden',
                              position: 'relative',
                              background: '#141419',
                              border: '1.5px solid rgba(255,255,255,0.12)'
                            }}>
                              <CaptionStylePreview
                                style="page"
                                isLandscape={isLandscape}
                                textColor={c.textColor || undefined}
                                bgColor={c.isBgTransparent ? 'transparent' : (c.bgColor || undefined)}
                                font={c.font || undefined}
                                fontSize={c.fontSize || undefined}
                              />
                              <div
                                role="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleDefaultPreset(p);
                                }}
                                title={p.isDefault ? 'Đang là preset mặc định cho lần tạo tiếp theo — nhấn để bỏ mặc định' : 'Đặt làm preset mặc định cho lần tạo kịch bản tiếp theo'}
                                style={{
                                  position: 'absolute',
                                  top: '3px',
                                  left: '3px',
                                  width: '17px',
                                  height: '17px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.62rem',
                                  cursor: 'pointer',
                                  background: p.isDefault ? '#FFCB4D' : 'rgba(0,0,0,0.55)',
                                  color: p.isDefault ? '#2A2118' : 'rgba(255,255,255,0.65)',
                                  boxShadow: p.isDefault ? '0 1px 4px rgba(0,0,0,0.5)' : 'none',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                📌
                              </div>
                              {active && (
                                <div style={{
                                  position: 'absolute',
                                  top: '3px',
                                  right: '3px',
                                  width: '17px',
                                  height: '17px',
                                  borderRadius: '50%',
                                  background: 'var(--secondary)',
                                  color: '#04262a',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.62rem',
                                  fontWeight: 900,
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.5)'
                                }}>
                                  ✓
                                </div>
                              )}
                            </div>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: active ? 'var(--secondary)' : '#fff',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '100%'
                            }}>
                              {p.name}
                            </span>
                            {p.isDefault && (
                              <span style={{ fontSize: '0.62rem', color: '#FFCB4D', fontWeight: 700, marginTop: '-4px' }}>
                                📌 mặc định
                              </span>
                            )}
                          </button>
                        );
                      })}

                      {userPresets.length === 0 && (
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                          (Chưa có preset nào. Mở "Tùy chỉnh trang đọc" để tự tạo và lưu preset mới!)
                        </span>
                      )}
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
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  cursor: isPinningRenderConfig ? 'wait' : 'pointer'
                }}
                disabled={isPinningRenderConfig}
                onClick={handlePinDefaultRenderConfig}
                title="Lưu kiểu phụ đề, kiểu chuyển cảnh và phụ đề song ngữ này làm MẶC ĐỊNH cho tất cả lần tạo sau"
              >
                <span>📌</span> {isPinningRenderConfig ? 'Đang ghim...' : 'Ghim mặc định'}
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
            background: '#181722',
            border: '1.5px solid var(--secondary)',
            borderRadius: '20px',
            padding: '20px 24px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 35px rgba(37, 244, 238, 0.2)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <h4 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎨</span> Tuỳ chỉnh Phụ Đề &amp; Bố Cục Màn Hình
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleSelectCaptionStyle(renderCaptionStyle)}
                  style={{
                    background: 'rgba(37, 244, 238, 0.08)',
                    border: '1px solid rgba(37, 244, 238, 0.25)',
                    color: 'var(--secondary)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                    transition: 'all 0.15s ease'
                  }}
                  title="Khôi phục về thông số mặc định của kiểu phụ đề hiện tại"
                >
                  ↺ Mặc định kiểu này
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomCapCut(false)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.8)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Preset Selection & Save Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>⭐</span> Preset mẫu:
                </span>

                {userPresets.map(p => (
                  <div
                    key={p.id}
                    onClick={() => applyPreset(p)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      background: 'rgba(37, 244, 238, 0.1)',
                      border: '1px solid rgba(37, 244, 238, 0.3)',
                      borderRadius: '8px',
                      fontSize: '0.74rem',
                      color: 'var(--secondary)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title={`Nhấn để áp dụng ngay mẫu preset "${p.name}"`}
                  >
                    <span>📁 {p.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePreset(p.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        padding: '0 2px',
                        lineHeight: 1
                      }}
                      title="Xóa preset này"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {userPresets.length === 0 && (
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                    (Chưa có preset tùy chỉnh nào được lưu)
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsSavingPreset(!isSavingPreset)}
                style={{
                  background: 'linear-gradient(135deg, rgba(37, 244, 238, 0.2), rgba(0, 242, 254, 0.2))',
                  border: '1px solid rgba(37, 244, 238, 0.4)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>💾</span> Lưu cấu hình hiện tại...
              </button>
            </div>

            {/* Form nhập tên Preset khi lưu */}
            {isSavingPreset && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                background: 'rgba(37, 244, 238, 0.08)',
                border: '1px solid rgba(37, 244, 238, 0.3)',
                borderRadius: '10px',
                flexShrink: 0
              }}>
                <input
                  type="text"
                  placeholder="Nhập tên Mẫu Preset (vd: Đọc Sáng Gold, Card Tối, Chuẩn CapCut...)"
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
              <div style={{ fontSize: '0.76rem', color: '#2ed573', fontWeight: 700, padding: '4px 10px', flexShrink: 0 }}>
                {presetMsg}
              </div>
            )}

            {/* Modal Body Container — 2 Column Grid (Left: Live Preview, Right: Custom Controls) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: capcutPreviewRatio === '16:9' ? '440px 1fr' : '360px 1fr',
              gap: '20px',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden'
            }}>
              {/* LEFT COLUMN: Live Preview Screen Container */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '12px',
                padding: '16px',
                background: 'rgba(0,0,0,0.4)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                height: '100%',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', flexShrink: 0 }}>
                  {/* Nút bấm chuyển đổi tỉ lệ màn hình mô phỏng */}
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
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
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
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      💻 16:9 Màn Ngang
                    </button>
                  </div>
                </div>

                {/* Khung mô phỏng màn hình thật — Chiếm trọn chiều cao còn lại */}
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
                    boxShadow: capcutPreviewRatio === '16:9' ? '0 0 30px rgba(37,244,238,0.3)' : '0 0 30px rgba(254,44,85,0.3)',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}>
                  {isReadingPractice ? (
                    <ReadingPageLivePreview
                      isLandscape={capcutPreviewRatio === '16:9'}
                      heroPercent={renderHeroHeightPercent !== undefined && renderHeroHeightPercent !== '' ? Number(renderHeroHeightPercent) : 25}
                      titlePercent={Number(renderTitleHeightPercent) || 10}
                      bodyPercent={Number(renderBodyHeightPercent) || 40}
                      titleFontSize={Number(renderTitleFontSize) || 44}
                      bodyFontSize={Number(renderCaptionFontSize) || 20}
                      titleGap={renderTitleBodyGap !== undefined && renderTitleBodyGap !== '' ? Number(renderTitleBodyGap) : 18}
                      contentPaddingPercent={Number(renderContentPaddingPercent) || 10}
                      bodyAlign={renderBodyAlign}
                      textColor={renderCaptionTextColor || '#1A1A1A'}
                      bgColor={renderCaptionBgColor || '#F5F2EB'}
                      isBgTransparent={renderCaptionBgTransparent}
                      highlightColor="#D8B07A"
                      heroImageUrl={`/api/prompts/image-stream?folderPath=${encodeURIComponent(result.input?.folderPath || 'example')}&file=images/${heroFileBase}.${result.input?.imageExt || 'jpg'}&v=${heroImageVersion}`}
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
                        if (Array.isArray(result.remotionConfig?.scenes)) {
                          const scenesArr = result.remotionConfig.scenes
                            .map(s => (s.caption || s.text || '').split('\n')[0])
                            .filter(Boolean);
                          if (scenesArr.length > 0) return scenesArr.join(' ');
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
                        if (Array.isArray(result.remotionConfig?.scenes)) {
                          const scenesArr = result.remotionConfig.scenes
                            .map(s => {
                              const cap = s.caption || s.text || '';
                              return cap.includes('\n') ? cap.split('\n')[1] : '';
                            })
                            .filter(Boolean);
                          if (scenesArr.length > 0) return scenesArr.join(' ');
                        }
                        return '';
                      })()}
                      showBilingual={renderBilingual}
                      bgOpacity={renderCaptionBgOpacity}
                      imageMode={renderImageMode}
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

                {/* Nút chọn Màu nền màn hình mô phỏng (Tối, Sáng, Gradient, Tùy chọn) — chỉ áp dụng cho
                    kiểu phụ đề box/tiktok/karaoke */}
                {!isReadingPractice && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Thử màu nền:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                      {[
                        { label: '⬛ Đen', bg: '#0d0d12' },
                        { label: '🌑 Tối', bg: '#252538' },
                        { label: '⬜ Sáng', bg: '#e2e8f0' },
                        { label: '🟦 Xanh', bg: '#1e3c72' },
                        { label: '🌆 Tráng lệ', bg: 'linear-gradient(135deg, #2c3e50, #fd746c)' }
                      ].map(preset => (
                        <button
                          key={preset.label}
                          type="button"
                          title={`Đổi nền sang ${preset.label}`}
                          onClick={() => setCustomScreenBg(preset.bg)}
                          style={{
                            padding: '3px 7px',
                            fontSize: '0.64rem',
                            borderRadius: '5px',
                            border: customScreenBg === preset.bg ? '1px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                            background: preset.bg,
                            color: preset.label.includes('Sáng') ? '#000' : '#fff',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: customScreenBg === preset.bg ? '0 0 6px rgba(255,255,255,0.4)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}

                      {/* Color Picker Tùy chỉnh màu nền màn mô phỏng */}
                      <input
                        type="color"
                        title="Chọn màu nền màn hình xem trước tùy chỉnh"
                        value={customScreenBg.startsWith('#') ? customScreenBg : '#252538'}
                        onChange={(e) => setCustomScreenBg(e.target.value)}
                        style={{
                          width: '22px',
                          height: '22px',
                          padding: 0,
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '5px',
                          background: 'transparent',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Custom Controls Form Panel */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                overflowY: 'auto',
                paddingRight: '6px'
              }}>
                {/* Hero image replace — chỉ cho reading_practice */}
                {isReadingPractice && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        backgroundImage: `url(/api/prompts/image-stream?folderPath=${encodeURIComponent(result.input?.folderPath || 'example')}&file=images/${heroFileBase}.${result.input?.imageExt || 'jpg'}&v=${heroImageVersion})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        border: '1px solid rgba(255,255,255,0.15)'
                      }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>🖼️ Ảnh minh hoạ đầu trang</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tải ảnh từ máy để thay thế ảnh Google Flow</span>
                        {heroImageUploadError && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--danger)' }}>⚠️ {heroImageUploadError}</span>
                        )}
                      </div>
                      <label
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.74rem', borderRadius: '8px', fontWeight: 700, cursor: isUploadingHeroImage ? 'wait' : 'pointer', flexShrink: 0 }}
                      >
                        {isUploadingHeroImage ? '⏳ Đang tải...' : '📤 Đổi ảnh'}
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

                    {/* Selector 3 Chế độ hiển thị vị trí ảnh minh hoạ */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', marginTop: '6px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>📷 Bố cục vị trí ảnh minh hoạ (3 Chế độ):</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setRenderImageMode('hero')}
                          style={{
                            padding: '8px 6px',
                            fontSize: '0.73rem',
                            fontWeight: 700,
                            borderRadius: '8px',
                            border: renderImageMode === 'hero' ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                            background: renderImageMode === 'hero' ? 'rgba(254, 44, 85, 0.15)' : 'rgba(0,0,0,0.3)',
                            color: renderImageMode === 'hero' ? '#fff' : 'rgba(255,255,255,0.7)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            textAlign: 'center'
                          }}
                        >
                          <span>🖼️ Hero Top</span>
                          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>(Ảnh nằm ngang)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRenderImageMode('full_bg')}
                          style={{
                            padding: '8px 6px',
                            fontSize: '0.73rem',
                            fontWeight: 700,
                            borderRadius: '8px',
                            border: renderImageMode === 'full_bg' ? '1px solid var(--secondary)' : '1px solid rgba(255,255,255,0.1)',
                            background: renderImageMode === 'full_bg' ? 'rgba(37, 244, 238, 0.15)' : 'rgba(0,0,0,0.3)',
                            color: renderImageMode === 'full_bg' ? '#fff' : 'rgba(255,255,255,0.7)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            textAlign: 'center'
                          }}
                        >
                          <span>📱 Full Nền Sau</span>
                          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>(Ảnh nằm dọc)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRenderImageMode('none')}
                          style={{
                            padding: '8px 6px',
                            fontSize: '0.73rem',
                            fontWeight: 700,
                            borderRadius: '8px',
                            border: renderImageMode === 'none' ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
                            background: renderImageMode === 'none' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)',
                            color: renderImageMode === 'none' ? '#fff' : 'rgba(255,255,255,0.7)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            textAlign: 'center'
                          }}
                        >
                          <span>🎨 Không dùng ảnh</span>
                          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>(Nền giấy/màu)</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Layout (CapCut-style) — chỉ cho reading_practice */}
                {isReadingPractice && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>📐 Bố cục (% khung hình)</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      {[
                        { label: 'Ảnh minh hoạ (Hero)', value: renderHeroHeightPercent, set: setRenderHeroHeightPercent, min: 0, max: 60 },
                        { label: 'Tiêu đề', value: renderTitleHeightPercent, set: setRenderTitleHeightPercent, min: 4, max: 30 },
                        { label: 'Nội dung', value: renderBodyHeightPercent, set: setRenderBodyHeightPercent, min: 15, max: 75 }
                      ].map(field => (
                        <div key={field.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{field.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                title="Giảm 1%"
                                onClick={() => {
                                  const curr = field.value !== undefined && field.value !== '' ? Number(field.value) : field.min;
                                  field.set(Math.max(field.min, curr - 1));
                                }}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  padding: 0,
                                  borderRadius: '4px',
                                  border: '1px solid rgba(255,255,255,0.15)',
                                  background: 'rgba(0,0,0,0.3)',
                                  color: 'var(--secondary)',
                                  fontSize: '0.62rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  lineHeight: 1
                                }}
                              >
                                ▼
                              </button>
                              <span style={{ color: 'var(--secondary)', fontWeight: 700, minWidth: '30px', textAlign: 'center' }}>
                                {field.value !== undefined && field.value !== '' ? `${field.value}%` : '-%'}
                              </span>
                              <button
                                type="button"
                                title="Tăng 1%"
                                onClick={() => {
                                  const curr = field.value !== undefined && field.value !== '' ? Number(field.value) : field.min;
                                  field.set(Math.min(field.max, curr + 1));
                                }}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  padding: 0,
                                  borderRadius: '4px',
                                  border: '1px solid rgba(255,255,255,0.15)',
                                  background: 'rgba(0,0,0,0.3)',
                                  color: 'var(--secondary)',
                                  fontSize: '0.62rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  lineHeight: 1
                                }}
                              >
                                ▲
                              </button>
                            </div>
                          </label>
                          <input
                            type="range"
                            min={field.min}
                            max={field.max}
                            step={1}
                            value={field.value !== undefined && field.value !== '' ? field.value : 0}
                            onChange={(e) => field.set(e.target.value)}
                            onKeyDown={(e) => {
                              const curr = field.value !== undefined && field.value !== '' ? Number(field.value) : field.min;
                              if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                                e.preventDefault();
                                field.set(Math.min(field.max, curr + 1));
                              } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                                e.preventDefault();
                                field.set(Math.max(field.min, curr - 1));
                              }
                            }}
                            style={{ width: '100%', cursor: 'pointer' }}
                          />
                        </div>
                      ))}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Khoảng trống cuối trang</label>
                        <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.5)', paddingTop: '4px' }}>
                          {Math.max(0, 100 - (Number(renderHeroHeightPercent) || 25) - (Number(renderTitleHeightPercent) || 10) - (Number(renderBodyHeightPercent) || 40))}% (tự động, phần còn lại)
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>🔠 Cỡ chữ tiêu đề (px)</label>
                        <input
                          type="number"
                          className="form-control"
                          min={20}
                          max={80}
                          value={renderTitleFontSize}
                          onChange={(e) => setRenderTitleFontSize(e.target.value)}
                          style={{ fontSize: '0.8rem', padding: '8px 10px', height: '36px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>↕️ Khoảng cách tiêu đề - nội dung (px)</label>
                        <input
                          type="number"
                          className="form-control"
                          min={0}
                          max={80}
                          value={renderTitleBodyGap}
                          onChange={(e) => setRenderTitleBodyGap(e.target.value)}
                          style={{ fontSize: '0.8rem', padding: '8px 10px', height: '36px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>↔️ Padding xung quanh (%)</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              title="Giảm 1%"
                              onClick={() => setRenderContentPaddingPercent(Math.max(0, (Number(renderContentPaddingPercent) || 0) - 1))}
                              style={{
                                width: '18px',
                                height: '18px',
                                padding: 0,
                                borderRadius: '4px',
                                border: '1px solid rgba(255,255,255,0.15)',
                                background: 'rgba(0,0,0,0.3)',
                                color: 'var(--secondary)',
                                fontSize: '0.62rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                lineHeight: 1
                              }}
                            >
                              ▼
                            </button>
                            <span style={{ color: 'var(--secondary)', fontWeight: 700, minWidth: '30px', textAlign: 'center' }}>
                              {renderContentPaddingPercent || '0'}%
                            </span>
                            <button
                              type="button"
                              title="Tăng 1%"
                              onClick={() => setRenderContentPaddingPercent(Math.min(30, (Number(renderContentPaddingPercent) || 0) + 1))}
                              style={{
                                width: '18px',
                                height: '18px',
                                padding: 0,
                                borderRadius: '4px',
                                border: '1px solid rgba(255,255,255,0.15)',
                                background: 'rgba(0,0,0,0.3)',
                                color: 'var(--secondary)',
                                fontSize: '0.62rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                lineHeight: 1
                              }}
                            >
                              ▲
                            </button>
                          </div>
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={30}
                          step={1}
                          value={renderContentPaddingPercent || 0}
                          onChange={(e) => setRenderContentPaddingPercent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                              e.preventDefault();
                              setRenderContentPaddingPercent(Math.min(30, (Number(renderContentPaddingPercent) || 0) + 1));
                            } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                              e.preventDefault();
                              setRenderContentPaddingPercent(Math.max(0, (Number(renderContentPaddingPercent) || 0) - 1));
                            }
                          }}
                          style={{ width: '100%', cursor: 'pointer' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>📃 Căn nội dung</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {[
                            {
                              value: 'left',
                              title: 'Căn trái',
                              icon: (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M3 4h18v2H3V4zm0 5h12v2H3V9zm0 5h18v2H3v-2zm0 5h12v2H3v-2z"/>
                                </svg>
                              )
                            },
                            {
                              value: 'center',
                              title: 'Căn giữa',
                              icon: (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M3 4h18v2H3V4zm3 5h12v2H6V9zm-3 5h18v2H3v-2zm3 5h12v2H6v-2z"/>
                                </svg>
                              )
                            },
                            {
                              value: 'justify',
                              title: 'Căn đều',
                              icon: (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M3 4h18v2H3V4zm0 5h18v2H3V9zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/>
                                </svg>
                              )
                            }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              title={opt.title}
                              onClick={() => setRenderBodyAlign(opt.value)}
                              style={{
                                flex: 1,
                                padding: '8px 6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                border: renderBodyAlign === opt.value ? '1px solid var(--secondary)' : '1px solid rgba(255,255,255,0.1)',
                                background: renderBodyAlign === opt.value ? 'rgba(37,244,238,0.15)' : 'rgba(0,0,0,0.3)',
                                color: renderBodyAlign === opt.value ? 'var(--secondary)' : 'rgba(255,255,255,0.7)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {opt.icon}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Controls Form Grid: Font & Cỡ chữ */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {/* Font chữ */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>🔤 Font chữ</label>
                    <select
                      className="form-control"
                      value={renderCaptionFont}
                      onChange={(e) => setRenderCaptionFont(e.target.value)}
                      style={{ fontSize: '0.8rem', padding: '8px 10px', height: '38px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    >
                      <option value="" style={{ background: '#1a1924' }}>Mặc định kiểu phụ đề</option>
                      <option value="be-vietnam-pro" style={{ background: '#1a1924' }}>Be Vietnam Pro</option>
                      <option value="roboto" style={{ background: '#1a1924' }}>Roboto</option>
                      <option value="montserrat" style={{ background: '#1a1924' }}>Montserrat</option>
                      <option value="nunito" style={{ background: '#1a1924' }}>Nunito</option>
                      <option value="inter" style={{ background: '#1a1924' }}>Inter</option>
                      <option value="oswald" style={{ background: '#1a1924' }}>Oswald</option>
                      {isReadingPractice && (
                        <option value="poppins" style={{ background: '#1a1924' }}>Poppins (không dấu tiếng Việt)</option>
                      )}
                    </select>
                  </div>

                  {/* Cỡ chữ */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>📏 Cỡ chữ {isReadingPractice ? 'nội dung ' : ''}(px)</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="number"
                        className="form-control"
                        min={16}
                        max={120}
                        placeholder="Mặc định"
                        value={renderCaptionFontSize}
                        onChange={(e) => setRenderCaptionFontSize(e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '8px 10px', paddingRight: '30px', height: '38px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      />
                      <span style={{ position: 'absolute', right: '10px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }}>px</span>
                    </div>
                  </div>

                  {/* Màu chữ */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>🖍️ Màu chữ</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="color"
                        value={renderCaptionTextColor || '#FFFFFF'}
                        onChange={(e) => setRenderCaptionTextColor(e.target.value)}
                        style={{ width: '36px', height: '36px', padding: '2px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="#FFFFFF"
                        value={renderCaptionTextColor}
                        onChange={(e) => setRenderCaptionTextColor(e.target.value)}
                        style={{ fontSize: '0.78rem', padding: '8px', height: '36px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontFamily: 'monospace' }}
                      />
                      {renderCaptionTextColor && (
                        <button type="button" onClick={() => setRenderCaptionTextColor('')} className="btn btn-secondary" style={{ padding: '4px 8px', height: '36px', fontSize: '0.75rem', borderRadius: '8px', flexShrink: 0 }}>✕</button>
                      )}
                    </div>
                  </div>

                  {/* Màu nền */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>🖼️ Màu nền {isReadingPractice ? 'trang giấy' : 'phụ đề'}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="color"
                        value={renderCaptionBgColor || '#0A0A0E'}
                        onChange={(e) => setRenderCaptionBgColor(e.target.value)}
                        disabled={renderCaptionBgTransparent}
                        style={{ width: '36px', height: '36px', padding: '2px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', cursor: renderCaptionBgTransparent ? 'not-allowed' : 'pointer', opacity: renderCaptionBgTransparent ? 0.3 : 1, flexShrink: 0 }}
                      />
                      <input
                        type="text"
                        className="form-control"
                        placeholder={renderCaptionBgTransparent ? 'Trong suốt' : '#0A0A0E'}
                        value={renderCaptionBgTransparent ? '' : renderCaptionBgColor}
                        onChange={(e) => setRenderCaptionBgColor(e.target.value)}
                        disabled={renderCaptionBgTransparent}
                        style={{ fontSize: '0.78rem', padding: '8px', height: '36px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontFamily: 'monospace', opacity: renderCaptionBgTransparent ? 0.4 : 1 }}
                      />
                      {renderCaptionBgColor && !renderCaptionBgTransparent && (
                        <button type="button" onClick={() => setRenderCaptionBgColor('')} className="btn btn-secondary" style={{ padding: '4px 8px', height: '36px', fontSize: '0.75rem', borderRadius: '8px', flexShrink: 0 }}>✕</button>
                      )}
                    </div>
                  </div>

                  {/* Độ mờ / Opacity màu nền (%) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>💧 Độ mờ / Opacity màu nền (%)</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          title="Giảm 1%"
                          onClick={() => setRenderCaptionBgOpacity(Math.max(0, (Number(renderCaptionBgOpacity) || 0) - 1))}
                          style={{
                            width: '18px',
                            height: '18px',
                            padding: 0,
                            borderRadius: '4px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            background: 'rgba(0,0,0,0.3)',
                            color: 'var(--secondary)',
                            fontSize: '0.62rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1
                          }}
                        >
                          ▼
                        </button>
                        <span style={{ color: 'var(--secondary)', fontWeight: 700, minWidth: '34px', textAlign: 'center' }}>
                          {renderCaptionBgOpacity || '100'}%
                        </span>
                        <button
                          type="button"
                          title="Tăng 1%"
                          onClick={() => setRenderCaptionBgOpacity(Math.min(100, (Number(renderCaptionBgOpacity) || 0) + 1))}
                          style={{
                            width: '18px',
                            height: '18px',
                            padding: 0,
                            borderRadius: '4px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            background: 'rgba(0,0,0,0.3)',
                            color: 'var(--secondary)',
                            fontSize: '0.62rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1
                          }}
                        >
                          ▲
                        </button>
                      </div>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={renderCaptionBgOpacity || 100}
                      disabled={renderCaptionBgTransparent}
                      onChange={(e) => setRenderCaptionBgOpacity(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                          e.preventDefault();
                          setRenderCaptionBgOpacity(Math.min(100, (Number(renderCaptionBgOpacity) || 0) + 1));
                        } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                          e.preventDefault();
                          setRenderCaptionBgOpacity(Math.max(0, (Number(renderCaptionBgOpacity) || 0) - 1));
                        }
                      }}
                      style={{ width: '100%', cursor: renderCaptionBgTransparent ? 'not-allowed' : 'pointer', opacity: renderCaptionBgTransparent ? 0.3 : 1 }}
                    />
                  </div>
                </div>

                {/* Nền trong suốt Pill Switch */}
                <div
                  onClick={() => setRenderCaptionBgTransparent(!renderCaptionBgTransparent)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '10px 14px',
                    background: renderCaptionBgTransparent ? 'rgba(37, 244, 238, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: renderCaptionBgTransparent ? '1px solid rgba(37, 244, 238, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: renderCaptionBgTransparent ? '#fff' : 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                    👁️ {isReadingPractice ? 'Trang giấy trong suốt (bỏ nền, chỉ còn chữ trên ảnh)' : 'Nền phụ đề trong suốt (bỏ hộp màu)'}
                  </span>
                  <label className="custom-switch" onClick={(e) => e.stopPropagation()} style={{ margin: 0, transform: 'scale(0.85)', flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={renderCaptionBgTransparent}
                      onChange={(e) => setRenderCaptionBgTransparent(e.target.checked)}
                    />
                    <span className="switch-slider" style={{
                      backgroundColor: renderCaptionBgTransparent ? 'var(--secondary)' : 'rgba(255, 255, 255, 0.1)'
                    }}></span>
                  </label>
                </div>

                {/* Option Hiển thị phụ đề song ngữ Switch */}
                <div
                  onClick={() => setRenderBilingual(!renderBilingual)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '10px 14px',
                    background: renderBilingual ? 'rgba(37, 244, 238, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: renderBilingual ? '1px solid rgba(37, 244, 238, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: renderBilingual ? '#fff' : 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                    🌐 Hiện phụ đề song ngữ (hiện bản dịch tiếng Việt bên dưới)
                  </span>
                  <label className="custom-switch" onClick={(e) => e.stopPropagation()} style={{ margin: 0, transform: 'scale(0.85)', flexShrink: 0 }}>
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
            </div>

            {/* Sub-Dialog Footer */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '8px 22px', fontSize: '0.82rem', borderRadius: '8px', fontWeight: 700, background: 'linear-gradient(135deg, var(--secondary), #00f2fe)', color: '#000', border: 'none', cursor: 'pointer' }}
                onClick={() => setShowCustomCapCut(false)}
              >
                Lưu &amp; Áp dụng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
