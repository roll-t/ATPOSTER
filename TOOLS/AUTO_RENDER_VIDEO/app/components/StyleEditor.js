'use client';

export default function StyleEditor({
  category,
  styleEditorText, setStyleEditorText,
  styleSaveError, isSavingStyle,
  onSave, onClose,
  onOpenStudio,
  onRenderVideo, isRendering, renderMsg, hasResult,
}) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div className="glass-card" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>🎨 Custom Style — "{category.label}"</h4>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.4 }}>
          Style Gemini cố định cho chủ đề này — dùng lại cho mọi kịch bản để giữ phong cách nhất quán. Sửa đúng cú pháp JSON.
        </p>

        <textarea
          className="form-control"
          rows={14}
          value={styleEditorText}
          onChange={(e) => setStyleEditorText(e.target.value)}
          style={{ fontFamily: 'monospace', fontSize: '0.78rem', resize: 'vertical' }}
        />

        {styleSaveError && (
          <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '8px' }}>{styleSaveError}</div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            type="button"
            onClick={onSave}
            disabled={isSavingStyle}
            className="btn btn-primary"
            style={{ flex: 1, padding: '9px' }}
          >
            {isSavingStyle ? '⏳ Đang lưu...' : '💾 Lưu Style'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '9px 16px' }}
          >
            Huỷ
          </button>
        </div>

        <div style={{
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Remotion
          </div>

          <button
            type="button"
            onClick={onOpenStudio}
            className="btn btn-secondary"
            style={{ padding: '9px 14px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>🎬</span> Mở Remotion Studio (xem trước live)
          </button>

          <button
            type="button"
            onClick={onRenderVideo}
            disabled={isRendering || !hasResult}
            title={!hasResult ? 'Cần có kịch bản — hãy tạo hoặc tải kịch bản từ Lịch sử trước' : 'Render video với thông số đã lưu trong kịch bản hiện tại'}
            style={{
              padding: '9px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: (isRendering || !hasResult) ? 'rgba(37,244,238,0.15)' : 'linear-gradient(135deg, var(--secondary), #00f2fe)',
              color: (isRendering || !hasResult) ? 'rgba(37,244,238,0.5)' : '#000',
              border: (isRendering || !hasResult) ? '1px solid rgba(37,244,238,0.3)' : 'none',
              cursor: (isRendering || !hasResult) ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            <span>{isRendering ? '⏳' : '🎥'}</span>
            {isRendering ? 'Đang render...' : 'Tạo Video (Remotion Render)'}
          </button>

          {!hasResult && (
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
              ℹ️ Tạo hoặc tải kịch bản từ tab "Lịch sử đã tạo" để kích hoạt nút Render.
            </div>
          )}

          {renderMsg && (
            <div style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: renderMsg.startsWith('Lỗi') ? 'var(--danger)' : 'var(--success)',
              background: renderMsg.startsWith('Lỗi') ? 'var(--danger-bg)' : 'var(--success-bg)',
              padding: '8px 12px',
              borderRadius: '7px',
              lineHeight: 1.45,
            }}>
              {renderMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
