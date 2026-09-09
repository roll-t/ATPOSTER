'use client';

export default function HistoryList({ 
  history, 
  historyLoading, 
  selectedIds = [], 
  deletingIds = [],
  copiedKey, 
  onCopy, 
  onView, 
  onDelete,
  onToggleSelect,
  onToggleSelectAll,
  onDeleteSelected
}) {
  const isDeletingAny = deletingIds.length > 0;

  return (
    <div className="glass-card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Header with bulk action buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '10px',
        flexShrink: 0
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <span>📜</span>
          <span>Lịch Sử Prompt ({history.length})</span>
        </h3>
        
        {!historyLoading && history.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onToggleSelectAll}
              disabled={isDeletingAny}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                padding: '4px 10px',
                color: '#fff',
                fontSize: '0.74rem',
                cursor: isDeletingAny ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                opacity: isDeletingAny ? 0.5 : 1,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { if (!isDeletingAny) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { if (!isDeletingAny) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            >
              {selectedIds.length === history.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={onDeleteSelected}
                disabled={isDeletingAny}
                className="btn btn-primary"
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  background: 'var(--primary)',
                  border: 'none',
                  color: '#fff',
                  cursor: isDeletingAny ? 'wait' : 'pointer',
                  boxShadow: '0 2px 10px rgba(254, 44, 85, 0.2)',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: isDeletingAny ? 0.75 : 1
                }}
                onMouseEnter={(e) => { if (!isDeletingAny) e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={(e) => { if (!isDeletingAny) e.currentTarget.style.opacity = '1'; }}
              >
                {isDeletingAny ? (
                  <>
                    <svg className="animate-spin" style={{ width: '13px', height: '13px', fill: 'none', stroke: '#fff', strokeWidth: '3' }} viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)"/>
                      <path fill="#fff" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <span>Đang xóa ({deletingIds.length})...</span>
                  </>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span>Xóa đã chọn ({selectedIds.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Progress banner when deleting */}
      {isDeletingAny && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          marginBottom: '12px',
          background: 'rgba(254, 44, 85, 0.12)',
          border: '1px solid rgba(254, 44, 85, 0.3)',
          borderRadius: '8px',
          fontSize: '0.8rem',
          color: '#ff99aa',
          fontWeight: 600,
          flexShrink: 0
        }}>
          <svg className="animate-spin" style={{ width: '15px', height: '15px', flexShrink: 0, fill: 'none', stroke: '#ff99aa', strokeWidth: '3' }} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)"/>
            <path fill="#ff99aa" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <span>Đang xóa {deletingIds.length} kịch bản và dọn dẹp thư mục tài nguyên trên máy, vui lòng đợi...</span>
        </div>
      )}

      {historyLoading ? (
        <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <svg className="animate-spin" style={{ width: '16px', height: '16px', fill: 'none', stroke: 'var(--text-muted)', strokeWidth: '3' }} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)"/>
            <path fill="var(--text-muted)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <span style={{ fontSize: '0.85rem' }}>Đang tải lịch sử...</span>
        </div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Chưa có prompt nào được tạo cho chủ đề này.
        </div>
      ) : (
        <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '6px' }}>
          {history.map(item => {
            const isSelected = selectedIds.includes(item.id);
            const isItemDeleting = deletingIds.includes(item.id);
            return (
              <div 
                key={item.id} 
                style={{ 
                  padding: '12px 14px', 
                  background: isSelected ? 'rgba(254, 44, 85, 0.04)' : 'rgba(255,255,255,0.015)', 
                  border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)', 
                  borderRadius: '10px',
                  transition: 'all 0.15s',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  opacity: isItemDeleting ? 0.55 : 1,
                  filter: isItemDeleting ? 'grayscale(0.3)' : 'none',
                  pointerEvents: isItemDeleting ? 'none' : 'auto'
                }}
                onMouseEnter={(e) => {
                  if (isItemDeleting) return;
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  }
                  e.currentTarget.style.background = isSelected ? 'rgba(254, 44, 85, 0.06)' : 'rgba(255, 255, 255, 0.035)';
                }}
                onMouseLeave={(e) => {
                  if (isItemDeleting) return;
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                  }
                  e.currentTarget.style.background = isSelected ? 'rgba(254, 44, 85, 0.04)' : 'rgba(255, 255, 255, 0.015)';
                }}
              >
                {/* Selection Checkbox */}
                <div style={{ paddingTop: '2px', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDeletingAny}
                    onChange={() => onToggleSelect(item.id)}
                    style={{ 
                      cursor: isDeletingAny ? 'not-allowed' : 'pointer', 
                      width: '15px', 
                      height: '15px', 
                      accentColor: 'var(--primary)',
                      filter: 'brightness(1.1)',
                      opacity: isDeletingAny ? 0.6 : 1
                    }}
                  />
                </div>

                {/* Main Content Area */}
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 700, lineHeight: 1.3 }}>
                      {item.title || item.jsonPrompt?.title || '(Không có tiêu đề)'}
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', paddingTop: '1px' }}>
                      {new Date(item.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.isSegmented
                      ? `[Video phân đoạn - ${item.segments?.length || 0} phần] ${item.segments?.[0]?.dialogueOrNarration || item.segments?.[0]?.visualDescription || ''}`
                      : item.textPrompt}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px' }}>
                    <button
                      type="button"
                      disabled={isDeletingAny}
                      onClick={() => {
                        if (item.isSegmented) {
                          const all = item.segments.map(s => `--- Phân đoạn ${s.segmentNumber} (${s.durationSeconds}s) ---\n${s.textPrompt}`).join('\n\n');
                          onCopy(all, `hist_${item.id}`);
                        } else {
                          onCopy(item.textPrompt, `hist_${item.id}`);
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--secondary)', fontSize: '0.75rem', cursor: isDeletingAny ? 'not-allowed' : 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', padding: 0, opacity: isDeletingAny ? 0.4 : 1 }}
                    >
                      <span>{copiedKey === `hist_${item.id}` ? '✓' : '📋'}</span>
                      <span>{copiedKey === `hist_${item.id}` ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                    {item.isSegmented ? (
                      <>
                        <button
                          type="button"
                          disabled={isDeletingAny}
                          onClick={() => onView(item, 'process')}
                          style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.75rem', cursor: isDeletingAny ? 'not-allowed' : 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', padding: 0, opacity: isDeletingAny ? 0.35 : 0.7 }}
                          onMouseEnter={(e) => { if (!isDeletingAny) e.currentTarget.style.opacity = '1'; }}
                          onMouseLeave={(e) => { if (!isDeletingAny) e.currentTarget.style.opacity = '0.7'; }}
                          title="Xem quy trình và review video"
                        >
                          <span>🎬</span>
                          <span>Xem Video</span>
                        </button>
                        <button
                          type="button"
                          disabled={isDeletingAny}
                          onClick={() => onView(item, 'script')}
                          style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.75rem', cursor: isDeletingAny ? 'not-allowed' : 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', padding: 0, opacity: isDeletingAny ? 0.35 : 0.7 }}
                          onMouseEnter={(e) => { if (!isDeletingAny) e.currentTarget.style.opacity = '1'; }}
                          onMouseLeave={(e) => { if (!isDeletingAny) e.currentTarget.style.opacity = '0.7'; }}
                          title="Xem kịch bản chi tiết từng slide"
                        >
                          <span>📜</span>
                          <span>Xem Kịch Bản</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={isDeletingAny}
                        onClick={() => onView(item)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.75rem', cursor: isDeletingAny ? 'not-allowed' : 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', padding: 0, opacity: isDeletingAny ? 0.35 : 0.7 }}
                        onMouseEnter={(e) => { if (!isDeletingAny) e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={(e) => { if (!isDeletingAny) e.currentTarget.style.opacity = '0.7'; }}
                      >
                        <span>👁️</span>
                        <span>Xem lại</span>
                      </button>
                    )}
                    {isItemDeleting ? (
                      <span style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto' }}>
                        <svg className="animate-spin" style={{ width: '12px', height: '12px', fill: 'none', stroke: 'var(--danger)', strokeWidth: '3' }} viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)"/>
                          <path fill="var(--danger)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        <span>Đang xóa...</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        disabled={isDeletingAny}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          fontSize: '0.75rem',
                          cursor: isDeletingAny ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: 0,
                          opacity: isDeletingAny ? 0.35 : 0.8,
                          marginLeft: 'auto'
                        }}
                        onMouseEnter={(e) => { if (!isDeletingAny) e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={(e) => { if (!isDeletingAny) e.currentTarget.style.opacity = '0.8'; }}
                      >
                        <span>🗑️</span>
                        <span>Xóa</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
