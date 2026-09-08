'use client';

import React from 'react';
import { IMAGE_PROMPT_CATEGORIES } from '@/src/domain/content/imagePromptCategories.js';

// --- VISUAL PREVIEWS FOR IMAGE PROMPT CATEGORIES ---

function PortraitCinematicPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #1f081c 0%, #3b1037 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
        {/* Soft Golden Bokeh Orbs */}
        <circle cx="35" cy="25" r="14" fill="rgba(244, 114, 182, 0.25)" />
        <circle cx="125" cy="45" r="18" fill="rgba(251, 191, 36, 0.2)" />
        <circle cx="138" cy="20" r="10" fill="rgba(236, 72, 153, 0.2)" />

        {/* 85mm Camera Lens Reticle / Viewfinder */}
        <circle cx="80" cy="35" r="26" stroke="#f472b6" strokeWidth="1" strokeDasharray="5 3" fill="none" opacity="0.6" />
        <circle cx="80" cy="35" r="16" stroke="#ec4899" strokeWidth="1.2" fill="none" opacity="0.8" />
        {/* Focusing Brackets */}
        <line x1="72" y1="31" x2="75" y2="31" stroke="#fff" strokeWidth="1.5" />
        <line x1="72" y1="31" x2="72" y2="34" stroke="#fff" strokeWidth="1.5" />
        
        <line x1="88" y1="31" x2="85" y2="31" stroke="#fff" strokeWidth="1.5" />
        <line x1="88" y1="31" x2="88" y2="34" stroke="#fff" strokeWidth="1.5" />

        <line x1="72" y1="39" x2="75" y2="39" stroke="#fff" strokeWidth="1.5" />
        <line x1="72" y1="39" x2="72" y2="36" stroke="#fff" strokeWidth="1.5" />

        <line x1="88" y1="39" x2="85" y2="39" stroke="#fff" strokeWidth="1.5" />
        <line x1="88" y1="39" x2="88" y2="36" stroke="#fff" strokeWidth="1.5" />

        {/* Center crosshair dot */}
        <circle cx="80" cy="35" r="1.5" fill="#ec4899" />
      </svg>

      <div style={{
        position: 'absolute',
        bottom: '8px',
        right: '12px',
        fontSize: '9px',
        color: '#f472b6',
        fontWeight: 800,
        background: 'rgba(236, 72, 153, 0.15)',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid rgba(244, 114, 182, 0.3)'
      }}>
        85MM F/1.4 BOKEH
      </div>
    </div>
  );
}

function SumieUkiyoePreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #1f1a14 0%, #2e261a 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
        {/* Soft Parchment Texture Tone */}
        <rect x="0" y="0" width="160" height="70" fill="#fef3c7" opacity="0.06" />

        {/* Sumi-e Ink Mountain Layers */}
        <path d="M 15 56 Q 45 25 75 56 Z" fill="#2d251d" opacity="0.7" />
        <path d="M 50 56 Q 90 18 135 56 Z" fill="#1b1510" opacity="0.9" />

        {/* Bamboo Branch with ink leaves */}
        <line x1="20" y1="20" x2="40" y2="48" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M 30 32 Q 22 28 18 32" stroke="#d97706" strokeWidth="1.5" fill="none" />
        <path d="M 36 40 Q 45 36 48 42" stroke="#d97706" strokeWidth="1.5" fill="none" />

        {/* Red Japanese Artist Hanko Stamp */}
        <rect x="135" y="14" width="12" height="12" rx="1.5" fill="#dc2626" opacity="0.9" />
        <text x="141" y="23" fontSize="8" fill="#fff" textAnchor="middle" fontWeight="bold">和</text>

        {/* Zen Water Ink Mist */}
        <line x1="10" y1="58" x2="150" y2="58" stroke="#b45309" strokeWidth="1" strokeDasharray="12 6 20 4" opacity="0.6" />
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
        墨絵 SUMI-E
      </div>
    </div>
  );
}

function AnimeShinkaiPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #0b2545 0%, #134074 50%, #8da9c4 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
        {/* Volumetric Cumulus Clouds (Makoto Shinkai style) */}
        <ellipse cx="60" cy="50" rx="35" ry="18" fill="#fbcfe8" opacity="0.6" />
        <ellipse cx="95" cy="45" rx="30" ry="22" fill="#bae6fd" opacity="0.7" />
        <ellipse cx="120" cy="52" rx="25" ry="16" fill="#fdf2f8" opacity="0.9" />

        {/* Shooting Stars / Comets */}
        <line x1="30" y1="12" x2="65" y2="28" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="65" cy="28" r="1.5" fill="#fff" />

        {/* Power Pole Silhouette with Wires */}
        <line x1="25" y1="35" x2="25" y2="65" stroke="#0f172a" strokeWidth="2" />
        <line x1="18" y1="42" x2="32" y2="42" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="20" y1="48" x2="30" y2="48" stroke="#0f172a" strokeWidth="1" />
        <path d="M 25 42 Q 90 48 160 40" stroke="#0f172a" strokeWidth="0.8" fill="none" />
        <path d="M 25 48 Q 90 54 160 46" stroke="#0f172a" strokeWidth="0.8" fill="none" />
      </svg>

      <div style={{
        position: 'absolute',
        top: '8px',
        right: '12px',
        fontSize: '9px',
        color: '#38bdf8',
        fontWeight: 800,
        background: 'rgba(56, 189, 248, 0.15)',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid rgba(56, 189, 248, 0.3)'
      }}>
        MAKOTO SHINKAI
      </div>
    </div>
  );
}

function EpicFantasyPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #180829 0%, #30104e 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
        {/* Floating Island with Ancient Castle */}
        <polygon points="50,42 110,42 90,62 70,62" fill="#2e1065" stroke="#7c3aed" strokeWidth="1" />
        
        {/* Castle Towers */}
        <rect x="68" y="28" width="8" height="14" fill="#4c1d95" />
        <polygon points="66,28 72,20 78,28" fill="#8b5cf6" />
        
        <rect x="84" y="25" width="10" height="17" fill="#4c1d95" />
        <polygon points="82,25 89,16 96,25" fill="#a855f7" />

        {/* Dragon Silhouette in sky */}
        <path d="M 25 22 Q 35 15 42 22 Q 48 18 52 24" stroke="#c084fc" strokeWidth="1.5" fill="none" />
        <polygon points="42,22 40,28 45,24" fill="#c084fc" />

        {/* Arcane Magic Rings */}
        <ellipse cx="80" cy="42" rx="42" ry="8" stroke="#a855f7" strokeWidth="1" strokeDasharray="4 2" fill="none" opacity="0.7" />
        <circle cx="118" cy="22" r="1.5" fill="#e9d5ff" />
        <circle cx="38" cy="35" r="1.2" fill="#c084fc" />
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
        UNREAL ENGINE 5
      </div>
    </div>
  );
}

function CyberpunkNeonPreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #050515 0%, #150529 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
        {/* Neon City Street Perspective */}
        <polygon points="0,70 65,42 95,42 160,70" fill="#090514" stroke="#ec4899" strokeWidth="0.8" />
        <line x1="80" y1="42" x2="80" y2="70" stroke="#06b6d4" strokeWidth="1.2" strokeDasharray="6 4" />

        {/* Vertical Neon Sign Boards */}
        <rect x="22" y="14" width="14" height="35" rx="2" fill="#1e1035" stroke="#06b6d4" strokeWidth="1.2" />
        <text x="29" y="25" fontSize="7" fill="#06b6d4" textAnchor="middle" fontWeight="bold">電</text>
        <text x="29" y="34" fontSize="7" fill="#06b6d4" textAnchor="middle" fontWeight="bold">脳</text>
        <text x="29" y="43" fontSize="7" fill="#06b6d4" textAnchor="middle" fontWeight="bold">街</text>

        <rect x="124" y="18" width="14" height="30" rx="2" fill="#1e1035" stroke="#f43f5e" strokeWidth="1.2" />
        <text x="131" y="29" fontSize="7" fill="#f43f5e" textAnchor="middle" fontWeight="bold">未</text>
        <text x="131" y="40" fontSize="7" fill="#f43f5e" textAnchor="middle" fontWeight="bold">来</text>

        {/* Hologram Circle */}
        <ellipse cx="80" cy="32" rx="14" ry="5" stroke="#ec4899" strokeWidth="1" strokeDasharray="3 2" fill="none" opacity="0.8" />
      </svg>

      <div style={{
        position: 'absolute',
        top: '8px',
        right: '12px',
        fontSize: '9px',
        color: '#f43f5e',
        fontWeight: 800,
        background: 'rgba(244, 63, 94, 0.15)',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid rgba(244, 63, 94, 0.3)'
      }}>
        NEON NOIR ART
      </div>
    </div>
  );
}

function LandscapeNaturePreview() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #05241b 0%, #0d3d2e 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <svg viewBox="0 0 160 70" style={{ width: '100%', height: '65px' }}>
        {/* Snow Peaks */}
        <polygon points="10,60 50,22 90,60" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
        <polygon points="50,22 42,32 58,32" fill="#f0fdf4" />
        
        <polygon points="65,60 110,16 155,60" fill="#042f2e" stroke="#34d399" strokeWidth="1" />
        <polygon points="110,16 100,28 120,28" fill="#f0fdf4" />

        {/* Flying Flycam Drone */}
        <rect x="76" y="18" width="8" height="4" rx="1" fill="#fff" />
        <line x1="72" y1="16" x2="88" y2="16" stroke="#94a3b8" strokeWidth="1" />
        <circle cx="72" cy="16" r="2" fill="#64748b" />
        <circle cx="88" cy="16" r="2" fill="#64748b" />
        <circle cx="80" cy="22" r="1" fill="#ef4444" /> {/* Red recording LED */}

        {/* Sun reflection on lake */}
        <line x1="30" y1="62" x2="130" y2="62" stroke="#6ee7b7" strokeWidth="1.2" strokeDasharray="14 4 10 3" opacity="0.7" />
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
        NAT GEO 8K
      </div>
    </div>
  );
}

export default function ImagePromptCategoryGrid({ onSelectCategory }) {
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
            color: '#f472b6',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.6px',
            marginBottom: '10px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
          }}>
            <span>⚡</span> STUDIO SÁNG TẠO PROMPT ẢNH AI
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
            🎨 Danh Mục Các Phong Cách Ảnh AI
          </h1>

          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            margin: 0,
            fontSize: '0.84rem',
            lineHeight: 1.45
          }}>
            Chọn trường phái nghệ thuật bên dưới để thiết kế prompt chuyên sâu cho Midjourney v6.1, Flux.1, Stable Diffusion XL với đầy đủ thông số ống kính, ánh sáng và góc máy điện ảnh.
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
        {IMAGE_PROMPT_CATEGORIES.map((cat) => {
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
                {cat.id === 'portrait_cinematic' && <PortraitCinematicPreview />}
                {cat.id === 'sumie_ukiyoe' && <SumieUkiyoePreview />}
                {cat.id === 'anime_shinkai' && <AnimeShinkaiPreview />}
                {cat.id === 'epic_fantasy' && <EpicFantasyPreview />}
                {cat.id === 'cyberpunk_neon' && <CyberpunkNeonPreview />}
                {cat.id === 'landscape_nature' && <LandscapeNaturePreview />}
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
                    background: cat.badgeBg || 'linear-gradient(135deg, #ec4899, #8b5cf6)',
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
