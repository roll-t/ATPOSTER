'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  MORAL_THEMES, 
  DEFAULT_MORAL_THEME, 
  DEFAULT_BOOK_THEME, 
  isBookMoralTheme 
} from '@/src/domain/content/moralThemes.js';

export default function MoralThemePicker({ value, onChange, onSelect, themeKeys }) {
  // Lọc theo themeKeys nếu có truyền vào
  const availableThemes = useMemo(() => {
    return themeKeys
      ? themeKeys.map(k => MORAL_THEMES.find(t => t.key === k)).filter(Boolean)
      : MORAL_THEMES;
  }, [themeKeys]);

  const moralThemes = useMemo(() => availableThemes.filter(t => (t.group || 'moral') === 'moral'), [availableThemes]);
  const bookThemes = useMemo(() => availableThemes.filter(t => t.group === 'book'), [availableThemes]);

  const currentVal = value || null;
  const isCurrentBook = value ? isBookMoralTheme(value) : false;

  // Tab hiện tại ('moral' | 'book')
  const [activeTab, setActiveTab] = useState(() => (isCurrentBook ? 'book' : 'moral'));

  // Số lượng hiển thị ban đầu tối đa 6 nhóm
  const [visibleCount, setVisibleCount] = useState(6);

  // Đồng bộ tab nếu value từ ngoài truyền vào thay đổi nhóm
  const currentTab = isCurrentBook ? 'book' : (activeTab === 'book' && bookThemes.length > 0 ? 'book' : 'moral');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setVisibleCount(6);
  };

  // Nếu chỉ có đúng 1 nhóm (ví dụ pexels_talk_video chỉ có moralThemes), không cần hiện tab bar
  const showTabBar = moralThemes.length > 0 && bookThemes.length > 0;

  const currentDisplayThemes = currentTab === 'book' ? bookThemes : moralThemes;
  const options = currentDisplayThemes.map(t => ({ 
    value: t.key, 
    label: t.label, 
    sublabel: t.sub, 
    icon: t.icon 
  }));

  // Tự động mở rộng số lượng hiển thị nếu giá trị đang chọn nằm ở trang sau
  useEffect(() => {
    if (value) {
      const idx = options.findIndex(o => o.value === value);
      if (idx >= 0 && idx >= visibleCount) {
        setVisibleCount(Math.ceil((idx + 1) / 6) * 6);
      }
    }
  }, [value, options]);

  const displayedOptions = options.slice(0, visibleCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {showTabBar && (
        <div 
          style={{ 
            display: 'flex', 
            gap: '8px', 
            background: 'rgba(255, 255, 255, 0.04)', 
            padding: '4px', 
            borderRadius: '12px', 
            border: '1px solid rgba(255, 255, 255, 0.08)' 
          }}
        >
          <button
            type="button"
            onClick={() => handleTabChange('moral')}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '9px',
              border: currentTab === 'moral' ? '1px solid rgba(168, 85, 247, 0.6)' : '1px solid transparent',
              background: currentTab === 'moral' ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.35))' : 'transparent',
              color: currentTab === 'moral' ? '#fff' : 'var(--text-muted)',
              fontWeight: currentTab === 'moral' ? 800 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              boxShadow: currentTab === 'moral' ? '0 2px 12px rgba(168, 85, 247, 0.3)' : 'none',
              transition: 'all 0.18s ease-in-out',
              fontFamily: 'inherit'
            }}
          >
            <span>🗣️ Đạo Lý Cuộc Sống</span>
            <span 
              style={{ 
                fontSize: '0.72rem', 
                padding: '2px 7px', 
                borderRadius: '20px', 
                background: currentTab === 'moral' ? 'rgba(168, 85, 247, 0.35)' : 'rgba(255, 255, 255, 0.08)', 
                color: currentTab === 'moral' ? '#d8b4fe' : 'var(--text-muted)' 
              }}
            >
              {moralThemes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('book')}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '9px',
              border: currentTab === 'book' ? '1px solid #fbbf24' : '1px solid transparent',
              background: currentTab === 'book' ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
              color: currentTab === 'book' ? '#fff' : 'var(--text-muted)',
              fontWeight: currentTab === 'book' ? 800 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              boxShadow: currentTab === 'book' ? '0 2px 10px rgba(245, 158, 11, 0.2)' : 'none',
              transition: 'all 0.18s ease-in-out',
              fontFamily: 'inherit'
            }}
          >
            <span>📚 Giới Thiệu Sách</span>
            <span 
              style={{ 
                fontSize: '0.72rem', 
                padding: '2px 7px', 
                borderRadius: '20px', 
                background: currentTab === 'book' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.08)', 
                color: currentTab === 'book' ? '#fbbf24' : 'var(--text-muted)' 
              }}
            >
              {bookThemes.length}
            </span>
          </button>
        </div>
      )}

      {currentTab === 'book' && showTabBar && (
        <div 
          style={{
            padding: '8px 12px',
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.12), rgba(37, 244, 238, 0.08))',
            border: '1px dashed rgba(245, 158, 11, 0.35)',
            borderRadius: '8px',
            fontSize: '0.76rem',
            color: 'rgba(255, 255, 255, 0.92)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '1.05rem' }}>🎯</span>
          <span>
            <strong>Kịch bản bán sách:</strong> Chạm nỗi đau/vấn đề ➔ Giới thiệu sách giải pháp ➔ Sách dạy gì (3 bài học thực chiến) ➔ Kêu gọi mua sách (giỏ hàng góc trái)!
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
        {displayedOptions.map(opt => {
          const isSelected = Boolean(currentVal && currentVal === opt.value);
          const isBook = currentTab === 'book';
          const highlightBorder = isBook ? '2px solid #fbbf24' : '2px solid #a855f7';
          const highlightBg = isBook ? 'rgba(245, 158, 11, 0.18)' : 'linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(168, 85, 247, 0.28))';
          const highlightShadow = isBook ? '0 4px 14px rgba(245, 158, 11, 0.25)' : '0 4px 16px rgba(168, 85, 247, 0.35)';
          const highlightColor = isBook ? '#fbbf24' : '#d8b4fe';

          return (
            <button
              type="button"
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                if (onSelect) onSelect(opt.value);
              }}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                border: isSelected ? highlightBorder : '1px solid rgba(255, 255, 255, 0.1)',
                background: isSelected ? highlightBg : 'rgba(255, 255, 255, 0.03)',
                boxShadow: isSelected ? highlightShadow : 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                textAlign: 'left',
                transition: 'all 0.15s ease-in-out',
                fontFamily: 'inherit',
                userSelect: 'none',
                minWidth: 0,
                width: '100%'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
            >
              <span style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: '1px' }}>{opt.icon}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, flex: 1 }}>
                <span style={{
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  color: isSelected ? highlightColor : '#fff',
                  lineHeight: 1.25,
                  wordBreak: 'break-word'
                }}>
                  {opt.label}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  color: isSelected ? (isBook ? 'rgba(254, 243, 199, 0.9)' : 'rgba(255,255,255,0.85)') : 'var(--text-muted)',
                  lineHeight: 1.3,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'break-word'
                }}>
                  {opt.sublabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {options.length > 6 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
          {visibleCount < options.length && (
            <button
              type="button"
              onClick={() => setVisibleCount(prev => prev + 6)}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '6px 14px',
                color: currentTab === 'book' ? '#fbbf24' : '#c084fc',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = currentTab === 'book' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(168, 85, 247, 0.18)';
                e.currentTarget.style.borderColor = currentTab === 'book' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(168, 85, 247, 0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <span>{`▼ Xem thêm 6 nhóm khác (${displayedOptions.length}/${options.length})`}</span>
            </button>
          )}

          {visibleCount > 6 && (
            <button
              type="button"
              onClick={() => setVisibleCount(6)}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '6px 14px',
                color: 'rgba(255, 255, 255, 0.65)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)';
              }}
            >
              <span>▲ Thu gọn</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
