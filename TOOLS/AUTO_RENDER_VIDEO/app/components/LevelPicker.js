'use client';

export default function LevelPicker({ field, value, onChange }) {
  const options = field.options || [
    { value: 'a1', label: 'A1', sublabel: 'Mới bắt đầu', icon: '🌱' },
    { value: 'a2', label: 'A2', sublabel: 'Sơ cấp', icon: '🌿' },
    { value: 'b1', label: 'B1', sublabel: 'Trung cấp', icon: '🌳' },
    { value: 'b2', label: 'B2', sublabel: 'Cao cấp', icon: '🚀' },
    { value: 'c1', label: 'C1', sublabel: 'Thành thạo', icon: '👑' },
    { value: 'c2', label: 'C2', sublabel: 'Bậc thầy', icon: '🔥' }
  ];

  const currentVal = (value || field.defaultValue || 'a2').toLowerCase();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
      {options.map(opt => {
        const isSelected = currentVal === opt.value.toLowerCase() || currentVal.startsWith(opt.value.toLowerCase());
        return (
          <button
            type="button"
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '10px 8px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '1rem' }}>{opt.icon || '⚡'}</span>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: isSelected ? 'var(--secondary)' : '#fff' }}>
                {opt.label}
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: isSelected ? 'rgba(255,255,255,0.9)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {opt.sublabel || opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
