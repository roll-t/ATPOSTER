'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IMAGE_STYLES } from '@/lib/prompts/index.js';

export default function StylePicker({ value, onChange, isModalOpen, setIsModalOpen }) {
  const [isMounted, setIsMounted] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const allStyles = Object.values(IMAGE_STYLES);
  const [recentKeys, setRecentKeys] = useState(['stick_figure', 'realistic', 'anime']);

  // Tải danh sách được chọn gần nhất từ localStorage khi component mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recent_image_styles');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validKeys = parsed.filter(k => IMAGE_STYLES[k]);
          if (validKeys.length > 0) {
            // Điền đầy bằng các phong cách mặc định nếu chưa đủ 3
            const fallbackKeys = ['stick_figure', 'realistic', 'anime'];
            const merged = [...validKeys];
            for (const fallback of fallbackKeys) {
              if (merged.length >= 3) break;
              if (!merged.includes(fallback)) {
                merged.push(fallback);
              }
            }
            setRecentKeys(merged.slice(0, 3));
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Cập nhật và lưu vào localStorage khi thay đổi phong cách được chọn
  useEffect(() => {
    if (!value || !IMAGE_STYLES[value]) return;
    setRecentKeys(prev => {
      const nextKeys = [value, ...prev.filter(k => k !== value)].slice(0, 3);
      try {
        localStorage.setItem('recent_image_styles', JSON.stringify(nextKeys));
      } catch (e) {
        console.error(e);
      }
      return nextKeys;
    });
  }, [value]);

  const stylesToShow = recentKeys.map(k => IMAGE_STYLES[k]).filter(Boolean);

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

  const renderModal = () => {
    if (!isModalOpen) return null;

    const modalContent = (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(5, 4, 10, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999, // Đảm bảo z-index cao nhất đè lên tất cả menu & thanh bar
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div className="glass-card" style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          position: 'relative'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: '12px'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <span>🎨</span>
              <span>Danh Sách Toàn Bộ Phong Cách Ảnh</span>
            </h3>
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                border: 'none', 
                color: '#fff', 
                fontSize: '1.3rem', 
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: '0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              ×
            </button>
          </div>

          {/* Scrollable list */}
          <div className="custom-scrollbar" style={{
            flexGrow: 1,
            overflowY: 'auto',
            paddingRight: '6px',
            paddingBottom: '10px'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '12px'
            }}>
              {allStyles.map(imgStyle => {
                const selected = value === imgStyle.key;
                return (
                  <div
                    key={imgStyle.key}
                    onClick={() => {
                      onChange(imgStyle.key);
                      setIsModalOpen(false);
                    }}
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
                      height: '130px',
                      backgroundImage: `url(/images/styles/${imgStyle.key}.png)`,
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
                          setPreviewImage(`/images/styles/${imgStyle.key}.png`);
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
                      <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{imgStyle.icon}</span>
                      <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff', flexGrow: 1 }}>{imgStyle.label}</span>
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
                      {imgStyle.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: '12px'
          }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              style={{ padding: '8px 20px', fontSize: '0.85rem', borderRadius: '8px', fontWeight: 700 }}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );

    if (isMounted) {
      return createPortal(modalContent, document.body);
    }
    return null;
  };

  return (
    <div>
      <div className="picker-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {stylesToShow.map(imgStyle => {
          const selected = value === imgStyle.key;
          return (
            <div
              key={imgStyle.key}
              onClick={() => onChange(imgStyle.key)}
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
                backgroundImage: `url(/images/styles/${imgStyle.key}.png)`,
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
                    setPreviewImage(`/images/styles/${imgStyle.key}.png`);
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
                <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{imgStyle.icon}</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff', flexGrow: 1 }}>{imgStyle.label}</span>
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
                {imgStyle.description}
              </div>
            </div>
          );
        })}
      </div>

      {renderModal()}
      {renderPreviewModal()}
    </div>
  );
}
