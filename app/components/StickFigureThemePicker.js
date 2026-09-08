import { useState, useEffect } from 'react';
import { STICK_FIGURE_LONGFORM_GROUPS } from '@/src/domain/content/stickFigureLongFormTopics.js';

export default function StickFigureThemePicker({ value, onChange, onSelect }) {
  const currentVal = value || null;
  const [visibleCount, setVisibleCount] = useState(6);

  // Tự động mở rộng nếu nhóm đang chọn nằm sau mốc hiển thị
  useEffect(() => {
    if (value) {
      const idx = STICK_FIGURE_LONGFORM_GROUPS.findIndex(g => g.key === value);
      if (idx >= 0 && idx >= visibleCount) {
        setVisibleCount(Math.ceil((idx + 1) / 6) * 6);
      }
    }
  }, [value]);

  const displayedGroups = STICK_FIGURE_LONGFORM_GROUPS.slice(0, visibleCount);
  const hasMore = visibleCount < STICK_FIGURE_LONGFORM_GROUPS.length;
  const isExpanded = visibleCount > 6;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
        {displayedGroups.map(g => {
          const isSelected = Boolean(currentVal && currentVal === g.key);
          return (
            <button
              type="button"
              key={g.key}
              onClick={() => {
                onChange(g.key);
                if (onSelect) onSelect(g.key);
              }}
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

      {/* Nút Xem thêm / Thu gọn khi số nhóm nhiều hơn 6 */}
      {STICK_FIGURE_LONGFORM_GROUPS.length > 6 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2px' }}>
          {hasMore ? (
            <button
              type="button"
              onClick={() => setVisibleCount(prev => prev + 6)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '20px',
                padding: '4px 14px',
                fontSize: '0.72rem',
                color: 'var(--secondary)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease-in-out'
              }}
            >
              <span>Xem thêm ({STICK_FIGURE_LONGFORM_GROUPS.length - visibleCount} nhóm nữa)</span>
              <span>▼</span>
            </button>
          ) : isExpanded ? (
            <button
              type="button"
              onClick={() => setVisibleCount(6)}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '4px 14px',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease-in-out'
              }}
            >
              <span>Thu gọn</span>
              <span>▲</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
