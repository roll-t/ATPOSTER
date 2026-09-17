'use client';

import React, { useState, useEffect } from 'react';

/**
 * Khối hiển thị và tự động sinh Tiêu đề, Hashtags và Mô tả bài đăng (TikTok, YouTube Shorts, Reels, Facebook)
 * Đặt tại tab trái của màn hình Studio làm video.
 */
export default function PublishMetaCard({
  result,
  onResult,
  folderPath,
  category,
  isLandscape = false,
  copiedKey,
  onCopy
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [localCopied, setLocalCopied] = useState('');

  const youtubeTitle = result?.youtubeTitle || '';
  const hashtags = Array.isArray(result?.hashtags) ? result.hashtags : [];
  const youtubeDescription = result?.youtubeDescription || '';

  const hasMeta = Boolean(youtubeTitle || hashtags.length > 0 || youtubeDescription);

  useEffect(() => {
    setEditTitle(youtubeTitle);
    setEditTags(hashtags.join(' '));
    setEditDesc(youtubeDescription);
  }, [youtubeTitle, hashtags, youtubeDescription]);

  const handleCopy = (text, key) => {
    if (onCopy) {
      onCopy(text, key);
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setLocalCopied(key);
      setTimeout(() => setLocalCopied(''), 2000);
    }
  };

  const isCopied = (key) => copiedKey === key || localCopied === key;

  // Copy toàn bộ thông tin đăng bài (Tiêu đề + Mô tả + Hashtags)
  const handleCopyAll = () => {
    const parts = [];
    if (youtubeTitle) parts.push(youtubeTitle);
    if (youtubeDescription) {
      parts.push('\n' + youtubeDescription);
    } else if (hashtags.length > 0) {
      parts.push('\n' + hashtags.join(' '));
    }
    const fullText = parts.join('\n').trim();
    if (fullText) {
      handleCopy(fullText, 'meta_all');
    }
  };

  // Sinh tiêu đề, hashtag và mô tả bằng AI
  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/prompts/publish-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: result?.id,
          folderPath: folderPath || result?.input?.folderPath,
          category: category || result?.category,
          title: result?.title,
          segments: result?.segments,
          isLandscape: isLandscape,
          action: 'generate'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể tạo nội dung bài đăng.');
      }

      const updated = {
        ...result,
        youtubeTitle: data.meta.youtubeTitle || '',
        hashtags: data.meta.hashtags || [],
        youtubeDescription: data.meta.youtubeDescription || ''
      };

      if (onResult) {
        onResult(updated);
      }
      setIsEditing(false);
    } catch (err) {
      console.error('[PublishMetaCard] Lỗi sinh bài đăng:', err);
      setErrorMsg(err.message || 'Lỗi khi gọi AI');
    } finally {
      setIsGenerating(false);
    }
  };

  // Lưu nội dung chỉnh sửa thủ công
  const handleSaveEdit = async () => {
    setIsSaving(true);
    setErrorMsg('');
    try {
      const parsedTags = editTags
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith('#') ? t : `#${t}`));

      const customMeta = {
        youtubeTitle: editTitle.trim(),
        hashtags: parsedTags,
        youtubeDescription: editDesc.trim()
      };

      const res = await fetch('/api/prompts/publish-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: result?.id,
          folderPath: folderPath || result?.input?.folderPath,
          category: category || result?.category,
          action: 'save',
          customMeta
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể lưu nội dung.');
      }

      const updated = {
        ...result,
        ...customMeta
      };

      if (onResult) {
        onResult(updated);
      }
      setIsEditing(false);
    } catch (err) {
      console.error('[PublishMetaCard] Lỗi lưu nội dung:', err);
      setErrorMsg(err.message || 'Lỗi khi lưu dữ liệu');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        marginTop: '16px',
        padding: '14px',
        borderRadius: '10px',
        background: 'linear-gradient(145deg, rgba(236, 72, 153, 0.05) 0%, rgba(139, 92, 246, 0.08) 100%)',
        border: '1px solid rgba(236, 72, 153, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
      }}
    >
      {/* Header card */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '1rem' }}>📱</span>
          <strong style={{ fontSize: '0.86rem', color: '#f472b6', fontWeight: 800 }}>
            Tiêu đề, Hashtag & Mô tả đăng bài
          </strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {hasMeta && !isEditing && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '3px 8px',
                  fontSize: '0.68rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#e2e8f0'
                }}
                onClick={() => setIsEditing(true)}
                title="Chỉnh sửa trực tiếp tiêu đề, hashtags, mô tả"
              >
                <span>✏️</span> Sửa
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '3px 8px',
                  fontSize: '0.68rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: isCopied('meta_all') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(236, 72, 153, 0.15)',
                  border: isCopied('meta_all') ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(236, 72, 153, 0.35)',
                  color: isCopied('meta_all') ? '#4ade80' : '#f472b6'
                }}
                onClick={handleCopyAll}
                title="Copy tất cả Tiêu đề, Mô tả và Hashtags để dán lên TikTok/YouTube"
              >
                <span>{isCopied('meta_all') ? '✓' : '📋'}</span>
                <span>{isCopied('meta_all') ? 'Đã chép tất cả!' : 'Copy tất cả'}</span>
              </button>
            </>
          )}

          <button
            type="button"
            className="btn"
            disabled={isGenerating}
            onClick={handleGenerate}
            style={{
              padding: '4px 10px',
              fontSize: '0.72rem',
              borderRadius: '6px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
              color: '#fff',
              border: 'none',
              cursor: isGenerating ? 'wait' : 'pointer',
              boxShadow: '0 2px 8px rgba(236, 72, 153, 0.3)',
              opacity: isGenerating ? 0.7 : 1
            }}
            title="Sử dụng AI phân tích kịch bản để tạo tiêu đề giật tít, hashtag thịnh hành và mô tả chuẩn SEO"
          >
            <span>{isGenerating ? '⏳' : '✨'}</span>
            <span>{isGenerating ? 'Đang tạo AI...' : hasMeta ? 'Tạo lại AI' : 'Tạo bằng AI'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            fontSize: '0.74rem',
            color: '#f87171',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '6px',
            padding: '6px 10px',
            lineHeight: 1.4
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Trạng thái đang tải */}
      {isGenerating && (
        <div
          style={{
            padding: '16px',
            borderRadius: '8px',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px dashed rgba(236, 72, 153, 0.4)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <div style={{ fontSize: '1.4rem', animation: 'spin 1.5s linear infinite' }}>✨</div>
          <span style={{ fontSize: '0.76rem', color: '#f472b6', fontWeight: 600 }}>
            AI đang phân tích kịch bản, trích xuất điểm nhấn và viết tiêu đề, hashtag...
          </span>
        </div>
      )}

      {/* Trạng thái chưa có metadata và không trong quá trình generate */}
      {!hasMeta && !isGenerating && (
        <div
          style={{
            padding: '14px',
            borderRadius: '8px',
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px dashed rgba(255, 255, 255, 0.12)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Video này chưa có nội dung đăng bài. Bấm <strong>Tạo bằng AI</strong> để tự động tạo tiêu đề thu hút, hashtags và mô tả chuẩn SEO TikTok/YouTube!
          </p>
          <button
            type="button"
            className="btn"
            onClick={handleGenerate}
            style={{
              padding: '6px 14px',
              fontSize: '0.76rem',
              borderRadius: '7px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <span>✨</span>
            <span>Tự động tạo nội dung đăng bài (AI)</span>
          </button>
        </div>
      )}

      {/* Chế độ chỉnh sửa */}
      {hasMeta && isEditing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
              Tiêu đề bài đăng:
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="form-control"
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: '6px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff'
              }}
              placeholder="Nhập tiêu đề đăng bài..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
              Hashtags (cách nhau bởi dấu cách):
            </label>
            <input
              type="text"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              className="form-control"
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: '6px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#38bdf8'
              }}
              placeholder="#hashtag1 #hashtag2..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
              Mô tả / Caption:
            </label>
            <textarea
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="form-control"
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                resize: 'vertical'
              }}
              placeholder="Nhập mô tả video..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '6px' }}
              onClick={() => setIsEditing(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={isSaving}
              style={{ padding: '4px 12px', fontSize: '0.72rem', borderRadius: '6px', fontWeight: 700 }}
              onClick={handleSaveEdit}
            >
              {isSaving ? 'Đang lưu...' : '💾 Lưu thay đổi'}
            </button>
          </div>
        </div>
      )}

      {/* Hiển thị nội dung đã tạo khi không edit */}
      {hasMeta && !isEditing && !isGenerating && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Tiêu đề */}
          {youtubeTitle && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>
                  📌 TIÊU ĐỀ
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    padding: '2px 7px',
                    fontSize: '0.66rem',
                    borderRadius: '5px',
                    fontWeight: 700,
                    background: isCopied('yt_title') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    color: isCopied('yt_title') ? '#4ade80' : '#e2e8f0',
                    border: '1px solid rgba(255, 255, 255, 0.12)'
                  }}
                  onClick={() => handleCopy(youtubeTitle, 'yt_title')}
                >
                  {isCopied('yt_title') ? '✓ Đã chép!' : '📋 Copy'}
                </button>
              </div>
              <div
                style={{
                  fontSize: '0.84rem',
                  lineHeight: 1.5,
                  fontWeight: 700,
                  color: '#fff',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  wordBreak: 'break-word'
                }}
              >
                {youtubeTitle}
              </div>
            </div>
          )}

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>
                  🏷️ HASHTAGS ({hashtags.length})
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    padding: '2px 7px',
                    fontSize: '0.66rem',
                    borderRadius: '5px',
                    fontWeight: 700,
                    background: isCopied('yt_tags') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    color: isCopied('yt_tags') ? '#4ade80' : '#38bdf8',
                    border: '1px solid rgba(255, 255, 255, 0.12)'
                  }}
                  onClick={() => handleCopy(hashtags.join(' '), 'yt_tags')}
                >
                  {isCopied('yt_tags') ? '✓ Đã chép!' : '📋 Copy tags'}
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {hashtags.map((tag, idx) => (
                  <span
                    key={idx}
                    onClick={() => handleCopy(tag, `tag_${idx}`)}
                    title="Click để copy hashtag này"
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: isCopied(`tag_${idx}`) ? '#4ade80' : '#38bdf8',
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      padding: '2px 7px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isCopied(`tag_${idx}`) ? '✓ ' + tag : tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Mô tả / Caption */}
          {youtubeDescription && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>
                  📝 MÔ TẢ / CAPTION
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    padding: '2px 7px',
                    fontSize: '0.66rem',
                    borderRadius: '5px',
                    fontWeight: 700,
                    background: isCopied('yt_desc') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    color: isCopied('yt_desc') ? '#4ade80' : '#e2e8f0',
                    border: '1px solid rgba(255, 255, 255, 0.12)'
                  }}
                  onClick={() => handleCopy(youtubeDescription, 'yt_desc')}
                >
                  {isCopied('yt_desc') ? '✓ Đã chép!' : '📋 Copy'}
                </button>
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  lineHeight: 1.55,
                  color: 'rgba(255, 255, 255, 0.88)',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '140px',
                  overflowY: 'auto'
                }}
              >
                {youtubeDescription}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
