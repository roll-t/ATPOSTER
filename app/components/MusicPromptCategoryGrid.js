'use client';

import React from 'react';
import { MUSIC_PROMPT_CATEGORIES } from '@/src/domain/content/bgMusicPrompts.js';

// --- VISUAL PREVIEWS FOR MUSIC PROMPT CATEGORIES ---

function ZenMeditationPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #1c1407 0%, #38240a 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
        {/* Soft Aura Ring */}
        <circle cx="80" cy="35" r="28" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 2" fill="none" opacity="0.4" />
        
        {/* Lotus Flower in Center */}
        <path d="M 80 20 Q 85 30 80 44 Q 75 30 80 20 Z" fill="#fef08a" />
        <path d="M 72 26 Q 78 34 80 44 Q 70 38 72 26 Z" fill="#fde047" opacity="0.85" />
        <path d="M 88 26 Q 82 34 80 44 Q 90 38 88 26 Z" fill="#fde047" opacity="0.85" />
        <path d="M 64 34 Q 74 38 80 44 Q 68 44 64 34 Z" fill="#eab308" opacity="0.75" />
        <path d="M 96 34 Q 86 38 80 44 Q 92 44 96 34 Z" fill="#eab308" opacity="0.75" />

        {/* Water Ripples */}
        <ellipse cx="80" cy="46" rx="30" ry="6" stroke="#fbbf24" strokeWidth="1" fill="none" opacity="0.6" />
        <ellipse cx="80" cy="46" rx="50" ry="10" stroke="#f59e0b" strokeWidth="0.8" fill="none" opacity="0.3" />

        {/* Shakuhachi Flute Silhouette */}
        <line x1="20" y1="20" x2="35" y2="50" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="25" cy="30" r="0.8" fill="#fff" />
        <circle cx="28" cy="36" r="0.8" fill="#fff" />
        <circle cx="31" cy="42" r="0.8" fill="#fff" />
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
        432HZ TĨNH TÂM
      </div>
    </div>
  );
}

function SamuraiEraPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #220606 0%, #440d0d 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
        {/* Taiko Drum Body on Left */}
        <ellipse cx="38" cy="35" rx="14" ry="20" fill="#7f1d1d" stroke="#f87171" strokeWidth="1.2" />
        <ellipse cx="44" cy="35" rx="14" ry="20" fill="#991b1b" stroke="#fca5a5" strokeWidth="1.2" />
        <circle cx="44" cy="35" r="4" fill="#fef2f2" opacity="0.6" />
        {/* Drumsticks Bachi */}
        <line x1="22" y1="20" x2="40" y2="30" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="22" y1="50" x2="40" y2="40" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" />

        {/* Satsuma Biwa Lute on Right */}
        <path d="M 120 18 L 120 30 Q 130 42 124 54 Q 116 58 112 54 Q 106 42 116 30 L 116 18 Z" fill="#b91c1c" stroke="#fca5a5" strokeWidth="1" />
        <line x1="118" y1="18" x2="118" y2="52" stroke="#fef08a" strokeWidth="1" />
        {/* Plectrum Bachi */}
        <polygon points="98,38 108,30 106,44" fill="#fbbf24" />

        {/* Sound waves pulse */}
        <path d="M 64 35 Q 72 25 80 35 Q 88 45 96 35" stroke="#ef4444" strokeWidth="1.5" fill="none" />
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
        TAIKO & BIWA 62 BPM
      </div>
    </div>
  );
}

function NinjaShinobiPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #10061e 0%, #200c3b 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
        {/* Full Moon in Mist */}
        <circle cx="120" cy="26" r="16" fill="#f5d0fe" opacity="0.6" />
        <ellipse cx="115" cy="30" rx="22" ry="6" fill="#10061e" opacity="0.7" />

        {/* Rooftop Silhouettes */}
        <polygon points="10,65 50,45 80,65" fill="#090312" stroke="#a855f7" strokeWidth="1" />
        <polygon points="75,65 115,48 150,65" fill="#090312" stroke="#c084fc" strokeWidth="1" />

        {/* Leaping Ninja Silhouette */}
        <circle cx="58" cy="32" r="3.5" fill="#e9d5ff" />
        <line x1="58" y1="35" x2="55" y2="44" stroke="#e9d5ff" strokeWidth="2.5" />
        <line x1="55" y1="44" x2="48" y2="48" stroke="#e9d5ff" strokeWidth="2" />
        <line x1="55" y1="44" x2="62" y2="47" stroke="#e9d5ff" strokeWidth="2" />
        {/* Katana on Back */}
        <line x1="52" y1="28" x2="64" y2="42" stroke="#c084fc" strokeWidth="1.2" />

        {/* Suspense Shinobue Waveform */}
        <path d="M 15 25 Q 25 15 35 25 Q 45 35 55 25" stroke="#a855f7" strokeWidth="1" strokeDasharray="2 2" fill="none" />
      </svg>

      <div style={{
        position: 'absolute',
        bottom: '8px',
        right: '12px',
        fontSize: '9px',
        color: '#c084fc',
        fontWeight: 800,
        background: 'rgba(168, 85, 247, 0.15)',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid rgba(192, 132, 252, 0.3)'
      }}>
        RUBATO SUSPENSE
      </div>
    </div>
  );
}

function LofiChillPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #260a16 0%, #441228 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
        {/* Spinning Vinyl Record on Left */}
        <circle cx="45" cy="35" r="22" fill="#18181b" stroke="#f43f5e" strokeWidth="1" />
        <circle cx="45" cy="35" r="16" stroke="#27272a" strokeWidth="1" fill="none" />
        <circle cx="45" cy="35" r="11" stroke="#3f3f46" strokeWidth="0.8" fill="none" />
        <circle cx="45" cy="35" r="7" fill="#fb7185" />
        <circle cx="45" cy="35" r="2" fill="#fff" />

        {/* Cozy Coffee Mug with Steam on Right */}
        <rect x="110" y="32" width="16" height="18" rx="3" fill="#fda4af" />
        {/* Mug Handle */}
        <path d="M 126 36 Q 132 40 126 44" stroke="#fda4af" strokeWidth="2" fill="none" />
        {/* Steam */}
        <path d="M 114 28 Q 116 22 113 18" stroke="#fecdd3" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        <path d="M 121 28 Q 123 23 120 18" stroke="#fecdd3" strokeWidth="1.2" strokeLinecap="round" fill="none" />

        {/* Rain streaks on window */}
        <line x1="80" y1="12" x2="76" y2="28" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <line x1="92" y1="20" x2="88" y2="38" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      </svg>

      <div style={{
        position: 'absolute',
        top: '8px',
        right: '12px',
        fontSize: '9px',
        color: '#fb7185',
        fontWeight: 800,
        background: 'rgba(244, 63, 94, 0.15)',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid rgba(251, 113, 133, 0.3)'
      }}>
        VINYL CRACKLE 70 BPM
      </div>
    </div>
  );
}

function AmbientSleepPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #090c24 0%, #141b4d 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
        {/* Crescent Moon */}
        <path d="M 125 18 A 12 12 0 0 0 135 38 A 15 15 0 1 1 125 18 Z" fill="#c7d2fe" />

        {/* Dreamy Twinkling Stars */}
        <circle cx="30" cy="20" r="1.5" fill="#e0e7ff" />
        <circle cx="55" cy="14" r="1" fill="#e0e7ff" />
        <circle cx="85" cy="22" r="1.2" fill="#e0e7ff" />
        <circle cx="105" cy="15" r="1.8" fill="#e0e7ff" />

        {/* 528Hz Smooth Sine Waveform */}
        <path d="M 10 46 Q 35 32 60 46 T 110 46 T 150 46" stroke="#818cf8" strokeWidth="2" fill="none" opacity="0.8" />
        <path d="M 10 46 Q 35 36 60 46 T 110 46 T 150 46" stroke="#a5b4fc" strokeWidth="1" fill="none" opacity="0.5" />
      </svg>

      <div style={{
        position: 'absolute',
        bottom: '8px',
        right: '12px',
        fontSize: '9px',
        color: '#a5b4fc',
        fontWeight: 800,
        background: 'rgba(99, 102, 241, 0.15)',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid rgba(165, 180, 252, 0.3)'
      }}>
        528HZ SÓNG NÃO DELTA
      </div>
    </div>
  );
}

function GhibliPianoPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #072218 0%, #0e3b2b 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
        {/* Pastoral Green Rolling Hills */}
        <path d="M 0 52 Q 50 38 100 50 Q 135 44 160 55 L 160 70 L 0 70 Z" fill="#064e3b" />
        
        {/* Floating Flower Petals in Wind */}
        <circle cx="35" cy="24" r="1.5" fill="#fbcfe8" />
        <circle cx="50" cy="18" r="2" fill="#fbcfe8" />
        <circle cx="75" cy="28" r="1.5" fill="#fbcfe8" />
        <circle cx="120" cy="22" r="2" fill="#fbcfe8" />

        {/* Piano Keyboard Silhouette */}
        <rect x="50" y="44" width="60" height="18" rx="2" fill="#f8fafc" stroke="#334155" strokeWidth="1" />
        {/* Black keys */}
        <rect x="56" y="44" width="4" height="10" fill="#0f172a" />
        <rect x="63" y="44" width="4" height="10" fill="#0f172a" />
        <rect x="75" y="44" width="4" height="10" fill="#0f172a" />
        <rect x="82" y="44" width="4" height="10" fill="#0f172a" />
        <rect x="89" y="44" width="4" height="10" fill="#0f172a" />
        <rect x="101" y="44" width="4" height="10" fill="#0f172a" />
      </svg>

      <div style={{
        position: 'absolute',
        top: '8px',
        right: '12px',
        fontSize: '9px',
        color: '#34d399',
        fontWeight: 800,
        background: 'rgba(16, 185, 129, 0.15)',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid rgba(52, 211, 153, 0.3)'
      }}>
        JOE HISAISHI STYLE
      </div>
    </div>
  );
}

function KnowledgeCuriosityPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #042f2e 0%, #0c4a6e 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
        {/* Glow Aura behind Light Bulb */}
        <circle cx="80" cy="28" r="22" fill="#38bdf8" opacity="0.18" />

        {/* Light Bulb (Idea / Knowledge) */}
        <path d="M 74 18 A 9 9 0 1 1 86 18 C 86 22 83 25 83 29 L 77 29 C 77 25 74 22 74 18 Z" fill="#fef08a" stroke="#facc15" strokeWidth="1.2" />
        <line x1="77" y1="32" x2="83" y2="32" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="78" y1="35" x2="82" y2="35" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />

        {/* Sparkle rays ("tin tin tin") */}
        <line x1="80" y1="4" x2="80" y2="7" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="66" y1="9" x2="69" y2="12" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="94" y1="9" x2="91" y2="12" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="60" y1="18" x2="64" y2="19" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="100" y1="18" x2="96" y2="19" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" />

        {/* Bouncing Pizzicato Arc ("ten ten ten") */}
        <path d="M 18 54 Q 34 32 50 54 Q 65 34 80 54 Q 95 34 110 54 Q 126 32 142 54" stroke="#06b6d4" strokeWidth="1.8" fill="none" strokeDasharray="3 2" />

        {/* Marimba / Xylophone wooden bars */}
        <rect x="24" y="46" width="5" height="17" rx="1.5" fill="#f59e0b" opacity="0.85" />
        <rect x="33" y="43" width="5" height="20" rx="1.5" fill="#f59e0b" opacity="0.85" />
        <rect x="42" y="40" width="5" height="23" rx="1.5" fill="#f59e0b" opacity="0.85" />

        <rect x="113" y="40" width="5" height="23" rx="1.5" fill="#38bdf8" opacity="0.85" />
        <rect x="122" y="43" width="5" height="20" rx="1.5" fill="#38bdf8" opacity="0.85" />
        <rect x="131" y="46" width="5" height="17" rx="1.5" fill="#38bdf8" opacity="0.85" />

        {/* Musical notes bouncing */}
        <circle cx="50" cy="32" r="2" fill="#a5f3fc" />
        <circle cx="110" cy="32" r="2" fill="#a5f3fc" />
      </svg>

      <div style={{
        position: 'absolute',
        top: '8px',
        right: '12px',
        fontSize: '9px',
        color: '#38bdf8',
        fontWeight: 800,
        background: 'rgba(6, 182, 212, 0.15)',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid rgba(56, 189, 248, 0.3)'
      }}>
        PIZZICATO & MARIMBA 108 BPM
      </div>
    </div>
  );
}

function NewsJournalismPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #030712 0%, #0c1c38 50%, #1e3a8a 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
        {/* Subtle Globe Grid / Radar Rings */}
        <circle cx="80" cy="35" r="28" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3 3" fill="none" opacity="0.3" />
        <ellipse cx="80" cy="35" rx="28" ry="12" stroke="#38bdf8" strokeWidth="0.8" fill="none" opacity="0.25" />
        <line x1="52" y1="35" x2="108" y2="35" stroke="#38bdf8" strokeWidth="0.8" opacity="0.3" />
        <line x1="80" y1="7" x2="80" y2="63" stroke="#38bdf8" strokeWidth="0.8" opacity="0.3" />

        {/* Studio Broadcast Micro / Signal Tower */}
        <circle cx="80" cy="22" r="3.5" fill="#f43f5e" />
        <path d="M 72 22 A 8 8 0 0 1 88 22" stroke="#f43f5e" strokeWidth="1.2" fill="none" opacity="0.8" />
        <path d="M 68 22 A 12 12 0 0 1 92 22" stroke="#f43f5e" strokeWidth="1" fill="none" opacity="0.5" />
        <line x1="80" y1="26" x2="80" y2="46" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <path d="M 74 46 L 86 46" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />

        {/* Digital Audio Equalizer & News Ticker Soundwaves */}
        <rect x="22" y="32" width="3.5" height="14" rx="1.5" fill="#38bdf8" opacity="0.75" />
        <rect x="28" y="24" width="3.5" height="22" rx="1.5" fill="#38bdf8" opacity="0.9" />
        <rect x="34" y="36" width="3.5" height="10" rx="1.5" fill="#0284c7" opacity="0.8" />
        <rect x="40" y="28" width="3.5" height="18" rx="1.5" fill="#38bdf8" opacity="0.85" />
        <rect x="46" y="34" width="3.5" height="12" rx="1.5" fill="#0284c7" opacity="0.7" />

        <rect x="110" y="34" width="3.5" height="12" rx="1.5" fill="#0284c7" opacity="0.7" />
        <rect x="116" y="28" width="3.5" height="18" rx="1.5" fill="#38bdf8" opacity="0.85" />
        <rect x="122" y="36" width="3.5" height="10" rx="1.5" fill="#0284c7" opacity="0.8" />
        <rect x="128" y="24" width="3.5" height="22" rx="1.5" fill="#38bdf8" opacity="0.9" />
        <rect x="134" y="32" width="3.5" height="14" rx="1.5" fill="#38bdf8" opacity="0.75" />

        {/* Horizontal Ticker Pulse Beam */}
        <line x1="16" y1="52" x2="144" y2="52" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="4 2" opacity="0.4" />
        <circle cx="50" cy="52" r="2" fill="#38bdf8" />
        <circle cx="110" cy="52" r="2" fill="#38bdf8" />
      </svg>

      <div style={{
        position: 'absolute',
        top: '8px',
        right: '12px',
        fontSize: '9px',
        color: '#38bdf8',
        fontWeight: 800,
        background: 'rgba(2, 132, 199, 0.2)',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid rgba(56, 189, 248, 0.35)'
      }}>
        TICKER & STRINGS 116 BPM
      </div>
    </div>
  );
}

export default function MusicPromptCategoryGrid({ onSelectCategory }) {
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
            color: '#c084fc',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.6px',
            marginBottom: '10px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
          }}>
            <span>⚡</span> KHO PROMPT NHẠC NỀN SUNO AI
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
            🎵 Danh Mục Các Thể Loại Nhạc Nền
          </h1>

          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            margin: 0,
            fontSize: '0.84rem',
            lineHeight: 1.45
          }}>
            Chọn thể loại âm nhạc để lấy bộ prompt Suno v4.5 tối ưu hóa cho video có lời bình: âm lượng đều, lặp vô tận (seamless loop), thưa tiếng không tranh giọng người.
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
        {MUSIC_PROMPT_CATEGORIES.map((cat) => {
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
                {cat.id === 'news_journalism' && <NewsJournalismPreview />}
                {cat.id === 'zen_meditation' && <ZenMeditationPreview />}
                {cat.id === 'samurai_era' && <SamuraiEraPreview />}
                {cat.id === 'ninja_shinobi' && <NinjaShinobiPreview />}
                {cat.id === 'lofi_chill' && <LofiChillPreview />}
                {cat.id === 'ambient_sleep' && <AmbientSleepPreview />}
                {cat.id === 'ghibli_piano' && <GhibliPianoPreview />}
                {cat.id === 'knowledge_curiosity' && <KnowledgeCuriosityPreview />}
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
                    ⚡ Sẵn sàng lấy prompt
                  </span>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: cat.badgeBg || 'linear-gradient(135deg, #a855f7, #6366f1)',
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
