'use client';

import { useState, useLayoutEffect, useRef } from 'react';

// Ảnh xem trước LAYOUT thật của skill reading-page-video (hero ảnh / tiêu đề / nội dung / khoảng
// trống) — mô phỏng đúng cấu trúc ReadingCard.tsx (25/10/40/25% mặc định), cập nhật trực tiếp
// theo % đang kéo, để có trải nghiệm chỉnh kiểu CapCut thấy ngay kết quả trước khi render thật.
export default function ReadingPageLivePreview({
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
