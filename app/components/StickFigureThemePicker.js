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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
        {displayedGroups.map(g => {
          const isSelected = Boolean(currentVal && currentVal === g.key);
          return (
            <button
              type="button"
              key={g.key}
              title={`Nhấn để mở danh sách bài thuộc nhóm ${g.label}`}
              onClick={() => {
                onChange(g.key);
                if (onSelect) onSelect(g.key);
              }}
              style={{
                position: 'relative',
                padding: '12px 14px',
                borderRadius: '12px',
                border: isSelected ? '1.5px solid var(--secondary)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(37, 244, 238, 0.16) 0%, rgba(19, 17, 32, 0.9) 100%)'
                  : 'rgba(255, 255, 255, 0.03)',
                boxShadow: isSelected
                  ? '0 6px 20px rgba(37, 244, 238, 0.22), inset 0 0 12px rgba(37, 244, 238, 0.08)'
                  : '0 2px 6px rgba(0, 0, 0, 0.15)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                textAlign: 'left',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                fontFamily: 'inherit',
                userSelect: 'none',
                minWidth: 0,
                width: '100%'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                if (!isSelected) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                if (!isSelected) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
                }
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1, paddingRight: '14px' }}>
                <span style={{
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  color: isSelected ? 'var(--secondary)' : '#fff',
                  lineHeight: 1.3,
                  wordBreak: 'break-word',
                  letterSpacing: '-0.2px'
                }}>
                  {g.label}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  color: isSelected ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)',
                  lineHeight: 1.35,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'break-word'
                }}>
                  {g.sublabel}
                </span>
              </div>
              <span style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                fontSize: '0.72rem',
                color: isSelected ? 'var(--secondary)' : 'rgba(255,255,255,0.3)',
                fontWeight: 700
              }}>
                {isSelected ? '✓' : '↗'}
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
