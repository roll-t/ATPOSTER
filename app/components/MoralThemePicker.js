'use client';

import { useState, useMemo } from 'react';
import { 
  MORAL_THEMES, 
  DEFAULT_MORAL_THEME, 
  DEFAULT_BOOK_THEME, 
  isBookMoralTheme 
} from '@/src/domain/content/moralThemes.js';

export default function MoralThemePicker({ value, onChange, themeKeys }) {
  // Lọc theo themeKeys nếu có truyền vào
  const availableThemes = useMemo(() => {
    return themeKeys
      ? themeKeys.map(k => MORAL_THEMES.find(t => t.key === k)).filter(Boolean)
      : MORAL_THEMES;
  }, [themeKeys]);

  const moralThemes = useMemo(() => availableThemes.filter(t => (t.group || 'moral') === 'moral'), [availableThemes]);
  const bookThemes = useMemo(() => availableThemes.filter(t => t.group === 'book'), [availableThemes]);

  const currentVal = value || DEFAULT_MORAL_THEME;
  const isCurrentBook = isBookMoralTheme(currentVal);

  // Tab hiện tại ('moral' | 'book')
  const [activeTab, setActiveTab] = useState(() => (isCurrentBook ? 'book' : 'moral'));

  // Đồng bộ tab nếu value từ ngoài truyền vào thay đổi nhóm
  const currentTab = isCurrentBook ? 'book' : (activeTab === 'book' && bookThemes.length > 0 ? 'book' : 'moral');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'book' && !isBookMoralTheme(currentVal)) {
      onChange(bookThemes[0]?.key || DEFAULT_BOOK_THEME);
    } else if (tab === 'moral' && isBookMoralTheme(currentVal)) {
      onChange(moralThemes[0]?.key || DEFAULT_MORAL_THEME);
    }
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
              border: currentTab === 'moral' ? '1px solid var(--secondary)' : '1px solid transparent',
              background: currentTab === 'moral' ? 'rgba(37, 244, 238, 0.15)' : 'transparent',
              color: currentTab === 'moral' ? '#fff' : 'var(--text-muted)',
              fontWeight: currentTab === 'moral' ? 800 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              boxShadow: currentTab === 'moral' ? '0 2px 10px rgba(37, 244, 238, 0.2)' : 'none',
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
                background: currentTab === 'moral' ? 'rgba(37, 244, 238, 0.25)' : 'rgba(255, 255, 255, 0.08)', 
                color: currentTab === 'moral' ? 'var(--secondary)' : 'var(--text-muted)' 
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
        {options.map(opt => {
          const isSelected = currentVal === opt.value;
          const isBook = currentTab === 'book';
          const highlightBorder = isBook ? '2px solid #fbbf24' : '2px solid var(--secondary)';
          const highlightBg = isBook ? 'rgba(245, 158, 11, 0.18)' : 'rgba(37, 244, 238, 0.15)';
          const highlightShadow = isBook ? '0 4px 14px rgba(245, 158, 11, 0.25)' : '0 4px 14px rgba(37, 244, 238, 0.2)';
          const highlightColor = isBook ? '#fbbf24' : 'var(--secondary)';

          return (
            <button
              type="button"
              key={opt.value}
              onClick={() => onChange(opt.value)}
              style={{
                padding: '10px 4px',
                borderRadius: '10px',
                border: isSelected ? highlightBorder : '1px solid rgba(255, 255, 255, 0.1)',
                background: isSelected ? highlightBg : 'rgba(255, 255, 255, 0.03)',
                boxShadow: isSelected ? highlightShadow : 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.15s ease-in-out',
                fontFamily: 'inherit',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: '1rem' }}>{opt.icon}</span>
                <span style={{ fontWeight: 800, fontSize: '0.82rem', color: isSelected ? highlightColor : '#fff', whiteSpace: 'nowrap' }}>
                  {opt.label}
                </span>
              </div>
              <span style={{ fontSize: '0.66rem', color: isSelected ? 'rgba(255,255,255,0.95)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
                {opt.sublabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
