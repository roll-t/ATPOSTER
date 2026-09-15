'use client';

import React, { useState, useEffect, useRef } from 'react';
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

// ==========================================
// CAPCUT DESKTOP SUB-COMPONENTS (PRO NLE UI)
// ==========================================

const CAPCUT_CARD_STYLE = {
  background: '#202020',
  border: '1px solid #2e2e2e',
  borderRadius: '8px',
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  boxSizing: 'border-box'
};

function CapCutSectionHeader({
  title,
  isOpen = true,
  onToggle,
  onReset,
  hasReset = true,
  hasKeyframe = true,
  checked,
  onCheckChange
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '6px',
        borderBottom: '1px solid #2a2a2a',
        userSelect: 'none'
      }}
    >
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: onToggle ? 'pointer' : 'default',
          flex: 1
        }}
      >
        {checked !== undefined && (
          <input
            type="checkbox"
            checked={Boolean(checked)}
            onChange={(e) => onCheckChange && onCheckChange(e.target.checked)}
            style={{
              accentColor: '#00e5ff',
              cursor: 'pointer',
              margin: 0,
              width: '13px',
              height: '13px'
            }}
          />
        )}
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {title}
          {onToggle && <span style={{ fontSize: '0.65rem', color: '#888' }}>{isOpen ? '▾' : '▸'}</span>}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {hasReset && onReset && (
          <button
            type="button"
            onClick={onReset}
            title="Đặt lại thông số mặc định"
            className="capcut-reset-btn"
          >
            ⟲
          </button>
        )}
        {hasKeyframe && (
          <button
            type="button"
            title="Keyframe"
            className="capcut-keyframe-btn"
          >
            ◇
          </button>
        )}
      </div>
    </div>
  );
}

function CapCutStepperBox({
  value,
  onChange,
  unit = '',
  step = 1,
  min,
  max,
  precision = 0,
  style = {}
}) {
  const numVal = Number(value) || 0;

  const handleStep = (direction) => {
    let next = numVal + direction * step;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    if (precision > 0) {
      onChange(Number(next.toFixed(precision)));
    } else {
      onChange(Math.round(next));
    }
  };

  return (
    <div className="capcut-stepper-box" style={style}>
      <input
        type="text"
        className="capcut-stepper-input"
        value={`${precision > 0 ? numVal.toFixed(precision) : Math.round(numVal)}${unit}`}
        onChange={(e) => {
          const raw = e.target.value.replace(unit, '').trim();
          const parsed = parseFloat(raw);
          if (!isNaN(parsed)) {
            let clamped = parsed;
            if (min !== undefined) clamped = Math.max(min, clamped);
            if (max !== undefined) clamped = Math.min(max, clamped);
            onChange(clamped);
          }
        }}
      />
      <div className="capcut-stepper-arrows">
        <button
          type="button"
          tabIndex={-1}
          className="capcut-stepper-btn"
          onClick={() => handleStep(1)}
        >
          ▲
        </button>
        <button
          type="button"
          tabIndex={-1}
          className="capcut-stepper-btn"
          onClick={() => handleStep(-1)}
        >
          ▼
        </button>
      </div>
    </div>
  );
}

function CapCutSliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '%',
  precision = 0,
  onChange,
  hasKeyframe = true,
  presets = []
}) {
  const numVal = Number(value) || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div className="capcut-control-row">
        <span className="capcut-label">{label}</span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 4px' }}>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={numVal}
            onChange={(e) => onChange(Number(e.target.value))}
            className="capcut-slider"
          />
        </div>
        <CapCutStepperBox
          value={numVal}
          onChange={onChange}
          unit={unit}
          step={step}
          min={min}
          max={max}
          precision={precision}
        />
        {hasKeyframe && (
          <button type="button" className="capcut-keyframe-btn" title="Keyframe">
            ◇
          </button>
        )}
      </div>

      {presets && presets.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', paddingLeft: '78px' }}>
          {presets.map((p) => {
            const pVal = typeof p === 'object' ? p.value : p;
            const pLabel = typeof p === 'object' && p.label ? p.label : (pVal > 0 && unit === '%' && pVal < 100 ? `${pVal}%` : `${pVal}${unit}`);
            const isActive = numVal === pVal;
            return (
              <button
                key={pVal}
                type="button"
                className={`capcut-preset-chip ${isActive ? 'active' : ''}`}
                onClick={() => onChange(pVal)}
              >
                {pLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CapCutPositionRow({
  label = 'Position',
  x,
  y,
  onXChange,
  onYChange,
  minX = -300,
  maxX = 300,
  minY = -100,
  maxY = 100,
  unitX = 'px',
  unitY = '%',
  stepX = 5,
  stepY = 5,
  hasKeyframe = true
}) {
  return (
    <div className="capcut-control-row">
      <span className="capcut-label">{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
        {onXChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#777', fontWeight: 600 }}>X</span>
            <CapCutStepperBox
              value={x || 0}
              onChange={onXChange}
              unit={unitX}
              step={stepX}
              min={minX}
              max={maxX}
            />
          </div>
        )}
        {onYChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#777', fontWeight: 600 }}>Y</span>
            <CapCutStepperBox
              value={y || 0}
              onChange={onYChange}
              unit={unitY}
              step={stepY}
              min={minY}
              max={maxY}
            />
          </div>
        )}
        {hasKeyframe && (
          <button type="button" className="capcut-keyframe-btn" title="Keyframe">
            ◇
          </button>
        )}
      </div>
    </div>
  );
}

function CapCutSwitchRow({ label, checked, onChange }) {
  return (
    <div className="capcut-control-row">
      <span className="capcut-label">{label}</span>
      <label
        style={{
          position: 'relative',
          display: 'inline-block',
          width: '34px',
          height: '18px',
          cursor: 'pointer',
          margin: 0
        }}
      >
        <input
          type="checkbox"
          checked={Boolean(checked)}
          onChange={(e) => onChange && onChange(e.target.checked)}
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
        />
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: checked ? '#00e5ff' : '#333333',
            borderRadius: '18px',
            transition: 'background-color 0.2s ease'
          }}
        >
          <span
            style={{
              position: 'absolute',
              height: '12px',
              width: '12px',
              left: checked ? '19px' : '3px',
              bottom: '3px',
              backgroundColor: '#ffffff',
              borderRadius: '50%',
              transition: 'left 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
            }}
          />
        </span>
      </label>
    </div>
  );
}

function CapCutAlignToolbar({
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignMiddle,
  onAlignBottom,
  currentAlignH = 'center',
  currentAlignV = 'middle'
}) {
  return (
    <div className="capcut-align-toolbar">
      <button
        type="button"
        title="Căn lề trái"
        className={`capcut-align-btn ${currentAlignH === 'left' ? 'active' : ''}`}
        onClick={onAlignLeft}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="2" width="2" height="12" rx="0.5" />
          <rect x="5" y="4" width="9" height="2" rx="0.5" />
          <rect x="5" y="9" width="6" height="2" rx="0.5" />
        </svg>
      </button>

      <button
        type="button"
        title="Căn giữa ngang"
        className={`capcut-align-btn ${currentAlignH === 'center' ? 'active' : ''}`}
        onClick={onAlignCenter}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 1" />
          <rect x="2" y="4" width="12" height="2" rx="0.5" />
          <rect x="4" y="9" width="8" height="2" rx="0.5" />
        </svg>
      </button>

      <button
        type="button"
        title="Căn lề phải"
        className={`capcut-align-btn ${currentAlignH === 'right' ? 'active' : ''}`}
        onClick={onAlignRight}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <rect x="13" y="2" width="2" height="12" rx="0.5" />
          <rect x="2" y="4" width="9" height="2" rx="0.5" />
          <rect x="5" y="9" width="6" height="2" rx="0.5" />
        </svg>
      </button>

      <div style={{ width: '1px', height: '14px', background: '#333333', margin: '0 2px' }} />

      <button
        type="button"
        title="Căn trên"
        className={`capcut-align-btn ${currentAlignV === 'top' ? 'active' : ''}`}
        onClick={onAlignTop}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="1" width="12" height="2" rx="0.5" />
          <rect x="4" y="5" width="2" height="9" rx="0.5" />
          <rect x="9" y="5" width="2" height="6" rx="0.5" />
        </svg>
      </button>

      <button
        type="button"
        title="Căn giữa dọc"
        className={`capcut-align-btn ${currentAlignV === 'middle' ? 'active' : ''}`}
        onClick={onAlignMiddle}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 1" />
          <rect x="4" y="2" width="2" height="12" rx="0.5" />
          <rect x="9" y="4" width="2" height="8" rx="0.5" />
        </svg>
      </button>

      <button
        type="button"
        title="Căn dưới"
        className={`capcut-align-btn ${currentAlignV === 'bottom' ? 'active' : ''}`}
        onClick={onAlignBottom}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="13" width="12" height="2" rx="0.5" />
          <rect x="4" y="2" width="2" height="9" rx="0.5" />
          <rect x="9" y="5" width="2" height="6" rx="0.5" />
        </svg>
      </button>
    </div>
  );
}

function CapCutClipStepper({ activeIndex, total, onPrev, onNext }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#202020',
        padding: '6px 10px',
        borderRadius: '6px',
        border: '1px solid #2e2e2e',
        flexShrink: 0
      }}
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={activeIndex === 0}
        style={{
          background: 'none',
          border: 'none',
          color: activeIndex === 0 ? '#444' : '#00e5ff',
          cursor: activeIndex === 0 ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          fontSize: '0.74rem',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <span>◀</span> <span>Trước</span>
      </button>

      <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em' }}>
        Cảnh {activeIndex + 1} / {total}
      </span>

      <button
        type="button"
        onClick={onNext}
        disabled={activeIndex >= total - 1}
        style={{
          background: 'none',
          border: 'none',
          color: activeIndex >= total - 1 ? '#444' : '#00e5ff',
          cursor: activeIndex >= total - 1 ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          fontSize: '0.74rem',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <span>Tiếp</span> <span>▶</span>
      </button>
    </div>
  );
}

export default function VideoEditorPanel({
  result = {},
  activeSceneIndex = 0,
  onSceneIndexChange,
  selectedElement = 'none',
  onSelectedElementChange,
  onUpdateRenderConfig,
  renderImageScale = '100',
  setRenderImageScale,
  renderImageTranslateY = '0',
  setRenderImageTranslateY,
  renderLogoTranslateX = '0',
  setRenderLogoTranslateX,
  renderLogoTranslateY = '0',
  setRenderLogoTranslateY,
  renderLogoScale = '1',
  setRenderLogoScale,
  renderOpeningCommentTranslateY = '0',
  setRenderOpeningCommentTranslateY,
  renderOpeningCommentScale = '1',
  setRenderOpeningCommentScale,
  renderOpeningNewsBannerTranslateY = '0',
  setRenderOpeningNewsBannerTranslateY,
  renderOpeningNewsBannerScale = '1',
  setRenderOpeningNewsBannerScale,
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
  // Tab hiện tại theo phong cách CapCut Desktop: 'caption' | 'image' | 'logo' | 'opening' | 'scenes' | 'style'
  const [currentTab, setCurrentTab] = useState(() => {
    if (selectedElement === 'caption') return 'caption';
    if (selectedElement === 'image') return 'image';
    if (selectedElement === 'logo') return 'logo';
    if (selectedElement === 'comment' || selectedElement === 'news_banner') return 'opening';
    return 'caption';
  });

  // Tự động chuyển tab khi người dùng click vào thành phần trên video (CapCut Contextual Inspector)
  useEffect(() => {
    if (selectedElement === 'caption') {
      setCurrentTab('caption');
    } else if (selectedElement === 'image') {
      setCurrentTab('image');
    } else if (selectedElement === 'logo') {
      setCurrentTab('logo');
    } else if (selectedElement === 'comment' || selectedElement === 'news_banner') {
      setCurrentTab('opening');
    }
  }, [selectedElement]);

  const handleSelectTab = (tabId) => {
    setCurrentTab(tabId);
    if (tabId === 'caption') {
      onSelectedElementChange?.('caption');
    } else if (tabId === 'image') {
      onSelectedElementChange?.('image');
    } else if (tabId === 'logo') {
      onSelectedElementChange?.('logo');
    } else if (tabId === 'opening') {
      onSelectedElementChange?.('comment');
    } else {
      onSelectedElementChange?.('none');
    }
  };

  const segments = result?.segments || [];
  const totalScenes = segments.length;
  const currentSegment = segments[activeSceneIndex] || segments[0] || {};

  // Form chỉnh sửa cảnh hiện tại
  const [currentSubtitleDraft, setCurrentSubtitleDraft] = useState(currentSegment?.subtitle || '');
  const [currentNarrationDraft, setCurrentNarrationDraft] = useState(currentSegment?.dialogueOrNarration || '');
  const [currentVisualPromptDraft, setCurrentVisualPromptDraft] = useState(currentSegment?.visualDescription || '');
  const [isSavingScene, setIsSavingScene] = useState(false);
  const [sceneSaveMsg, setSceneSaveMsg] = useState('');
  const [isSavingVisualPrompt, setIsSavingVisualPrompt] = useState(false);
  const [visualPromptSaveMsg, setVisualPromptSaveMsg] = useState('');
  const [isPlayingSceneAudio, setIsPlayingSceneAudio] = useState(false);
  const [isResyncingVoice, setIsResyncingVoice] = useState(false);

  // Upload ảnh mới trực tiếp cho cảnh
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadMsg, setImageUploadMsg] = useState('');
  const [imageVersion, setImageVersion] = useState(0);
  const fileInputRef = useRef(null);

  // Đồng bộ form khi đổi cảnh
  useEffect(() => {
    setCurrentSubtitleDraft(currentSegment?.subtitle || '');
    setCurrentNarrationDraft(currentSegment?.dialogueOrNarration || '');
    setCurrentVisualPromptDraft(currentSegment?.visualDescription || '');
    setSceneSaveMsg('');
    setVisualPromptSaveMsg('');
    setImageUploadMsg('');
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
    ? `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=images/scene-${currentPaddedNum}.jpg&category=${encodeURIComponent(category)}&v=${activeSceneIndex}-${imageVersion}`
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

  const handleSaveVisualPrompt = async () => {
    if (!result?.id) return;
    setIsSavingVisualPrompt(true);
    setVisualPromptSaveMsg('');
    const segNum = currentSegment.segmentNumber || activeSceneIndex + 1;

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
              visualDescription: currentVisualPromptDraft.trim()
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
        setVisualPromptSaveMsg('✓ Đã lưu mô tả ảnh!');
      } else {
        setVisualPromptSaveMsg(`Lỗi: ${data.error || 'Không thể lưu'}`);
      }
    } catch {
      setVisualPromptSaveMsg('Lỗi kết nối máy chủ');
    } finally {
      setIsSavingVisualPrompt(false);
    }
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    setImageUploadMsg('⏳ Đang lưu ảnh...');
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result;
          const targetFilename = `images/scene-${currentPaddedNum}.jpg`;
          const res = await fetch('/api/prompts/save-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              folderPath,
              filename: targetFilename,
              dataUrl,
              category
            })
          });
          const json = await res.json();
          if (res.ok && json.success) {
            setImageUploadMsg(`✓ Đã thay ảnh Cảnh ${activeSceneIndex + 1} thành công!`);
            setImageVersion(Date.now());
            if (checkAssets) checkAssets();
            onHistoryRefresh?.();
          } else {
            setImageUploadMsg(`Lỗi: ${json.error || 'Không thể lưu ảnh'}`);
          }
        } catch {
          setImageUploadMsg('Lỗi khi tải ảnh lên server');
        } finally {
          setIsUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setImageUploadMsg('Lỗi đọc file từ máy tính');
      setIsUploadingImage(false);
    }
  };

  return (
    <div
      data-video-editor-panel="true"
      className="video-editor-panel capcut-panel"
      style={{
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        height: '100%',
        maxHeight: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: '#181818',
        borderLeft: '1px solid #282828',
        color: '#e0e0e0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* THANH TAB TRÊN CÙNG: CHUẨN CAPCUT DESKTOP */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          borderBottom: '1px solid #282828',
          paddingBottom: '2px',
          flexShrink: 0,
          overflowX: 'auto',
          scrollbarWidth: 'none'
        }}
      >
        {[
          { id: 'caption', label: 'Văn bản' },
          { id: 'image', label: 'Hình ảnh' },
          { id: 'logo', label: 'Logo' },
          { id: 'opening', label: 'Mở đầu' },
          { id: 'scenes', label: `Cảnh (${totalScenes})` },
          { id: 'style', label: 'Cài đặt' }
        ].map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #00e5ff' : '2px solid transparent',
                padding: '6px 10px 8px 10px',
                fontSize: '0.8rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#00e5ff' : '#888888',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s ease, border-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = '#888888';
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================
          1. TAB VĂN BẢN (TYPOGRAPHY & SUBTITLE STYLES)
          ======================================================== */}
      {currentTab === 'caption' && (
        <div className="scrollable-col" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px', paddingBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Section: Định dạng chữ & Typography */}
          <div className="capcut-card" style={CAPCUT_CARD_STYLE}>
            <CapCutSectionHeader
              title="Định dạng chữ (Typography)"
              checked={renderCaptionEnabled}
              onCheckChange={(v) => setRenderCaptionEnabled && setRenderCaptionEnabled(v)}
              onReset={() => {
                setRenderCaptionFontSize && setRenderCaptionFontSize('50');
                setRenderCaptionTextAlign && setRenderCaptionTextAlign('center');
                onUpdateRenderConfig?.({ captionFontSize: 50, captionTextAlign: 'center' });
              }}
            />

            {/* Mẫu kiểu chữ (CapCut Presets) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', opacity: renderCaptionEnabled ? 1 : 0.4, pointerEvents: renderCaptionEnabled ? 'auto' : 'none' }}>
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
                      } else if (st.id === 'minimal' && setRenderCaptionBgTransparent) {
                        setRenderCaptionBgTransparent(true);
                      }
                    }}
                    style={{
                      position: 'relative',
                      padding: '5px 3px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: isActive ? '1.5px solid #00e5ff' : '1px solid #303030',
                      background: isActive ? '#282828' : '#1c1c1c',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      height: '60px',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none', pointerEvents: 'none' }}>
                      {renderStyleVisualPreview(st.id, renderHighlightColor, renderCaptionTextColor)}
                    </div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 600, color: isActive ? '#00e5ff' : '#9a9a9a', textAlign: 'center', width: '100%', lineHeight: 1.1 }}>
                      {st.shortLabel || st.label}
                    </div>
                    {isActive && (
                      <div style={{ position: 'absolute', top: '3px', right: '3px', width: '11px', height: '11px', borderRadius: '50%', background: '#00e5ff', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', fontWeight: 900 }}>
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Căn lề chữ (Alignment toolbar chuẩn CapCut Image 2) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '28px', opacity: renderCaptionEnabled ? 1 : 0.4, pointerEvents: renderCaptionEnabled ? 'auto' : 'none' }}>
              <span className="capcut-label">Căn lề:</span>
              <CapCutAlignToolbar
                currentAlignH={renderCaptionTextAlign}
                onAlignLeft={() => setRenderCaptionTextAlign && setRenderCaptionTextAlign('left')}
                onAlignCenter={() => setRenderCaptionTextAlign && setRenderCaptionTextAlign('center')}
                onAlignRight={() => setRenderCaptionTextAlign && setRenderCaptionTextAlign('right')}
                onAlignTop={() => {}}
                onAlignMiddle={() => {}}
                onAlignBottom={() => {}}
              />
            </div>

            {/* Font chữ */}
            <div className="capcut-control-row" style={{ minHeight: '28px', opacity: renderCaptionEnabled ? 1 : 0.4, pointerEvents: renderCaptionEnabled ? 'auto' : 'none' }}>
              <span className="capcut-label">Font chữ</span>
              <select
                value={renderCaptionFont}
                onChange={(e) => setRenderCaptionFont && setRenderCaptionFont(e.target.value)}
                className="capcut-input"
                style={{ flex: 1, padding: '5px 8px', fontSize: '0.74rem', cursor: 'pointer' }}
              >
                {FONTS.map((f) => (
                  <option key={f.id} value={f.id} style={{ background: '#222', color: '#fff' }}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Cỡ chữ với CapCut Slider Row */}
            <div style={{ opacity: renderCaptionEnabled ? 1 : 0.4, pointerEvents: renderCaptionEnabled ? 'auto' : 'none' }}>
              <CapCutSliderRow
                label="Cỡ chữ"
                value={Number(renderCaptionFontSize) || 50}
                min={24}
                max={72}
                unit="px"
                onChange={(val) => {
                  setRenderCaptionFontSize && setRenderCaptionFontSize(String(val));
                  onUpdateRenderConfig?.({ captionFontSize: val });
                }}
              />
            </div>

            {/* Màu sắc */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', minHeight: '28px', opacity: renderCaptionEnabled ? 1 : 0.4, pointerEvents: renderCaptionEnabled ? 'auto' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="capcut-label">Highlight:</span>
                <ColorPickerPopover color={renderHighlightColor} onChange={setRenderHighlightColor} label="Highlight" align="left" />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="capcut-label">Màu chữ:</span>
                <ColorPickerPopover color={renderCaptionTextColor || '#ffffff'} onChange={setRenderCaptionTextColor} label="Màu chữ" align="right" />
              </div>
            </div>

            {/* Animation tiêu đề */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '28px', opacity: renderCaptionEnabled ? 1 : 0.4, pointerEvents: renderCaptionEnabled ? 'auto' : 'none' }}>
              <span className="capcut-label">Hoạt ảnh:</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {CAPTION_ANIMATIONS.map((anim) => {
                  const currentAnim = renderCaptionAnimation || (renderCaptionStyle === 'news' ? 'none' : 'zoom');
                  const isActive = currentAnim === anim.id;
                  return (
                    <button
                      key={anim.id}
                      type="button"
                      title={anim.desc}
                      onClick={() => setRenderCaptionAnimation && setRenderCaptionAnimation(anim.id)}
                      className={`capcut-preset-chip ${isActive ? 'active' : ''}`}
                    >
                      {anim.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nút lưu style */}
            <button
              type="button"
              onClick={handleSaveAndApply}
              disabled={isSavingStyle}
              className="capcut-btn-secondary"
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.74rem', marginTop: '4px' }}
            >
              {isSavingStyle ? '⏳ Đang lưu...' : '💾 Lưu Style Tiêu Đề'}
            </button>
            {saveStyleMsg && (
              <span style={{ fontSize: '0.7rem', color: '#00e5ff', textAlign: 'center', fontWeight: 600 }}>
                {saveStyleMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          2. TAB HÌNH ẢNH (MEDIA & TRANSFORM - CHUẨN CAPCUT DESKTOP)
          ======================================================== */}
      {currentTab === 'image' && (
        <div className="scrollable-col" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px', paddingBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Section: Transform (Chuẩn CapCut Image 2) */}
          <div className="capcut-card" style={CAPCUT_CARD_STYLE}>
            <CapCutSectionHeader
              title="Transform"
              onReset={() => {
                setRenderImageScale && setRenderImageScale('100');
                setRenderImageTranslateY && setRenderImageTranslateY('0');
                onUpdateRenderConfig?.({ imageScale: 1, imageTranslateY: 0 });
              }}
            />

            {/* Scale */}
            <CapCutSliderRow
              label="Scale"
              value={Number(renderImageScale) || 100}
              min={50}
              max={250}
              unit="%"
              presets={[
                { value: 75, label: '75%' },
                { value: 100, label: '100%' },
                { value: 125, label: '125%' },
                { value: 150, label: '150%' }
              ]}
              onChange={(val) => {
                setRenderImageScale && setRenderImageScale(String(val));
                onUpdateRenderConfig?.({ imageScale: val / 100 });
              }}
            />

            {/* Uniform scale toggle */}
            <CapCutSwitchRow
              label="Uniform scale"
              checked={true}
              onChange={() => {}}
            />

            {/* Position Y */}
            <CapCutSliderRow
              label="Position Y"
              value={Number(renderImageTranslateY) || 0}
              min={-100}
              max={100}
              unit="%"
              presets={[
                { value: -20, label: '-20%' },
                { value: 0, label: '0%' },
                { value: 20, label: '+20%' }
              ]}
              onChange={(val) => {
                setRenderImageTranslateY && setRenderImageTranslateY(String(val));
                onUpdateRenderConfig?.({ imageTranslateY: val });
              }}
            />

            {/* Rotate row */}
            <div className="capcut-control-row" style={{ minHeight: '28px' }}>
              <span className="capcut-label">Rotate</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                <CapCutStepperBox
                  value={0}
                  onChange={() => {}}
                  unit="°"
                  precision={2}
                />
                <button
                  type="button"
                  className="capcut-align-btn"
                  title="Rotation Dial"
                  style={{ width: '22px', height: '22px' }}
                >
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1px solid #777', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '4px', height: '1px', background: '#fff' }} />
                  </div>
                </button>
                <button type="button" className="capcut-keyframe-btn" title="Keyframe">
                  ◇
                </button>
              </div>
            </div>

            {/* Alignment Toolbar chuẩn CapCut Desktop */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '28px' }}>
              <span className="capcut-label">Align</span>
              <CapCutAlignToolbar
                onAlignLeft={() => {}}
                onAlignCenter={() => {
                  setRenderImageTranslateY && setRenderImageTranslateY('0');
                  onUpdateRenderConfig?.({ imageTranslateY: 0 });
                }}
                onAlignRight={() => {}}
                onAlignTop={() => {
                  setRenderImageTranslateY && setRenderImageTranslateY('-25');
                  onUpdateRenderConfig?.({ imageTranslateY: -25 });
                }}
                onAlignMiddle={() => {
                  setRenderImageTranslateY && setRenderImageTranslateY('0');
                  onUpdateRenderConfig?.({ imageTranslateY: 0 });
                }}
                onAlignBottom={() => {
                  setRenderImageTranslateY && setRenderImageTranslateY('25');
                  onUpdateRenderConfig?.({ imageTranslateY: 25 });
                }}
              />
            </div>
          </div>

          {/* Section: Màu nền & Chuyển cảnh */}
          <div className="capcut-card" style={CAPCUT_CARD_STYLE}>
            <CapCutSectionHeader
              title="Cài đặt khung hình &amp; Chuyển cảnh"
              hasReset={false}
              hasKeyframe={false}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '28px' }}>
              <span className="capcut-label">Màu nền video:</span>
              <ColorPickerPopover
                color={renderVideoBgColor || '#000000'}
                onChange={(val) => {
                  setRenderVideoBgColor && setRenderVideoBgColor(val);
                  if (result) {
                    if (!result.remotionConfig) result.remotionConfig = {};
                    result.remotionConfig.videoBgColor = val;
                  }
                }}
                label="Màu nền"
                align="right"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="capcut-label">Hiệu ứng chuyển cảnh:</span>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {TRANSITION_STYLES.map((t) => {
                  const isActive = renderTransitionStyle === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setRenderTransitionStyle && setRenderTransitionStyle(t.id)}
                      className={`capcut-preset-chip ${isActive ? 'active' : ''}`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveAndApply}
              disabled={isSavingStyle}
              className="capcut-btn-primary"
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.76rem', marginTop: '4px' }}
            >
              {isSavingStyle ? '⏳ Đang lưu...' : '💾 Lưu Cài Đặt Media'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          3. TAB LOGO (BRAND LOGO)
          ======================================================== */}
      {currentTab === 'logo' && (
        <div className="scrollable-col" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px', paddingBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="capcut-card" style={CAPCUT_CARD_STYLE}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img
                  src="/icons/logo-mark.png"
                  alt=""
                  style={{ width: '24px', height: '16px', objectFit: 'contain' }}
                />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ffffff' }}>
                  Logo thương hiệu
                </span>
              </div>
              <CapCutSwitchRow
                label=""
                checked={renderChannelLogo}
                onChange={setRenderChannelLogo}
              />
            </div>
            <p style={{ margin: 0, fontSize: '0.68rem', color: '#888', lineHeight: 1.4 }}>
              Kéo di chuyển hoặc thu phóng trực tiếp Logo trên khung video, hoặc tinh chỉnh bằng thanh trượt bên dưới.
            </p>
          </div>

          <div className="capcut-card" style={{ ...CAPCUT_CARD_STYLE, opacity: renderChannelLogo ? 1 : 0.4, pointerEvents: renderChannelLogo ? 'auto' : 'none' }}>
            <CapCutSectionHeader
              title="Transform"
              onReset={() => {
                setRenderLogoScale && setRenderLogoScale('1');
                setRenderLogoTranslateX && setRenderLogoTranslateX('0');
                setRenderLogoTranslateY && setRenderLogoTranslateY('0');
                onUpdateRenderConfig?.({ logoScale: 1, logoTranslateX: 0, logoTranslateY: 0 });
              }}
            />

            {/* Scale */}
            <CapCutSliderRow
              label="Scale"
              value={Number(renderLogoScale) || 1}
              min={0.4}
              max={2.5}
              step={0.05}
              precision={2}
              unit="x"
              onChange={(val) => {
                setRenderLogoScale && setRenderLogoScale(String(val));
                onUpdateRenderConfig?.({ logoScale: val });
              }}
            />

            {/* Position X & Y */}
            <CapCutPositionRow
              label="Position"
              x={Number(renderLogoTranslateX) || 0}
              y={Number(renderLogoTranslateY) || 0}
              onXChange={(val) => {
                setRenderLogoTranslateX && setRenderLogoTranslateX(String(val));
                onUpdateRenderConfig?.({ logoTranslateX: val });
              }}
              onYChange={(val) => {
                setRenderLogoTranslateY && setRenderLogoTranslateY(String(val));
                onUpdateRenderConfig?.({ logoTranslateY: val });
              }}
              minX={-300}
              maxX={300}
              minY={-600}
              maxY={600}
              unitX="px"
              unitY="px"
              stepX={5}
              stepY={10}
            />

            <button
              type="button"
              onClick={handleSaveAndApply}
              disabled={isSavingStyle}
              className="capcut-btn-primary"
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.76rem', marginTop: '4px' }}
            >
              {isSavingStyle ? '⏳ Đang lưu...' : '💾 Lưu Cài Đặt Logo'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          4. TAB MỞ ĐẦU (INTRO CẢNH 1)
          ======================================================== */}
      {currentTab === 'opening' && (
        <div className="scrollable-col" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px', paddingBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="capcut-card" style={CAPCUT_CARD_STYLE}>
            <CapCutSectionHeader
              title="Mở đầu video (Cảnh 1)"
              hasReset={false}
              hasKeyframe={false}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {[
                { id: 'none', label: 'Bình thường', desc: 'Không sticker/banner', active: !renderShowOpeningComment && !renderShowOpeningNewsBanner },
                { id: 'comment', label: 'Hộp bình luận', desc: 'Sticker hỏi ở trên', active: renderShowOpeningComment && !renderShowOpeningNewsBanner },
                { id: 'news', label: 'Banner tin tức', desc: 'Nửa màn hình dưới đỏ', active: !renderShowOpeningComment && renderShowOpeningNewsBanner },
                { id: 'both', label: 'Cả hai', desc: 'Bình luận + Banner', active: renderShowOpeningComment && renderShowOpeningNewsBanner }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (m.id === 'none') {
                      setRenderShowOpeningComment && setRenderShowOpeningComment(false);
                      setRenderShowOpeningNewsBanner && setRenderShowOpeningNewsBanner(false);
                    } else if (m.id === 'comment') {
                      setRenderShowOpeningComment && setRenderShowOpeningComment(true);
                      setRenderShowOpeningNewsBanner && setRenderShowOpeningNewsBanner(false);
                    } else if (m.id === 'news') {
                      setRenderShowOpeningComment && setRenderShowOpeningComment(false);
                      setRenderShowOpeningNewsBanner && setRenderShowOpeningNewsBanner(true);
                    } else if (m.id === 'both') {
                      setRenderShowOpeningComment && setRenderShowOpeningComment(true);
                      setRenderShowOpeningNewsBanner && setRenderShowOpeningNewsBanner(true);
                    }
                  }}
                  style={{
                    padding: '8px 6px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: m.active ? '1.5px solid #00e5ff' : '1px solid #303030',
                    background: m.active ? '#282828' : '#1c1c1c',
                    color: m.active ? '#00e5ff' : '#888',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <span>{m.label}</span>
                  <span style={{ fontSize: '0.62rem', color: '#666', fontWeight: 400 }}>{m.desc}</span>
                </button>
              ))}
            </div>

            {renderShowOpeningComment && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '10px', borderTop: '1px solid #2a2a2a' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#00e5ff' }}>Cài đặt Hộp bình luận:</span>
                <input
                  type="text"
                  value={renderOpeningCommentAuthor || ''}
                  placeholder="Người hỏi (VD: Trả lời bình luận)"
                  onChange={(e) => setRenderOpeningCommentAuthor && setRenderOpeningCommentAuthor(e.target.value)}
                  className="capcut-input"
                  style={{ width: '100%', padding: '6px 8px', boxSizing: 'border-box' }}
                />
                <textarea
                  rows={2}
                  value={renderOpeningCommentText || ''}
                  placeholder="Nội dung câu hỏi..."
                  onChange={(e) => setRenderOpeningCommentText && setRenderOpeningCommentText(e.target.value)}
                  className="capcut-input"
                  style={{ width: '100%', padding: '6px 8px', resize: 'none', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {renderShowOpeningNewsBanner && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '10px', borderTop: '1px solid #2a2a2a' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#00e5ff' }}>Cài đặt Banner tin tức:</span>
                <textarea
                  rows={2}
                  value={renderOpeningNewsHeadline || ''}
                  placeholder="TIÊU ĐỀ NỔI BẬT..."
                  onChange={(e) => setRenderOpeningNewsHeadline && setRenderOpeningNewsHeadline(e.target.value)}
                  className="capcut-input"
                  style={{ width: '100%', padding: '6px 8px', color: '#FACC15', fontWeight: 700, resize: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    value={renderOpeningNewsBrand || ''}
                    placeholder="TIN TỨC"
                    onChange={(e) => setRenderOpeningNewsBrand && setRenderOpeningNewsBrand(e.target.value)}
                    className="capcut-input"
                    style={{ width: '100%', padding: '6px 8px', boxSizing: 'border-box' }}
                  />
                  <input
                    type="text"
                    value={renderOpeningNewsLikes || ''}
                    placeholder="27.1K"
                    onChange={(e) => setRenderOpeningNewsLikes && setRenderOpeningNewsLikes(e.target.value)}
                    className="capcut-input"
                    style={{ width: '100%', padding: '6px 8px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveAndApply}
              disabled={isSavingStyle}
              className="capcut-btn-primary"
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.76rem', marginTop: '4px' }}
            >
              {isSavingStyle ? '⏳ Đang lưu...' : '💾 Lưu Cài Đặt Mở Đầu'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          5. TAB CẢNH (SCENES SPLIT VIEW)
          ======================================================== */}
      {currentTab === 'scenes' && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}>
          {/* PHẦN TRÊN: CẢNH ĐANG ACTIVE HIỆN TẠI (Ôm sát nội dung) */}
          <div
            style={{
              flex: '0 0 auto',
              height: 'auto',
              maxHeight: '55%',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              background: '#202020',
              border: '1px solid #2e2e2e',
              borderRadius: '8px',
              padding: '12px 14px',
              boxSizing: 'border-box'
            }}
          >
            {/* Header cảnh đang active: Thumbnail + Stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#191919', padding: '6px 8px', borderRadius: '4px', border: '1px solid #2c2c2c' }}>
              {currentImgSrc ? (
                <img
                  src={currentImgSrc}
                  alt=""
                  style={{ width: '38px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #333', flexShrink: 0 }}
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              ) : (
                <div style={{ width: '38px', height: '50px', borderRadius: '4px', background: '#252525', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0, color: '#666' }}>🎬</div>
              )}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
                    Cảnh {activeSceneIndex + 1} / {totalScenes}
                  </span>
                  <span style={{ fontSize: '0.62rem', background: 'rgba(0, 229, 255, 0.15)', color: '#00e5ff', padding: '1px 6px', borderRadius: '3px', fontWeight: 600 }}>
                    Đang chọn
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => onSceneIndexChange && onSceneIndexChange(Math.max(0, activeSceneIndex - 1))}
                    disabled={activeSceneIndex === 0}
                    className="capcut-btn-secondary"
                    style={{ flex: 1, padding: '4px 6px', fontSize: '0.7rem' }}
                  >
                    ◀ Trước
                  </button>
                  <button
                    type="button"
                    onClick={() => onSceneIndexChange && onSceneIndexChange(Math.min(totalScenes - 1, activeSceneIndex + 1))}
                    disabled={activeSceneIndex >= totalScenes - 1}
                    className="capcut-btn-secondary"
                    style={{ flex: 1, padding: '4px 6px', fontSize: '0.7rem' }}
                  >
                    Tiếp ▶
                  </button>
                </div>
              </div>
            </div>

            {/* Phụ đề trên video */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '0.72rem', color: '#9a9a9a', fontWeight: 600 }}>
                Phụ đề hiển thị:
              </span>
              <textarea
                rows={2}
                value={currentSubtitleDraft}
                onChange={(e) => setCurrentSubtitleDraft(e.target.value)}
                className="capcut-input"
                style={{ width: '100%', padding: '6px 8px', lineHeight: 1.4, resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            {/* Lời kể lồng tiếng */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '0.72rem', color: '#9a9a9a', fontWeight: 600 }}>
                Lời kể / Thuyết minh:
              </span>
              <textarea
                rows={2}
                value={currentNarrationDraft}
                onChange={(e) => setCurrentNarrationDraft(e.target.value)}
                className="capcut-input"
                style={{ width: '100%', padding: '6px 8px', lineHeight: 1.4, resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            {/* Nghe thử & Nút lưu */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handlePlaySceneAudio}
                className="capcut-btn-secondary"
                style={{ flex: 1, padding: '7px 10px', fontSize: '0.72rem' }}
              >
                {isPlayingSceneAudio ? '🔊 Đang phát...' : '▶ Nghe thử voice'}
              </button>

              <button
                type="button"
                onClick={handleSaveCurrentScene}
                disabled={isSavingScene || isResyncingVoice}
                className="capcut-btn-primary"
                style={{ flex: 1.3, padding: '7px 12px', fontSize: '0.74rem' }}
              >
                {isSavingScene ? '⏳ Đang lưu...' : isResyncingVoice ? '🎙️ Tạo voice...' : '💾 Lưu Cảnh Này'}
              </button>
            </div>
            {sceneSaveMsg && (
              <span style={{ fontSize: '0.71rem', color: '#00e5ff', textAlign: 'center', fontWeight: 600 }}>
                {sceneSaveMsg}
              </span>
            )}
          </div>

          {/* PHẦN DƯỚI: DANH SÁCH TOÀN BỘ CÁC CẢNH */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: '#202020',
              border: '1px solid #2e2e2e',
              borderRadius: '8px',
              padding: '10px 12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 6px 4px', borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#ffffff' }}>
                Danh sách cảnh ({totalScenes})
              </span>
              <span style={{ fontSize: '0.65rem', color: '#888' }}>
                Nhấn để chọn
              </span>
            </div>

            <div className="scrollable-col" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', paddingRight: '2px' }}>
              {segments.map((seg, idx) => {
                const isCurrent = idx === activeSceneIndex;
                const padNum = String(seg.segmentNumber || idx + 1).padStart(2, '0');
                const segNum = Number(seg.segmentNumber || idx + 1);
                const hasThumb = hasSceneImage(segNum);
                const thumb = hasThumb
                  ? `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=images/scene-${padNum}.jpg&category=${encodeURIComponent(category)}&v=${idx}-${imageVersion}`
                  : null;
                const sub = (seg.subtitle || seg.dialogueOrNarration || '').split('\n')[0];

                return (
                  <div
                    key={idx}
                    onClick={() => onSceneIndexChange && onSceneIndexChange(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      border: isCurrent ? '1.5px solid #00e5ff' : '1px solid #2a2a2a',
                      background: isCurrent ? '#282828' : '#191919',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        style={{ width: '36px', height: '48px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0, border: '1px solid #333' }}
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      <div style={{ width: '36px', height: '48px', borderRadius: '4px', border: '1px solid #333', background: '#252525', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: '#666', flexShrink: 0 }}>🎬</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: isCurrent ? '#00e5ff' : '#ffffff' }}>
                          Cảnh {idx + 1}
                        </span>
                        {isCurrent && (
                          <span style={{ fontSize: '0.62rem', color: '#00e5ff', fontWeight: 600 }}>
                            Đang chọn
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: isCurrent ? '#ffffff' : '#888888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sub || 'Chưa có nội dung'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          6. TAB CÀI ĐẶT (STYLE / SETTINGS)
          ======================================================== */}
      {currentTab === 'style' && (
        <div className="scrollable-col" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px', paddingBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="capcut-card" style={CAPCUT_CARD_STYLE}>
            <CapCutSectionHeader
              title="Cài đặt video &amp; Hiệu ứng chung"
              hasReset={false}
              hasKeyframe={false}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', minHeight: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="capcut-label">Màu Primary:</span>
                <ColorPickerPopover color={renderHighlightColor} onChange={setRenderHighlightColor} label="Primary" align="left" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="capcut-label">Màu nền video:</span>
                <ColorPickerPopover color={renderVideoBgColor || '#000000'} onChange={setRenderVideoBgColor} label="Nền video" align="right" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="capcut-label">Chuyển cảnh giữa các slide:</span>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {TRANSITION_STYLES.map((t) => {
                  const isActive = renderTransitionStyle === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setRenderTransitionStyle && setRenderTransitionStyle(t.id)}
                      className={`capcut-preset-chip ${isActive ? 'active' : ''}`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveAndApply}
              disabled={isSavingStyle}
              className="capcut-btn-primary"
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.76rem', marginTop: '4px' }}
            >
              {isSavingStyle ? '⏳ Đang lưu...' : '💾 Lưu Cài Đặt Video'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
