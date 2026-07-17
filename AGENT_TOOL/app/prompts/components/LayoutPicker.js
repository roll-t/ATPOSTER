'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LAYOUT_TYPES } from '@/lib/prompts/index.js';

export default function LayoutPicker({ value, onChange }) {
  const allLayouts = Object.values(LAYOUT_TYPES);
  const [isMounted, setIsMounted] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const renderPreviewModal = () => {
    if (!previewImage) return null;
    const modal = (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 4, 10, 0.92)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          cursor: 'zoom-out'
        }}
        onClick={() => setPreviewImage(null)}
      >
        <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={e => e.stopPropagation()}>
          <img 
            src={previewImage} 
            alt="Preview" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '85vh', 
              borderRadius: '12px', 
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              display: 'block'
            }} 
          />
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'absolute',
              top: '-16px',
              right: '-16px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#FE2C55',
              border: 'none',
              color: '#fff',
              fontSize: '1.4rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(254, 44, 85, 0.4)'
            }}
          >
            ×
          </button>
        </div>
      </div>
    );

    if (isMounted) {
      return createPortal(modal, document.body);
    }
    return null;
  };

  return (
    <div className="picker-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
      {allLayouts.map(layout => {
        const selected = value === layout.key;
        return (
          <div
            key={layout.key}
            onClick={() => onChange(layout.key)}
            className={`picker-card ${selected ? 'active' : ''}`}
            style={{
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'left',
              alignItems: 'stretch',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: '100%',
              height: '110px',
              backgroundImage: `url(/images/layouts/${layout.key}.png)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '8px',
              marginBottom: '10px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              flexShrink: 0,
              position: 'relative'
            }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewImage(`/images/layouts/${layout.key}.png`);
                }}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'rgba(15, 15, 18, 0.75)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  zIndex: 10
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#FE2C55'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(15, 15, 18, 0.75)'}
                title="Xem chi tiết ảnh"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{layout.icon}</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff', flexGrow: 1 }}>{layout.label}</span>
              {selected && (
                <span style={{ 
                  fontSize: '0.72rem', 
                  color: 'var(--primary)', 
                  fontWeight: 700, 
                  background: 'rgba(254, 44, 85, 0.12)', 
                  padding: '2px 6px', 
                  borderRadius: '4px' 
                }}>
                  ✓
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
              {layout.description}
            </div>
          </div>
        );
      })}

      {renderPreviewModal()}
    </div>
  );
}
