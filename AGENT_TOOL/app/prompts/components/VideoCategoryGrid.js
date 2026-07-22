'use client';

import { PROMPT_CATEGORIES } from '@/lib/prompts/index.js';

const CARD_CONFIGS = {
  stick_figure_slideshow: {
    bgImg: '/card-bg/stick_figure_slideshow.png',
    badge: '🔥 HOT SKILL',
    badgeBg: 'linear-gradient(135deg, #fe2c55, #ff0055)',
    accentColor: '#fe2c55',
    glowColor: 'rgba(254, 44, 85, 0.25)',
    tags: ['🎨 2D Người Que Nhất Quán', '📱 9:16 & 💻 16:9', '🎬 Remotion Slideshow MP4']
  },
  reading_practice: {
    bgImg: '/card-bg/reading_practice.png',
    badge: '📚 CEFR 50 BÀI/LEVEL',
    badgeBg: 'linear-gradient(135deg, #00f2fe, #4ade80)',
    accentColor: '#25f4ee',
    glowColor: 'rgba(37, 244, 238, 0.25)',
    tags: ['🎤 Giọng Đọc Tô Sáng Karaoke', '🇻🇳 Vietsub Tự Động', '📖 Lộ Trình 300 Bài CEFR']
  }
};

export default function VideoCategoryGrid({ onSelectCategory }) {
  const allCategoryKeys = ['stick_figure_slideshow', 'reading_practice'].filter(k => PROMPT_CATEGORIES[k]);

  return (
    <div style={{ padding: '8px 8px 36px 8px', animation: 'fadeIn 0.25s ease-out' }}>
      {/* Hero Header */}
      <div style={{ marginBottom: '28px', textAlign: 'left' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '20px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: 'var(--secondary)',
          fontSize: '0.78rem',
          fontWeight: 800,
          letterSpacing: '0.8px',
          marginBottom: '14px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
        }}>
          <span>⚡</span> STUDIO SÁNG TẠO VIDEO AI
        </div>

        <h1 style={{
          fontSize: '2rem',
          fontWeight: 900,
          color: '#fff',
          margin: '0 0 8px 0',
          letterSpacing: '-0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          🎬 Danh Mục Các Chủ Đề Video
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0, fontSize: '0.92rem', maxWidth: '720px', lineHeight: 1.5 }}>
          Chọn bộ Skill chuyên biệt dưới đây để tự động tạo kịch bản phân đoạn Gemini AI & xuất video Remotion MP4 chất lượng cao.
        </p>
      </div>

      {/* Grid 2 Hero Showcase Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
        gap: '24px',
        padding: '4px'
      }}>
        {allCategoryKeys.map(key => {
          const cat = PROMPT_CATEGORIES[key];
          const cfg = CARD_CONFIGS[key] || {};
          const bgImg = cfg.bgImg;

          return (
            <div
              key={key}
              onClick={() => onSelectCategory(key)}
              style={{
                position: 'relative',
                borderRadius: '22px',
                overflow: 'hidden',
                isolation: 'isolate',
                border: `1.5px solid ${cfg.accentColor ? `${cfg.accentColor}66` : 'rgba(255, 255, 255, 0.15)'}`,
                boxShadow: `0 12px 36px ${cfg.glowColor || 'rgba(0,0,0,0.4)'}`,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                minHeight: '310px',
                display: 'flex',
                flexDirection: 'column',
                background: '#12111A'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px) scale(1.015)';
                e.currentTarget.style.borderColor = cfg.accentColor || '#fff';
                e.currentTarget.style.boxShadow = `0 18px 50px ${cfg.glowColor ? cfg.glowColor.replace('0.25', '0.45') : 'rgba(0,0,0,0.6)'}`;
                const img = e.currentTarget.querySelector('.card-bg-layer');
                if (img) img.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.borderColor = cfg.accentColor ? `${cfg.accentColor}66` : 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.boxShadow = `0 12px 36px ${cfg.glowColor || 'rgba(0,0,0,0.4)'}`;
                const img = e.currentTarget.querySelector('.card-bg-layer');
                if (img) img.style.transform = 'scale(1)';
              }}
            >
              {/* Ảnh nền Full Cover */}
              {bgImg && (
                <div
                  className="card-bg-layer"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${bgImg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                    zIndex: 0
                  }}
                />
              )}

              {/* Gradient Darkening Overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(14, 13, 24, 0.45) 0%, rgba(14, 13, 24, 0.85) 50%, rgba(14, 13, 24, 0.98) 100%)',
                  backdropFilter: 'blur(1px)',
                  pointerEvents: 'none',
                  zIndex: 1
                }}
              />

              {/* Nội dung Card */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  justifyContent: 'space-between'
                }}
              >
                {/* Header Row Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '2.6rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.9))' }}>
                    {cat.icon}
                  </div>
                  {cfg.badge && (
                    <div style={{
                      background: cfg.badgeBg || 'var(--primary-gradient)',
                      color: '#000',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      padding: '5px 12px',
                      borderRadius: '14px',
                      letterSpacing: '0.6px',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
                    }}>
                      {cfg.badge}
                    </div>
                  )}
                </div>

                {/* Title & Description */}
                <div>
                  <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', margin: '0 0 10px 0', lineHeight: 1.25, letterSpacing: '-0.3px' }}>
                    {cat.label}
                  </h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.88rem', margin: '0 0 18px 0', lineHeight: 1.55 }}>
                    {cat.description}
                  </p>
                </div>

                {/* Feature Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                  {(cfg.tags || []).map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'rgba(255, 255, 255, 0.95)',
                        background: 'rgba(0, 0, 0, 0.55)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        backdropFilter: 'blur(4px)'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Bottom Action Footer */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.12)'
                }}>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                    ⚡ Đã sẵn sàng tạo video
                  </span>
                  <div style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    background: cfg.accentColor === '#fe2c55'
                      ? 'linear-gradient(135deg, #fe2c55, #ff0055)'
                      : 'linear-gradient(135deg, #00f2fe, #4ade80)',
                    color: cfg.accentColor === '#fe2c55' ? '#fff' : '#000',
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                  }}>
                    <span>Bắt đầu làm</span>
                    <span>→</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
