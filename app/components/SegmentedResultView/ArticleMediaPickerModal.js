'use client';

import React, { useState, useEffect } from 'react';

/**
 * Modal hiển thị và chọn ảnh/video trích xuất từ bài báo
 */
export default function ArticleMediaPickerModal({
  isOpen,
  onClose,
  folderPath,
  category,
  sceneNumber,
  articleUrl,
  preloadedMedia = [],
  onApplied,
  showToast,
}) {
  const [mediaList, setMediaList] = useState(preloadedMedia || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyingIndex, setApplyingIndex] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    // Nếu đã có preloadedMedia từ manifest thì dùng luôn
    if (Array.isArray(preloadedMedia) && preloadedMedia.length > 0) {
      setMediaList(preloadedMedia);
      return;
    }

    // Nếu chưa có nhưng có articleUrl, tải danh sách media từ API
    if (articleUrl) {
      setIsLoading(true);
      setErrorMsg('');
      fetch('/api/articles/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: articleUrl }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.article?.media)) {
            setMediaList(data.article.media);
          } else {
            setErrorMsg(data.error || 'Không tìm thấy ảnh hoặc video nào từ bài báo này.');
          }
        })
        .catch((err) => {
          setErrorMsg(err.message || 'Lỗi kết nối khi trích xuất ảnh bài báo.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, articleUrl, preloadedMedia]);

  if (!isOpen) return null;

  // Gán 1 ảnh cụ thể vào cảnh hiện tại
  const handleApplySingleMedia = async (item, index) => {
    setIsApplying(true);
    setApplyingIndex(index);
    try {
      const res = await fetch('/api/prompts/sync-article-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath,
          category,
          mediaList: [item],
          targetSceneNumbers: [sceneNumber],
          replaceExisting: true,
          articleUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast?.success?.(`✓ Đã áp dụng ${item.type === 'video' ? 'video' : 'ảnh'} vào Cảnh ${sceneNumber}!`);
        onApplied?.(data.savedFiles);
        onClose();
      } else {
        throw new Error(data.error || 'Không thể lưu media vào cảnh.');
      }
    } catch (err) {
      showToast?.error?.(err.message);
    } finally {
      setIsApplying(false);
      setApplyingIndex(null);
    }
  };

  // Đồng bộ tất cả ảnh bài báo vào các cảnh 1..N
  const handleApplyAllMedia = async () => {
    if (!mediaList || mediaList.length === 0) return;
    setIsApplying(true);
    setApplyingIndex('all');
    try {
      const res = await fetch('/api/prompts/sync-article-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath,
          category,
          mediaList,
          replaceExisting: true,
          articleUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast?.success?.(`✓ Đã đồng bộ ${data.savedCount} ảnh/video bài báo vào các cảnh!`);
        onApplied?.(data.savedFiles);
        onClose();
      } else {
        throw new Error(data.error || 'Không thể đồng bộ media.');
      }
    } catch (err) {
      showToast?.error?.(err.message);
    } finally {
      setIsApplying(false);
      setApplyingIndex(null);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '960px',
          maxHeight: '90vh',
          background: '#0f172a',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'rgba(15, 23, 42, 0.95)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                flexShrink: 0,
              }}
            >
              📰
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 800 }}>
                Ảnh & Video Trích Xuất Từ Bài Báo
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                {mediaList.length > 0
                  ? `Tìm thấy ${mediaList.length} media nét cao sẵn sàng làm nguyên liệu`
                  : 'Đang tải media từ bài báo...'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {mediaList.length > 0 && (
              <button
                type="button"
                onClick={handleApplyAllMedia}
                disabled={isApplying}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: isApplying ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 10px rgba(14, 165, 233, 0.3)',
                }}
              >
                <span>📥</span>
                <span>{isApplying && applyingIndex === 'all' ? 'Đang đồng bộ...' : `Điền tất cả (${mediaList.length} ảnh) vào các cảnh`}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '1.2rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Body content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#38bdf8' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
              <div style={{ fontWeight: 600 }}>Đang quét và bóc tách ảnh & video từ bài báo...</div>
            </div>
          )}

          {errorMsg && !isLoading && (
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                textAlign: 'center',
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {!isLoading && !errorMsg && mediaList.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
              Không tìm thấy ảnh hoặc video nào trong bài báo.
            </div>
          )}

          {!isLoading && mediaList.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
                gap: '16px',
              }}
            >
              {mediaList.map((item, idx) => {
                const isApplyingThis = isApplying && applyingIndex === idx;
                return (
                  <div
                    key={idx}
                    style={{
                      background: '#1e293b',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.15s ease, border-color 0.15s ease',
                    }}
                  >
                    {/* Media preview */}
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '170px',
                        background: '#090d16',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.type === 'video' ? (
                        <video
                          src={item.url}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          controls
                        />
                      ) : (
                        <img
                          src={item.url}
                          alt={item.alt || ''}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                      )}

                      {/* Badges */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          display: 'flex',
                          gap: '6px',
                        }}
                      >
                        <span
                          style={{
                            background: 'rgba(0,0,0,0.75)',
                            backdropFilter: 'blur(4px)',
                            color: '#fff',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(255,255,255,0.2)',
                          }}
                        >
                          #{idx + 1}
                        </span>
                        {item.isHero && (
                          <span
                            style={{
                              background: 'rgba(234, 179, 8, 0.85)',
                              color: '#000',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            ⭐ Ảnh bìa
                          </span>
                        )}
                        {item.type === 'video' && (
                          <span
                            style={{
                              background: 'rgba(14, 165, 233, 0.85)',
                              color: '#fff',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            🎬 Video
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Caption & Actions */}
                    <div
                      style={{
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        flex: 1,
                        justifyContent: 'space-between',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: '#cbd5e1',
                          lineHeight: 1.4,
                          maxHeight: '42px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                        title={item.caption || item.alt || ''}
                      >
                        {item.caption || item.alt || 'Ảnh minh họa bài báo'}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplySingleMedia(item, idx)}
                        disabled={isApplying}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: isApplyingThis
                            ? 'rgba(56, 189, 248, 0.3)'
                            : 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(37, 99, 235, 0.2))',
                          border: '1px solid rgba(56, 189, 248, 0.4)',
                          color: '#38bdf8',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: isApplying ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>✓</span>
                        <span>{isApplyingThis ? 'Đang gán...' : `Gán vào Cảnh ${sceneNumber}`}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
