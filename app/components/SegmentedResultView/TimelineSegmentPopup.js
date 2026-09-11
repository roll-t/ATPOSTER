'use client';

import React from 'react';

export default function TimelineSegmentPopup({
  segment = {},
  sceneIndex = 0,
  totalScenes = 1,
  duration = 3.5,
  sceneOffsets = [],
  totalDuration = 1,
  editText = '',
  setEditText,
  isRegenerating = false,
  popupMsg = null,
  isScenePlaying = false,
  onClose,
  onPlay,
  onRegenerate,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur
}) {
  const startOffset = sceneOffsets[sceneIndex] || 0;
  const centerPercent = ((startOffset + duration / 2) / Math.max(0.1, totalDuration)) * 100;
  const clampedCenter = Math.max(18, Math.min(82, centerPercent));

  const originalText = (segment.dialogueOrNarration || segment.subtitle || '').trim();
  const currentText = (editText || '').trim();
  const isDirty = currentText !== originalText;
  const wordCount = currentText ? currentText.split(/\s+/).filter(Boolean).length : 0;
  const charCount = (editText || '').length;

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 10px)',
        left: `${clampedCenter}%`,
        transform: 'translateX(-50%)',
        width: '320px',
        maxWidth: 'calc(100vw - 32px)',
        background: '#12141f',
        opacity: 1,
        border: isDirty ? '1px solid rgba(251, 191, 36, 0.45)' : '1px solid rgba(37, 244, 238, 0.3)',
        borderRadius: '12px',
        padding: '12px 14px',
        boxShadow: isDirty
          ? '0 12px 36px rgba(0, 0, 0, 0.85), 0 0 20px rgba(251, 191, 36, 0.15)'
          : '0 12px 36px rgba(0, 0, 0, 0.8), 0 0 20px rgba(37, 244, 238, 0.15)',
        backdropFilter: 'blur(16px)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'auto',
        transition: 'border-color 0.2s, box-shadow 0.2s'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#25f4ee', letterSpacing: '0.02em' }}>
            🎬 Cảnh {sceneIndex + 1}/{totalScenes}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: '4px' }}>
            ⏱ {duration.toFixed(1)}s
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            onClick={() => onPlay?.(sceneIndex)}
            title={isScenePlaying ? 'Dừng phát' : 'Phát đúng đoạn này'}
            style={{
              background: isScenePlaying ? 'rgba(239, 68, 68, 0.18)' : 'rgba(37, 244, 238, 0.12)',
              border: isScenePlaying ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(37, 244, 238, 0.35)',
              color: isScenePlaying ? '#f87171' : '#25f4ee',
              borderRadius: '5px',
              padding: '2px 8px',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            {isScenePlaying ? '⏸ Dừng' : '▶ Phát'}
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Đóng (hủy thay đổi chưa lưu)"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '0.9rem',
              cursor: 'pointer',
              padding: '2px 4px',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Text content / Editing Area - Luôn hiển thị mặc định cho sửa */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
            Lời đọc kịch bản:
          </span>
          {isDirty && (
            <span style={{ fontSize: '0.67rem', color: '#fbbf24', fontWeight: 600 }}>
              * Chưa lưu
            </span>
          )}
        </div>

        <textarea
          value={editText}
          onChange={(e) => setEditText?.(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              if (!isRegenerating && editText.trim()) {
                onRegenerate?.(sceneIndex, editText);
              }
            }
          }}
          rows={3}
          placeholder="Nhập lời đọc kịch bản cho cảnh này..."
          style={{
            width: '100%',
            background: '#090a10',
            border: isDirty ? '1px solid #fbbf24' : '1px solid rgba(37, 244, 238, 0.4)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '0.78rem',
            lineHeight: 1.38,
            padding: '6px 8px',
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            boxShadow: isDirty ? '0 0 8px rgba(251, 191, 36, 0.2)' : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s'
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.67rem', color: 'rgba(255,255,255,0.45)' }}>
          <span>{wordCount} từ • {charCount} ký tự</span>
          <span>{isDirty ? 'Ấn "Đọc lại" để lưu' : 'Sửa text & ấn Đọc lại'}</span>
        </div>

        {segment.subtitle && segment.subtitle !== (segment.dialogueOrNarration || '').trim() && (
          <div
            style={{
              fontSize: '0.67rem',
              color: 'rgba(255,255,255,0.4)',
              fontStyle: 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={segment.subtitle}
          >
            Phụ đề: {segment.subtitle}
          </div>
        )}
      </div>

      {/* Thông báo trạng thái */}
      {popupMsg && (
        <div
          style={{
            fontSize: '0.72rem',
            padding: '5px 8px',
            borderRadius: '5px',
            fontWeight: 600,
            background: popupMsg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : popupMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37, 244, 238, 0.12)',
            color: popupMsg.type === 'error' ? '#f87171' : popupMsg.type === 'success' ? '#34d399' : '#25f4ee',
            border: `1px solid ${popupMsg.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : popupMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(37, 244, 238, 0.3)'}`
          }}
        >
          {popupMsg.text}
        </div>
      )}

      {/* Nút Đọc lại duy nhất (chỉ ghi nhận lưu sửa khi ấn nút này) */}
      <div style={{ marginTop: '2px' }}>
        <button
          type="button"
          disabled={isRegenerating || !editText.trim()}
          onClick={() => onRegenerate?.(sceneIndex, editText)}
          title={isDirty ? 'Lưu nội dung mới và tạo lại giọng đọc' : 'Tạo lại giọng đọc cho cảnh này'}
          style={{
            width: '100%',
            padding: '7px 12px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: isRegenerating || !editText.trim() ? 'not-allowed' : 'pointer',
            background: isDirty
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            border: 'none',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: isDirty
              ? '0 2px 10px rgba(16, 185, 129, 0.35)'
              : '0 2px 8px rgba(99, 102, 241, 0.3)',
            transition: 'all 0.2s ease',
            opacity: isRegenerating || !editText.trim() ? 0.6 : 1
          }}
        >
          {isRegenerating ? (
            '⏳ Đang đọc lại...'
          ) : isDirty ? (
            '🎙️ Đọc lại (lưu thay đổi)'
          ) : (
            '🎙️ Đọc lại'
          )}
        </button>
      </div>

      {/* Mũi tên chỉ xuống segment */}
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid #12141f'
        }}
      />
    </div>
  );
}
