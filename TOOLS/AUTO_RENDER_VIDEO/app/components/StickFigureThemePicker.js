'use client';

import { STICK_FIGURE_LONGFORM_GROUPS } from '@/lib/prompts/stickFigureLongFormTopics.js';

export default function StickFigureThemePicker({ value, onChange }) {
  const currentVal = value || STICK_FIGURE_LONGFORM_GROUPS[0].key;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
      {STICK_FIGURE_LONGFORM_GROUPS.map(g => {
        const isSelected = currentVal === g.key;
        return (
          <button
            type="button"
            key={g.key}
            onClick={() => onChange(g.key)}
            style={{
              padding: '10px 4px',
              borderRadius: '10px',
              border: isSelected ? '2px solid var(--secondary)' : '1px solid rgba(255, 255, 255, 0.1)',
              background: isSelected ? 'rgba(37, 244, 238, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              boxShadow: isSelected ? '0 4px 14px rgba(37, 244, 238, 0.2)' : 'none',
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
              <span style={{ fontSize: '1rem' }}>{g.icon}</span>
              <span style={{ fontWeight: 800, fontSize: '0.82rem', color: isSelected ? 'var(--secondary)' : '#fff', whiteSpace: 'nowrap' }}>
                {g.label}
              </span>
            </div>
            <span style={{ fontSize: '0.66rem', color: isSelected ? 'rgba(255,255,255,0.9)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
              {g.sublabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
