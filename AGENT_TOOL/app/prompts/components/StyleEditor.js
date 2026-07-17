'use client';

export default function StyleEditor({
  category,
  styleEditorText, setStyleEditorText,
  styleSaveError, isSavingStyle,
  onSave, onClose
}) {
  return (
    <div className="glass-card" style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>🎨 Style cố định của "{category.label}"</h4>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.4 }}>
        Style này được dùng lại cho MỌI prompt của chủ đề này để đảm bảo video sau giống video trước. Sửa cẩn thận — cần đúng cú pháp JSON.
      </p>
      <textarea
        className="form-control"
        rows={16}
        value={styleEditorText}
        onChange={(e) => setStyleEditorText(e.target.value)}
        style={{ fontFamily: 'monospace', fontSize: '0.78rem', resize: 'vertical' }}
      />
      {styleSaveError && (
        <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '10px' }}>{styleSaveError}</div>
      )}
      <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
        <button type="button" onClick={onSave} disabled={isSavingStyle} className="btn btn-primary" style={{ flex: 1, padding: '10px' }}>
          {isSavingStyle ? 'Đang lưu...' : 'Lưu Style'}
        </button>
        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '10px 16px' }}>
          Hủy
        </button>
      </div>
    </div>
  );
}
