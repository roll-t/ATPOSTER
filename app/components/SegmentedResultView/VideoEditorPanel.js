'use client';

import React, { useState, useEffect } from 'react';
import ColorPickerPopover from './ColorPickerPopover';

const CAPTION_STYLES = [
  { id: 'hook', label: 'Tiêu đề mở đầu (Hook)', desc: 'Tiêu đề nổi bật, badge sao' },
  { id: 'tiktok', label: 'Viền chữ TikTok', desc: 'Viền nét, đổi màu từng từ' },
  { id: 'karaoke', label: 'Karaoke phát sáng', desc: 'Sáng dần theo giọng đọc' },
  { id: 'pill', label: 'Hộp bo tròn (Pill)', desc: 'Thẻ kính trong suốt bo tròn' },
  { id: 'news', label: 'Báo chí hiện đại', desc: 'Hiện đại, căn lề trái' },
  { id: 'classic', label: 'Cổ điển chuẩn mực', desc: 'Chữ đổ bóng mềm' },
  { id: 'minimal', label: 'Tối giản không nền', desc: 'Nổi bật hình ảnh minh hoạ' },
  { id: 'box', label: 'Khung viền nổi bật', desc: 'Khung màu nổi tương phản' }
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

export default function VideoEditorPanel({
  result = {},
  activeSceneIndex = 0,
  onSceneIndexChange,
  assetCounts = {},
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
  renderChannelLogo = true,
  setRenderChannelLogo,
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
          <span style={{ fontSize: '0.7rem', color: '#25f4ee', fontWeight: 700, background: 'rgba(37, 244, 238, 0.12)', padding: '2px 8px', borderRadius: '4px' }}>
            Live Inspector
          </span>
        </div>

        {/* Tab Switcher - Không bo góc, không spacing */}
        <div style={{ display: 'flex', gap: '0px', background: 'rgba(0, 0, 0, 0.35)', padding: '2px', borderRadius: '0px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
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
              background: editorTab === 'style' ? 'linear-gradient(135deg, rgba(37, 244, 238, 0.25), rgba(99, 102, 241, 0.35))' : 'transparent',
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
              background: editorTab === 'scene' ? 'linear-gradient(135deg, rgba(37, 244, 238, 0.25), rgba(99, 102, 241, 0.35))' : 'transparent',
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
              background: editorTab === 'all' ? 'linear-gradient(135deg, rgba(37, 244, 238, 0.25), rgba(99, 102, 241, 0.35))' : 'transparent',
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
          {/* Kiểu phụ đề */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
              Kiểu hiển thị phụ đề:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {CAPTION_STYLES.map((st) => {
                const isActive = renderCaptionStyle === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setRenderCaptionStyle && setRenderCaptionStyle(st.id)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      border: isActive ? '1.5px solid #25f4ee' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isActive ? 'rgba(37, 244, 238, 0.12)' : 'rgba(0, 0, 0, 0.3)',
                      color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.75)',
                      boxShadow: isActive ? '0 0 12px rgba(37, 244, 238, 0.2)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: isActive ? '#25f4ee' : '#fff' }}>
                      {st.label}
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                      {st.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font chữ & Cỡ chữ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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

          {/* Màu chữ & Màu nhấn Highlight */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
              Màu tô sáng từ nhấn mạnh (**từ khóa**):
            </span>
            <ColorPickerPopover
              color={renderHighlightColor}
              onChange={setRenderHighlightColor}
              label="Màu tô sáng từ nhấn mạnh"
            />
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
                      border: isActive ? '1px solid #25f4ee' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: isActive ? 'rgba(37, 244, 238, 0.18)' : 'rgba(0, 0, 0, 0.3)',
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
              background: renderChannelLogo ? 'rgba(37, 244, 238, 0.08)' : 'rgba(0,0,0,0.25)',
              borderRadius: '8px',
              border: renderChannelLogo ? '1px solid rgba(37, 244, 238, 0.35)' : '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img
                src="/images/watermark/the-mind-logo.png"
                alt=""
                style={{ width: '22px', height: '22px', objectFit: 'contain', mixBlendMode: 'screen', filter: 'brightness(1.15)' }}
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
              <span className="switch-slider" style={{ backgroundColor: renderChannelLogo ? '#25f4ee' : 'rgba(255,255,255,0.15)' }}></span>
            </label>
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
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                color: '#fff',
                boxShadow: '0 3px 12px rgba(16, 185, 129, 0.35)',
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
              style={{ background: 'none', border: 'none', color: activeSceneIndex === 0 ? 'rgba(255,255,255,0.2)' : '#25f4ee', cursor: activeSceneIndex === 0 ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '0.85rem' }}
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
              style={{ background: 'none', border: 'none', color: activeSceneIndex >= totalScenes - 1 ? 'rgba(255,255,255,0.2)' : '#25f4ee', cursor: activeSceneIndex >= totalScenes - 1 ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '0.85rem' }}
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
                  border: isCurrent ? '1.5px solid #25f4ee' : '1px solid rgba(255, 255, 255, 0.06)',
                  background: isCurrent ? 'rgba(37, 244, 238, 0.12)' : 'rgba(0, 0, 0, 0.25)',
                  boxShadow: isCurrent ? '0 0 12px rgba(37, 244, 238, 0.15)' : 'none',
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
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: isCurrent ? '#25f4ee' : '#fff' }}>
                      Cảnh {idx + 1}
                    </span>
                    {isCurrent && (
                      <span style={{ fontSize: '0.66rem', color: '#25f4ee', fontWeight: 700 }}>
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
