'use client';

import { MORAL_THEMES, DEFAULT_MORAL_THEME } from '@/lib/prompts/moralThemes.js';

// auto-fill thay cho repeat(3, 1fr) cố định: số nhóm chủ đề giờ do registry quyết định (9 nhóm),
// khoá cứng 3 cột sẽ bóp mỗi thẻ xuống quá hẹp để đọc được nhãn.
export default function MoralThemePicker({ value, onChange }) {
  // Đọc từ registry (moralThemes.js) thay vì chép tay — xem chú thích ở file đó.
  const options = MORAL_THEMES.map(t => ({ value: t.key, label: t.label, sublabel: t.sub, icon: t.icon }));

  const currentVal = value || DEFAULT_MORAL_THEME;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
      {options.map(opt => {
        const isSelected = currentVal === opt.value;
        return (
          <button
            type="button"
            key={opt.value}
            onClick={() => onChange(opt.value)}
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
              <span style={{ fontSize: '1rem' }}>{opt.icon}</span>
              <span style={{ fontWeight: 800, fontSize: '0.82rem', color: isSelected ? 'var(--secondary)' : '#fff', whiteSpace: 'nowrap' }}>
                {opt.label}
              </span>
            </div>
            <span style={{ fontSize: '0.66rem', color: isSelected ? 'rgba(255,255,255,0.9)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
              {opt.sublabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
