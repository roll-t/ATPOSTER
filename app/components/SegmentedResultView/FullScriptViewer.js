'use client';

import { useState, useMemo } from 'react';
import { countNarrationUnits, isJapaneseText } from '@/src/domain/narration/speech-rate.js';
import { tagSegmentsForElevenLabs } from '@/src/domain/narration/smartElevenLabsTagger.js';
import {
  cleanNarrationText,
  buildFullNarrationText,
  formatNarrationAsParagraphs,
  splitNarrationForTts,
  countCharacters,
  formatDuration,
  estimateSpeechSeconds,
  ttsChunkLimitFor
} from './utils.js';

const narrationUnitLabel = (text) => (isJapaneseText(text) ? 'ký tự' : 'chữ');

/**
 * Render lời kể có highlight tag cảm xúc [whispers], [pause], [sighs]...
 * Nếu keepTags = false, trả về chuỗi text sạch.
 */
export function renderNarrationWithHighlights(text, keepTags = true) {
  if (!keepTags) {
    return cleanNarrationText(text, { keepTags: false });
  }
  const cleaned = cleanNarrationText(text, { keepTags: true });
  const parts = cleaned.split(/(\[[^\]]+\])/g);
  if (parts.length === 1) return cleaned;

  return parts.map((part, idx) => {
    if (/^\[[^\]]+\]$/.test(part)) {
      return (
        <span
          key={idx}
          style={{
            display: 'inline-block',
            padding: '1px 7px',
            margin: '0 3px',
            borderRadius: '5px',
            fontSize: '0.82em',
            fontWeight: 700,
            background: 'rgba(245, 158, 11, 0.2)',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            color: '#fbbf24',
            letterSpacing: '0.02em',
            verticalAlign: 'baseline',
            lineHeight: 1.35
          }}
          title={`Tag cảm xúc cho ElevenLabs v3: ${part}`}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

/**
 * Khung hiển thị & sao chép toàn bộ kịch bản nói (Voice Script)
 * Hỗ trợ 2 phiên bản:
 *  1. Bản có gắn tag cho ElevenLabs (giữ lại [whispers], [pause], [sighs]...)
 *  2. Bản chuẩn không gắn tag (làm sạch để dán CapCut / VieNeu / Edge TTS / phụ đề)
 */
export default function FullScriptViewer({
  projectId = null,
  segments = [],
  copiedKey = '',
  onCopy = () => {},
  showEmotionTags = false,
  onToggleEmotionTags = null,
  onClose = null,
  onApplyTags = null
}) {
  const [activeTab, setActiveTab] = useState(showEmotionTags ? 'with_tags' : 'without_tags');
  const [viewMode, setViewMode] = useState('paragraphs'); // 'paragraphs' | 'by_slide'
  const [customTaggedSegments, setCustomTaggedSegments] = useState(null);
  const [isAiTagging, setIsAiTagging] = useState(false);
  const [aiTagError, setAiTagError] = useState('');
  const [appliedMsg, setAppliedMsg] = useState('');
  const [forceUntagged, setForceUntagged] = useState(false);

  // Kịch bản gốc trong database có sẵn tag hay chưa
  const hasNativeTags = useMemo(() => {
    return (segments || []).some((s) => /\[[^\]]+\]/.test(String(s?.dialogueOrNarration || '')));
  }, [segments]);

  // Bộ tag thông minh sinh tự động nếu kịch bản gốc chưa có sẵn tag
  const smartAutoTaggedSegments = useMemo(() => {
    return tagSegmentsForElevenLabs(segments).map((s) => ({
      ...s,
      dialogueOrNarration: s.dialogueWithTags || s.dialogueOrNarration
    }));
  }, [segments]);

  // Danh sách phân cảnh có tag thực tế sẽ dùng để hiển thị tab ElevenLabs
  const effectiveTaggedSegments = useMemo(() => {
    if (customTaggedSegments) return customTaggedSegments;
    if (hasNativeTags) return segments;
    if (forceUntagged) return segments;
    // Tự động gợi ý gắn tag theo ngữ cảnh để khi bấm tab ElevenLabs là người dùng THẤY NGAY CÁC TAG
    return smartAutoTaggedSegments;
  }, [customTaggedSegments, hasNativeTags, forceUntagged, segments, smartAutoTaggedSegments]);

  const isAutoTagged = !hasNativeTags && !forceUntagged;

  // Phân tích các tag cảm xúc có trong kịch bản đang hiển thị
  const allTags = useMemo(() => {
    const tags = [];
    for (const s of effectiveTaggedSegments || []) {
      const matches = String(s?.dialogueOrNarration || '').match(/\[[^\]]+\]/g);
      if (matches) tags.push(...matches);
    }
    return tags;
  }, [effectiveTaggedSegments]);

  const uniqueTags = useMemo(() => Array.from(new Set(allTags)), [allTags]);
  const hasTags = allTags.length > 0;

  // Lời thoại bản có tag (ElevenLabs)
  const rawWithTags = useMemo(() => buildFullNarrationText(effectiveTaggedSegments, { keepTags: true }), [effectiveTaggedSegments]);
  const paragraphsWithTags = useMemo(() => formatNarrationAsParagraphs(rawWithTags), [rawWithTags]);

  // Lời thoại bản không tag (Chuẩn / Sạch)
  const rawWithoutTags = useMemo(() => buildFullNarrationText(segments, { keepTags: false }), [segments]);
  const paragraphsWithoutTags = useMemo(() => formatNarrationAsParagraphs(rawWithoutTags), [rawWithoutTags]);

  // Chia theo từng slide cho bản có tag
  const slidesWithTags = useMemo(() => {
    return (effectiveTaggedSegments || [])
      .filter((s) => !s.isThumbnail && !s.dialogueOrNarration?.includes('Thumbnail'))
      .map((s) => {
        const text = cleanNarrationText(s.dialogueOrNarration, { keepTags: true });
        return {
          segmentNumber: s.segmentNumber,
          text,
          words: countNarrationUnits(text),
          seconds: estimateSpeechSeconds(text)
        };
      })
      .filter((s) => s.text);
  }, [effectiveTaggedSegments]);

  // Chia theo từng slide cho bản không tag
  const slidesWithoutTags = useMemo(() => {
    return (segments || [])
      .filter((s) => !s.isThumbnail && !s.dialogueOrNarration?.includes('Thumbnail'))
      .map((s) => {
        const text = cleanNarrationText(s.dialogueOrNarration, { keepTags: false });
        return {
          segmentNumber: s.segmentNumber,
          text,
          words: countNarrationUnits(text),
          seconds: estimateSpeechSeconds(text)
        };
      })
      .filter((s) => s.text);
  }, [segments]);

  // Chuỗi copy theo slide
  const slideStringWithTags = useMemo(() => {
    return slidesWithTags.map((s) => `[Slide ${s.segmentNumber}]\n${s.text}`).join('\n\n');
  }, [slidesWithTags]);

  const slideStringWithoutTags = useMemo(() => {
    return slidesWithoutTags.map((s) => `[Slide ${s.segmentNumber}]\n${s.text}`).join('\n\n');
  }, [slidesWithoutTags]);

  // Thống kê
  const activeKeepTags = activeTab === 'with_tags';
  const currentText = activeKeepTags ? paragraphsWithTags : paragraphsWithoutTags;
  const wordCount = countNarrationUnits(paragraphsWithoutTags);
  const unitLabel = narrationUnitLabel(paragraphsWithoutTags);
  const charCount = countCharacters(currentText);
  const estimatedSec = estimateSpeechSeconds(paragraphsWithoutTags);
  const durationStr = formatDuration(estimatedSec);

  // Kiểm tra chia phần TTS nếu dài vượt giới hạn
  const ttsParts = useMemo(() => splitNarrationForTts(currentText), [currentText]);
  const isMultiPart = ttsParts.length > 1;

  // Xử lý chuyển tab
  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    if (onToggleEmotionTags) {
      onToggleEmotionTags(tab === 'with_tags');
    }
  };

  // Gọi Gemini AI để gắn tag sâu
  const handleAiTagging = async () => {
    setIsAiTagging(true);
    setAiTagError('');
    try {
      const res = await fetch('/api/prompts/tag-elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectId,
          segments
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Không thể gắn tag bằng Gemini.');
      }
      if (data.segments && Array.isArray(data.segments)) {
        setCustomTaggedSegments(data.segments);
        setForceUntagged(false);
        setAppliedMsg('✓ Đã dùng Gemini AI đạo diễn tag cảm xúc thành công!');
        setTimeout(() => setAppliedMsg(''), 4500);
      }
    } catch (err) {
      setAiTagError(err.message || 'Lỗi khi gọi Gemini AI');
    } finally {
      setIsAiTagging(false);
    }
  };

  // Áp dụng tag vào danh sách slide thực tế của dự án
  const handleApplyToScript = async () => {
    if (!effectiveTaggedSegments || effectiveTaggedSegments.length === 0) return;
    if (onApplyTags) {
      onApplyTags(effectiveTaggedSegments);
    }
    setAppliedMsg('✓ Đã lưu các tag cảm xúc vào từng slide kịch bản!');
    setTimeout(() => setAppliedMsg(''), 4500);

    if (projectId) {
      try {
        await fetch('/api/prompts/tag-elevenlabs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: projectId,
            segments: effectiveTaggedSegments,
            saveToDb: true
          })
        });
      } catch (e) {
        // background sync
      }
    }
  };

  // Text để copy bản có tag
  const textToCopyWithTags = viewMode === 'by_slide' ? slideStringWithTags : paragraphsWithTags;
  // Text để copy bản không tag
  const textToCopyWithouts = viewMode === 'by_slide' ? slideStringWithoutTags : paragraphsWithoutTags;

  const currentParagraphs = useMemo(() => {
    return (currentText || '').split('\n\n').filter(Boolean);
  }, [currentText]);

  const currentSlides = activeKeepTags ? slidesWithTags : slidesWithoutTags;

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, rgba(20, 18, 34, 0.98), rgba(13, 11, 23, 0.99))',
        border: '1px solid rgba(99, 102, 241, 0.28)',
        borderRadius: '14px',
        padding: '18px 20px',
        marginBottom: '20px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5), 0 0 25px rgba(99, 102, 241, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      {/* Header của khung kịch bản nói */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.15rem' }}>🎙️</span>
            <strong style={{ fontSize: '0.92rem', color: '#fff', letterSpacing: '0.01em' }}>
              Toàn Bộ Kịch Bản Nói (Voice Script)
            </strong>
          </div>

          {/* Hai Tab chuyển đổi phiên bản */}
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(0, 0, 0, 0.45)',
              padding: '3px',
              borderRadius: '9px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <button
              type="button"
              onClick={() => handleSelectTab('with_tags')}
              style={{
                padding: '5px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: activeTab === 'with_tags' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
                color: activeTab === 'with_tags' ? '#0f172a' : 'rgba(255, 255, 255, 0.75)',
                boxShadow: activeTab === 'with_tags' ? '0 2px 8px rgba(245, 158, 11, 0.4)' : 'none'
              }}
              title="Bản giữ nguyên các tag cảm xúc [whispers], [pause], [sighs]... cho ElevenLabs v3"
            >
              <span>🏷️</span>
              <span>Bản có tag (ElevenLabs)</span>
              {hasTags && (
                <span
                  style={{
                    padding: '1px 5px',
                    borderRadius: '10px',
                    fontSize: '0.68rem',
                    background: activeTab === 'with_tags' ? '#0f172a' : 'rgba(245, 158, 11, 0.25)',
                    color: activeTab === 'with_tags' ? '#fbbf24' : '#fbbf24',
                    fontWeight: 800
                  }}
                >
                  {allTags.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab('without_tags')}
              style={{
                padding: '5px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: activeTab === 'without_tags' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                color: activeTab === 'without_tags' ? '#fff' : 'rgba(255, 255, 255, 0.75)',
                boxShadow: activeTab === 'without_tags' ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none'
              }}
              title="Bản thuần sạch đã lọc bỏ mọi tag [tag], thích hợp dán vào CapCut, VieNeu, Edge TTS, Google TTS hoặc làm phụ đề"
            >
              <span>✨</span>
              <span>Bản không tag (Chuẩn / CapCut)</span>
            </button>
          </div>
        </div>

        {/* Các nút sao chép & đóng */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              padding: '5px 12px',
              fontSize: '0.76rem',
              fontWeight: 700,
              borderRadius: '7px',
              background: 'rgba(245, 158, 11, 0.12)',
              borderColor: 'rgba(245, 158, 11, 0.35)',
              color: '#fbbf24'
            }}
            onClick={() => onCopy(textToCopyWithTags, 'script_full_with_tags')}
            title="Sao chép toàn bộ kịch bản có kèm tag cảm xúc cho ElevenLabs"
          >
            {copiedKey === 'script_full_with_tags' ? '✓ Đã chép bản ElevenLabs!' : '📋 Copy bản có tag'}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{
              padding: '5px 12px',
              fontSize: '0.76rem',
              fontWeight: 700,
              borderRadius: '7px',
              background: 'rgba(99, 102, 241, 0.12)',
              borderColor: 'rgba(99, 102, 241, 0.35)',
              color: '#a5b4fc'
            }}
            onClick={() => onCopy(textToCopyWithouts, 'script_full_without_tags')}
            title="Sao chép toàn bộ kịch bản thuần sạch (không có tag) cho CapCut/TTS thông thường"
          >
            {copiedKey === 'script_full_without_tags' ? '✓ Đã chép bản chuẩn!' : '📋 Copy bản không tag'}
          </button>

          {onClose && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                padding: '5px 10px',
                fontSize: '0.76rem',
                fontWeight: 600,
                borderRadius: '7px',
                color: 'rgba(255, 255, 255, 0.6)'
              }}
              onClick={onClose}
              title="Thu gọn khung kịch bản nói"
            >
              ▲ Thu gọn
            </button>
          )}
        </div>
      </div>

      {/* Dòng mô tả & thống kê */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          fontSize: '0.76rem',
          color: 'var(--text-muted)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ color: '#fff', fontWeight: 600 }}>
            📊 {wordCount.toLocaleString('vi-VN')} {unitLabel} · {charCount.toLocaleString('vi-VN')} ký tự · ~{durationStr}
          </span>
          <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>|</span>
          <span>{slidesWithoutTags.length} phân cảnh</span>

          {activeTab === 'with_tags' ? (
            hasTags ? (
              <span style={{ color: '#fbbf24', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span>🏷️</span> {customTaggedSegments ? '🤖 Gemini AI' : isAutoTagged ? '✨ Tự động gợi ý' : '🏷️ Đã gắn'} {allTags.length} tag cảm xúc ({uniqueTags.slice(0, 4).join(', ')}{uniqueTags.length > 4 ? '...' : ''})
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                (Đang hiển thị bản gốc chưa gắn tag cảm xúc)
              </span>
            )
          ) : (
            <span style={{ color: '#818cf8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span>✨</span> Bản sạch: Đã lọc toàn bộ tag cảm xúc (thích hợp cho CapCut / VieNeu / Edge TTS)
            </span>
          )}

          {isMultiPart && (
            <span style={{ color: 'var(--warning)', fontWeight: 700 }}>
              (Kịch bản dài, khuyến nghị chia {ttsParts.length} phần khi render)
            </span>
          )}
        </div>

        {/* Nút chuyển chế độ xem: Theo đoạn văn vs Theo từng slide */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Chế độ xem:</span>
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(0,0,0,0.35)',
              borderRadius: '6px',
              padding: '2px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('paragraphs')}
              style={{
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: 600,
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'paragraphs' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: viewMode === 'paragraphs' ? '#fff' : 'rgba(255,255,255,0.6)'
              }}
            >
              📝 Đoạn văn
            </button>
            <button
              type="button"
              onClick={() => setViewMode('by_slide')}
              style={{
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: 600,
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'by_slide' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: viewMode === 'by_slide' ? '#fff' : 'rgba(255,255,255,0.6)'
              }}
            >
              🎬 Từng slide
            </button>
          </div>
        </div>
      </div>

      {/* Thanh công cụ bổ sung cho Tab ElevenLabs: Gọi Gemini AI hoặc lưu tag vào kịch bản */}
      {activeTab === 'with_tags' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.06)',
            border: '1px solid rgba(245, 158, 11, 0.18)',
            fontSize: '0.76rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255, 255, 255, 0.85)', flex: 1, minWidth: '220px' }}>
            <span style={{ color: '#fbbf24' }}>💡</span>
            <span>
              {customTaggedSegments
                ? 'Đang áp dụng tag được Gemini AI phân tích theo sắc thái kịch bản.'
                : isAutoTagged
                  ? 'Kịch bản gốc chưa có tag — hệ thống đã tự động gán tag cảm xúc thông minh theo ngữ cảnh.'
                  : 'Kịch bản gốc đã có sẵn các tag cảm xúc.'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={isAiTagging}
              style={{
                padding: '4px 10px',
                fontSize: '0.72rem',
                borderRadius: '6px',
                fontWeight: 700,
                background: 'rgba(99, 102, 241, 0.15)',
                borderColor: 'rgba(99, 102, 241, 0.4)',
                color: '#a5b4fc',
                opacity: isAiTagging ? 0.6 : 1
              }}
              onClick={handleAiTagging}
              title="Nhờ Gemini AI phân tích kịch bản và chèn tag cảm xúc điện ảnh phù hợp nhất"
            >
              {isAiTagging ? '⏳ Gemini đang phân tích...' : '🤖 AI Gắn Tag Chi Tiết (Gemini)'}
            </button>

            {isAutoTagged && onApplyTags && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.15)',
                  borderColor: 'rgba(16, 185, 129, 0.4)',
                  color: '#34d399'
                }}
                onClick={handleApplyToScript}
                title="Lưu các tag cảm xúc này vào từng slide kịch bản của dự án"
              >
                💾 Lưu tag vào slide
              </button>
            )}

            {!hasNativeTags && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  borderRadius: '6px',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}
                onClick={() => setForceUntagged((v) => !v)}
                title="Bật/tắt chế độ tự động gắn tag"
              >
                {forceUntagged ? '✨ Bật gợi ý tag' : '✕ Xem nguyên bản'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Thông báo kết quả AI hoặc lưu */}
      {appliedMsg && (
        <div
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#34d399',
            fontSize: '0.76rem',
            fontWeight: 600
          }}
        >
          {appliedMsg}
        </div>
      )}

      {aiTagError && (
        <div
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#f87171',
            fontSize: '0.76rem',
            fontWeight: 600
          }}
        >
          {aiTagError}
        </div>
      )}

      {/* Khung nội dung kịch bản */}
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '16px 18px',
          maxHeight: '380px',
          overflowY: 'auto'
        }}
      >
        {viewMode === 'paragraphs' ? (
          <div>
            {currentParagraphs.length > 0 ? (
              currentParagraphs.map((p, idx) => (
                <p
                  key={idx}
                  style={{
                    margin: idx < currentParagraphs.length - 1 ? '0 0 14px 0' : 0,
                    fontSize: '0.88rem',
                    lineHeight: 1.75,
                    color: 'rgba(255, 255, 255, 0.92)'
                  }}
                >
                  {activeKeepTags ? renderNarrationWithHighlights(p, true) : p}
                </p>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                Không có dữ liệu lời kể
              </div>
            )}
          </div>
        ) : (
          <div>
            {currentSlides.length > 0 ? (
              currentSlides.map((s) => (
                <div
                  key={s.segmentNumber}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.025)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    marginBottom: '10px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                      flexWrap: 'wrap',
                      gap: '6px'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--warning)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>🎬</span> Slide {s.segmentNumber}
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        ({s.words} chữ · ~{s.seconds}s)
                      </span>
                    </span>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.68rem',
                        borderRadius: '5px',
                        fontWeight: 600
                      }}
                      onClick={() => onCopy(s.text, `slide_script_${s.segmentNumber}`)}
                    >
                      {copiedKey === `slide_script_${s.segmentNumber}` ? '✓ Đã chép' : '📋 Copy slide'}
                    </button>
                  </div>

                  <div
                    style={{
                      fontSize: '0.86rem',
                      lineHeight: 1.65,
                      color: 'rgba(255, 255, 255, 0.92)'
                    }}
                  >
                    {activeKeepTags ? renderNarrationWithHighlights(s.text, true) : s.text}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                Không có dữ liệu slide
              </div>
            )}
          </div>
        )}
      </div>

      {/* Khối chia nhiều phần TTS nếu kịch bản dài */}
      {isMultiPart && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 700 }}>
              ✂️ Kịch bản dài ({charCount} ký tự) — chia {ttsParts.length} phần render:
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {ttsParts.map((part, i) => (
              <button
                key={i}
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  borderRadius: '6px',
                  fontWeight: 600
                }}
                onClick={() => onCopy(part, `tts_part_${i}`)}
                title={`Copy phần ${i + 1} (${countCharacters(part)} ký tự)`}
              >
                {copiedKey === `tts_part_${i}` ? `✓ Đã chép P.${i + 1}` : `📋 Copy Phần ${i + 1} (${countCharacters(part)} kt)`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
