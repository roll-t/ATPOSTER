'use client';

import { BUDDHIST_THEMES } from '@/lib/prompts/buddhistThemes.js';

export default function BuddhistThemePicker({ value, onChange }) {
  const currentKey = value || 'zen_stories';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '10px'
      }}>
        {BUDDHIST_THEMES.map(theme => {
          const isSelected = theme.key === currentKey;
          return (
            <div
              key={theme.key}
              onClick={() => onChange(theme.key)}
              style={{
                background: isSelected ? 'rgba(245, 158, 11, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                border: isSelected ? `2px solid ${theme.accentColor || '#f59e0b'}` : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isSelected ? '0 4px 18px rgba(245, 158, 11, 0.25)' : 'none',
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
    </div>
  );
}
