'use client';

import React, { useState, useEffect, useMemo } from 'react';

/**
 * Helper tính toán URL thumbnail siêu nhẹ (40KB, < 20ms) cho CDN báo chí VN
 */
const getFastThumbUrl = (item) => {
  if (item?.thumbUrl) return item.thumbUrl;
  const url = item?.url || '';
  if (
    url.includes('kenh14cdn.com') ||
    url.includes('mediacdn.vn') ||
    url.includes('sohacdn.com') ||
    url.includes('cafebizcdn.com') ||
    url.includes('afamilycdn.com') ||
    url.includes('autopro.com.vn')
  ) {
    if (!url.includes('thumb_w/') && !url.includes('zoom/')) {
      return url.replace(/(kenh14cdn\.com|mediacdn\.vn|sohacdn\.com|cafebizcdn\.com|afamilycdn\.com|autopro\.com\.vn)\//, (m, domain) => `${domain}/thumb_w/400/`);
    }
    if (url.includes('thumb_w/1200/')) {
      return url.replace('thumb_w/1200/', 'thumb_w/400/');
    }
    if (url.includes('thumb_w/')) {
      return url.replace(/thumb_w\/\d+\//, 'thumb_w/400/');
    }
  }
  return url;
};

/**
 * Helper tính toán URL download chất lượng cao Full HD (1200px, 200KB)
 */
const getFastDownloadUrl = (item) => {
  if (item?.downloadUrl) return item.downloadUrl;
  const url = item?.url || '';
  if (
    url.includes('kenh14cdn.com') ||
    url.includes('mediacdn.vn') ||
    url.includes('sohacdn.com') ||
    url.includes('cafebizcdn.com') ||
    url.includes('afamilycdn.com') ||
    url.includes('autopro.com.vn')
  ) {
    if (!url.includes('thumb_w/') && !url.includes('zoom/')) {
      return url.replace(/(kenh14cdn\.com|mediacdn\.vn|sohacdn\.com|cafebizcdn\.com|afamilycdn\.com|autopro\.com\.vn)\//, (m, domain) => `${domain}/thumb_w/1200/`);
    }
  }
  return url;
};

/**
 * Modal hiển thị và chọn/đổi ảnh/video trích xuất từ bài báo
 */
export default function ArticleMediaPickerModal({
  isOpen,
  onClose,
  folderPath,
  category,
  sceneNumber = 1,
  totalScenes = 1,
  articleUrl,
  preloadedMedia = [],
  onApplied,
  showToast,
}) {
  const [selectedScene, setSelectedScene] = useState(sceneNumber || 1);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [mediaList, setMediaList] = useState(preloadedMedia || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyingIndex, setApplyingIndex] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [hoverIndex, setHoverIndex] = useState(null);

  useEffect(() => {
    if (sceneNumber) {
      setSelectedScene(sceneNumber);
    }
  }, [sceneNumber]);

  const fetchMediaFromUrl = (urlToFetch) => {
    if (!urlToFetch) return;
    setIsLoading(true);
    setErrorMsg('');
    fetch('/api/articles/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlToFetch }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.article?.media) && data.article.media.length > 0) {
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
  };

  useEffect(() => {
    if (!isOpen) return;

    const validPreloaded = Array.isArray(preloadedMedia) && preloadedMedia.length > 0 ? preloadedMedia : [];
    if (validPreloaded.length > 1) {
      setMediaList(validPreloaded);
      return;
    }

    // Nếu preloadedMedia chỉ có <= 1 ảnh nhưng có URL bài báo, tự động quét để lấy danh sách đầy đủ
    if (articleUrl) {
      if (validPreloaded.length === 1) {
        setMediaList(validPreloaded);
      }
      fetchMediaFromUrl(articleUrl);
    } else if (validPreloaded.length > 0) {
      setMediaList(validPreloaded);
    }
  }, [isOpen, articleUrl, preloadedMedia]);

  if (!isOpen) return null;

  // Gán / đổi 1 ảnh cụ thể vào cảnh đang chọn
  const handleApplySingleMedia = async (item, index) => {
    if (isApplying) return;
    setIsApplying(true);
    setApplyingIndex(index);
    const targetScene = selectedScene;
    try {
      const res = await fetch('/api/prompts/sync-article-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath,
          category,
          mediaList: [{
            ...item,
            downloadUrl: getFastDownloadUrl(item),
            thumbUrl: getFastThumbUrl(item),
          }],
          targetSceneNumbers: [targetScene],
          replaceExisting: true,
          articleUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast?.success?.(`✓ Đã đổi ${item.type === 'video' ? 'video' : 'ảnh'} thành công cho Cảnh ${targetScene}!`);
        onApplied?.(data.savedFiles);
        if (autoAdvance && targetScene < totalScenes) {
          setSelectedScene(targetScene + 1);
        }
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
    if (!mediaList || mediaList.length === 0 || isApplying) return;
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

  const sceneOptionsCount = Math.max(totalScenes, selectedScene, 1);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1020px',
          maxHeight: '92vh',
          background: '#0f172a',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            background: 'rgba(15, 23, 42, 0.98)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Left: Icon + Title + Scene Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                flexShrink: 0,
              }}
            >
              📰
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>Kho Ảnh Bài Báo</span>

                {/* Bộ điều khiển chọn cảnh trực tiếp trong modal */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.45)',
                    borderRadius: '8px',
                    padding: '2px 6px',
                  }}
                >
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, paddingRight: '2px' }}>Đổi cho:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedScene((prev) => Math.max(1, prev - 1))}
                    disabled={selectedScene <= 1}
                    title="Cảnh trước"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: selectedScene <= 1 ? '#475569' : '#38bdf8',
                      cursor: selectedScene <= 1 ? 'not-allowed' : 'pointer',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      padding: '2px 5px',
                    }}
                  >
                    ◀
                  </button>
                  <select
                    value={selectedScene}
                    onChange={(e) => setSelectedScene(Number(e.target.value))}
                    style={{
                      background: 'transparent',
                      color: '#38bdf8',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {Array.from({ length: sceneOptionsCount }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num} style={{ background: '#0f172a', color: '#fff' }}>
                        Cảnh #{num}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setSelectedScene((prev) => Math.min(sceneOptionsCount, prev + 1))}
                    disabled={selectedScene >= sceneOptionsCount}
                    title="Cảnh sau"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: selectedScene >= sceneOptionsCount ? '#475569' : '#38bdf8',
                      cursor: selectedScene >= sceneOptionsCount ? 'not-allowed' : 'pointer',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      padding: '2px 5px',
                    }}
                  >
                    ▶
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  {mediaList.length > 0 ? `Nhấp ảnh bất kỳ để đổi cho Cảnh ${selectedScene}` : 'Đang tải media...'}
                </span>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    color: autoAdvance ? '#38bdf8' : '#64748b',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  title="Sau khi chọn ảnh xong, tự động chuyển mục tiêu sang cảnh kế tiếp"
                >
                  <input
                    type="checkbox"
                    checked={autoAdvance}
                    onChange={(e) => setAutoAdvance(e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: '#0ea5e9' }}
                  />
                  <span>Tự nhảy sang cảnh tiếp</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {articleUrl && (
              <button
                type="button"
                onClick={() => fetchMediaFromUrl(articleUrl)}
                disabled={isLoading}
                title="Quét lại từ URL bài báo gốc"
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>🔄</span>
                <span>{isLoading ? 'Đang quét...' : 'Quét lại'}</span>
              </button>
            )}

            {mediaList.length > 0 && (
              <button
                type="button"
                onClick={handleApplyAllMedia}
                disabled={isApplying}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: isApplying ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 10px rgba(14, 165, 233, 0.3)',
                }}
              >
                <span>📥</span>
                <span>{isApplying && applyingIndex === 'all' ? 'Đang đồng bộ...' : `Điền tất cả (${mediaList.length} ảnh)`}</span>
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
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#38bdf8' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
              <div style={{ fontWeight: 600 }}>Đang tải danh sách ảnh & video bài báo...</div>
            </div>
          )}

          {errorMsg && !isLoading && (
            <div
              style={{
                padding: '14px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                textAlign: 'center',
                fontSize: '0.85rem',
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
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '14px',
              }}
            >
              {mediaList.map((item, idx) => {
                const isApplyingThis = isApplying && applyingIndex === idx;
                const isHovered = hoverIndex === idx;
                const displaySrc = getFastThumbUrl(item);

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoverIndex(idx)}
                    onMouseLeave={() => setHoverIndex(null)}
                    onClick={() => handleApplySingleMedia(item, idx)}
                    style={{
                      background: isHovered ? '#1e293b' : '#141e33',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: isHovered ? '1.5px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: isApplying ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isHovered ? '0 10px 25px -5px rgba(56, 189, 248, 0.25)' : 'none',
                      transform: isHovered ? 'translateY(-2px)' : 'none',
                    }}
                  >
                    {/* Media preview */}
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '175px',
                        background: '#090d16',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
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
                          src={displaySrc}
                          alt={item.alt || ''}
                          referrerPolicy="no-referrer"
                          loading="eager"
                          decoding="async"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.3s ease',
                            transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                          }}
                        />
                      )}

                      {/* Click overlay on hover */}
                      {isHovered && !isApplying && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(2, 132, 199, 0.4)',
                            backdropFilter: 'blur(2px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            gap: '6px',
                            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                          }}
                        >
                          <span>🔄</span>
                          <span>Đổi sang ảnh này</span>
                        </div>
                      )}

                      {/* Badges */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          display: 'flex',
                          gap: '6px',
                          zIndex: 2,
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
                              background: 'rgba(234, 179, 8, 0.9)',
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
                              background: 'rgba(14, 165, 233, 0.9)',
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplySingleMedia(item, idx);
                        }}
                        disabled={isApplying}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: isApplyingThis
                            ? 'rgba(56, 189, 248, 0.3)'
                            : isHovered
                              ? 'linear-gradient(135deg, #0284c7, #2563eb)'
                              : 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(37, 99, 235, 0.25))',
                          border: '1px solid rgba(56, 189, 248, 0.5)',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: isApplying ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                          boxShadow: isHovered ? '0 2px 10px rgba(56, 189, 248, 0.4)' : 'none',
                        }}
                      >
                        <span>🔄</span>
                        <span>{isApplyingThis ? 'Đang đổi...' : `Đổi ảnh cho Cảnh ${selectedScene}`}</span>
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
