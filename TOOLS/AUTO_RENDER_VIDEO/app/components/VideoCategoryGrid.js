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

function PexelsTalkPreview() {
  const bars = Array.from({ length: 22 }, (_, i) => i);
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(160deg, #080810 0%, #100820 55%, #050810 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '10px 12px 12px',
      boxSizing: 'border-box',
    }}>
      {/* Simulated Pexels video frame (faint scene shapes) */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 55% at 50% 38%, rgba(120,80,200,0.18) 0%, transparent 75%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '55%', left: '22%', width: '18px', height: '32px',
        background: 'rgba(255,255,255,0.05)', borderRadius: '3px',
      }} />
      <div style={{
        position: 'absolute', bottom: '55%', left: '48%', width: '14px', height: '24px',
        background: 'rgba(255,255,255,0.04)', borderRadius: '2px',
      }} />

      {/* Audio waveform bars (Gaussian-envelope style, centered) — all values pre-rounded to
          avoid floating-point toString() differences between Node.js SSR and browser */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2.5px', height: '28px', marginBottom: '7px' }}>
        {bars.map(i => {
          const center = (bars.length - 1) / 2;
          const env = Math.exp(-0.07 * Math.pow(i - center, 2));
          const opacity = Math.round((0.45 + 0.55 * env) * 1000) / 1000;
          const dur = (Math.round((0.5 + (i * 0.09) % 0.6) * 100) / 100).toFixed(2);
          return (
            <div key={i} style={{
              width: '4px',
              height: '10px',
              background: '#a78bfa',
              borderRadius: '2px',
              opacity,
              animation: `ptWave${i % 6} ${dur}s ease-in-out infinite alternate`,
            }} />
          );
        })}
      </div>

      {/* Glass text card */}
      <div style={{
        width: '95%',
        background: 'rgba(15,10,30,0.72)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(167,139,250,0.3)',
        borderRadius: '10px',
        padding: '7px 10px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#fff', lineHeight: 1.4, letterSpacing: '-0.2px' }}>
          Bạn có bao giờ dừng lại và hỏi{' '}
          <span style={{ color: '#a78bfa' }}>mình sống vì điều gì?</span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ptWave0 { from { height: 4px; } to { height: 14px; } }
        @keyframes ptWave1 { from { height: 8px; } to { height: 5px; } }
        @keyframes ptWave2 { from { height: 16px; } to { height: 9px; } }
        @keyframes ptWave3 { from { height: 5px; } to { height: 20px; } }
        @keyframes ptWave4 { from { height: 20px; } to { height: 7px; } }
        @keyframes ptWave5 { from { height: 11px; } to { height: 4px; } }
      `}} />
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

function BuddhistWisdomPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(145deg, #1c1917 0%, #292524 50%, #1c1917 100%)',
      position: 'relative',
      padding: '12px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'hidden'
    }}>
      {/* Soft warm lantern glow aura in top-left */}
      <div style={{
        position: 'absolute',
        top: '-10px',
        left: '20px',
        width: '140px',
        height: '120px',
        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.28) 0%, rgba(217, 119, 6, 0.1) 50%, transparent 80%)',
        pointerEvents: 'none',
        animation: 'lampAuraGlow 4s infinite ease-in-out'
      }} />

      {/* Top Header Label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
        <span style={{ fontSize: '9px', color: 'rgba(253, 230, 138, 0.7)', fontWeight: 800, letterSpacing: '0.8px' }}>
          ZEN WATERCOLOR & INK
        </span>
        <div style={{
          background: 'rgba(245, 158, 11, 0.2)',
          border: '1px solid rgba(245, 158, 11, 0.45)',
          color: '#fbbf24',
          fontSize: '9px',
          fontWeight: 900,
          padding: '2px 8px',
          borderRadius: '12px'
        }}>
          100% ENGLISH · VIETSUB
        </div>
      </div>

      {/* Center Illustrated Scene SVG (Recreating the oil lamp, antique scrolls, parchment & desk) */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '70px',
        zIndex: 2,
        margin: '2px 0'
      }}>
        <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
          {/* Background Stone Wall Texture */}
          <rect x="5" y="5" width="150" height="60" rx="4" fill="#262329" opacity="0.6" />
          <line x1="5" y1="25" x2="155" y2="25" stroke="#38333e" strokeWidth="1" strokeDasharray="15 3 20 4" />
          <line x1="5" y1="45" x2="155" y2="45" stroke="#38333e" strokeWidth="1" strokeDasharray="25 4 10 3" />

          {/* Wooden Desk Surface */}
          <polygon points="5,48 155,48 150,66 10,66" fill="#3e2d21" stroke="#5c4028" strokeWidth="1" />
          <line x1="15" y1="53" x2="145" y2="53" stroke="#2b1d14" strokeWidth="0.8" />
          <line x1="20" y1="60" x2="140" y2="60" stroke="#2b1d14" strokeWidth="0.8" />

          {/* Glowing Antique Oil Lamp on Left */}
          <path d="M 28 52 Q 22 52 20 48 Q 20 44 26 44 L 38 44 Q 44 44 44 48 Q 42 52 36 52 Z" fill="#b45309" stroke="#78350f" strokeWidth="1" />
          <path d="M 22 46 Q 16 46 16 50 Q 16 54 22 54" stroke="#78350f" strokeWidth="1.2" fill="none" />
          <circle cx="38" cy="42" r="2.5" fill="#f59e0b" />
          {/* Animated Lamp Flame */}
          <path d="M 38 42 Q 36 34 38 30 Q 40 34 38 42" fill="#fbbf24" style={{ animation: 'flameFlicker 2s infinite ease-in-out', transformOrigin: '38px 42px' }} />
          <circle cx="38" cy="36" r="6" fill="rgba(245, 158, 11, 0.35)" />

          {/* Ancient Parchment Paper with Calligraphy & Ink Splash */}
          <polygon points="46,46 100,45 106,62 50,63" fill="#fef3c7" stroke="#d97706" strokeWidth="0.8" />
          {/* Faux Calligraphy Lines */}
          <line x1="53" y1="49" x2="93" y2="48" stroke="#78350f" strokeWidth="1.2" strokeDasharray="3 2 4 1 2 1" />
          <line x1="52" y1="53" x2="96" y2="52" stroke="#78350f" strokeWidth="1.2" strokeDasharray="4 2 2 2 3 1" />
          <line x1="54" y1="57" x2="88" y2="56" stroke="#78350f" strokeWidth="1.2" strokeDasharray="2 1 4 2 2 1" />
          {/* Ink Drop Stain */}
          <circle cx="95" cy="57" r="2" fill="#1e1b4b" />
          <circle cx="98" cy="55.5" r="0.8" fill="#1e1b4b" />

          {/* Calligraphy Brush / Quill */}
          <line x1="75" y1="53" x2="112" y2="51" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
          <polygon points="75,53 70,53.5 73,52" fill="#1e1b4b" />

          {/* Stack of Rolled Ancient Scrolls on Right */}
          {/* Bottom Scroll */}
          <rect x="108" y="52" width="36" height="7" rx="3.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
          <line x1="120" y1="52" x2="120" y2="59" stroke="#78350f" strokeWidth="1.2" />
          {/* Top Scroll */}
          <rect x="110" y="45" width="34" height="7" rx="3.5" fill="#fef9c3" stroke="#ca8a04" strokeWidth="0.8" />
          <line x1="122" y1="45" x2="122" y2="52" stroke="#78350f" strokeWidth="1.2" />
        </svg>
      </div>

      {/* Bottom Floating Zen Wisdom Subtitle Quote */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', zIndex: 2 }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 800,
          color: '#fef3c7',
          textAlign: 'center',
          fontFamily: 'serif',
          letterSpacing: '-0.2px'
        }}>
          "In the stillness of the mind, wisdom arises."
        </div>
        <div style={{
          fontSize: '8px',
          color: 'rgba(251, 191, 36, 0.8)',
          textAlign: 'center',
          fontWeight: 600
        }}>
          Trong tĩnh lặng của tâm, trí tuệ tự khắc sinh khởi.
        </div>
      </div>
    </div>
  );
}

const CARD_CONFIGS = {
  buddhist_wisdom: {
    badge: '🪷 PHẬT GIÁO & ZEN',
    badgeBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.3)',
    buttonTextColor: '#000',
    tags: ['🎙️ Giọng Podcast Nhẹ Nhàng', '🏷️ Tag Cảm Xúc ElevenLabs v3', '🎨 Màu Nước Giấy Trắng (16:9)', '📜 100% Tiếng Anh (Vietsub)', '⏱️ Video Dài 8 - 20 Phút', '🖼️ 1 Ảnh / 20s (Google Flow)']
  },
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
  },
  pexels_talk_video: {
    badge: '🎙️ TÂM SỰ ĐẠO LÝ',
    badgeBg: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    accentColor: '#a78bfa',
    glowColor: 'rgba(167, 139, 250, 0.25)',
    tags: ['🎞️ Nền Video Pexels Tự Động', '〰️ Sóng Âm Thanh Giọng Đọc', '🪟 Glass Text Overlay']
  }
};

export default function VideoCategoryGrid({ onSelectCategory }) {
  const allCategoryKeys = ['buddhist_wisdom', 'stick_figure_slideshow', 'reading_practice', 'moral_talk_slideshow', 'pexels_talk_video'].filter(k => PROMPT_CATEGORIES[k]);

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
                @keyframes flameFlicker {
                  0% { transform: scale(1) rotate(0deg); opacity: 0.9; }
                  25% { transform: scale(1.1, 0.9) rotate(-2deg); opacity: 1; }
                  50% { transform: scale(0.95, 1.15) rotate(2deg); opacity: 0.85; }
                  75% { transform: scale(1.05, 0.98) rotate(-1deg); opacity: 1; }
                  100% { transform: scale(1) rotate(0deg); opacity: 0.9; }
                }
                @keyframes lampAuraGlow {
                  0% { opacity: 0.6; transform: scale(1); }
                  50% { opacity: 0.95; transform: scale(1.15); }
                  100% { opacity: 0.6; transform: scale(1); }
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
                {key === 'buddhist_wisdom' && <BuddhistWisdomPreview />}
                {key === 'stick_figure_slideshow' && <StickFigurePreview />}
                {key === 'reading_practice' && <ReadingPracticePreview />}
                {key === 'moral_talk_slideshow' && <MoralTalkPreview />}
                {key === 'pexels_talk_video' && <PexelsTalkPreview />}

                {/* Fallback for other potential categories */}
                {!['buddhist_wisdom','stick_figure_slideshow','reading_practice','moral_talk_slideshow','pexels_talk_video'].includes(key) && bgImg && (
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
