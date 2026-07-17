'use client';

export default function CategoryTabs({ categoryKeys, categories, activeCategory, onChange }) {
  if (categoryKeys.length <= 1) {
    return null;
  }

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
      {categoryKeys.map(key => {
        const cat = categories[key];
        const isActive = activeCategory === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`category-tab ${isActive ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.05rem' }}>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
