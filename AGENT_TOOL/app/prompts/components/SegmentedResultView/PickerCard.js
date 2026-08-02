'use client';

// Thẻ chọn dạng lưới có ảnh xem trước (thay cho dropdown) — dùng chung cho cả 2 bộ chọn
// kiểu phụ đề và kiểu chuyển cảnh bên dưới, để việc chọn trực quan hơn là đọc chữ trong <select>.
// Hỗ trợ nút "Tùy chỉnh" trên thẻ đã chọn.
export default function PickerCard({ selected, onClick, onCustomize, label, children, width, isLandscape = false, showCustomizeBtn = false }) {
  const cardWidth = width || (isLandscape ? 130 : 84);
  const aspectRatio = isLandscape ? '16 / 9' : '3 / 4';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        width: cardWidth,
        position: 'relative'
      }}
    >
      <div style={{
        width: '100%',
        aspectRatio,
        borderRadius: '10px',
        overflow: 'hidden',
        background: '#141419',
        border: selected ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.12)',
        boxShadow: selected ? '0 0 14px rgba(254, 44, 85, 0.4)' : 'none',
        position: 'relative',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
      }}>
        {children}

        {/* Nút "Tùy chỉnh" trực tiếp trên góc thẻ đã chọn */}
        {selected && showCustomizeBtn && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCustomize?.();
            }}
            title="Cuộn tới bảng Tùy chỉnh Style Phụ Đề"
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: 'linear-gradient(135deg, var(--secondary), #00f2fe)',
              color: '#000',
              borderRadius: '6px',
              padding: '2px 5px',
              fontSize: '0.6rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              zIndex: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              lineHeight: 1
            }}
          >
            ⚙️ Tùy chỉnh
          </button>
        )}
      </div>

      <div style={{ minHeight: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: selected ? 700 : 500, color: selected ? '#fff' : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.25 }}>
          {label}
        </span>
      </div>
    </div>
  );
}
