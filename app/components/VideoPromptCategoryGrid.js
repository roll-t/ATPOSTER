'use client';

import React from 'react';
import { VIDEO_PROMPT_CATEGORIES } from '@/src/domain/content/videoPromptCategories.js';

// --- VISUAL PREVIEWS FOR VIDEO PROMPT CATEGORIES ---

function CraftAsmrPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #0b192c 0%, #1e3e62 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.15), transparent 70%)',
        pointerEvents: 'none'
      }} />

      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
        {/* Workbench */}
        <rect x="15" y="48" width="130" height="16" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="1" />
        <line x1="20" y1="56" x2="140" y2="56" stroke="#475569" strokeWidth="0.8" strokeDasharray="5 3" />

        {/* Soda Can (Red recycled can) */}
        <rect x="35" y="28" width="18" height="26" rx="3" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
        <line x1="38" y1="33" x2="50" y2="33" stroke="#fff" strokeWidth="1" opacity="0.6" />
        <ellipse cx="44" cy="28" rx="8" ry="2.5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />

        {/* Miniature Samurai Helmet Crafted on right */}
        <path d="M 105 48 Q 115 36 125 48 Z" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.2" />
        <path d="M 115 36 L 115 28" stroke="#fbbf24" strokeWidth="1.5" />
        <polygon points="112,28 115,22 118,28" fill="#f59e0b" />
        <path d="M 108 40 Q 115 44 122 40" stroke="#e0f2fe" strokeWidth="1" fill="none" />

        {/* Scissors / Tool */}
        <line x1="68" y1="36" x2="88" y2="44" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <line x1="68" y1="44" x2="88" y2="36" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <circle cx="66" cy="35" r="3" stroke="#06b6d4" strokeWidth="1.5" fill="none" />
        <circle cx="66" cy="45" r="3" stroke="#06b6d4" strokeWidth="1.5" fill="none" />

        {/* Sparkles */}
        <circle cx="95" cy="28" r="1.5" fill="#38bdf8" style={{ animation: 'sparkleGlow 2s infinite alternate' }} />
        <circle cx="128" cy="32" r="1.2" fill="#fbbf24" style={{ animation: 'sparkleGlow 2.5s infinite alternate' }} />
      </svg>

      <div style={{
        position: 'absolute',
        bottom: '8px',
        right: '12px',
        fontSize: '9px',
        color: '#38bdf8',
        fontWeight: 800,
        background: 'rgba(6, 182, 212, 0.15)',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid rgba(56, 189, 248, 0.3)'
      }}>
        ASMR QUICK-CUT
      </div>
    </div>
  );
}

function ScifiCyberpunkPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #090014 0%, #1b003a 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      {/* Cyberpunk Grid */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '45px',
        background: 'linear-gradient(to top, rgba(236, 72, 153, 0.25), transparent)',
        transform: 'perspective(100px) rotateX(45deg)',
        transformOrigin: 'bottom',
        backgroundImage: 'linear-gradient(90deg, rgba(168, 85, 247, 0.3) 1px, transparent 1px), linear-gradient(0deg, rgba(168, 85, 247, 0.3) 1px, transparent 1px)',
        backgroundSize: '16px 8px',
      }} />

      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px', zIndex: 1 }}>
        {/* Neon City Skylines in background */}
        <rect x="25" y="18" width="18" height="40" fill="#1e1035" stroke="#a855f7" strokeWidth="0.8" opacity="0.7" />
        <rect x="48" y="26" width="14" height="32" fill="#150824" stroke="#ec4899" strokeWidth="0.8" opacity="0.6" />
        <rect x="110" y="15" width="22" height="43" fill="#1e1035" stroke="#06b6d4" strokeWidth="0.8" opacity="0.7" />
        
        {/* Flying Speeder / Spaceship */}
        <polygon points="70,30 96,26 90,34 66,33" fill="#ec4899" stroke="#f43f5e" strokeWidth="1" />
        {/* Neon Thruster Trail */}
        <line x1="64" y1="32" x2="35" y2="32" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        <line x1="63" y1="33" x2="48" y2="33" stroke="#fff" strokeWidth="1" strokeLinecap="round" />

        {/* Rain streaks */}
        <line x1="30" y1="8" x2="26" y2="22" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <line x1="85" y1="5" x2="81" y2="20" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <line x1="140" y1="12" x2="136" y2="26" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      </svg>

      <div style={{
        position: 'absolute',
        top: '8px',
        right: '12px',
        fontSize: '9px',
        color: '#f43f5e',
        fontWeight: 800,
        background: 'rgba(236, 72, 153, 0.15)',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid rgba(236, 72, 153, 0.3)'
      }}>
        NEO-TOKYO 2099
      </div>
    </div>
  );
}

function WildlifePreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #1c1308 0%, #3d2406 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
        {/* Golden Sun */}
        <circle cx="125" cy="22" r="14" fill="#fbbf24" opacity="0.85" />
        
        {/* African Acacia Tree Silhouette */}
        <path d="M 38 60 L 40 40 Q 42 34 32 30 Q 30 26 38 25 Q 46 25 45 28 Q 50 22 58 24 Q 65 26 62 30 Q 55 35 44 40 L 46 60 Z" fill="#0f0b06" />
        <ellipse cx="48" cy="26" rx="20" ry="4" fill="#0f0b06" />

        {/* Savannah Ground Horizon */}
        <path d="M 0 58 Q 50 55 100 57 Q 140 56 160 59 L 160 70 L 0 70 Z" fill="#0f0b06" />

        {/* Walking Lion / Leopard Silhouette */}
        <ellipse cx="98" cy="53" rx="9" ry="5" fill="#0f0b06" />
        <circle cx="107" cy="50" r="3.5" fill="#0f0b06" />
        <line x1="93" y1="55" x2="91" y2="60" stroke="#0f0b06" strokeWidth="1.8" />
        <line x1="96" y1="55" x2="95" y2="60" stroke="#0f0b06" strokeWidth="1.8" />
        <line x1="102" y1="55" x2="103" y2="60" stroke="#0f0b06" strokeWidth="1.8" />
        <line x1="105" y1="55" x2="107" y2="60" stroke="#0f0b06" strokeWidth="1.8" />
        {/* Tail */}
        <path d="M 89 52 Q 85 50 86 46" stroke="#0f0b06" strokeWidth="1.5" fill="none" />

        {/* Birds flying */}
        <path d="M 80 18 Q 83 14 86 18 Q 89 14 92 18" stroke="#fef08a" strokeWidth="1" fill="none" opacity="0.8" />
        <path d="M 95 24 Q 97 21 99 24 Q 101 21 103 24" stroke="#fef08a" strokeWidth="0.8" fill="none" opacity="0.7" />
      </svg>

      <div style={{
        position: 'absolute',
        bottom: '8px',
        right: '12px',
        fontSize: '9px',
        color: '#fbbf24',
        fontWeight: 800,
        background: 'rgba(245, 158, 11, 0.15)',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid rgba(251, 191, 36, 0.3)'
      }}>
        BBC EARTH 4K
      </div>
    </div>
  );
}

function EpicBattlePreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #240808 0%, #4a1010 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
        {/* Smokey sky with war sparks */}
        <rect x="0" y="0" width="160" height="70" fill="url(#smokeGrad)" opacity="0.3" />
        
        {/* Distant Hills */}
        <path d="M 0 45 Q 40 38 90 44 Q 130 39 160 46 L 160 70 L 0 70 Z" fill="#120404" />

        {/* Battle banners & spears */}
        <line x1="28" y1="20" x2="28" y2="52" stroke="#ef4444" strokeWidth="1.5" />
        <polygon points="28,21 44,25 28,30" fill="#dc2626" />
        
        <line x1="48" y1="24" x2="48" y2="54" stroke="#fca5a5" strokeWidth="1.2" />
        <polygon points="48,25 60,28 48,32" fill="#991b1b" />

        <line x1="125" y1="18" x2="125" y2="50" stroke="#f59e0b" strokeWidth="1.5" />
        <polygon points="125,19 110,24 125,29" fill="#d97706" />

        {/* Horse & Rider Silhouette */}
        <ellipse cx="85" cy="46" rx="10" ry="6" fill="#000" />
        <circle cx="94" cy="41" r="3" fill="#000" />
        <line x1="88" y1="36" x2="88" y2="44" stroke="#000" strokeWidth="2.5" />
        <circle cx="88" cy="33" r="2.5" fill="#000" />
        {/* Spear held high */}
        <line x1="82" y1="25" x2="98" y2="40" stroke="#ef4444" strokeWidth="1.5" />

        {/* Glowing fire embers */}
        <circle cx="45" cy="18" r="1.2" fill="#fbbf24" />
        <circle cx="75" cy="12" r="1.5" fill="#f87171" />
        <circle cx="110" cy="15" r="1" fill="#fbbf24" />
      </svg>

      <div style={{
        position: 'absolute',
        top: '8px',
        right: '12px',
        fontSize: '9px',
        color: '#f87171',
        fontWeight: 800,
        background: 'rgba(239, 68, 68, 0.15)',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid rgba(239, 68, 68, 0.3)'
      }}>
        IMAX CINEMATIC
      </div>
    </div>
  );
}

function Animation3DPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #062828 0%, #0d4a3e 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
        {/* Dreamy hills */}
        <path d="M 0 50 Q 50 42 110 52 Q 140 48 160 55 L 160 70 L 0 70 Z" fill="#042119" />
        
        {/* Glowing Fireflies / Magical Stars */}
        <circle cx="35" cy="22" r="2" fill="#34d399" opacity="0.8" />
        <circle cx="60" cy="16" r="1.5" fill="#6ee7b7" opacity="0.7" />
        <circle cx="120" cy="25" r="2.5" fill="#a7f3d0" opacity="0.9" />

        {/* Cute 3D Creature Body (Pixar aesthetic) */}
        <ellipse cx="80" cy="46" rx="14" ry="12" fill="#10b981" stroke="#059669" strokeWidth="1.2" />
        <circle cx="75" cy="43" r="3" fill="#fff" />
        <circle cx="76" cy="43" r="1.5" fill="#064e3b" />
        <circle cx="85" cy="43" r="3" fill="#fff" />
        <circle cx="86" cy="43" r="1.5" fill="#064e3b" />
        {/* Cute smile */}
        <path d="M 78 48 Q 80 50 82 48" stroke="#064e3b" strokeWidth="1" fill="none" />
        {/* Tiny Horns / Ears */}
        <polygon points="72,36 75,32 77,36" fill="#34d399" />
        <polygon points="83,36 85,32 88,36" fill="#34d399" />

        {/* Magic Aura */}
        <circle cx="80" cy="46" r="18" stroke="#34d399" strokeWidth="1" strokeDasharray="3 3" fill="none" opacity="0.6" />
      </svg>

      <div style={{
        position: 'absolute',
        bottom: '8px',
        right: '12px',
        fontSize: '9px',
        color: '#34d399',
        fontWeight: 800,
        background: 'rgba(16, 185, 129, 0.15)',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid rgba(52, 211, 153, 0.3)'
      }}>
        PIXAR & GHIBLI
      </div>
    </div>
  );
}

function ProductCommercialPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #09132b 0%, #15295c 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
        {/* Studio spotlight */}
        <ellipse cx="80" cy="56" rx="35" ry="8" fill="#1e3a8a" opacity="0.5" />
        
        {/* Floating Luxury Perfume Bottle */}
        <rect x="70" y="26" width="20" height="28" rx="4" fill="rgba(255, 255, 255, 0.2)" stroke="#93c5fd" strokeWidth="1.2" />
        {/* Bottle Neck and Cap */}
        <rect x="76" y="21" width="8" height="5" fill="#f59e0b" stroke="#d97706" strokeWidth="0.8" />
        <rect x="74" y="15" width="12" height="6" rx="1.5" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" />

        {/* Perfume Label */}
        <rect x="74" y="34" width="12" height="12" rx="1" fill="#fff" opacity="0.9" />
        <line x1="76" y1="38" x2="84" y2="38" stroke="#1e3a8a" strokeWidth="0.8" />
        <line x1="77" y1="41" x2="83" y2="41" stroke="#1e3a8a" strokeWidth="0.6" />

        {/* Water Splash Ripples */}
        <ellipse cx="80" cy="56" rx="25" ry="5" stroke="#60a5fa" strokeWidth="1" fill="none" opacity="0.7" />
        <ellipse cx="80" cy="56" rx="42" ry="7" stroke="#3b82f6" strokeWidth="0.8" fill="none" opacity="0.4" />

        {/* Water Droplets */}
        <circle cx="58" cy="32" r="2" fill="#93c5fd" opacity="0.8" />
        <circle cx="102" cy="28" r="1.5" fill="#93c5fd" opacity="0.8" />
        <circle cx="64" cy="45" r="1.8" fill="#bfdbfe" opacity="0.9" />
      </svg>

      <div style={{
        position: 'absolute',
        top: '8px',
        right: '12px',
        fontSize: '9px',
        color: '#60a5fa',
        fontWeight: 800,
        background: 'rgba(59, 130, 246, 0.15)',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid rgba(96, 165, 250, 0.3)'
      }}>
        TVC COMMERCIAL
      </div>
    </div>
  );
}

export default function VideoPromptCategoryGrid({ onSelectCategory }) {
  return (
    <div style={{ padding: '4px 4px 28px 4px', animation: 'fadeIn 0.25s ease-out' }}>
      {/* Hero Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        marginBottom: '22px',
        flexWrap: 'wrap'
      }}>
        <div style={{ textAlign: 'left', maxWidth: '720px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#22d3ee',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.6px',
            marginBottom: '10px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
          }}>
            <span>⚡</span> STUDIO SÁNG TẠO PROMPT VIDEO AI
          </div>

          <h1 style={{
            fontSize: '1.65rem',
            fontWeight: 900,
            color: '#fff',
            margin: '0 0 6px 0',
            letterSpacing: '-0.4px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            🎬 Danh Mục Các Thể Loại Video AI
          </h1>

          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            margin: 0,
            fontSize: '0.84rem',
            lineHeight: 1.45
          }}>
            Chọn dòng thể loại dưới đây để tự động tạo bộ prompt camera, chuyển động ánh sáng chuẩn chỉnh dán trực tiếp vào Google Veo, OpenAI Sora, Kling AI hay Runway Gen-3.
          </p>
        </div>
      </div>

      {/* Grid Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
        gap: '16px',
        width: '100%'
      }}>
        {VIDEO_PROMPT_CATEGORIES.map((cat) => {
          return (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="video-card"
              style={{
                background: '#12111A',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)';
                e.currentTarget.style.borderColor = `${cat.accentColor}77`;
                e.currentTarget.style.boxShadow = `0 12px 30px -8px ${cat.accentColor}33`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Top Style Preview Section */}
              <div style={{
                height: '125px',
                width: '100%',
                overflow: 'hidden',
                position: 'relative',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                zIndex: 1
              }}>
                {cat.id === 'craft_asmr' && <CraftAsmrPreview />}
                {cat.id === 'scifi_cyberpunk' && <ScifiCyberpunkPreview />}
                {cat.id === 'wildlife_nature' && <WildlifePreview />}
                {cat.id === 'epic_battle' && <EpicBattlePreview />}
                {cat.id === 'animation_3d' && <Animation3DPreview />}
                {cat.id === 'product_commercial' && <ProductCommercialPreview />}
              </div>

              {/* Bottom Card Content Section */}
              <div style={{
                position: 'relative',
                zIndex: 2,
                padding: '16px 16px 14px 16px',
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                justifyContent: 'space-between',
                background: '#12111A'
              }}>
                {/* Header Row Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '1.65rem', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))' }}>
                    {cat.icon}
                  </div>
                  {cat.badge && (
                    <div style={{
                      background: cat.badgeBg || 'var(--primary-gradient)',
                      color: '#fff',
                      fontSize: '0.66rem',
                      fontWeight: 900,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      letterSpacing: '0.4px',
                      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
                    }}>
                      {cat.badge}
                    </div>
                  )}
                </div>

                {/* Title & Description */}
                <div>
                  <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#fff', margin: '0 0 5px 0', lineHeight: 1.25, letterSpacing: '-0.2px' }}>
                    {cat.label}
                  </h3>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.78rem',
                    margin: '0 0 10px 0',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {cat.shortDescription}
                  </p>
                </div>

                {/* Feature Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                  {(cat.tags || []).map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 600,
                        color: 'rgba(255, 255, 255, 0.88)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '2px 7px',
                        borderRadius: '5px',
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
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                    ⚡ Sẵn sàng tạo prompt
                  </span>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: cat.badgeBg || 'linear-gradient(135deg, #06b6d4, #0891b2)',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                    transition: 'all 0.2s ease'
                  }}>
                    <span>Bắt đầu</span>
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
