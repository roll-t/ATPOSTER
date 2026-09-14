'use client';

import React, { useState, useEffect } from 'react';
import ColorPickerPopover from './ColorPickerPopover';

function hexToRgba(hex, alpha = 0.2) {
  if (!hex || typeof hex !== 'string') return `rgba(254, 44, 85, ${alpha})`;
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(254, 44, 85, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


const CAPTION_STYLES = [
  { id: 'news', label: 'Báo chí hiện đại', shortLabel: 'Báo chí', desc: 'Hiện đại, căn lề trái' },
  { id: 'minimal', label: 'Tối giản không nền', shortLabel: 'Tối giản', desc: 'Nổi bật hình ảnh minh hoạ' },
  { id: 'karaoke', label: 'Karaoke phát sáng', shortLabel: 'Karaoke', desc: 'Sáng dần theo giọng đọc' }
];

const CAPTION_ANIMATIONS = [
  { id: 'none', label: 'Tĩnh', desc: 'Cố định, không rung lắc' },
  { id: 'zoom', label: 'Zoom nhẹ', desc: 'Dãn nở êm theo nhịp ảnh' },
  { id: 'fade', label: 'Mờ dần', desc: 'Xuất hiện êm dịu ở đầu cảnh' },
  { id: 'slide-up', label: 'Trượt lên', desc: 'Trượt nhẹ từ dưới lên' }
];

const TRANSITION_STYLES = [
  { id: 'crossfade', label: 'Hòa tan' },
  { id: 'slide-left', label: 'Trượt trái' },
  { id: 'slide-right', label: 'Trượt phải' },
  { id: 'slide-up', label: 'Trượt lên' },
  { id: 'zoom', label: 'Phóng to' }
];

const FONTS = [
  { id: 'paytone-one', label: 'Paytone One' },
  { id: 'be-vietnam-pro', label: 'Be Vietnam Pro' },
  { id: 'itim', label: 'Itim (Viết tay)' },
  { id: 'roboto', label: 'Roboto' },
  { id: 'montserrat', label: 'Montserrat' },
  { id: 'nunito', label: 'Nunito (Bo tròn)' },
  { id: 'oswald', label: 'Oswald' }
];


function renderStyleVisualPreview(styleId, highlightColor = '#d9a620', textColor = '#ffffff') {
  switch (styleId) {
    case 'news':
      return (
        <div style={{ background: 'linear-gradient(135deg, rgba(14, 16, 28, 0.75) 0%, rgba(254, 44, 85, 0.18) 100%)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.12)', borderLeft: `3px solid ${highlightColor || '#d9a620'}`, padding: '3px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px', boxShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>
          <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '10px' }}>Báo chí</span>
          <span style={{ color: highlightColor || '#d9a620', fontWeight: 800, fontSize: '10px' }}>hiện đại</span>
        </div>
      );
    case 'minimal':
      return (
        <div style={{ fontSize: '10.5px', fontWeight: 900, letterSpacing: '0.02em', textShadow: '0 2px 8px rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ color: '#ffffff' }}>Tối giản</span>
          <span style={{ color: highlightColor || '#d9a620' }}>không nền</span>
        </div>
      );
    case 'karaoke':
      return (
        <div style={{ fontSize: '10.5px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ color: '#FE2C55', textShadow: '0 0 8px #FE2C55, 0 0 14px rgba(254,44,85,0.85)' }}>Karaoke</span>
          <span style={{ color: 'rgba(255,255,255,0.45)', textShadow: 'none' }}>sáng</span>
        </div>
      );
    default:
      return <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>{styleId}</span>;
  }
}

export default function VideoEditorPanel({
  result = {},
  activeSceneIndex = 0,
  onSceneIndexChange,
  assetCounts = {},
  renderCaptionEnabled = true,
  setRenderCaptionEnabled,
  renderCaptionAnimation = 'none',
  setRenderCaptionAnimation,
  renderCaptionTextAlign = 'center',
  setRenderCaptionTextAlign,
  renderCaptionStyle = 'hook',
  setRenderCaptionStyle,
  renderCaptionFont = 'be-vietnam-pro',
  setRenderCaptionFont,
  renderCaptionFontSize = '50',
  setRenderCaptionFontSize,
  renderHighlightColor = '#d9a620',
  setRenderHighlightColor,
  renderCaptionTextColor = '#ffffff',
  setRenderCaptionTextColor,
  renderCaptionBgTransparent = true,
  setRenderCaptionBgTransparent,
  renderCaptionMarginY = '-215',
  setRenderCaptionMarginY,
  renderCaptionWidth = '92',
  setRenderCaptionWidth,
  renderTransitionStyle = 'crossfade',
  setRenderTransitionStyle,
  renderVideoBgColor = '#000000',
  setRenderVideoBgColor,
  renderChannelLogo = true,
  setRenderChannelLogo,
  renderShowOpeningComment = true,
  setRenderShowOpeningComment,
  renderOpeningCommentAuthor = 'Trả lời bình luận',
  setRenderOpeningCommentAuthor,
  renderOpeningCommentText = '',
  setRenderOpeningCommentText,
  renderShowOpeningNewsBanner = false,
  setRenderShowOpeningNewsBanner,
  renderOpeningNewsHeadline = '',
  setRenderOpeningNewsHeadline,
  renderOpeningNewsBrand = 'TIN TỨC',
  setRenderOpeningNewsBrand,
  renderOpeningNewsLikes = '27.1K',
  setRenderOpeningNewsLikes,
  handleSaveAndApply,
  isSavingStyle = false,
  saveStyleMsg = '',
  onResult,
  onHistoryRefresh,
  resyncVoiceForSegments,
  checkAssets
}) {
  const [editorTab, setEditorTab] = useState('style'); // 'style' | 'scene' | 'all'
  const segments = result?.segments || [];
  const totalScenes = segments.length;
  const currentSegment = segments[activeSceneIndex] || segments[0] || {};

  // Form chỉnh sửa cảnh hiện tại
  const [currentSubtitleDraft, setCurrentSubtitleDraft] = useState(currentSegment?.subtitle || '');
  const [currentNarrationDraft, setCurrentNarrationDraft] = useState(currentSegment?.dialogueOrNarration || '');
  const [isSavingScene, setIsSavingScene] = useState(false);
  const [sceneSaveMsg, setSceneSaveMsg] = useState('');
  const [isPlayingSceneAudio, setIsPlayingSceneAudio] = useState(false);
  const [isResyncingVoice, setIsResyncingVoice] = useState(false);

  // Đồng bộ form khi đổi cảnh
  useEffect(() => {
    setCurrentSubtitleDraft(currentSegment?.subtitle || '');
    setCurrentNarrationDraft(currentSegment?.dialogueOrNarration || '');
    setSceneSaveMsg('');
  }, [activeSceneIndex, currentSegment]);

  const folderPath = result?.input?.folderPath || 'example';
  const category = result?.category || '';
  const currentPaddedNum = String(currentSegment.segmentNumber || activeSceneIndex + 1).padStart(2, '0');
  const currentSceneNumber = Number(currentSegment.segmentNumber || activeSceneIndex + 1);

  const hasSceneImage = (sceneNum) => {
    if (assetCounts?.imageCount !== undefined && assetCounts.imageCount === 0) return false;
    if (Array.isArray(assetCounts?.existingImageNumbers)) return assetCounts.existingImageNumbers.includes(sceneNum);
    if (typeof assetCounts?.imageCount === 'number') return assetCounts.imageCount > 0;
    return true;
  };

  const currentAudioSrc = `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=audio/scene-${currentPaddedNum}.mp3&category=${encodeURIComponent(category)}`;
  const currentImgSrc = hasSceneImage(currentSceneNumber)
    ? `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=images/scene-${currentPaddedNum}.jpg&category=${encodeURIComponent(category)}&v=${activeSceneIndex}`
    : null;

  const handlePlaySceneAudio = () => {
    const audio = new Audio(currentAudioSrc);
    setIsPlayingSceneAudio(true);
    audio.onended = () => setIsPlayingSceneAudio(false);
    audio.onerror = () => setIsPlayingSceneAudio(false);
    audio.play().catch(() => setIsPlayingSceneAudio(false));
  };

  const handleSaveCurrentScene = async () => {
    if (!result?.id) return;
    setIsSavingScene(true);
    setSceneSaveMsg('');
    const segNum = currentSegment.segmentNumber || activeSceneIndex + 1;
    const narrationChanged = currentNarrationDraft.trim() !== (currentSegment.dialogueOrNarration || '').trim();

    try {
      const res = await fetch('/api/prompts/update-segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: result.id,
          folderPath: result.input?.folderPath || '',
          category: result.category,
          segments: [
            {
              segmentNumber: segNum,
              subtitle: currentSubtitleDraft.trim(),
              dialogueOrNarration: currentNarrationDraft.trim()
            }
          ]
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onResult?.({
          ...result,
          segments: data.segments,
          remotionConfig: data.remotionConfig ?? result.remotionConfig
        });
        onHistoryRefresh?.();
        setSceneSaveMsg('✓ Đã lưu thay đổi cảnh!');

        if (narrationChanged && resyncVoiceForSegments) {
          setIsResyncingVoice(true);
          setSceneSaveMsg('✓ Đã lưu cảnh. 🎙️ Đang tạo lại giọng đọc...');
          const r = await resyncVoiceForSegments([segNum], data.segments);
          setIsResyncingVoice(false);
          if (r && !r.error) {
            setSceneSaveMsg('✓ Đã lưu và cập nhật giọng đọc mới!');
            if (checkAssets) checkAssets();
          }
        }
      } else {
        setSceneSaveMsg(`Lỗi: ${data.error || 'Không thể lưu cảnh'}`);
      }
    } catch {
      setSceneSaveMsg('Lỗi kết nối máy chủ');
    } finally {
      setIsSavingScene(false);
    }
  };

  return (
    <div
      style={{
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: '100%',
        maxHeight: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: 'rgba(255, 255, 255, 0.025)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '0px',
        boxShadow: 'none',
        transform: 'none',
        transition: 'none'
      }}
    >
      {/* Header & Tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎛️</span> Chỉnh sửa Video
          </h4>
          <span style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 700, background: 'rgba(168, 85, 247, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
            Live Inspector
          </span>
        </div>

        {/* Tab Switcher - Không bo góc, không spacing */}
        <div style={{ display: 'flex', gap: '0px', background: 'rgba(20, 15, 38, 0.6)', padding: '2px', borderRadius: '0px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
          <button
            type="button"
            onClick={() => setEditorTab('style')}
            style={{
              flex: 1,
              padding: '6px 4px',
              fontSize: '0.74rem',
              fontWeight: 700,
              borderRadius: '0px',
              border: 'none',
              cursor: 'pointer',
              background: editorTab === 'style' ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : 'transparent',
              color: editorTab === 'style' ? '#fff' : 'rgba(255, 255, 255, 0.65)',
              boxShadow: editorTab === 'style' ? '0 2px 8px rgba(0,0,0,0.4)' : 'none',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            🎨 Style Video
          </button>
          <button
            type="button"
            onClick={() => setEditorTab('scene')}
            style={{
              flex: 1,
              padding: '6px 4px',
              fontSize: '0.74rem',
              fontWeight: 700,
              borderRadius: '0px',
              border: 'none',
              cursor: 'pointer',
              background: editorTab === 'scene' ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : 'transparent',
              color: editorTab === 'scene' ? '#fff' : 'rgba(255, 255, 255, 0.65)',
              boxShadow: editorTab === 'scene' ? '0 2px 8px rgba(0,0,0,0.4)' : 'none',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            🎬 Sửa Cảnh {activeSceneIndex + 1}
          </button>
          <button
            type="button"
            onClick={() => setEditorTab('all')}
            style={{
              flex: 1,
              padding: '6px 4px',
              fontSize: '0.74rem',
              fontWeight: 700,
              borderRadius: '0px',
              border: 'none',
              cursor: 'pointer',
              background: editorTab === 'all' ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : 'transparent',
              color: editorTab === 'all' ? '#fff' : 'rgba(255, 255, 255, 0.65)',
              boxShadow: editorTab === 'all' ? '0 2px 8px rgba(0,0,0,0.4)' : 'none',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            📜 Toàn bộ ({totalScenes})
          </button>
        </div>
      </div>

      {/* TAB 1: STYLE VIDEO */}
      {editorTab === 'style' && (
        <div className="scrollable-col" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Kiểu phụ đề & Bật/Tắt phụ đề */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>💬</span>
                <span>Phụ đề video</span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.7rem', color: renderCaptionEnabled ? '#c084fc' : 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                  {renderCaptionEnabled ? 'Đang bật' : 'Đã tắt'}
                </span>
                <label className="custom-switch" style={{ margin: 0, transform: 'scale(0.8)' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(renderCaptionEnabled)}
                    onChange={(e) => setRenderCaptionEnabled && setRenderCaptionEnabled(e.target.checked)}
                  />
                  <span className="switch-slider" style={{ backgroundColor: renderCaptionEnabled ? '#a855f7' : 'rgba(255,255,255,0.15)' }}></span>
                </label>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', opacity: renderCaptionEnabled ? 1 : 0.45, pointerEvents: renderCaptionEnabled ? 'auto' : 'none', transition: 'all 0.15s ease' }}>
              {CAPTION_STYLES.map((st) => {
                const isActive = renderCaptionStyle === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    title={`${st.label} - ${st.desc}`}
                    onClick={() => {
                      setRenderCaptionStyle && setRenderCaptionStyle(st.id);
                      if (st.id === 'news') {
                        if (setRenderCaptionAnimation) setRenderCaptionAnimation('none');
                        if (setRenderCaptionBgTransparent) setRenderCaptionBgTransparent(false);
                      } else if (false && setRenderCaptionBgTransparent) {
                        setRenderCaptionBgTransparent(false);
                      } else if (st.id === 'minimal' && setRenderCaptionBgTransparent) {
                        setRenderCaptionBgTransparent(true);
                      }
                    }}
                    style={{
                      position: 'relative',
                      padding: '5px 2px 4px 2px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: isActive ? '1.5px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isActive
                        ? 'radial-gradient(ellipse at center, rgba(168, 85, 247, 0.22) 0%, rgba(18, 14, 32, 0.95) 100%)'
                        : 'radial-gradient(ellipse at center, rgba(30, 25, 48, 0.6) 0%, rgba(14, 11, 24, 0.85) 100%)',
                      boxShadow: isActive ? '0 0 12px rgba(168, 85, 247, 0.4)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      height: '64px',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Visual Style Preview in center */}
                    <div
                      style={{
                        flex: 1,
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none',
                        pointerEvents: 'none'
                      }}
                    >
                      {renderStyleVisualPreview(st.id, renderHighlightColor, renderCaptionTextColor)}
                    </div>

                    {/* Tên kiểu phụ đề nhỏ gọn nằm trực tiếp bên trong item */}
                    <div
                      style={{
                        fontSize: '0.63rem',
                        fontWeight: 700,
                        color: isActive ? '#d8b4fe' : 'rgba(255, 255, 255, 0.72)',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        width: '100%',
                        lineHeight: 1.1,
                        paddingTop: '2px'
                      }}
                    >
                      {st.shortLabel || st.label}
                    </div>

                    {isActive && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '3px',
                          right: '3px',
                          width: '13px',
                          height: '13px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '8px',
                          fontWeight: 900,
                          boxShadow: '0 1px 6px rgba(168, 85, 247, 0.6)',
                          zIndex: 5
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Canh chỉnh text trong phụ đề */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '10px',
            padding: '0',
            opacity: renderCaptionEnabled ? 1 : 0.45,
            pointerEvents: renderCaptionEnabled ? 'auto' : 'none',
            transition: 'all 0.15s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem' }}>📐</span>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                Canh lề chữ phụ đề:
              </span>
            </div>
            <div style={{ display: 'inline-flex', background: 'rgba(20, 15, 38, 0.7)', padding: '2px', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.25)', gap: '2px' }}>
              <button
                type="button"
                onClick={() => setRenderCaptionTextAlign && setRenderCaptionTextAlign('left')}
                title="Canh lề trái"
                style={{
                  padding: '5px 9px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '5px',
                  border: 'none',
                  cursor: 'pointer',
                  background: renderCaptionTextAlign === 'left' ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'transparent',
                  color: renderCaptionTextAlign === 'left' ? '#fff' : 'rgba(255, 255, 255, 0.65)',
                  boxShadow: renderCaptionTextAlign === 'left' ? '0 1px 8px rgba(168, 85, 247, 0.4)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>
                <span>Trái</span>
              </button>
              <button
                type="button"
                onClick={() => setRenderCaptionTextAlign && setRenderCaptionTextAlign('center')}
                title="Canh giữa"
                style={{
                  padding: '5px 9px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '5px',
                  border: 'none',
                  cursor: 'pointer',
                  background: renderCaptionTextAlign === 'center' ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'transparent',
                  color: renderCaptionTextAlign === 'center' ? '#fff' : 'rgba(255, 255, 255, 0.65)',
                  boxShadow: renderCaptionTextAlign === 'center' ? '0 1px 8px rgba(168, 85, 247, 0.4)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>
                <span>Giữa</span>
              </button>
              <button
                type="button"
                onClick={() => setRenderCaptionTextAlign && setRenderCaptionTextAlign('right')}
                title="Canh lề phải"
                style={{
                  padding: '5px 9px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '5px',
                  border: 'none',
                  cursor: 'pointer',
                  background: renderCaptionTextAlign === 'right' ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'transparent',
                  color: renderCaptionTextAlign === 'right' ? '#fff' : 'rgba(255, 255, 255, 0.65)',
                  boxShadow: renderCaptionTextAlign === 'right' ? '0 1px 8px rgba(168, 85, 247, 0.4)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>
                <span>Phải</span>
              </button>
            </div>
          </div>

          {/* Hiệu ứng animation tiêu đề / phụ đề */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '10px',
            padding: '0',
            opacity: renderCaptionEnabled ? 1 : 0.45,
            pointerEvents: renderCaptionEnabled ? 'auto' : 'none',
            transition: 'all 0.15s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem' }}>✨</span>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}>
                Animation tiêu đề:
              </span>
            </div>
            <div style={{ display: 'inline-flex', background: 'rgba(20, 15, 38, 0.7)', padding: '2px', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.25)', gap: '2px' }}>
              {CAPTION_ANIMATIONS.map((anim) => {
                const currentAnim = renderCaptionAnimation || (renderCaptionStyle === 'news' ? 'none' : 'zoom');
                const isActive = currentAnim === anim.id;
                return (
                  <button
                    key={anim.id}
                    type="button"
                    title={anim.desc}
                    onClick={() => setRenderCaptionAnimation && setRenderCaptionAnimation(anim.id)}
                    style={{
                      padding: '5px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      borderRadius: '5px',
                      border: 'none',
                      cursor: 'pointer',
                      background: isActive ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'transparent',
                      color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.65)',
                      boxShadow: isActive ? '0 1px 8px rgba(168, 85, 247, 0.4)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>{anim.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font chữ & Cỡ chữ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', opacity: renderCaptionEnabled ? 1 : 0.45, pointerEvents: renderCaptionEnabled ? 'auto' : 'none', transition: 'all 0.15s ease' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                Font chữ:
              </span>
              <select
                value={renderCaptionFont}
                onChange={(e) => setRenderCaptionFont && setRenderCaptionFont(e.target.value)}
                style={{
                  padding: '7px 8px',
                  borderRadius: '7px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  outline: 'none'
                }}
              >
                {FONTS.map((f) => (
                  <option key={f.id} value={f.id} style={{ background: '#121020', color: '#fff' }}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                Cỡ chữ: {renderCaptionFontSize}px
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setRenderCaptionFontSize && setRenderCaptionFontSize(String(Math.max(20, (Number(renderCaptionFontSize) || 50) - 2)))}
                  style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
                >
                  -
                </button>
                <input
                  type="range"
                  min={24}
                  max={72}
                  value={Number(renderCaptionFontSize) || 50}
                  onChange={(e) => setRenderCaptionFontSize && setRenderCaptionFontSize(e.target.value)}
                  style={{ flex: 1, cursor: 'pointer' }}
                />
                <button
                  type="button"
                  onClick={() => setRenderCaptionFontSize && setRenderCaptionFontSize(String(Math.min(76, (Number(renderCaptionFontSize) || 50) + 2)))}
                  style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Màu Primary & Màu nền video nằm ngang nhau, bảng màu nằm cạnh tiêu đề */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
                Màu Primary:
              </span>
              <ColorPickerPopover
                color={renderHighlightColor}
                onChange={setRenderHighlightColor}
                label="Màu Primary"
                align="left"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
                Màu nền video:
              </span>
              <ColorPickerPopover
                color={renderVideoBgColor || '#000000'}
                onChange={setRenderVideoBgColor}
                label="Màu nền video"
                align="right"
              />
            </div>
          </div>

          {/* Kiểu chuyển cảnh */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
              Hiệu ứng chuyển cảnh giữa các slide:
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {TRANSITION_STYLES.map((t) => {
                const isActive = renderTransitionStyle === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setRenderTransitionStyle && setRenderTransitionStyle(t.id)}
                    style={{
                      padding: '5px 9px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: isActive ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(168, 85, 247, 0.35))' : 'rgba(0, 0, 0, 0.3)',
                      color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.7)'
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tùy chọn bổ sung: Logo kênh */}
          <div
            onClick={() => setRenderChannelLogo && setRenderChannelLogo(!renderChannelLogo)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: renderChannelLogo ? 'rgba(168, 85, 247, 0.15)' : 'rgba(0,0,0,0.25)',
              borderRadius: '8px',
              border: renderChannelLogo ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img
                src="/images/watermark/the-mind-logo.png"
                alt=""
                style={{ width: '28px', height: '14px', objectFit: 'contain', mixBlendMode: 'screen', filter: 'brightness(1.15)' }}
              />
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: renderChannelLogo ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                Logo kênh thương hiệu
              </span>
            </div>
            <label className="custom-switch" onClick={(e) => e.stopPropagation()} style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={Boolean(renderChannelLogo)}
                onChange={(e) => setRenderChannelLogo && setRenderChannelLogo(e.target.checked)}
              />
              <span className="switch-slider" style={{ backgroundColor: renderChannelLogo ? '#a855f7' : 'rgba(255,255,255,0.15)' }}></span>
            </label>
          </div>

          {/* Tuỳ chọn Mở đầu video (Cảnh 1): Bình thường / Hộp hỏi / Banner tin tức / Cả hai */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: (renderShowOpeningComment || renderShowOpeningNewsBanner) ? 'rgba(239, 68, 68, 0.08)' : 'rgba(0,0,0,0.25)', borderRadius: '10px', border: (renderShowOpeningComment || renderShowOpeningNewsBanner) ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.06)', padding: '12px', transition: 'all 0.15s ease' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1.05rem' }}>🎬</span>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#fff' }}>
                    Mở đầu video (Cảnh 1)
                  </span>
                </div>
                <span style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.45)' }}>
                  Tuỳ chọn giao diện frame đầu
                </span>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)', marginBottom: '8px' }}>
                Chọn phong cách xuất hiện mở đầu thu hút người xem:
              </div>

              {/* 4 Nút chọn nhanh kiểu mở đầu */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {/* Option 1: Bình thường (không sticker, không banner) */}
                <button
                  type="button"
                  onClick={() => {
                    setRenderShowOpeningComment && setRenderShowOpeningComment(false);
                    setRenderShowOpeningNewsBanner && setRenderShowOpeningNewsBanner(false);
                  }}
                  style={{
                    padding: '8px 6px',
                    borderRadius: '7px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    background: (!renderShowOpeningComment && !renderShowOpeningNewsBanner) ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0,0,0,0.3)',
                    border: (!renderShowOpeningComment && !renderShowOpeningNewsBanner) ? '1.5px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                    color: (!renderShowOpeningComment && !renderShowOpeningNewsBanner) ? '#fff' : 'rgba(255,255,255,0.65)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '0.9rem' }}>⚪</span>
                  <span>Bình thường</span>
                  <span style={{ fontSize: '0.58rem', fontWeight: 400, opacity: 0.7 }}>Không sticker/banner</span>
                </button>

                {/* Option 2: Hộp bình luận (TikTok Question Sticker) */}
                <button
                  type="button"
                  onClick={() => {
                    setRenderShowOpeningComment && setRenderShowOpeningComment(true);
                    setRenderShowOpeningNewsBanner && setRenderShowOpeningNewsBanner(false);
                  }}
                  style={{
                    padding: '8px 6px',
                    borderRadius: '7px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    background: (renderShowOpeningComment && !renderShowOpeningNewsBanner) ? 'rgba(59, 130, 246, 0.25)' : 'rgba(0,0,0,0.3)',
                    border: (renderShowOpeningComment && !renderShowOpeningNewsBanner) ? '1.5px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                    color: (renderShowOpeningComment && !renderShowOpeningNewsBanner) ? '#60a5fa' : 'rgba(255,255,255,0.65)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '0.9rem' }}>💬</span>
                  <span>Hộp bình luận</span>
                  <span style={{ fontSize: '0.58rem', fontWeight: 400, opacity: 0.7 }}>Sticker hỏi ở trên</span>
                </button>

                {/* Option 3: Banner tin tức nửa dưới */}
                <button
                  type="button"
                  onClick={() => {
                    setRenderShowOpeningComment && setRenderShowOpeningComment(false);
                    setRenderShowOpeningNewsBanner && setRenderShowOpeningNewsBanner(true);
                  }}
                  style={{
                    padding: '8px 6px',
                    borderRadius: '7px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    background: (!renderShowOpeningComment && renderShowOpeningNewsBanner) ? 'rgba(239, 68, 68, 0.25)' : 'rgba(0,0,0,0.3)',
                    border: (!renderShowOpeningComment && renderShowOpeningNewsBanner) ? '1.5px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                    color: (!renderShowOpeningComment && renderShowOpeningNewsBanner) ? '#f87171' : 'rgba(255,255,255,0.65)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '0.9rem' }}>📰</span>
                  <span>Banner tin tức</span>
                  <span style={{ fontSize: '0.58rem', fontWeight: 400, opacity: 0.7 }}>Nửa màn hình dưới đỏ</span>
                </button>

                {/* Option 4: Cả hai */}
                <button
                  type="button"
                  onClick={() => {
                    setRenderShowOpeningComment && setRenderShowOpeningComment(true);
                    setRenderShowOpeningNewsBanner && setRenderShowOpeningNewsBanner(true);
                  }}
                  style={{
                    padding: '8px 6px',
                    borderRadius: '7px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    background: (renderShowOpeningComment && renderShowOpeningNewsBanner) ? 'rgba(168, 85, 247, 0.25)' : 'rgba(0,0,0,0.3)',
                    border: (renderShowOpeningComment && renderShowOpeningNewsBanner) ? '1.5px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                    color: (renderShowOpeningComment && renderShowOpeningNewsBanner) ? '#c084fc' : 'rgba(255,255,255,0.65)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '0.9rem' }}>🔥</span>
                  <span>Cả hai</span>
                  <span style={{ fontSize: '0.58rem', fontWeight: 400, opacity: 0.7 }}>Hộp hỏi + Banner tin</span>
                </button>
              </div>
            </div>

            {/* Cấu hình chi tiết Hộp bình luận khi được bật */}
            {renderShowOpeningComment && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>💬</span> Cài đặt Hộp bình luận (trên):
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.64rem', color: 'rgba(255,255,255,0.6)', marginBottom: '3px' }}>
                    Tên người hỏi / Dòng tiêu đề sticker:
                  </label>
                  <input
                    type="text"
                    value={renderOpeningCommentAuthor || ''}
                    placeholder="Trả lời bình luận"
                    onChange={(e) => setRenderOpeningCommentAuthor && setRenderOpeningCommentAuthor(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      fontSize: '0.72rem',
                      borderRadius: '6px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.64rem', color: 'rgba(255,255,255,0.6)', marginBottom: '3px' }}>
                    Nội dung câu hỏi bình luận (để trống = lấy lời mở đầu):
                  </label>
                  <textarea
                    rows={2}
                    value={renderOpeningCommentText || ''}
                    placeholder={result?.segments?.[0]?.dialogueOrNarration || result?.segments?.[0]?.subtitle || result?.title || 'Câu hỏi mở đầu...'}
                    onChange={(e) => setRenderOpeningCommentText && setRenderOpeningCommentText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      fontSize: '0.72rem',
                      borderRadius: '6px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      outline: 'none',
                      resize: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Cấu hình chi tiết Banner tin tức nửa dưới khi được bật */}
            {renderShowOpeningNewsBanner && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>📰</span> Cài đặt Banner tin tức (nửa dưới):
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.64rem', color: 'rgba(255,255,255,0.6)', marginBottom: '3px' }}>
                    Tiêu đề giật tít màu vàng (để trống = lấy tiêu đề video):
                  </label>
                  <textarea
                    rows={2}
                    value={renderOpeningNewsHeadline || ''}
                    placeholder={result?.title || result?.segments?.[0]?.dialogueOrNarration || result?.segments?.[0]?.subtitle || 'TIÊU ĐỀ NỔI BẬT DỄ ĐỌC...'}
                    onChange={(e) => setRenderOpeningNewsHeadline && setRenderOpeningNewsHeadline(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      fontSize: '0.72rem',
                      borderRadius: '6px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#FACC15',
                      fontWeight: 700,
                      outline: 'none',
                      resize: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.64rem', color: 'rgba(255,255,255,0.6)', marginBottom: '3px' }}>
                      Kênh / Thương hiệu:
                    </label>
                    <input
                      type="text"
                      value={renderOpeningNewsBrand || ''}
                      placeholder="TIN TỨC"
                      onChange={(e) => setRenderOpeningNewsBrand && setRenderOpeningNewsBrand(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: '0.72rem',
                        borderRadius: '6px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.64rem', color: 'rgba(255,255,255,0.6)', marginBottom: '3px' }}>
                      Số lượt thích (♡):
                    </label>
                    <input
                      type="text"
                      value={renderOpeningNewsLikes || ''}
                      placeholder="27.1K"
                      onChange={(e) => setRenderOpeningNewsLikes && setRenderOpeningNewsLikes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: '0.72rem',
                        borderRadius: '6px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Nút Lưu cấu hình & Ghim mặc định */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={handleSaveAndApply}
              disabled={isSavingStyle}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: isSavingStyle ? 'wait' : 'pointer',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                border: 'none',
                color: '#fff',
                boxShadow: '0 3px 14px rgba(168, 85, 247, 0.4)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              title="Lưu style cho video này và đặt làm định dạng mặc định cho skill này"
            >
              {isSavingStyle ? '⏳ Đang lưu...' : '💾 Lưu Style'}
            </button>
            {saveStyleMsg && (
              <span style={{ fontSize: '0.74rem', color: '#10b981', textAlign: 'center', fontWeight: 600 }}>
                {saveStyleMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SỬA CẢNH HIỆN TẠI */}
      {editorTab === 'scene' && (
        <div className="scrollable-col" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Cảnh Navigator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => onSceneIndexChange && onSceneIndexChange(Math.max(0, activeSceneIndex - 1))}
              disabled={activeSceneIndex === 0}
              style={{ background: 'none', border: 'none', color: activeSceneIndex === 0 ? 'rgba(255,255,255,0.2)' : '#c084fc', cursor: activeSceneIndex === 0 ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '0.85rem' }}
            >
              ◀ Cảnh trước
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff' }}>
              Cảnh {activeSceneIndex + 1} / {totalScenes}
            </span>
            <button
              type="button"
              onClick={() => onSceneIndexChange && onSceneIndexChange(Math.min(totalScenes - 1, activeSceneIndex + 1))}
              disabled={activeSceneIndex >= totalScenes - 1}
              style={{ background: 'none', border: 'none', color: activeSceneIndex >= totalScenes - 1 ? 'rgba(255,255,255,0.2)' : '#c084fc', cursor: activeSceneIndex >= totalScenes - 1 ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '0.85rem' }}
            >
              Cảnh tiếp ▶
            </button>
          </div>

          {/* Phụ đề trên video */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                💬 Phụ đề hiển thị (On-screen Subtitle):
              </span>
              <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.45)' }}>
                Dùng **từ khóa** để tô sáng
              </span>
            </div>
            <textarea
              rows={2}
              value={currentSubtitleDraft}
              onChange={(e) => setCurrentSubtitleDraft(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                lineHeight: 1.45,
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Lời kể lồng tiếng */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
              🎙️ Lời kể / Thuyết minh (Voiceover):
            </span>
            <textarea
              rows={3}
              value={currentNarrationDraft}
              onChange={(e) => setCurrentNarrationDraft(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                lineHeight: 1.45,
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Nghe thử voice cảnh này */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePlaySceneAudio}
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              {isPlayingSceneAudio ? '🔊 Đang phát...' : '▶ Nghe thử voice cảnh này'}
            </button>
          </div>

          {/* Ảnh hoạt cảnh thu nhỏ */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0,0,0,0.25)', padding: '8px', borderRadius: '8px' }}>
            {currentImgSrc ? (
              <img
                src={currentImgSrc}
                alt=""
                style={{ width: '48px', height: '64px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            ) : (
              <div style={{ width: '48px', height: '64px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} title="Chưa sinh ảnh">🎬</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', display: 'block' }}>Mô tả hình ảnh:</span>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {currentSegment?.visualDescription || 'Chưa có mô tả hình ảnh'}
              </p>
            </div>
          </div>

          {/* Nút lưu cảnh */}
          <button
            type="button"
            onClick={handleSaveCurrentScene}
            disabled={isSavingScene || isResyncingVoice}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              border: 'none',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              marginTop: '4px'
            }}
          >
            {isSavingScene ? '⏳ Đang lưu...' : isResyncingVoice ? '🎙️ Đang tạo lại voice...' : '💾 Lưu Thay Đổi Cảnh Này'}
          </button>
          {sceneSaveMsg && (
            <span style={{ fontSize: '0.74rem', color: '#10b981', textAlign: 'center', fontWeight: 600 }}>
              {sceneSaveMsg}
            </span>
          )}
        </div>
      )}

      {/* TAB 3: TOÀN BỘ CẢNH */}
      {editorTab === 'all' && (
        <div className="scrollable-col" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {segments.map((seg, idx) => {
            const isCurrent = idx === activeSceneIndex;
            const padNum = String(seg.segmentNumber || idx + 1).padStart(2, '0');
            const segNum = Number(seg.segmentNumber || idx + 1);
            const hasThumb = hasSceneImage(segNum);
            const thumb = hasThumb
              ? `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=images/scene-${padNum}.jpg&category=${encodeURIComponent(category)}&v=${idx}`
              : null;
            const sub = (seg.subtitle || seg.dialogueOrNarration || '').split('\n')[0];

            return (
              <div
                key={idx}
                onClick={() => {
                  onSceneIndexChange && onSceneIndexChange(idx);
                  setEditorTab('scene');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: isCurrent ? '1.5px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.06)',
                  background: isCurrent ? 'rgba(168, 85, 247, 0.15)' : 'rgba(0, 0, 0, 0.25)',
                  boxShadow: isCurrent ? '0 0 14px rgba(168, 85, 247, 0.25)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    style={{ width: '36px', height: '48px', objectFit: 'cover', borderRadius: '5px', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : (
                  <div style={{ width: '36px', height: '48px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} title="Chưa sinh ảnh">🎬</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: isCurrent ? '#d8b4fe' : '#fff' }}>
                      Cảnh {idx + 1}
                    </span>
                    {isCurrent && (
                      <span style={{ fontSize: '0.66rem', color: '#c084fc', fontWeight: 700 }}>
                        Đang chọn
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sub}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}