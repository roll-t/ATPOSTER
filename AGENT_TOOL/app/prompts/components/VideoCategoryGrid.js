'use client';

import { PROMPT_CATEGORIES } from '@/lib/prompts/index.js';

const CARD_IMAGES = {
  stick_figure_slideshow: '/card-bg/stick_figure_slideshow.png',
  english_quiz: '/card-bg/english_quiz.png',
  stick_figure: '/card-bg/stick_figure.png',
  moral_wisdom: '/card-bg/moral_wisdom.png',
  english_tips: '/card-bg/english_tips.png'
};

export default function VideoCategoryGrid({ onSelectCategory }) {
  const allCategoryKeys = [
    'stick_figure_slideshow',
    'reading_practice',
    'english_quiz',
    'stick_figure',
    'moral_wisdom',
    'english_tips'
  ].filter(k => PROMPT_CATEGORIES[k]);

  return (
    <div style={{ padding: '8px 8px 36px 8px', animation: 'fadeIn 0.25s ease-out' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🎬 Danh Mục Các Chủ Đề Video
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
          Chọn loại chủ đề video bạn muốn thực hiện bên dưới để bắt đầu tạo kịch bản AI.
        </p>
      </div>

      {/* Grid danh sách chủ đề */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
        gap: '24px',
        padding: '6px'
      }}>
        {allCategoryKeys.map(key => {
          const cat = PROMPT_CATEGORIES[key];
          const isSlideshow = key === 'stick_figure_slideshow';
          const bgImg = CARD_IMAGES[key];
          
          return (
            <div
              key={key}
              onClick={() => onSelectCategory(key)}
              style={{
                position: 'relative',
                borderRadius: '16px',
                overflow: 'hidden',
                isolation: 'isolate',
                transform: 'translateZ(0)',
                WebkitMaskImage: '-webkit-radial-gradient(white, black)',
                border: isSlideshow ? '1px solid rgba(254, 44, 85, 0.45)' : '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: isSlideshow ? '0 8px 24px rgba(254, 44, 85, 0.15)' : '0 8px 24px rgba(0, 0, 0, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                minHeight: '230px',
                display: 'flex',
                flexDirection: 'column'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px) scale(1.01) translateZ(0)';
                e.currentTarget.style.borderColor = isSlideshow ? '#fe2c55' : 'var(--primary)';
                e.currentTarget.style.boxShadow = '0 12px 35px rgba(254, 44, 85, 0.25)';
                const img = e.currentTarget.querySelector('.card-bg-layer');
                if (img) img.style.transform = 'scale(1.08) translateZ(0)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateZ(0)';
                e.currentTarget.style.borderColor = isSlideshow ? 'rgba(254, 44, 85, 0.45)' : 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.boxShadow = isSlideshow ? '0 8px 24px rgba(254, 44, 85, 0.15)' : '0 8px 24px rgba(0, 0, 0, 0.3)';
                const img = e.currentTarget.querySelector('.card-bg-layer');
                if (img) img.style.transform = 'scale(1) translateZ(0)';
              }}
            >
              {/* Lớp ảnh nền Background Image */}
              {bgImg && (
                <div
                  className="card-bg-layer"
                  style={{
                    position: 'absolute',
                    inset: '-2px',
                    borderRadius: 'inherit',
                    overflow: 'hidden',
                    backgroundImage: `url(${bgImg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 0
                  }}
                />
              )}

              {/* Lớp Gradient Shadow Overlay tối màu để làm nổi bật văn bản phía trên */}
              <div
                style={{
                  position: 'absolute',
                  inset: '-2px',
                  borderRadius: 'inherit',
                  background: 'linear-gradient(180deg, rgba(12, 10, 24, 0.55) 0%, rgba(12, 10, 24, 0.88) 55%, rgba(12, 10, 24, 0.99) 100%)',
                  backdropFilter: 'blur(1px)',
                  pointerEvents: 'none',
                  zIndex: 1
                }}
              />

              {/* Nội dung trên cùng */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.95)'
                }}
              >
                {isSlideshow && (
                  <div style={{
                    position: 'absolute',
                    top: '14px',
                    right: '14px',
                    background: 'var(--primary-gradient)',
                    color: '#fff',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: '12px',
                    letterSpacing: '0.5px',
                    boxShadow: '0 4px 12px rgba(254, 44, 85, 0.4)'
                  }}>
                    HOT SKILL
                  </div>
                )}

                <div style={{ fontSize: '2.4rem', marginBottom: '12px', filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.8))' }}>
                  {cat.icon}
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: '0 0 8px 0', lineHeight: 1.3, letterSpacing: '-0.3px' }}>
                  {cat.label}
                </h3>

                <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.83rem', margin: '0 0 20px 0', lineHeight: 1.5, flex: 1, fontWeight: 400 }}>
                  {cat.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <span style={{ fontSize: '0.72rem', color: '#fff', background: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(4px)', padding: '4px 9px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {cat.type === 'slideshow' ? '🎬 Slideshow AI' : '📹 Script AI'}
                  </span>
                  <span style={{ color: 'var(--secondary)', fontSize: '0.88rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Bắt đầu làm &rarr;
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
