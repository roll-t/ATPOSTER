'use client';

import { PROMPT_CATEGORIES } from '@/lib/prompts/index.js';

// --- PREVIEW COMPONENTS FOR DYNAMIC THUMBNAILS ---

function StickFigurePreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#faf8f5',
      padding: '12px',
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* Panel 1 */}
      <div className="storyboard-cell" style={{
        flex: 1,
        height: '100%',
        background: '#fff',
        border: '1.5px solid #e1dbd6',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '6px',
        boxSizing: 'border-box',
        transition: 'all 0.3s ease'
      }}>
        <span style={{ fontSize: '8px', fontWeight: 800, color: '#a39b95', marginBottom: '2px' }}>SCENE 1</span>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '52px' }}>
          <circle cx="50" cy="30" r="10" stroke="#111" strokeWidth="3" fill="none" />
          <line x1="50" y1="40" x2="50" y2="70" stroke="#111" strokeWidth="3" />
          <line x1="50" y1="48" x2="35" y2="55" stroke="#111" strokeWidth="3" />
          <line x1="50" y1="48" x2="65" y2="52" stroke="#111" strokeWidth="3" />
          <rect x="63" y="45" width="5" height="10" rx="1" fill="#fe2c55" />
          <line x1="50" y1="70" x2="38" y2="90" stroke="#111" strokeWidth="3" />
          <line x1="50" y1="70" x2="62" y2="90" stroke="#111" strokeWidth="3" />
        </svg>
        <span style={{ fontSize: '7.5px', color: '#6b6661', textAlign: 'center', marginTop: '2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: '100%' }}>
          A: Chơi điện thoại...
        </span>
      </div>

      {/* Panel 2 */}
      <div className="storyboard-cell" style={{
        flex: 1,
        height: '100%',
        background: '#fff',
        border: '1.5px solid #e1dbd6',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '6px',
        boxSizing: 'border-box',
        transition: 'all 0.3s ease'
      }}>
        <span style={{ fontSize: '8px', fontWeight: 800, color: '#a39b95', marginBottom: '2px' }}>SCENE 2</span>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '52px' }}>
          <circle cx="45" cy="30" r="10" stroke="#111" strokeWidth="3" fill="none" />
          <line x1="45" y1="40" x2="48" y2="68" stroke="#111" strokeWidth="3" />
          <line x1="45" y1="48" x2="60" y2="42" stroke="#111" strokeWidth="3" />
          <line x1="45" y1="48" x2="30" y2="58" stroke="#111" strokeWidth="3" />
          <line x1="48" y1="68" x2="35" y2="90" stroke="#111" strokeWidth="3" />
          <line x1="48" y1="68" x2="60" y2="88" stroke="#111" strokeWidth="3" />
        </svg>
        <span style={{ fontSize: '7.5px', color: '#6b6661', textAlign: 'center', marginTop: '2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: '100%' }}>
          B: Vội chạy đi...
        </span>
      </div>

      {/* Panel 3 */}
      <div className="storyboard-cell" style={{
        flex: 1,
        height: '100%',
        background: '#fff',
        border: '1.5px solid #e1dbd6',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '6px',
        boxSizing: 'border-box',
        transition: 'all 0.3s ease'
      }}>
        <span style={{ fontSize: '8px', fontWeight: 800, color: '#a39b95', marginBottom: '2px' }}>SCENE 3</span>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '52px' }}>
          <line x1="10" y1="75" x2="90" y2="75" stroke="#ccc" strokeWidth="3" />
          <line x1="20" y1="75" x2="20" y2="88" stroke="#ccc" strokeWidth="3" />
          <line x1="80" y1="75" x2="80" y2="88" stroke="#ccc" strokeWidth="3" />
          <circle cx="35" cy="55" r="10" stroke="#111" strokeWidth="3" fill="none" />
          <line x1="45" y1="62" x2="75" y2="68" stroke="#111" strokeWidth="3" />
          <line x1="50" y1="63" x2="60" y2="55" stroke="#111" strokeWidth="3" />
          <text x="65" y="35" fontSize="12" fill="#fe2c55" fontWeight="bold">Z</text>
          <text x="75" y="27" fontSize="8" fill="#fe2c55" fontWeight="bold">z</text>
        </svg>
        <span style={{ fontSize: '7.5px', color: '#6b6661', textAlign: 'center', marginTop: '2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: '100%' }}>
          C: Ngủ quên mất...
        </span>
      </div>
    </div>
  );
}

function ReadingPracticePreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#1a1924',
      position: 'relative',
      padding: '12px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600, letterSpacing: '0.5px' }}>ENGLISH READER</span>
        <div style={{
          background: 'rgba(74, 222, 128, 0.15)',
          border: '1px solid rgba(74, 222, 128, 0.3)',
          color: '#4ade80',
          fontSize: '9px',
          fontWeight: 800,
          padding: '2px 8px',
          borderRadius: '12px'
        }}>
          LEVEL: A2
        </div>
      </div>

      <div style={{
        height: '42px',
        width: '100%',
        borderRadius: '6px',
        background: 'linear-gradient(135deg, rgba(37, 244, 238, 0.08), rgba(74, 222, 128, 0.08))',
        border: '1px dashed rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '6px 0'
      }}>
        <svg viewBox="0 0 100 40" style={{ height: '32px' }}>
          <path d="M 10 35 Q 50 38 90 35" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="2" fill="none" />
          <path d="M 50 35 L 50 15 Q 52 10 58 12" stroke="#4ade80" strokeWidth="2" fill="none" />
          <path d="M 50 22 Q 40 18 45 15 Q 50 18 50 22" fill="#25f4ee" opacity="0.8" />
          <path d="M 50 27 Q 60 23 55 20 Q 50 23 50 27" fill="#4ade80" opacity="0.8" />
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#fff',
          lineHeight: '1.3',
          fontFamily: 'monospace, sans-serif',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          The little <span style={{
            background: '#25f4ee',
            color: '#000',
            padding: '1px 5px',
            borderRadius: '3px',
            fontWeight: 800,
            animation: 'karaokePulse 2.5s infinite ease-in-out'
          }}>seed</span> grew into a big tree.
        </div>
        
        <div style={{
          fontSize: '9px',
          color: 'rgba(255, 255, 255, 0.5)',
          fontStyle: 'italic',
          lineHeight: '1.2',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          Hạt giống nhỏ đã lớn lên thành một cây lớn.
        </div>
      </div>
    </div>
  );
}

function MoralTalkPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#0a0a0f',
      position: 'relative',
      padding: '12px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.3)', fontWeight: 600, letterSpacing: '0.5px' }}>MORAL TALK</span>
        <div style={{
          background: 'rgba(167, 139, 250, 0.15)',
          border: '1px solid rgba(167, 139, 250, 0.3)',
          color: '#a78bfa',
          fontSize: '9px',
          fontWeight: 800,
          padding: '2px 8px',
          borderRadius: '12px'
        }}>
          PICTOGRAM GLOW
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '62px',
        margin: '2px 0'
      }}>
        <svg viewBox="0 0 100 60" style={{
          height: '52px',
          filter: 'drop-shadow(0 0 8px rgba(167, 139, 250, 0.8))',
          animation: 'pictogramGlow 3s infinite ease-in-out'
        }}>
          <line x1="10" y1="50" x2="90" y2="50" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          
          <circle cx="42" cy="22" r="5" fill="#fff" />
          <line x1="42" y1="27" x2="42" y2="40" stroke="#fff" strokeWidth="2.5" />
          <line x1="42" y1="31" x2="56" y2="35" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="42" y1="31" x2="32" y2="38" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <line x1="42" y1="40" x2="35" y2="50" stroke="#fff" strokeWidth="2.5" />
          <line x1="42" y1="40" x2="47" y2="50" stroke="#fff" strokeWidth="2.5" />

          <circle cx="66" cy="31" r="5" fill="#fff" />
          <line x1="66" y1="36" x2="73" y2="46" stroke="#fff" strokeWidth="2.5" />
          <line x1="66" y1="39" x2="56" y2="35" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="73" y1="46" x2="85" y2="48" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="73" y1="46" x2="68" y2="50" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 700,
          color: '#fff',
          textAlign: 'center',
          fontFamily: 'serif'
        }}>
          "Kindness is never wasted."
        </div>
        <div style={{
          fontSize: '8px',
          color: 'rgba(255, 255, 255, 0.45)',
          textAlign: 'center'
        }}>
          Sự tử tế không bao giờ là lãng phí.
        </div>
      </div>
    </div>
  );
}

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
    buttonTextColor: '#000',
    tags: ['🎤 Giọng Đọc Tô Sáng Karaoke', '🇻🇳 Vietsub Tự Động', '📖 Lộ Trình 300 Bài CEFR']
  },
  moral_talk_slideshow: {
    badge: '🇻🇳 LỒNG TIẾNG VIỆT',
    badgeBg: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    accentColor: '#a78bfa',
    glowColor: 'rgba(167, 139, 250, 0.25)',
    tags: ['✨ Pictogram Phát Sáng', '🇻🇳🇬🇧 Việt/Anh Linh Hoạt', '🎙️ Lồng Tiếng Tự Động']
  }
};

export default function VideoCategoryGrid({ onSelectCategory }) {
  const allCategoryKeys = ['stick_figure_slideshow', 'reading_practice', 'moral_talk_slideshow'].filter(k => PROMPT_CATEGORIES[k]);

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
              className="video-card"
              style={{
                position: 'relative',
                borderRadius: '22px',
                overflow: 'hidden',
                isolation: 'isolate',
                border: `1.5px solid ${cfg.accentColor ? `${cfg.accentColor}66` : 'rgba(255, 255, 255, 0.15)'}`,
                boxShadow: `0 12px 36px ${cfg.glowColor || 'rgba(0,0,0,0.4)'}`,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                minHeight: '430px',
                display: 'flex',
                flexDirection: 'column',
                background: '#12111A'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px) scale(1.015)';
                e.currentTarget.style.borderColor = cfg.accentColor || '#fff';
                e.currentTarget.style.boxShadow = `0 18px 50px ${cfg.glowColor ? cfg.glowColor.replace('0.25', '0.45') : 'rgba(0,0,0,0.6)'}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.borderColor = cfg.accentColor ? `${cfg.accentColor}66` : 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.boxShadow = `0 12px 36px ${cfg.glowColor || 'rgba(0,0,0,0.4)'}`;
              }}
            >
              {/* Inject keyframes animations for previews */}
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes karaokePulse {
                  0% { background-color: #25f4ee; box-shadow: 0 0 0px rgba(37,244,238,0); }
                  50% { background-color: #4ade80; box-shadow: 0 0 8px rgba(74,222,128,0.7); color: #000; }
                  100% { background-color: #25f4ee; box-shadow: 0 0 0px rgba(37,244,238,0); }
                }
                @keyframes pictogramGlow {
                  0% { filter: drop-shadow(0 0 5px rgba(167,139,250,0.5)); opacity: 0.85; }
                  50% { filter: drop-shadow(0 0 14px rgba(167,139,250,0.95)); opacity: 1; }
                  100% { filter: drop-shadow(0 0 5px rgba(167,139,250,0.5)); opacity: 0.85; }
                }
                .video-card .storyboard-cell {
                  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .video-card:hover .storyboard-cell:nth-child(1) {
                  transform: translateY(-2px) rotate(-1.5deg);
                }
                .video-card:hover .storyboard-cell:nth-child(2) {
                  transform: translateY(-5px) scale(1.03);
                }
                .video-card:hover .storyboard-cell:nth-child(3) {
                  transform: translateY(-2px) rotate(1.5deg);
                }
              `}} />

              {/* Unblurred Top Style Preview Section */}
              <div style={{
                height: '165px',
                width: '100%',
                overflow: 'hidden',
                position: 'relative',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                zIndex: 1
              }}>
                {key === 'stick_figure_slideshow' && <StickFigurePreview />}
                {key === 'reading_practice' && <ReadingPracticePreview />}
                {key === 'moral_talk_slideshow' && <MoralTalkPreview />}
                
                {/* Fallback for other potential categories */}
                {key !== 'stick_figure_slideshow' && key !== 'reading_practice' && key !== 'moral_talk_slideshow' && bgImg && (
                  <div
                    className="card-bg-layer"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url(${bgImg})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                )}
              </div>

              {/* Bottom Card Content Section */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  padding: '24px 24px 20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  flexGrow: 1,
                  justifyContent: 'space-between',
                  background: '#12111A'
                }}
              >
                {/* Header Row Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ fontSize: '2.4rem', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>
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
                  <h3 style={{ fontSize: '1.38rem', fontWeight: 800, color: '#fff', margin: '0 0 8px 0', lineHeight: 1.25, letterSpacing: '-0.3px' }}>
                    {cat.label}
                  </h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.85rem', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                    {cat.description}
                  </p>
                </div>

                {/* Feature Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
                  {(cfg.tags || []).map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: 'rgba(255, 255, 255, 0.9)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '4px 8px',
                        borderRadius: '6px',
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
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                    ⚡ Đã sẵn sàng tạo video
                  </span>
                  <div style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: cfg.badgeBg || 'linear-gradient(135deg, #fe2c55, #ff0055)',
                    color: cfg.buttonTextColor || '#fff',
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                    transition: 'all 0.2s ease'
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
