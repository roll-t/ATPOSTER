'use client';

import { useState, useEffect } from 'react';
import { PROMPT_CATEGORIES } from '@/src/domain/content/index.js';

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

function ArticleNewsPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#0a0f1d',
      padding: '10px 12px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#ef4444',
            boxShadow: '0 0 8px #ef4444',
            display: 'inline-block'
          }} />
          <span style={{ fontSize: '8.5px', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.6px' }}>
            BREAKING NEWS
          </span>
        </div>
        <div style={{
          background: 'rgba(56, 189, 248, 0.2)',
          border: '1px solid rgba(56, 189, 248, 0.45)',
          color: '#7dd3fc',
          fontSize: '8px',
          fontWeight: 900,
          padding: '2px 7px',
          borderRadius: '10px',
          letterSpacing: '0.4px'
        }}>
          LINK → VIDEO
        </div>
      </div>

      {/* Center News Graphic */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        margin: '2px 0',
        zIndex: 2
      }}>
        {/* Newspaper Icon */}
        <div style={{
          width: '50px',
          height: '40px',
          background: '#1e293b',
          border: '1.5px solid #334155',
          borderRadius: '6px',
          padding: '4px 5px',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <div style={{ height: '4px', width: '70%', background: '#38bdf8', borderRadius: '2px' }} />
          <div style={{ height: '3px', width: '100%', background: '#475569', borderRadius: '1.5px' }} />
          <div style={{ height: '3px', width: '90%', background: '#475569', borderRadius: '1.5px' }} />
          <div style={{ height: '3px', width: '80%', background: '#475569', borderRadius: '1.5px' }} />
        </div>

        {/* Stick Figure Reporter */}
        <svg viewBox="0 0 60 70" style={{ width: '40px', height: '44px' }}>
          <circle cx="28" cy="16" r="8" stroke="#fff" strokeWidth="2.5" fill="none" />
          <line x1="28" y1="24" x2="28" y2="48" stroke="#fff" strokeWidth="2.5" />
          {/* Arm holding mic */}
          <line x1="28" y1="30" x2="42" y2="34" stroke="#fff" strokeWidth="2.5" />
          <line x1="42" y1="34" x2="42" y2="28" stroke="#fff" strokeWidth="2.5" />
          <rect x="39" y="24" width="6" height="6" rx="2" fill="#ef4444" />
          {/* Other arm */}
          <line x1="28" y1="30" x2="14" y2="38" stroke="#fff" strokeWidth="2.5" />
          {/* Legs */}
          <line x1="28" y1="48" x2="18" y2="66" stroke="#fff" strokeWidth="2.5" />
          <line x1="28" y1="48" x2="38" y2="66" stroke="#fff" strokeWidth="2.5" />
        </svg>
      </div>

      {/* Red News Lower Banner */}
      <div style={{
        background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)',
        borderRadius: '5px',
        padding: '3px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)',
        zIndex: 2
      }}>
        <span style={{
          fontSize: '7.5px',
          fontWeight: 900,
          background: '#fff',
          color: '#dc2626',
          padding: '1px 4px',
          borderRadius: '2px',
          letterSpacing: '0.4px'
        }}>
          TIN TỨC
        </span>
        <span style={{
          fontSize: '8px',
          fontWeight: 700,
          color: '#fff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          Chuyển bài báo thành kịch bản người que...
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
          100% TIẾNG NHẬT
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

function JapaneseHistoryPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '10px 12px 8px 12px',
      boxSizing: 'border-box'
    }}>
      {/* Background Japanese History Artwork */}
      <div
        className="card-bg-layer"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/card-bg/japanese_history.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 42%',
          transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: 0
        }}
      />

      {/* Dark gradient overlay for text readability */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(8, 6, 12, 0.72) 0%, rgba(8, 6, 12, 0.15) 45%, rgba(8, 6, 12, 0.88) 100%)',
        zIndex: 1,
        pointerEvents: 'none'
      }} />

      {/* Top Header Label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2, position: 'relative' }}>
        <span style={{ fontSize: '8.5px', color: '#fda4af', fontWeight: 800, letterSpacing: '0.8px', textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
          ⚔️ SENGOKU & SAMURAI
        </span>
        <div style={{
          background: 'rgba(244, 63, 94, 0.28)',
          border: '1px solid rgba(244, 63, 94, 0.5)',
          color: '#fecdd3',
          fontSize: '8.5px',
          fontWeight: 900,
          padding: '2px 8px',
          borderRadius: '12px',
          backdropFilter: 'blur(6px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
        }}>
          100% TIẾNG NHẬT
        </div>
      </div>

      {/* Center spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom Floating Quote */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', zIndex: 2, position: 'relative' }}>
        <div style={{
          fontSize: '9.5px',
          fontWeight: 800,
          color: '#fff',
          textAlign: 'center',
          fontFamily: 'serif',
          letterSpacing: '-0.2px',
          textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 10px rgba(244, 63, 94, 0.5)'
        }}>
          "天下布武 — Hào Khí Thời Đại Samurai"
        </div>
        <div style={{
          fontSize: '8px',
          color: 'rgba(254, 205, 211, 0.85)',
          textAlign: 'center',
          fontWeight: 600,
          textShadow: '0 2px 6px rgba(0,0,0,0.9)'
        }}>
          Dã sử Sengoku · Huyền thoại Samurai & Ninja
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
    shortDescription: 'Triết lý Phật giáo, lời Phật dạy & thiền định kết hợp tranh thuỷ mặc cổ phong.',
    tags: ['🪷 Thiền & Triết Lý', '📜 Tiếng Nhật/Việt', '⏱️ 8 - 20 Phút']
  },
  japanese_history: {
    bgImg: '/card-bg/japanese_history.jpg',
    badge: '⚔️ LỊCH SỬ NHẬT BẢN',
    badgeBg: 'linear-gradient(135deg, #f43f5e, #be123c)',
    accentColor: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.3)',
    shortDescription: 'Dã sử & danh tướng Sengoku, Samurai và các trận chiến kinh điển thời Mạc Phủ.',
    tags: ['🏯 Lịch Sử & Samurai', '📜 Tiếng Nhật/Việt', '⏱️ 4 - 20 Phút']
  },
  stick_figure_slideshow: {
    bgImg: '/card-bg/stick_figure_slideshow.png',
    badge: '🔥 HOT SKILL',
    badgeBg: 'linear-gradient(135deg, #fe2c55, #ff0055)',
    accentColor: '#fe2c55',
    glowColor: 'rgba(254, 44, 85, 0.25)',
    shortDescription: 'Trình chiếu người que 2D đen trắng tối giản kể chuyện đời sống & bài học ý nghĩa.',
    tags: ['🎨 2D Người Que', '📱 9:16 & 💻 16:9', '🎬 Slideshow MP4']
  },
  article_news_stick_figure: {
    badge: '📰 BÁO CHÍ & ĐỜI SỐNG',
    badgeBg: 'linear-gradient(135deg, #0284c7, #2563eb)',
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.28)',
    shortDescription: 'Dán link bài báo, AI tự bóc tách nội dung và chuyển thể thành video người que sinh động.',
    tags: ['🔗 Link Bài Báo', '🎙️ Phóng Sự Hoạt Họa', '✏️ Người Que 2D']
  },
  reading_practice: {
    bgImg: '/card-bg/reading_practice.png',
    badge: '📚 CEFR 50 BÀI/LEVEL',
    badgeBg: 'linear-gradient(135deg, #00f2fe, #4ade80)',
    accentColor: '#25f4ee',
    glowColor: 'rgba(37, 244, 238, 0.25)',
    buttonTextColor: '#000',
    shortDescription: 'Bài học đọc tiếng Anh chuẩn CEFR A1-C2, vietsub song song kèm giọng bản xứ.',
    tags: ['🎤 Giọng Karaoke', '🇻🇳 Vietsub Tự Động', '📖 Lộ Trình CEFR']
  },
  moral_talk_slideshow: {
    badge: '🇻🇳 LỒNG TIẾNG VIỆT',
    badgeBg: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    accentColor: '#a78bfa',
    glowColor: 'rgba(167, 139, 250, 0.25)',
    shortDescription: 'Bài học cuộc sống, tóm tắt sách hay bằng tranh pictogram phát sáng nghệ thuật.',
    tags: ['✨ Pictogram Sáng', '🎙️ Lồng Tiếng Tự Động', '🇻🇳 Lời Bình Triết Lý']
  },
  pexels_talk_video: {
    badge: '🎙️ TÂM SỰ ĐẠO LÝ',
    badgeBg: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    accentColor: '#a78bfa',
    glowColor: 'rgba(167, 139, 250, 0.25)',
    shortDescription: 'Tâm sự góc nhìn cuộc sống với nền video cảnh Pexels và sóng âm thanh.',
    tags: ['🎞️ Stock Pexels', '〰️ Sóng Âm Thanh', '🪟 Text Overlay']
  }
};

export default function VideoCategoryGrid({ onSelectCategory, onOpenVideos }) {
  const allCategoryKeys = ['buddhist_wisdom', 'japanese_history', 'stick_figure_slideshow', 'article_news_stick_figure', 'reading_practice', 'moral_talk_slideshow', 'pexels_talk_video'].filter(k => PROMPT_CATEGORIES[k]);
  const [videoCount, setVideoCount] = useState(null);

  useEffect(() => {
    fetch('/api/prompts/created-videos')
      .then(res => res.json())
      .then(data => {
        if (data?.videos) setVideoCount(data.videos.length);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ padding: '4px 4px 28px 4px', animation: 'fadeIn 0.25s ease-out' }}>
      {/* Hero Header với nút "Video Đã Tạo" ở bên phải */}
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
            color: 'var(--secondary)',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.6px',
            marginBottom: '10px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
          }}>
            <span>⚡</span> STUDIO SÁNG TẠO VIDEO AI
          </div>

          <h1 style={{
            fontSize: '1.65rem',
            fontWeight: 900,
            color: '#fff',
            margin: 0,
            letterSpacing: '-0.4px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            🎬 Danh Mục Các Chủ Đề Video
          </h1>
        </div>

        {/* Nút "Video Đã Tạo" nằm bên phải chỗ người dùng đánh dấu */}
        {onOpenVideos && (
          <button
            type="button"
            onClick={onOpenVideos}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 18px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(255, 46, 99, 0.14), rgba(167, 139, 250, 0.2))',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              backdropFilter: 'blur(12px)',
              userSelect: 'none',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'rgba(255, 46, 99, 0.5)';
              e.currentTarget.style.boxShadow = '0 12px 28px rgba(255, 46, 99, 0.28)';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 46, 99, 0.24), rgba(167, 139, 250, 0.3))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 46, 99, 0.14), rgba(167, 139, 250, 0.2))';
            }}
          >
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #ff2e63, #a78bfa)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(255, 46, 99, 0.35)'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                  Video Đã Tạo
                </span>
                {videoCount !== null && (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    background: 'rgba(37, 244, 238, 0.2)',
                    border: '1px solid rgba(37, 244, 238, 0.4)',
                    color: 'var(--secondary)',
                    borderRadius: '10px',
                    padding: '1px 7px',
                    lineHeight: 1.3
                  }}>
                    {videoCount}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500 }}>
                Xem lại video MP4 đã xuất
              </span>
            </div>
            <span style={{
              fontSize: '0.82rem',
              color: 'var(--secondary)',
              marginLeft: '4px',
              fontWeight: 800
            }}>
              ➔
            </span>
          </button>
        )}
      </div>

      {/* Grid Showcase Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
        gap: '16px',
        padding: '2px'
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
                borderRadius: '16px',
                overflow: 'hidden',
                isolation: 'isolate',
                border: `1.5px solid ${cfg.accentColor ? `${cfg.accentColor}66` : 'rgba(255, 255, 255, 0.15)'}`,
                boxShadow: `0 8px 24px ${cfg.glowColor || 'rgba(0,0,0,0.3)'}`,
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                flexDirection: 'column',
                background: '#12111A'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)';
                e.currentTarget.style.borderColor = cfg.accentColor || '#fff';
                e.currentTarget.style.boxShadow = `0 14px 36px ${cfg.glowColor ? cfg.glowColor.replace('0.25', '0.4').replace('0.3', '0.45') : 'rgba(0,0,0,0.5)'}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.borderColor = cfg.accentColor ? `${cfg.accentColor}66` : 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.boxShadow = `0 8px 24px ${cfg.glowColor || 'rgba(0,0,0,0.3)'}`;
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

              {/* Top Style Preview Section */}
              <div style={{
                height: '125px',
                width: '100%',
                overflow: 'hidden',
                position: 'relative',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                zIndex: 1
              }}>
                {key === 'buddhist_wisdom' && <BuddhistWisdomPreview />}
                {key === 'japanese_history' && <JapaneseHistoryPreview />}
                {key === 'stick_figure_slideshow' && <StickFigurePreview />}
                {key === 'article_news_stick_figure' && <ArticleNewsPreview />}
                {key === 'reading_practice' && <ReadingPracticePreview />}
                {key === 'moral_talk_slideshow' && <MoralTalkPreview />}
                {key === 'pexels_talk_video' && <PexelsTalkPreview />}

                {/* Fallback for other potential categories */}
                {!['buddhist_wisdom','japanese_history','stick_figure_slideshow','article_news_stick_figure','reading_practice','moral_talk_slideshow','pexels_talk_video'].includes(key) && bgImg && (
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
                  padding: '16px 16px 14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  flexGrow: 1,
                  justifyContent: 'space-between',
                  background: '#12111A'
                }}
              >
                {/* Header Row Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '1.65rem', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))' }}>
                    {cat.icon}
                  </div>
                  {cfg.badge && (
                    <div style={{
                      background: cfg.badgeBg || 'var(--primary-gradient)',
                      color: '#000',
                      fontSize: '0.66rem',
                      fontWeight: 900,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      letterSpacing: '0.4px',
                      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
                    }}>
                      {cfg.badge}
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
                    {cfg.shortDescription || cat.description}
                  </p>
                </div>

                {/* Feature Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                  {(cfg.tags || []).map((tag, idx) => (
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
                    ⚡ Sẵn sàng tạo video
                  </span>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: cfg.badgeBg || 'linear-gradient(135deg, #fe2c55, #ff0055)',
                    color: cfg.buttonTextColor || '#fff',
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
