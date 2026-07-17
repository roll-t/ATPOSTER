'use client';

const TYPE_META = {
  video: { icon: '🎬', label: 'Prompt Video' },
  image: { icon: '🖼️', label: 'Prompt Ảnh' }
};

export default function PromptTypeTabs({ types, activeType, onChange, style }) {
  return (
    <div className="segmented-control" style={style}>
      {types.map(type => {
        const isActive = activeType === type;
        const meta = TYPE_META[type] || { icon: '📁', label: type };
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={`segmented-control-btn ${isActive ? 'active' : ''}`}
          >
            <span>{meta.icon}</span>
            <span>{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
