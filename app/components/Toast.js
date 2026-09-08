'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Global Toast emitter
 * @param {string} message 
 * @param {'success' | 'error' | 'warning' | 'info'} [type]
 * @param {number} [duration=3500] 
 */
export function showToast(message, type, duration = 3500) {
  if (typeof window === 'undefined') return;

  // Tự động nhận diện loại thông báo nếu không truyền
  let resolvedType = type;
  if (!resolvedType) {
    const lower = String(message || '').toLowerCase();
    if (message?.includes('✓') || lower.includes('thành công') || lower.includes('success')) {
      resolvedType = 'success';
    } else if (message?.includes('⚠️') || lower.includes('lỗi') || lower.includes('error') || lower.includes('thất bại')) {
      resolvedType = 'error';
    } else if (lower.includes('vui lòng') || lower.includes('chú ý') || lower.includes('cảnh báo')) {
      resolvedType = 'warning';
    } else {
      resolvedType = 'info';
    }
  }

  // Làm sạch ký tự icon ở đầu nếu có để tránh lặp icon
  let cleanMessage = String(message || '').trim();
  if (cleanMessage.startsWith('✓') || cleanMessage.startsWith('✔')) {
    cleanMessage = cleanMessage.replace(/^[✓✔]\s*/, '');
  }

  window.dispatchEvent(
    new CustomEvent('atposter-toast', {
      detail: {
        id: Date.now() + Math.random().toString(36).substring(2, 9),
        message: cleanMessage,
        type: resolvedType,
        duration
      }
    })
  );
}

showToast.success = (msg, duration) => showToast(msg, 'success', duration);
showToast.error = (msg, duration) => showToast(msg, 'error', duration);
showToast.warning = (msg, duration) => showToast(msg, 'warning', duration);
showToast.info = (msg, duration) => showToast(msg, 'info', duration);

if (typeof window !== 'undefined') {
  window.showToast = showToast;
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  }, []);

  useEffect(() => {
    // Chuyển hướng window.alert sang showToast để không còn hộp thoại alert mặc định chặn màn hình
    const originalAlert = window.alert;
    window.alert = (msg) => {
      showToast(msg);
    };

    const handleToastEvent = (e) => {
      const { id, message, type, duration } = e.detail;
      setToasts((prev) => [...prev.slice(-4), { id, message, type, duration, createdAt: Date.now() }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    };

    window.addEventListener('atposter-toast', handleToastEvent);

    return () => {
      window.alert = originalAlert;
      window.removeEventListener('atposter-toast', handleToastEvent);
    };
  }, [removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'center',
        pointerEvents: 'none',
        maxWidth: '92vw',
        width: 'max-content'
      }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes toastSlideDown {
          from {
            opacity: 0;
            transform: translateY(-14px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes toastSlideUp {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}} />

      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        const accentColor = isSuccess
          ? '#22c55e'
          : isError
          ? '#ef4444'
          : isWarning
          ? '#f59e0b'
          : '#25f4ee';

        const icon = isSuccess
          ? '✓'
          : isError
          ? '✕'
          : isWarning
          ? '⚠️'
          : 'ℹ️';

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: 'rgba(18, 16, 28, 0.94)',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${accentColor}44`,
              borderLeft: `4px solid ${accentColor}`,
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: `0 12px 36px rgba(0, 0, 0, 0.55), 0 0 16px ${accentColor}22`,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              minWidth: '280px',
              maxWidth: '480px',
              animation: toast.exiting
                ? 'toastSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                : 'toastSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Icon status */}
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: `${accentColor}22`,
                border: `1.5px solid ${accentColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isWarning ? '0.75rem' : '0.8rem',
                fontWeight: 900,
                color: accentColor,
                flexShrink: 0
              }}
            >
              {icon}
            </div>

            {/* Nội dung thông báo */}
            <div
              style={{
                fontSize: '0.86rem',
                fontWeight: 600,
                lineHeight: 1.4,
                color: '#fff',
                wordBreak: 'break-word',
                flexGrow: 1
              }}
            >
              {toast.message}
            </div>

            {/* Nút đóng */}
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.45)',
                fontSize: '1.1rem',
                lineHeight: 1,
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                marginLeft: '4px',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)';
                e.currentTarget.style.background = 'none';
              }}
            >
              ×
            </button>

            {/* Thanh thời gian thu nhỏ ở dưới */}
            {toast.duration > 0 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: '2px',
                  background: accentColor,
                  opacity: 0.6,
                  animation: `toastProgress ${toast.duration}ms linear forwards`
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
