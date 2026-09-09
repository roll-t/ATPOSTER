'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import SegmentedResultView from './SegmentedResultView.js';

export default function ScriptDetailModal({
  item,
  onClose,
  onOpenProcess,
  copiedKey,
  onCopy,
  onResult,
  onHistoryRefresh
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const isLandscape = (item.input?.aspectRatio || '9:16') === '16:9';
  const sceneCount = item.segments?.length || 0;
  const title = item.title || item.jsonPrompt?.title || item.textPrompt || 'Bản thảo kịch bản';

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '24px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1240px',
          maxHeight: '92vh',
          background: 'linear-gradient(145deg, rgba(20, 18, 33, 0.98), rgba(12, 10, 22, 0.99))',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.85), 0 0 50px rgba(99, 102, 241, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#fff',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.02)',
            flexShrink: 0,
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3
                style={{
                  color: '#fff',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>📜</span> Chi Tiết & Tinh Chỉnh Kịch Bản
              </h3>
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: isLandscape ? 'var(--secondary)' : 'var(--primary)',
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}
              >
                {isLandscape ? '💻 16:9' : '📱 9:16'}
              </span>
              {sceneCount > 0 && (
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: '#818cf8',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}
                >
                  {sceneCount} phân cảnh
                </span>
              )}
            </div>
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '700px'
              }}
              title={title}
            >
              {title}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {onOpenProcess && (
              <button
                type="button"
                onClick={() => onOpenProcess(item)}
                className="btn btn-primary"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  border: 'none',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 3px 12px rgba(168, 85, 247, 0.35)'
                }}
              >
                <span>🎬</span>
                <span>Chuyển sang Quy trình & Dựng video</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'rgba(255, 255, 255, 0.7)',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.95rem',
                fontWeight: 700,
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
              title="Đóng hộp thoại (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body - SegmentedResultView in script mode */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            minHeight: 0
          }}
        >
          <SegmentedResultView
            key={item.id ? `modal_script_${item.id}` : 'modal_script'}
            result={item}
            copiedKey={copiedKey}
            onCopy={onCopy}
            activeTab="script"
            onResult={onResult}
            onHistoryRefresh={onHistoryRefresh}
          />
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
