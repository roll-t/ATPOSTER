'use client';

export default function UnrenderedScriptCard({
  item,
  onSelectProcess,
  onSelectScript,
  onDelete,
  isDeleting
}) {
  const isLandscape = (item.input?.aspectRatio || '9:16') === '16:9';
  const segmentCount = item.segments?.length || 0;
  const firstPreviewText = item.segments?.[0]?.dialogueOrNarration || item.segments?.[0]?.visualDescription || item.textPrompt || '';

  return (
    <div
      className="glass-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '14px',
        overflow: 'hidden',
        padding: 0,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(22, 20, 38, 0.7)',
        boxShadow: 'none',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.3)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Top placeholder/preview box */}
      <div
        onClick={() => onSelectProcess(item)}
        title="Nhấn để chọn và chuyển qua tab Tạo video"
        style={{
          height: isLandscape ? '165px' : '225px',
          background: 'linear-gradient(135deg, rgba(20, 18, 30, 0.95) 0%, rgba(35, 30, 50, 0.8) 100%)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          cursor: 'pointer'
        }}
      >
        {/* Ratio badge */}
        <span style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          padding: '4px 9px',
          borderRadius: '7px',
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          color: isLandscape ? 'var(--secondary)' : 'var(--primary)',
          fontSize: '0.74rem',
          fontWeight: 800
        }}>
          {isLandscape ? '💻 16:9' : '📱 9:16'}
        </span>

        {/* Pending status badge */}
        <span style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          padding: '4px 10px',
          borderRadius: '7px',
          background: 'rgba(251, 191, 36, 0.15)',
          border: '1px solid rgba(251, 191, 36, 0.35)',
          color: '#fbbf24',
          fontSize: '0.72rem',
          fontWeight: 700,
          backdropFilter: 'blur(4px)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>⏳</span>
          <span>Chưa tạo video</span>
        </span>

        {/* Center illustration */}
        <div style={{ fontSize: '2.6rem', opacity: 0.8, marginBottom: '8px' }}>📜</div>
        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
          {segmentCount > 0 ? `${segmentCount} phân cảnh đã sẵn sàng` : 'Bản thảo kịch bản AI'}
        </span>
      </div>

      {/* Body info */}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <h5 style={{
            fontSize: '0.94rem',
            fontWeight: 800,
            color: '#fff',
            margin: 0,
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word'
          }}>
            {item.title || item.jsonPrompt?.title || '(Kịch bản chưa đặt tên)'}
          </h5>
        </div>

        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
          {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : ''}
        </span>

        <p style={{
          fontSize: '0.8rem',
          color: 'rgba(255,255,255,0.6)',
          lineHeight: 1.45,
          margin: '2px 0 0 0',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {firstPreviewText}
        </p>

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '12px' }}>
          <button
            type="button"
            onClick={() => onSelectProcess(item)}
            className="btn btn-primary"
            style={{
              flex: 1,
              padding: '9px 12px',
              fontSize: '0.82rem',
              fontWeight: 700,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              border: 'none',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
            }}
            title="Chọn và chuyển sang tab Quy trình & Review"
          >
            <span>🎬</span>
            <span>Tạo video ngay</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectScript(item)}
            className="btn btn-secondary vc-act"
            data-tip="Xem kịch bản chi tiết"
            style={{
              padding: '8px 11px',
              fontSize: '0.95rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            📜
          </button>

          {onDelete && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => onDelete(item.id)}
              className="btn btn-secondary vc-act"
              data-tip="Xóa kịch bản này"
              style={{
                padding: '8px 11px',
                fontSize: '0.95rem',
                borderRadius: '8px',
                background: 'rgba(254, 44, 85, 0.08)',
                border: '1px solid rgba(254, 44, 85, 0.2)',
                color: 'var(--danger)',
                cursor: isDeleting ? 'wait' : 'pointer'
              }}
            >
              {isDeleting ? '⏳' : '🗑️'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
