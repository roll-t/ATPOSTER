'use client';

// Thẻ chọn dạng lưới có ảnh xem trước (thay cho dropdown) — dùng chung cho cả 2 bộ chọn
// kiểu phụ đề và kiểu chuyển cảnh bên dưới, để việc chọn trực quan hơn là đọc chữ trong <select>.
// Hỗ trợ nút "Tùy chỉnh" trên thẻ đã chọn.
//
// `subdued`: thẻ ĐANG có hiệu lực nhưng KHÔNG phải lựa chọn chính của hàng.
//
// Sinh ra cho đúng một tình huống: hàng "Style" trộn 2 loại thẻ khác nhau — Format người dùng tự
// lưu, và Kiểu phụ đề hệ thống. Một Format LUÔN chứa sẵn một kiểu phụ đề bên trong nó, nên khi áp
// dụng Format thì cả hai thẻ cùng đúng và cùng sáng viền đỏ. Nhìn vào chỉ thấy "sao 2 cái cùng
// active", trong khi thật ra là một lựa chọn và thành phần của nó.
//
// Mức phụ giữ nguyên nút Tùy chỉnh và màu xem trước (thẻ vẫn đang có hiệu lực thật), chỉ hạ viền
// xuống nét đứt và bỏ quầng sáng, để mỗi hàng chỉ còn ĐÚNG MỘT thẻ mang viền đỏ đậm.
export default function PickerCard({ selected, subdued = false, subLabel, onClick, onCustomize, label, children, width, isLandscape = false, showCustomizeBtn = false }) {
  const cardWidth = width || (isLandscape ? 130 : 84);
  const isPrimary = selected && !subdued;
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
        border: isPrimary
          ? '2px solid var(--primary)'
          : selected
            ? '2px dashed rgba(37,244,238,0.55)'
            : '2px solid rgba(255,255,255,0.12)',
        boxShadow: isPrimary ? '0 0 14px rgba(254, 44, 85, 0.4)' : 'none',
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

      <div style={{ minHeight: '26px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{
          fontSize: '0.68rem',
          fontWeight: isPrimary ? 700 : 500,
          color: isPrimary ? '#fff' : subdued ? 'var(--secondary)' : 'var(--text-muted)',
          textAlign: 'center',
          lineHeight: 1.25
        }}>
          {label}
        </span>
        {subLabel && (
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
}
