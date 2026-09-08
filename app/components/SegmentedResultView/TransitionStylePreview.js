'use client';

// Ảnh xem trước kiểu chuyển cảnh — 2 khối màu chạy animation CSS lặp vô hạn mô phỏng đúng
// chuyển động thật (hòa tan/trượt/phóng to), để thấy hiệu ứng chuyển động chứ không chỉ đọc tên.
export default function TransitionStylePreview({ style }) {
  const frameBase = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  return (
    <>
      <div style={{ ...frameBase, background: '#1f2937', animation: `prev-${style}-a 1.6s ease-in-out infinite alternate` }}>
        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(37,244,238,0.55)' }} />
      </div>
      <div style={{ ...frameBase, background: '#3a1f2e', animation: `prev-${style}-b 1.6s ease-in-out infinite alternate` }}>
        <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'rgba(254,44,85,0.6)' }} />
      </div>
    </>
  );
}
