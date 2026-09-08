'use client';

import { useState, useEffect } from 'react';
import { JAPANESE_HISTORY_THEMES } from '@/src/domain/content/japaneseHistoryThemes.js';

export default function JapaneseHistoryThemePicker({ value, onChange, onSelect }) {
  const currentKey = value || null;
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (value) {
      const idx = JAPANESE_HISTORY_THEMES.findIndex(t => t.key === value);
      if (idx >= 4) {
        setIsExpanded(true);
      }
    }
  }, [value]);

  const displayedThemes = isExpanded ? JAPANESE_HISTORY_THEMES : JAPANESE_HISTORY_THEMES.slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '10px'
      }}>
        {displayedThemes.map(theme => {
          const isSelected = Boolean(currentKey && theme.key === currentKey);
          return (
            <div
              key={theme.key}
              onClick={() => {
                onChange(theme.key);
                if (onSelect) onSelect(theme.key);
              }}
              style={{
                background: isSelected ? 'rgba(244, 63, 94, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                border: isSelected ? `2px solid ${theme.accentColor || '#f59e0b'}` : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isSelected ? '0 4px 18px rgba(244, 63, 94, 0.25)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.25rem' }}>{theme.icon}</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    color: isSelected ? '#fef3c7' : '#fff',
                    lineHeight: 1.2
                  }}>
                    {theme.label}
                  </span>
                  <span style={{
                    fontSize: '0.74rem',
                    color: isSelected ? '#fbbf24' : 'rgba(255, 255, 255, 0.55)',
                    fontWeight: 600
                  }}>
                    {theme.sublabel}
                  </span>
                </div>
              </div>
              <p style={{
                margin: 0,
                fontSize: '0.72rem',
                color: 'rgba(255, 255, 255, 0.65)',
                lineHeight: 1.35
              }}>
                {theme.description}
              </p>
            </div>
          );
        })}
      </div>

      {JAPANESE_HISTORY_THEMES.length > 4 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '6px 14px',
              color: 'var(--secondary, #25F4EE)',
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
              e.currentTarget.style.background = 'rgba(37, 244, 238, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(37, 244, 238, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <span>{isExpanded ? '▲ Thu gọn' : `▼ Xem thêm 4 nhóm chủ đề khác`}</span>
          </button>
        </div>
      )}
    </div>
  );
}
