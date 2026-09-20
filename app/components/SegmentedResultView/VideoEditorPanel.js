'use client';

import React, { useState, useEffect, useRef } from 'react';
import ColorPickerPopover from './ColorPickerPopover';
import PexelsMediaPickerModal from './PexelsMediaPickerModal';
import sceneStyles from './VideoEditorSceneList.module.css';
import { showToast } from '../Toast.js';

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
  { id: 'crossfade', label: 'Hòa tan', desc: 'Mờ dần chuyển tiếp cảnh' },
  { id: 'slide-left', label: 'Trượt trái', desc: 'Trượt từ phải sang trái' },
  { id: 'slide-right', label: 'Trượt phải', desc: 'Trượt từ trái sang phải' },
  { id: 'slide-up', label: 'Trượt lên', desc: 'Đẩy cảnh mới từ dưới lên' },
  { id: 'zoom', label: 'Phóng to', desc: 'Phóng to cảnh tiếp theo' }
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

function renderAnimationVisualPreview(animId, isActive) {
  const color = isActive ? '#00e5ff' : '#8c8c8c';
  switch (animId) {
    case 'none':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="8.5" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case 'zoom':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      );
    case 'fade':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="8.5" strokeDasharray="3 2" />
          <circle cx="12" cy="12" r="3.5" fill={color} />
        </svg>
      );
    case 'slide-up':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="6 11 12 5 18 11" />
          <line x1="6" y1="20" x2="18" y2="20" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
      );
    default:
      return null;
  }
}

function renderTransitionVisualPreview(transitionId, isActive) {
  const color = isActive ? '#00e5ff' : '#8c8c8c';
  switch (transitionId) {
    case 'crossfade':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="11" height="11" rx="2" strokeOpacity="0.45" />
          <rect x="10" y="10" width="11" height="11" rx="2" stroke={color} fill={isActive ? 'rgba(0, 229, 255, 0.18)' : 'none'} />
        </svg>
      );
    case 'slide-left':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="12 19 5 12 12 5" />
          <line x1="19" y1="12" x2="5" y2="12" />
          <line x1="19" y1="5" x2="19" y2="19" strokeWidth="1.5" strokeDasharray="2 2" strokeOpacity="0.6" />
        </svg>
      );
    case 'slide-right':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="12 5 19 12 12 19" />
          <line x1="5" y1="12" x2="19" y2="12" />
          <line x1="5" y1="5" x2="5" y2="19" strokeWidth="1.5" strokeDasharray="2 2" strokeOpacity="0.6" />
        </svg>
      );
    case 'slide-up':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="5 12 12 5 19 12" />
          <line x1="12" y1="19" x2="12" y2="5" />
          <line x1="5" y1="19" x2="19" y2="19" strokeWidth="1.5" strokeDasharray="2 2" strokeOpacity="0.6" />
        </svg>
      );
    case 'zoom':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
          <rect x="8" y="8" width="8" height="8" rx="1.5" strokeWidth="1.2" strokeDasharray="2 1.5" strokeOpacity="0.7" />
        </svg>
      );
    default:
      return null;
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
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
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
  renderBilingual = false,
  setRenderBilingual,
  renderTransitionStyle = 'crossfade',
  setRenderTransitionStyle,
  renderVideoBgColor = '#000000',
  setRenderVideoBgColor,
  renderChannelLogo = true,
  setRenderChannelLogo,
  logoVersion = 1,
  setLogoVersion,
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
  renderOpeningNewsTitleColor = '#FFE24A',
  setRenderOpeningNewsTitleColor,
  renderOpeningNewsTitleSize = 0,
  setRenderOpeningNewsTitleSize,
  renderOpeningNewsHeadlineWidth = 82,
  setRenderOpeningNewsHeadlineWidth,
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
    if (selectedElement === 'comment' || selectedElement === 'news_banner' || selectedElement === 'news_headline' || selectedElement === 'news_tag') return 'opening';
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
    } else if (selectedElement === 'comment' || selectedElement === 'news_banner' || selectedElement === 'news_headline' || selectedElement === 'news_tag') {
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
      if (renderShowOpeningNewsBanner) {
        onSelectedElementChange?.('news_headline');
      } else if (renderShowOpeningComment) {
        onSelectedElementChange?.('comment');
      } else {
        onSelectedElementChange?.('none');
      }
    } else {
      onSelectedElementChange?.('none');
    }
  };

  const segments = result?.segments || [];
  const totalScenes = segments.length;
  const currentSegment = segments[activeSceneIndex] || segments[0] || {};

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadLogoMsg, setUploadLogoMsg] = useState('');

  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    setUploadLogoMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/prompts/upload-logo', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const newVer = data.version || Date.now();
        setLogoVersion && setLogoVersion(newVer);
        setUploadLogoMsg('✓ Đã cập nhật ảnh Logo thương hiệu mới!');
        showToast.success('✓ Đã cập nhật ảnh Logo mới!');
        setTimeout(() => setUploadLogoMsg(''), 4000);
      } else {
        setUploadLogoMsg('Lỗi: ' + (data.error || 'Không thể tải ảnh lên.'));
        showToast.error(data.error || 'Lỗi tải ảnh logo.');
      }
    } catch (err) {
      setUploadLogoMsg('Lỗi kết nối khi tải ảnh logo.');
      showToast.error('Lỗi kết nối khi tải ảnh logo.');
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleRestoreDefaultLogo = async () => {
    if (!confirm('Bạn có chắc muốn khôi phục Logo thương hiệu về ảnh mặc định ban đầu?')) return;

    setIsUploadingLogo(true);
    setUploadLogoMsg('');

    try {
      const res = await fetch('/api/prompts/upload-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const newVer = data.version || Date.now();
        setLogoVersion && setLogoVersion(newVer);
        setUploadLogoMsg('✓ Đã khôi phục Logo mặc định!');
        showToast.success('✓ Đã khôi phục Logo mặc định!');
        setTimeout(() => setUploadLogoMsg(''), 4000);
      } else {
        setUploadLogoMsg('Lỗi: ' + (data.error || 'Không thể khôi phục logo.'));
        showToast.error(data.error || 'Lỗi khôi phục logo.');
      }
    } catch (err) {
      setUploadLogoMsg('Lỗi kết nối khi khôi phục logo.');
      showToast.error('Lỗi kết nối khi khôi phục logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const getSceneDefaultPrompt = (seg) => {
    return seg?.visualDescription || seg?.textPrompt || seg?.prompt || seg?.imagePrompt || seg?.dialogueOrNarration || seg?.subtitle || '';
  };

  // Form chỉnh sửa cảnh hiện tại
  const [currentSubtitleDraft, setCurrentSubtitleDraft] = useState(currentSegment?.subtitle || '');
  const [currentNarrationDraft, setCurrentNarrationDraft] = useState(currentSegment?.dialogueOrNarration || '');
  const [scenePromptDrafts, setScenePromptDrafts] = useState({});
  const [currentVisualPromptDraft, setCurrentVisualPromptDraft] = useState(() => {
    return currentSegment?.visualDescription || currentSegment?.textPrompt || currentSegment?.prompt || currentSegment?.imagePrompt || currentSegment?.dialogueOrNarration || currentSegment?.subtitle || '';
  });
  const [isSavingScene, setIsSavingScene] = useState(false);
  const [sceneSaveMsg, setSceneSaveMsg] = useState('');
  const [isSavingVisualPrompt, setIsSavingVisualPrompt] = useState(false);
  const [visualPromptSaveMsg, setVisualPromptSaveMsg] = useState('');
  const [isPlayingSceneAudio, setIsPlayingSceneAudio] = useState(false);
  const [isResyncingVoice, setIsResyncingVoice] = useState(false);
  const [expandedSceneIndex, setExpandedSceneIndex] = useState(null);
  const [sceneListQuery, setSceneListQuery] = useState('');
  const [sceneMediaFilter, setSceneMediaFilter] = useState('all');
  const sceneCardRefs = useRef(new Map());

  const getScenePrompt = (seg, idx) => {
    if (scenePromptDrafts[idx] !== undefined) {
      return scenePromptDrafts[idx];
    }
    if (idx === activeSceneIndex && currentVisualPromptDraft) {
      return currentVisualPromptDraft;
    }
    return getSceneDefaultPrompt(seg);
  };

  // Upload ảnh/video mới trực tiếp cho cảnh
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadMsg, setImageUploadMsg] = useState('');
  const [imageVersion, setImageVersion] = useState(0);
  const [uploadTargetSceneIndex, setUploadTargetSceneIndex] = useState(null);
  const fileInputRef = useRef(null);

  // Modal Pexels Picker
  const [pexelsPickerOpen, setPexelsPickerOpen] = useState(false);
  const [pexelsTargetSceneIndex, setPexelsTargetSceneIndex] = useState(null);

  // Đồng bộ form khi đổi cảnh
  useEffect(() => {
    setCurrentSubtitleDraft(currentSegment?.subtitle || '');
    setCurrentNarrationDraft(currentSegment?.dialogueOrNarration || '');
    const defaultPrompt = getSceneDefaultPrompt(currentSegment);
    setCurrentVisualPromptDraft(scenePromptDrafts[activeSceneIndex] !== undefined ? scenePromptDrafts[activeSceneIndex] : defaultPrompt);
    setSceneSaveMsg('');
    setVisualPromptSaveMsg('');
    setImageUploadMsg('');
  }, [activeSceneIndex, currentSegment]);

  useEffect(() => {
    if (currentTab !== 'scenes') return undefined;

    const frameId = window.requestAnimationFrame(() => {
      sceneCardRefs.current.get(activeSceneIndex)?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeSceneIndex, currentTab]);

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

  const isSceneVideo = (sceneNum, seg) => {
    if (seg?.mediaType === 'video') return true;
    if (assetCounts?.mediaTypes?.[sceneNum] === 'video') return true;
    if (Array.isArray(assetCounts?.existingVideoNumbers) && assetCounts.existingVideoNumbers.includes(sceneNum)) return true;
    return false;
  };

  const currentAudioFile = assetCounts?.audioFiles?.[currentSceneNumber] || null;
  const currentAudioSrc = currentAudioFile
    ? `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=${encodeURIComponent(`audio/${currentAudioFile}`)}&category=${encodeURIComponent(category)}`
    : null;
  const isCurrentVideo = isSceneVideo(currentSceneNumber, currentSegment);
  const currentMediaFile = isCurrentVideo ? `images/scene-${currentPaddedNum}.mp4` : `images/scene-${currentPaddedNum}.jpg`;
  const currentImgSrc = hasSceneImage(currentSceneNumber)
    ? `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=${currentMediaFile}&category=${encodeURIComponent(category)}&v=${activeSceneIndex}-${imageVersion}`
    : null;

  const handlePlaySceneAudio = () => {
    if (!currentAudioSrc) return;
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

  const handleSaveVisualPrompt = async (targetIdx = activeSceneIndex) => {
    if (!result?.id) return;
    setIsSavingVisualPrompt(true);
    setVisualPromptSaveMsg('');
    const seg = segments[targetIdx] || currentSegment;
    const segNum = seg?.segmentNumber || targetIdx + 1;
    const promptValue = getScenePrompt(seg, targetIdx)?.trim() || '';

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
              visualDescription: promptValue,
              textPrompt: promptValue
            }
          ]
        })
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.segments)) {
        const mergedSegs = data.segments.length >= (segments.length || 0)
          ? data.segments
          : segments.map((s) => (s.segmentNumber === segNum ? { ...s, visualDescription: promptValue, textPrompt: promptValue } : s));
        onResult?.({
          ...result,
          segments: mergedSegs,
          remotionConfig: data.remotionConfig ?? result.remotionConfig
        });
        onHistoryRefresh?.();
        setVisualPromptSaveMsg(`✓ Đã lưu mô tả ảnh Cảnh ${segNum}!`);
        showToast?.success?.(`✓ Đã lưu prompt Cảnh ${segNum}!`);
        setTimeout(() => setVisualPromptSaveMsg(''), 4000);
      } else {
        setVisualPromptSaveMsg(`Lỗi: ${data.error || 'Không thể lưu'}`);
      }
    } catch {
      setVisualPromptSaveMsg('Lỗi kết nối máy chủ');
    } finally {
      setIsSavingVisualPrompt(false);
    }
  };

  const handleTriggerUploadImage = (targetIdx) => {
    setUploadTargetSceneIndex(targetIdx);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const targetIdx = uploadTargetSceneIndex !== null ? uploadTargetSceneIndex : activeSceneIndex;
    const targetSeg = segments[targetIdx] || currentSegment;
    const padNum = String(targetSeg?.segmentNumber || targetIdx + 1).padStart(2, '0');

    setIsUploadingImage(true);
    const isVid = file.type?.startsWith('video/') || file.name?.endsWith('.mp4') || file.name?.endsWith('.webm');
    const targetExt = isVid ? (file.name?.endsWith('.webm') ? 'webm' : 'mp4') : 'jpg';
    const targetFilename = `images/scene-${padNum}.${targetExt}`;

    setImageUploadMsg(`⏳ Đang lưu ${isVid ? 'video' : 'ảnh'} Cảnh ${targetIdx + 1}...`);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result;
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
            const successMsg = `✓ Đã cập nhật ${isVid ? 'video' : 'ảnh'} Cảnh ${targetIdx + 1} thành công!`;
            setImageUploadMsg(successMsg);
            showToast?.success?.(successMsg);
            setImageVersion(Date.now());
            if (checkAssets) checkAssets();
            onHistoryRefresh?.();
            const updated = segments.map((s, i) => i === targetIdx ? { ...s, mediaType: isVid ? 'video' : 'image', mediaFile: targetFilename } : s);
            onResult?.({
              ...result,
              segments: updated
            });
            setTimeout(() => setImageUploadMsg(''), 4000);
          } else {
            const err = `Lỗi: ${json.error || 'Không thể lưu media'}`;
            setImageUploadMsg(err);
            showToast?.error?.(err);
          }
        } catch {
          const err = 'Lỗi khi tải file lên server';
          setImageUploadMsg(err);
          showToast?.error?.(err);
        } finally {
          setIsUploadingImage(false);
          setUploadTargetSceneIndex(null);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      const err = 'Lỗi đọc file từ máy tính';
      setImageUploadMsg(err);
      showToast?.error?.(err);
      setIsUploadingImage(false);
      setUploadTargetSceneIndex(null);
    }
  };

  const handleOpenPexelsForScene = (targetIdx) => {
    setPexelsTargetSceneIndex(targetIdx);
    setPexelsPickerOpen(true);
  };

  const handlePexelsApplied = ({ sceneNumber, mediaType, filename }) => {
    setImageVersion(Date.now());
    if (checkAssets) checkAssets();
    onHistoryRefresh?.();
    const updated = segments.map(s => {
      if (Number(s.segmentNumber) === Number(sceneNumber)) {
        return { ...s, mediaType, mediaFile: filename };
      }
      return s;
    });
    onResult?.({
      ...result,
      segments: updated
    });
  };

  const handleGenerateFlowForScene = (targetIdx) => {
    const targetSeg = segments[targetIdx] || currentSegment;
    const promptText = getScenePrompt(targetSeg, targetIdx)?.trim();

    if (!promptText) {
      showToast?.error?.('Vui lòng nhập prompt mô tả hình ảnh trước khi tạo!');
      return;
    }

    const segNum = targetSeg?.segmentNumber || targetIdx + 1;

    // Tự động lưu prompt mới vào segments database để không bị mất khi reload
    if (result?.id) {
      fetch('/api/prompts/update-segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: result.id,
          folderPath: result.input?.folderPath || '',
          category: result.category,
          segments: [
            {
              segmentNumber: segNum,
              visualDescription: promptText,
              textPrompt: promptText
            }
          ]
        })
      }).then(res => res.json()).then(data => {
        if (data?.success && Array.isArray(data.segments)) {
          const mergedSegs = data.segments.length >= (segments.length || 0)
            ? data.segments
            : segments.map((s) => (s.segmentNumber === segNum ? { ...s, visualDescription: promptText, textPrompt: promptText } : s));
          onResult?.({
            ...result,
            segments: mergedSegs,
            remotionConfig: data.remotionConfig ?? result.remotionConfig
          });
          onHistoryRefresh?.();
        }
      }).catch(() => { });
    }

    const singleSegment = {
      ...targetSeg,
      segmentNumber: segNum,
      visualDescription: promptText,
      textPrompt: promptText
    };

    window.postMessage({
      type: 'START_FLOW_GENERATION',
      segments: [singleSegment],
      title: result?.title || 'Single Scene Flow',
      isImage: true,
      folderPath: result?.input?.folderPath || 'example',
      imageExt: result?.input?.imageExt || 'jpg',
      category: result?.category || '',
      aspectRatio: result?.input?.aspectRatio || '9:16',
      orientation: 'portrait'
    }, '*');

    // Tự động copy prompt hiện tại trong input vào clipboard
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(promptText).catch(() => { });
    }

    const notifyMsg = `🚀 Đã gửi Cảnh ${segNum} sang Google Flow với prompt hiện tại!`;
    showToast?.success?.(notifyMsg);
    setImageUploadMsg(notifyMsg);
    setTimeout(() => setImageUploadMsg(''), 6000);
  };

  const handleCopyPrompt = (targetIdx) => {
    const targetSeg = segments[targetIdx] || currentSegment;
    const promptText = getScenePrompt(targetSeg, targetIdx)?.trim();

    if (!promptText) {
      showToast?.error?.('Chưa có prompt để copy!');
      return;
    }

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(promptText);
      showToast?.success?.(`📋 Đã copy Prompt Cảnh ${targetIdx + 1}!`);
    }
  };

  const sceneEntries = segments.map((seg, idx) => {
    const sceneNumber = Number(seg.segmentNumber || idx + 1);
    return {
      seg,
      idx,
      sceneNumber,
      hasMedia: hasSceneImage(sceneNumber)
    };
  });
  const readySceneCount = sceneEntries.filter((entry) => entry.hasMedia).length;
  const normalizedSceneQuery = sceneListQuery.trim().toLocaleLowerCase('vi');
  const visibleSceneEntries = sceneEntries.filter(({ seg, idx, hasMedia }) => {
    if (sceneMediaFilter === 'ready' && !hasMedia) return false;
    if (sceneMediaFilter === 'missing' && hasMedia) return false;
    if (!normalizedSceneQuery) return true;

    const searchableText = [
      `cảnh ${idx + 1}`,
      `scene ${idx + 1}`,
      seg.subtitle,
      seg.dialogueOrNarration,
      getScenePrompt(seg, idx)
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('vi');

    return searchableText.includes(normalizedSceneQuery);
  });

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
        {/* Hidden file input for uploading/replacing scene image */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageFileChange}
        />
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
            { id: 'caption', label: 'Phụ đề' },
            { id: 'image', label: 'Hình ảnh' },
            { id: 'animation', label: 'Animation' },
            { id: 'logo', label: 'Logo' },
            { id: 'opening', label: 'Mở đầu' },
            { id: 'scenes', label: `Cảnh (${totalScenes})` },
            { id: 'style', label: 'Cài đặt chung' }
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
                  onAlignTop={() => { }}
                  onAlignMiddle={() => { }}
                  onAlignBottom={() => { }}
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


              {/* Tiêu đề song ngữ */}
              <div style={{ opacity: renderCaptionEnabled ? 1 : 0.4, pointerEvents: renderCaptionEnabled ? 'auto' : 'none' }}>
                <CapCutSwitchRow
                  label="Tiêu đề song ngữ (Bilingual)"
                  checked={Boolean(renderBilingual)}
                  onChange={(val) => {
                    setRenderBilingual && setRenderBilingual(val);
                    onUpdateRenderConfig?.({ bilingual: val });
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
          2. TAB HÌNH ẢNH (MEDIA & TRANSFORM - CHUẨN CAPCUT DESKTOP)
          ======================================================== */}
        {currentTab === 'image' && (
          <div className="scrollable-col" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px', paddingBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Section: Thay thế ảnh & Google Flow của cảnh hiện tại */}
            <div className="capcut-card" style={CAPCUT_CARD_STYLE}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>🖼️</span> <span>Ảnh Cảnh {activeSceneIndex + 1}</span>
                </span>
                {isUploadingImage && (uploadTargetSceneIndex === null || uploadTargetSceneIndex === activeSceneIndex) && (
                  <span style={{ fontSize: '0.66rem', color: '#ffb300', fontWeight: 600 }}>
                    ⏳ Đang lưu...
                  </span>
                )}
              </div>

              {/* Thumbnail preview + action buttons */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '80px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    background: '#151515',
                    border: '1px solid #383838',
                    flexShrink: 0,
                    position: 'relative'
                  }}
                >
                  {currentImgSrc ? (
                    <img src={currentImgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#555' }}>
                      🎬
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleTriggerUploadImage(activeSceneIndex)}
                    disabled={isUploadingImage}
                    className="capcut-btn-secondary"
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                  >
                    <span>📁</span>
                    <span>Thay thế ảnh từ máy</span>
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleGenerateFlowForScene(activeSceneIndex)}
                      style={{
                        padding: '5px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        borderRadius: '5px',
                        border: '1px solid rgba(0, 229, 255, 0.4)',
                        background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.15) 0%, rgba(0, 150, 255, 0.25) 100%)',
                        color: '#00e5ff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                      title="Tạo lại ảnh cảnh này với Google Flow"
                    >
                      <span>🚀</span>
                      <span>Tạo với Flow</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyPrompt(activeSceneIndex)}
                      className="capcut-btn-secondary"
                      style={{ padding: '5px 8px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}
                      title="Sao chép prompt mô tả hình ảnh"
                    >
                      <span>📋</span>
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Prompt mô tả ảnh cảnh này */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.66rem', color: '#888' }}>
                    Prompt mô tả hình ảnh:
                  </span>
                  {getScenePrompt(currentSegment, activeSceneIndex) !== getSceneDefaultPrompt(currentSegment) && (
                    <button
                      type="button"
                      onClick={() => handleSaveVisualPrompt(activeSceneIndex)}
                      disabled={isSavingVisualPrompt}
                      style={{ background: 'none', border: 'none', color: '#00e5ff', fontSize: '0.65rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                    >
                      {isSavingVisualPrompt ? 'Đang lưu...' : 'Lưu prompt'}
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={getScenePrompt(currentSegment, activeSceneIndex)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCurrentVisualPromptDraft(val);
                    setScenePromptDrafts(prev => ({ ...prev, [activeSceneIndex]: val }));
                  }}
                  placeholder="Mô tả hình ảnh cho cảnh này..."
                  className="capcut-input"
                  style={{ width: '100%', padding: '5px 8px', fontSize: '0.7rem', lineHeight: 1.35, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {imageUploadMsg && (
                <div style={{ marginTop: '6px', fontSize: '0.68rem', color: imageUploadMsg.startsWith('✓') ? '#00e5ff' : imageUploadMsg.startsWith('🚀') ? '#69f0ae' : '#ffb300', textAlign: 'center', fontWeight: 600 }}>
                  {imageUploadMsg}
                </div>
              )}
            </div>

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
                onChange={() => { }}
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
                    onChange={() => { }}
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
                  onAlignLeft={() => { }}
                  onAlignCenter={() => {
                    setRenderImageTranslateY && setRenderImageTranslateY('0');
                    onUpdateRenderConfig?.({ imageTranslateY: 0 });
                  }}
                  onAlignRight={() => { }}
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
          </div>
        )}

        {/* ========================================================
          3. TAB HOẠT ẢNH (ANIMATION & TRANSITION - CHUẨN CAPCUT)
          ======================================================== */}
        {currentTab === 'animation' && (
          <div className="scrollable-col" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px', paddingBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Card 1: Hoạt ảnh phụ đề / chữ */}
            <div className="capcut-card" style={CAPCUT_CARD_STYLE}>
              <CapCutSectionHeader
                title="Hoạt ảnh phụ đề (Caption Animation)"
                hasReset={true}
                onReset={() => {
                  setRenderCaptionAnimation && setRenderCaptionAnimation('none');
                  if (result) {
                    if (!result.remotionConfig) result.remotionConfig = {};
                    result.remotionConfig.captionAnimation = 'none';
                  }
                }}
                hasKeyframe={false}
              />
              <p style={{ margin: 0, fontSize: '0.68rem', color: '#888', lineHeight: 1.4 }}>
                Hiệu ứng xuất hiện cho từng câu phụ đề và tiêu đề khi người thuyết minh bắt đầu nói.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {CAPTION_ANIMATIONS.map((anim) => {
                  const currentAnim = renderCaptionAnimation || (renderCaptionStyle === 'news' ? 'none' : 'zoom');
                  const isActive = currentAnim === anim.id;
                  return (
                    <button
                      key={anim.id}
                      type="button"
                      title={`${anim.label} - ${anim.desc}`}
                      onClick={() => {
                        setRenderCaptionAnimation && setRenderCaptionAnimation(anim.id);
                        if (result) {
                          if (!result.remotionConfig) result.remotionConfig = {};
                          result.remotionConfig.captionAnimation = anim.id;
                        }
                      }}
                      style={{
                        position: 'relative',
                        padding: '6px 3px 5px 3px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: isActive ? '1.5px solid #00e5ff' : '1px solid #303030',
                        background: isActive ? '#282828' : '#1c1c1c',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        height: '58px',
                        boxSizing: 'border-box',
                        transition: 'all 0.15s ease',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none', pointerEvents: 'none' }}>
                        {renderAnimationVisualPreview(anim.id, isActive)}
                      </div>
                      <div style={{ fontSize: '0.64rem', fontWeight: 600, color: isActive ? '#00e5ff' : '#9a9a9a', textAlign: 'center', width: '100%', lineHeight: 1.1 }}>
                        {anim.label}
                      </div>
                      {isActive && (
                        <div style={{ position: 'absolute', top: '3px', right: '3px', width: '10px', height: '10px', borderRadius: '50%', background: '#00e5ff', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6.5px', fontWeight: 900 }}>
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card 2: Hiệu ứng chuyển cảnh giữa các slide */}
            <div className="capcut-card" style={CAPCUT_CARD_STYLE}>
              <CapCutSectionHeader
                title="Chuyển cảnh slide (Scene Transitions)"
                hasReset={true}
                onReset={() => {
                  setRenderTransitionStyle && setRenderTransitionStyle('crossfade');
                  if (result) {
                    if (!result.remotionConfig) result.remotionConfig = {};
                    result.remotionConfig.transitionStyle = 'crossfade';
                  }
                }}
                hasKeyframe={false}
              />
              <p style={{ margin: 0, fontSize: '0.68rem', color: '#888', lineHeight: 1.4 }}>
                Hiệu ứng chuyển tiếp chuyển động giữa các phân cảnh trong video.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {TRANSITION_STYLES.map((t) => {
                  const isActive = renderTransitionStyle === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      title={`${t.label} - ${t.desc || ''}`}
                      onClick={() => {
                        setRenderTransitionStyle && setRenderTransitionStyle(t.id);
                        if (result) {
                          if (!result.remotionConfig) result.remotionConfig = {};
                          result.remotionConfig.transitionStyle = t.id;
                        }
                      }}
                      style={{
                        position: 'relative',
                        padding: '6px 2px 5px 2px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: isActive ? '1.5px solid #00e5ff' : '1px solid #303030',
                        background: isActive ? '#282828' : '#1c1c1c',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        height: '58px',
                        boxSizing: 'border-box',
                        transition: 'all 0.15s ease',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none', pointerEvents: 'none' }}>
                        {renderTransitionVisualPreview(t.id, isActive)}
                      </div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 600, color: isActive ? '#00e5ff' : '#9a9a9a', textAlign: 'center', width: '100%', lineHeight: 1.1, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {t.label}
                      </div>
                      {isActive && (
                        <div style={{ position: 'absolute', top: '3px', right: '3px', width: '10px', height: '10px', borderRadius: '50%', background: '#00e5ff', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6.5px', fontWeight: 900 }}>
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
          4. TAB LOGO (BRAND LOGO)
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
                  onChange={(val) => {
                    setRenderChannelLogo && setRenderChannelLogo(val);
                    onUpdateRenderConfig?.({ channelLogo: val });
                  }}
                />
              </div>
              <p style={{ margin: 0, fontSize: '0.68rem', color: '#888', lineHeight: 1.4 }}>
                Kéo di chuyển hoặc thu phóng trực tiếp Logo trên khung video, hoặc tinh chỉnh bằng thanh trượt bên dưới.
              </p>
            </div>

            {/* Card Hình ảnh Logo & Upload */}
            <div className="capcut-card" style={{ ...CAPCUT_CARD_STYLE, opacity: renderChannelLogo ? 1 : 0.4, pointerEvents: renderChannelLogo ? 'auto' : 'none' }}>
              <CapCutSectionHeader
                title="Hình ảnh Logo"
                hasReset={false}
                hasKeyframe={false}
              />

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(0,0,0,0.3)',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{
                  width: '72px',
                  height: '52px',
                  borderRadius: '6px',
                  background: 'repeating-conic-gradient(#1e1e24 0% 25%, #2a2a35 0% 50%) 50% / 12px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.12)',
                  position: 'relative',
                  flexShrink: 0
                }}>
                  <img
                    src={`/images/watermark/nexora-video-logo.png?v=${logoVersion || 1}`}
                    alt="Logo hiện tại"
                    style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
                    onError={(e) => {
                      e.currentTarget.style.opacity = '0.3';
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.74rem', color: '#fff', fontWeight: 600 }}>
                    Logo đang áp dụng
                  </div>
                  <div style={{ fontSize: '0.64rem', color: '#888', lineHeight: 1.3 }}>
                    Khuyên dùng file PNG nền trong suốt để khi lồng vào video có tính thẩm mỹ cao nhất.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <label
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'rgba(37, 244, 238, 0.15)',
                    border: '1px solid rgba(37, 244, 238, 0.35)',
                    borderRadius: '6px',
                    color: 'var(--secondary)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: isUploadingLogo ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  {isUploadingLogo ? '⏳ Đang tải ảnh lên...' : '📁 Tải lên ảnh Logo mới'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    style={{ display: 'none' }}
                    disabled={isUploadingLogo}
                    onChange={handleLogoFileChange}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleRestoreDefaultLogo}
                  disabled={isUploadingLogo}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.74rem',
                    cursor: isUploadingLogo ? 'wait' : 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}
                  title="Khôi phục lại logo mặc định ban đầu"
                >
                  ↺ Mặc định
                </button>
              </div>

              {uploadLogoMsg && (
                <div style={{
                  fontSize: '0.72rem',
                  color: uploadLogoMsg.startsWith('Lỗi') ? 'var(--danger)' : '#4ade80',
                  fontWeight: 600,
                  marginTop: '4px'
                }}>
                  {uploadLogoMsg}
                </div>
              )}
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
                minX={-800}
                maxX={800}
                minY={-1600}
                maxY={600}
                unitX="px"
                unitY="px"
                stepX={5}
                stepY={10}
              />

              <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setRenderLogoTranslateX && setRenderLogoTranslateX('0');
                    setRenderLogoTranslateY && setRenderLogoTranslateY('0');
                    onUpdateRenderConfig?.({ logoTranslateX: 0, logoTranslateY: 0 });
                  }}
                  className="capcut-btn-secondary"
                  style={{ flex: 1, padding: '6px 10px', fontSize: '0.72rem' }}
                >
                  ↺ Đặt lại vị trí trung tâm (X: 0, Y: 0)
                </button>
              </div>
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

              {/* Công tắc Bật / Tắt màn hình mở đầu (Cảnh 1) */}
              <CapCutSwitchRow
                label="Bật màn hình mở đầu (Cảnh 1)"
                checked={Boolean(renderShowOpeningComment || renderShowOpeningNewsBanner)}
                onChange={(checked) => {
                  if (!checked) {
                    setRenderShowOpeningComment && setRenderShowOpeningComment(false);
                    setRenderShowOpeningNewsBanner && setRenderShowOpeningNewsBanner(false);
                    onSelectedElementChange?.('none');
                    onUpdateRenderConfig?.({ showOpeningComment: false, showOpeningNewsBanner: false });
                    if (result) {
                      if (!result.remotionConfig) result.remotionConfig = {};
                      result.remotionConfig.showOpeningComment = false;
                      result.remotionConfig.showOpeningNewsBanner = false;
                    }
                  } else {
                    // Mặc định bật Banner tin tức khi kích hoạt
                    setRenderShowOpeningComment && setRenderShowOpeningComment(false);
                    setRenderShowOpeningNewsBanner && setRenderShowOpeningNewsBanner(true);
                    onSelectedElementChange?.('news_headline');
                    onUpdateRenderConfig?.({ showOpeningComment: false, showOpeningNewsBanner: true });
                    if (result) {
                      if (!result.remotionConfig) result.remotionConfig = {};
                      result.remotionConfig.showOpeningComment = false;
                      result.remotionConfig.showOpeningNewsBanner = true;
                    }
                  }
                }}
              />

              {!(renderShowOpeningComment || renderShowOpeningNewsBanner) ? (
                <div style={{ padding: '14px 10px', background: '#181818', borderRadius: '6px', border: '1px dashed #333', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#888', fontWeight: 600 }}>Màn hình mở đầu đang tắt</span>
                  <span style={{ fontSize: '0.62rem', color: '#666' }}>Bật công tắc phía trên để hiển thị sticker hộp bình luận hoặc banner tin tức cho Cảnh 1.</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '4px' }}>
                  {[
                    { id: 'news', label: 'Banner tin tức', desc: '50% mờ dần mép trên', active: !renderShowOpeningComment && renderShowOpeningNewsBanner },
                    { id: 'comment', label: 'Hộp bình luận', desc: 'Sticker hỏi ở trên', active: renderShowOpeningComment && !renderShowOpeningNewsBanner },
                    { id: 'both', label: 'Cả hai', desc: 'Bình luận + Banner', active: renderShowOpeningComment && renderShowOpeningNewsBanner }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        let showComment = false;
                        let showNews = false;
                        let selectedEl = 'none';
                        if (m.id === 'comment') {
                          showComment = true;
                          showNews = false;
                          selectedEl = 'comment';
                        } else if (m.id === 'news') {
                          showComment = false;
                          showNews = true;
                          selectedEl = 'news_headline';
                        } else if (m.id === 'both') {
                          showComment = true;
                          showNews = true;
                          selectedEl = 'news_headline';
                        }
                        setRenderShowOpeningComment && setRenderShowOpeningComment(showComment);
                        setRenderShowOpeningNewsBanner && setRenderShowOpeningNewsBanner(showNews);
                        onSelectedElementChange?.(selectedEl);
                        onUpdateRenderConfig?.({ showOpeningComment: showComment, showOpeningNewsBanner: showNews });
                        if (result) {
                          if (!result.remotionConfig) result.remotionConfig = {};
                          result.remotionConfig.showOpeningComment = showComment;
                          result.remotionConfig.showOpeningNewsBanner = showNews;
                        }
                      }}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '6px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: m.active ? '1.5px solid #00e5ff' : '1px solid #303030',
                        background: m.active ? '#282828' : '#1c1c1c',
                        color: m.active ? '#00e5ff' : '#888',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '3px',
                        textAlign: 'center'
                      }}
                    >
                      <span>{m.label}</span>
                      <span style={{ fontSize: '0.6rem', color: '#666', fontWeight: 400 }}>{m.desc}</span>
                    </button>
                  ))}
                </div>
              )}

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: '1px solid #2a2a2a' }}>


                  {/* 1. SECTION CHỮ TIÊU ĐỀ */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '10px',
                      borderRadius: '8px',
                      background: selectedElement === 'news_headline' ? 'rgba(254, 226, 74, 0.04)' : '#191919',
                      border: selectedElement === 'news_headline' ? '1.5px solid rgba(254, 226, 74, 0.65)' : '1px solid #282828',
                      transition: 'border 0.2s ease, background 0.2s ease'
                    }}
                    onClick={() => onSelectedElementChange?.('news_headline')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: selectedElement === 'news_headline' ? '#FFE24A' : '#ddd', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>📰</span> Chữ tiêu đề banner
                      </span>
                      {selectedElement === 'news_headline' && (
                        <span style={{ fontSize: '0.58rem', color: '#FFE24A', background: 'rgba(254, 226, 74, 0.15)', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                          Đang chọn
                        </span>
                      )}
                    </div>

                    <textarea
                      rows={3}
                      value={renderOpeningNewsHeadline || ''}
                      placeholder="TIÊU ĐỀ NỔI BẬT..."
                      onChange={(e) => setRenderOpeningNewsHeadline && setRenderOpeningNewsHeadline(e.target.value)}
                      className="capcut-input"
                      style={{ width: '100%', padding: '6px 8px', color: renderOpeningNewsTitleColor || '#FFE24A', fontWeight: 700, resize: 'none', boxSizing: 'border-box' }}
                    />

                    {/* Màu sắc tiêu đề */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#aaa' }}>Màu tiêu đề:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {[
                          { label: 'Vàng Neon', color: '#FFE24A' },
                          { label: 'Trắng Sáng', color: '#FFFFFF' },
                          { label: 'Đỏ Cam', color: '#FF4D4F' },
                          { label: 'Xanh Neon', color: '#00E5FF' },
                          { label: 'Xanh Lá', color: '#52C41A' },
                        ].map((preset) => {
                          const isMatch = (renderOpeningNewsTitleColor || '#FFE24A').toUpperCase() === preset.color.toUpperCase();
                          return (
                            <button
                              key={preset.color}
                              type="button"
                              title={preset.label}
                              onClick={() => setRenderOpeningNewsTitleColor && setRenderOpeningNewsTitleColor(preset.color)}
                              style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                backgroundColor: preset.color,
                                border: isMatch ? '2px solid #fff' : '1px solid rgba(255,255,255,0.25)',
                                cursor: 'pointer',
                                outline: 'none',
                                padding: 0,
                                boxShadow: isMatch ? `0 0 8px ${preset.color}` : 'none',
                                transform: isMatch ? 'scale(1.15)' : 'scale(1)',
                                transition: 'all 0.15s ease'
                              }}
                            />
                          );
                        })}
                        <input
                          type="color"
                          value={renderOpeningNewsTitleColor || '#FFE24A'}
                          onChange={(e) => setRenderOpeningNewsTitleColor && setRenderOpeningNewsTitleColor(e.target.value)}
                          style={{
                            width: '22px',
                            height: '22px',
                            padding: 0,
                            border: '1px solid #444',
                            borderRadius: '4px',
                            background: 'none',
                            cursor: 'pointer'
                          }}
                          title="Tự chọn màu tùy ý"
                        />
                      </div>
                    </div>

                    {/* Cỡ chữ tiêu đề */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#aaa', flexShrink: 0 }}>Cỡ chữ:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                        <input
                          type="range"
                          min="30"
                          max="80"
                          step="2"
                          value={Number(renderOpeningNewsTitleSize) || 54}
                          onChange={(e) => setRenderOpeningNewsTitleSize && setRenderOpeningNewsTitleSize(Number(e.target.value))}
                          style={{ flex: 1, maxWidth: '120px', cursor: 'pointer', accentColor: '#FFE24A' }}
                        />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff', minWidth: '32px', textAlign: 'right' }}>
                          {Number(renderOpeningNewsTitleSize) > 0 ? `${renderOpeningNewsTitleSize}px` : 'Auto'}
                        </span>
                        {Number(renderOpeningNewsTitleSize) > 0 && (
                          <button
                            type="button"
                            onClick={() => setRenderOpeningNewsTitleSize && setRenderOpeningNewsTitleSize(0)}
                            style={{
                              background: '#2c2c2c',
                              border: '1px solid #444',
                              color: '#aaa',
                              borderRadius: '4px',
                              fontSize: '0.62rem',
                              padding: '2px 5px',
                              cursor: 'pointer'
                            }}
                            title="Tự động theo độ dài tiêu đề"
                          >
                            Auto
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Giới hạn độ rộng tiêu đề */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#aaa', flexShrink: 0 }}>
                        Giới hạn độ rộng:
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                        <input
                          type="range"
                          min="40"
                          max="100"
                          step="2"
                          value={Number(renderOpeningNewsHeadlineWidth) || 82}
                          onChange={(e) => setRenderOpeningNewsHeadlineWidth && setRenderOpeningNewsHeadlineWidth(Number(e.target.value))}
                          style={{ flex: 1, maxWidth: '120px', cursor: 'pointer', accentColor: '#FFE24A' }}
                          title="Thu hẹp để chữ tự xuống dòng, tránh đè icon bên phải"
                        />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff', minWidth: '36px', textAlign: 'right' }}>
                          {Number(renderOpeningNewsHeadlineWidth) || 82}%
                        </span>
                        {Number(renderOpeningNewsHeadlineWidth) !== 82 && (
                          <button
                            type="button"
                            onClick={() => setRenderOpeningNewsHeadlineWidth && setRenderOpeningNewsHeadlineWidth(82)}
                            style={{
                              background: '#2c2c2c',
                              border: '1px solid #444',
                              color: '#aaa',
                              borderRadius: '4px',
                              fontSize: '0.62rem',
                              padding: '2px 5px',
                              cursor: 'pointer'
                            }}
                            title="Đặt lại mặc định 82%"
                          >
                            82%
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. SECTION TAG THỂ LOẠI */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '10px',
                      borderRadius: '8px',
                      background: selectedElement === 'news_tag' ? 'rgba(0, 229, 255, 0.04)' : '#191919',
                      border: selectedElement === 'news_tag' ? '1.5px solid rgba(0, 229, 255, 0.65)' : '1px solid #282828',
                      transition: 'border 0.2s ease, background 0.2s ease'
                    }}
                    onClick={() => onSelectedElementChange?.('news_tag')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: selectedElement === 'news_tag' ? '#00e5ff' : '#ddd', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>🏷️</span> Tag thể loại chuyên mục
                      </span>
                      {selectedElement === 'news_tag' && (
                        <span style={{ fontSize: '0.58rem', color: '#00e5ff', background: 'rgba(0, 229, 255, 0.15)', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                          Đang chọn
                        </span>
                      )}
                    </div>

                    {/* Danh sách các Type Tag mẫu */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {[
                        { label: 'Tin tức', icon: '🔴', val: 'Tin tức' },
                        { label: 'Kiến thức', icon: '💡', val: 'Kiến thức' },
                        { label: 'Sự thật thú vị', icon: '✨', val: 'Sự thật thú vị' },
                        { label: 'Bí ẩn', icon: '🔮', val: 'Bí ẩn' },
                        { label: 'Có thể bạn chưa biết', icon: '🧠', val: 'Có thể bạn chưa biết' }
                      ].map((t) => {
                        const currentVal = (renderOpeningNewsBrand || 'Tin tức').trim().toLowerCase();
                        const isSelected = currentVal === t.val.toLowerCase();
                        return (
                          <button
                            key={t.val}
                            type="button"
                            onClick={() => setRenderOpeningNewsBrand && setRenderOpeningNewsBrand(t.val)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: isSelected ? '1.5px solid #00e5ff' : '1px solid #333',
                              background: isSelected ? 'rgba(0, 229, 255, 0.18)' : '#222',
                              color: isSelected ? '#00e5ff' : '#bbb',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span>{t.icon}</span>
                            <span>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      value={renderOpeningNewsBrand || ''}
                      placeholder="Hoặc tự nhập Tag thể loại (VD: Lịch sử, Vũ trụ...)"
                      onChange={(e) => setRenderOpeningNewsBrand && setRenderOpeningNewsBrand(e.target.value)}
                      className="capcut-input"
                      style={{ width: '100%', padding: '6px 8px', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* 3. SECTION NỀN BANNER */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '10px',
                      borderRadius: '8px',
                      background: selectedElement === 'news_banner' ? 'rgba(239, 68, 68, 0.04)' : '#191919',
                      border: selectedElement === 'news_banner' ? '1.5px solid rgba(239, 68, 68, 0.65)' : '1px solid #282828',
                      transition: 'border 0.2s ease, background 0.2s ease'
                    }}
                    onClick={() => onSelectedElementChange?.('news_banner')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: selectedElement === 'news_banner' ? '#fca5a5' : '#ddd', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>🟥</span> Nền gradient banner
                      </span>
                      {selectedElement === 'news_banner' && (
                        <span style={{ fontSize: '0.58rem', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.15)', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                          Đang chọn
                        </span>
                      )}
                    </div>

                    {/* Vị trí Y nền banner */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#aaa', flexShrink: 0 }}>Vị trí dọc (Y):</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                        <input
                          type="range"
                          min="-300"
                          max="300"
                          step="5"
                          value={Number(renderOpeningNewsBannerTranslateY) || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setRenderOpeningNewsBannerTranslateY && setRenderOpeningNewsBannerTranslateY(String(val));
                            onUpdateRenderConfig?.({ openingNewsBannerTranslateY: val });
                          }}
                          style={{ flex: 1, maxWidth: '120px', cursor: 'pointer', accentColor: '#ef4444' }}
                        />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff', minWidth: '36px', textAlign: 'right' }}>
                          {Number(renderOpeningNewsBannerTranslateY) || 0}px
                        </span>
                        {Number(renderOpeningNewsBannerTranslateY) !== 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setRenderOpeningNewsBannerTranslateY && setRenderOpeningNewsBannerTranslateY('0');
                              onUpdateRenderConfig?.({ openingNewsBannerTranslateY: 0 });
                            }}
                            style={{
                              background: '#2c2c2c',
                              border: '1px solid #444',
                              color: '#aaa',
                              borderRadius: '4px',
                              fontSize: '0.62rem',
                              padding: '2px 5px',
                              cursor: 'pointer'
                            }}
                            title="Đặt lại vị trí 0px"
                          >
                            0
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Thu phóng nền banner */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#aaa', flexShrink: 0 }}>Thu phóng (Scale):</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                        <input
                          type="range"
                          min="50"
                          max="200"
                          step="5"
                          value={Math.round((Number(renderOpeningNewsBannerScale) || 1) * 100)}
                          onChange={(e) => {
                            const scaleVal = Number((Number(e.target.value) / 100).toFixed(2));
                            setRenderOpeningNewsBannerScale && setRenderOpeningNewsBannerScale(String(scaleVal));
                            onUpdateRenderConfig?.({ openingNewsBannerScale: scaleVal });
                          }}
                          style={{ flex: 1, maxWidth: '120px', cursor: 'pointer', accentColor: '#ef4444' }}
                        />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff', minWidth: '36px', textAlign: 'right' }}>
                          {Math.round((Number(renderOpeningNewsBannerScale) || 1) * 100)}%
                        </span>
                        {Number(renderOpeningNewsBannerScale) !== 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setRenderOpeningNewsBannerScale && setRenderOpeningNewsBannerScale('1');
                              onUpdateRenderConfig?.({ openingNewsBannerScale: 1 });
                            }}
                            style={{
                              background: '#2c2c2c',
                              border: '1px solid #444',
                              color: '#aaa',
                              borderRadius: '4px',
                              fontSize: '0.62rem',
                              padding: '2px 5px',
                              cursor: 'pointer'
                            }}
                            title="Đặt lại 100%"
                          >
                            100%
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
          5. TAB CẢNH (MẶC ĐỊNH CHỈ HIỆN ẢNH VÀ VIDEO, BẤM "CHI TIẾT" MỚI SỔ THÊM TEXT & AUDIO)
          ======================================================== */}
        {currentTab === 'scenes' && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
            {/* THANH ĐIỀU HƯỚNG CẢNH (COMPACT STEPPER) */}
            <div
              style={{
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#181818',
                border: '1px solid #282828',
                borderRadius: '6px',
                padding: '6px 10px',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#00e5ff' }}>
                  🎬 Cảnh {activeSceneIndex + 1} / {totalScenes}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const prevIdx = Math.max(0, activeSceneIndex - 1);
                    onSceneIndexChange && onSceneIndexChange(prevIdx);
                    if (expandedSceneIndex !== null) setExpandedSceneIndex(prevIdx);
                  }}
                  disabled={activeSceneIndex === 0}
                  className="capcut-btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '0.68rem', cursor: activeSceneIndex === 0 ? 'not-allowed' : 'pointer' }}
                >
                  ◀ Trước
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = Math.min(totalScenes - 1, activeSceneIndex + 1);
                    onSceneIndexChange && onSceneIndexChange(nextIdx);
                    if (expandedSceneIndex !== null) setExpandedSceneIndex(nextIdx);
                  }}
                  disabled={activeSceneIndex >= totalScenes - 1}
                  className="capcut-btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '0.68rem', cursor: activeSceneIndex >= totalScenes - 1 ? 'not-allowed' : 'pointer' }}
                >
                  Tiếp ▶
                </button>
              </div>
            </div>

            {/* DANH SÁCH CẢNH - MẶC ĐỊNH CHỈ HIỆN ẢNH VÀ VIDEO, BẤM "CHI TIẾT" MỚI SỔ THÊM TEXT & AUDIO */}
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
              <div className={sceneStyles.listHeader}>
                <div className={sceneStyles.headingRow}>
                  <span className={sceneStyles.listTitle}>Danh sách cảnh ({totalScenes})</span>
                  <span className={sceneStyles.progressText}>
                    <strong>{readySceneCount} có media</strong> · {Math.max(0, totalScenes - readySceneCount)} cần bổ sung
                  </span>
                </div>

                <div className={sceneStyles.searchRow}>
                  <div className={sceneStyles.searchBox}>
                    <span className={sceneStyles.searchIcon}>⌕</span>
                    <input
                      type="search"
                      value={sceneListQuery}
                      onChange={(event) => setSceneListQuery(event.target.value)}
                      className={sceneStyles.searchInput}
                      placeholder="Tìm số cảnh hoặc nội dung..."
                      aria-label="Tìm trong danh sách cảnh"
                    />
                    {sceneListQuery && (
                      <button
                        type="button"
                        onClick={() => setSceneListQuery('')}
                        className={sceneStyles.clearSearch}
                        aria-label="Xóa nội dung tìm kiếm"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className={sceneStyles.filterGroup} aria-label="Lọc cảnh theo trạng thái media">
                    {[
                      { id: 'all', label: `Tất cả ${totalScenes}` },
                      { id: 'ready', label: `Đã có ${readySceneCount}` },
                      { id: 'missing', label: `Thiếu ${Math.max(0, totalScenes - readySceneCount)}` }
                    ].map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setSceneMediaFilter(filter.id)}
                        className={`${sceneStyles.filterButton} ${sceneMediaFilter === filter.id ? sceneStyles.filterButtonActive : ''}`}
                        aria-pressed={sceneMediaFilter === filter.id}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="scrollable-col" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
                {visibleSceneEntries.map(({ seg, idx }) => {
                  const isCurrent = idx === activeSceneIndex;
                  const isExpanded = expandedSceneIndex === idx;
                  const padNum = String(seg.segmentNumber || idx + 1).padStart(2, '0');
                  const segNum = Number(seg.segmentNumber || idx + 1);
                  const isVideo = isSceneVideo(segNum, seg);
                  const mediaFile = isVideo ? `images/scene-${padNum}.mp4` : `images/scene-${padNum}.jpg`;
                  const hasThumb = hasSceneImage(segNum);
                  const thumb = hasThumb
                    ? `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=${mediaFile}&category=${encodeURIComponent(category)}&v=${idx}-${imageVersion}`
                    : null;
                  const hasTextChanges = isCurrent && (
                    currentSubtitleDraft !== (seg.subtitle || '')
                    || currentNarrationDraft !== (seg.dialogueOrNarration || '')
                  );

                  return (
                    <div
                      key={idx}
                      ref={(node) => {
                        if (node) sceneCardRefs.current.set(idx, node);
                        else sceneCardRefs.current.delete(idx);
                      }}
                      onClick={() => {
                        if (onSceneIndexChange) onSceneIndexChange(idx);
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: isExpanded ? '10px' : '0px',
                        padding: isExpanded ? '9px' : '7px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: isCurrent ? '1.5px solid #00e5ff' : '1px solid #2a2a2a',
                        background: isCurrent ? '#252525' : '#191919',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Header item: Ảnh / Video của cảnh lớn + Tên cảnh + Nút Chi tiết */}
                      <div style={{ display: 'flex', alignItems: 'stretch', gap: isExpanded ? '12px' : '10px' }}>
                        {/* Thumbnail ảnh/video 9:16 lớn, rõ nét */}
                        <div
                          style={{
                            position: 'relative',
                            width: isExpanded ? '88px' : '70px',
                            height: isExpanded ? '124px' : '94px',
                            flexShrink: 0,
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: isCurrent ? '2px solid #00e5ff' : '1px solid #383838',
                            boxShadow: isCurrent ? '0 0 12px rgba(0, 229, 255, 0.35)' : '0 2px 8px rgba(0,0,0,0.5)',
                            background: '#151515'
                          }}
                        >
                          {/* Badge loại media ở góc trên trái */}
                          <div
                            style={{
                              position: 'absolute',
                              top: '4px',
                              left: '4px',
                              background: isVideo ? 'rgba(0, 119, 255, 0.85)' : 'rgba(0, 0, 0, 0.72)',
                              backdropFilter: 'blur(4px)',
                              border: isVideo ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '4px',
                              padding: '1px 5px',
                              fontSize: '0.58rem',
                              fontWeight: 800,
                              color: isVideo ? '#00e5ff' : '#eee',
                              zIndex: 2,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                          >
                            <span>{isVideo ? '🎥' : '🖼️'}</span>
                            <span>{isVideo ? 'Video' : 'Ảnh'}</span>
                          </div>

                          {thumb ? (
                            isVideo ? (
                              <video
                                key={isCurrent ? 'active-preview' : 'idle-preview'}
                                src={thumb}
                                autoPlay={isCurrent}
                                muted
                                loop={isCurrent}
                                playsInline
                                preload={isCurrent ? 'auto' : 'metadata'}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                            ) : (
                              <img
                                src={thumb}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                            )
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#666' }}>
                              <span style={{ fontSize: '1.4rem' }}>{isVideo ? '🎥' : '🎬'}</span>
                              <span style={{ fontSize: '0.62rem', color: '#888' }}>{isVideo ? 'Chưa có video' : 'Chưa có ảnh'}</span>
                            </div>
                          )}
                          {/* Nút Đổi ảnh nhanh trên Thumbnail */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerUploadImage(idx);
                            }}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'rgba(0, 0, 0, 0.72)',
                              backdropFilter: 'blur(4px)',
                              border: '1px solid rgba(255, 255, 255, 0.25)',
                              borderRadius: '4px',
                              padding: '2px 5px',
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              color: '#fff',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                              transition: 'all 0.15s ease'
                            }}
                            title="Thay thế ảnh cảnh này (Upload từ máy)"
                          >
                            <span>📷</span>
                            <span>Đổi</span>
                          </button>
                          {/* Huy hiệu số cảnh góc dưới */}
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '4px',
                              left: '4px',
                              background: 'rgba(0, 0, 0, 0.75)',
                              backdropFilter: 'blur(4px)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              color: isCurrent ? '#00e5ff' : '#fff'
                            }}
                          >
                            #{idx + 1}
                          </div>
                        </div>

                        {/* Thông tin bên phải thumbnail */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '2px', paddingBottom: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <div className={sceneStyles.sceneTitleRow}>
                              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: isCurrent ? '#00e5ff' : '#ffffff' }}>
                                Cảnh {idx + 1}
                              </span>
                              {isCurrent && (
                                <span style={{ fontSize: '0.62rem', color: '#00e5ff', fontWeight: 700, background: 'rgba(0, 229, 255, 0.15)', border: '1px solid rgba(0, 229, 255, 0.3)', padding: '1px 6px', borderRadius: '4px' }}>
                                  Đang chọn
                                </span>
                              )}
                              <span className={`${sceneStyles.statusBadge} ${hasThumb ? sceneStyles.statusReady : sceneStyles.statusMissing}`}>
                                {hasThumb ? '✓ Có media' : '! Thiếu media'}
                              </span>
                            </div>

                            {/* Nút Chi tiết */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isExpanded) {
                                  setExpandedSceneIndex(null);
                                } else {
                                  setExpandedSceneIndex(idx);
                                  if (onSceneIndexChange) onSceneIndexChange(idx);
                                }
                              }}
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                borderRadius: '5px',
                                border: isExpanded ? '1px solid #00e5ff' : '1px solid #3a3a3a',
                                background: isExpanded ? 'rgba(0, 229, 255, 0.2)' : '#252525',
                                color: isExpanded ? '#00e5ff' : '#ccc',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                flexShrink: 0,
                                transition: 'all 0.15s ease'
                              }}
                              title={isExpanded ? 'Thu gọn chi tiết' : 'Xem & chỉnh sửa chi tiết text, audio'}
                            >
                              <span>{isExpanded ? '▴' : '▾'}</span>
                              <span>{isExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
                            </button>
                          </div>

                          {/* Đoạn text tóm tắt nội dung cảnh (chỉ 2 dòng gọn gàng khi chưa mở chi tiết) */}
                          <p
                            style={{
                              margin: 0,
                              fontSize: '0.72rem',
                              color: isCurrent ? 'rgba(255,255,255,0.85)' : '#8e8e8e',
                              lineHeight: 1.45,
                              display: '-webkit-box',
                              WebkitLineClamp: isExpanded ? 3 : 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {seg.subtitle || seg.dialogueOrNarration || 'Chưa có nội dung'}
                          </p>

                          <div className={sceneStyles.statusRow}>
                            <span className={sceneStyles.durationBadge}>⏱ {Number(seg.durationSeconds || 5)}s</span>
                            {!isExpanded && <span className={sceneStyles.durationBadge}>Nhấn để xem trước</span>}
                          </div>
                        </div>
                      </div>

                      {/* Thao tác media luôn hiển thị trên cảnh đang chọn, không cần mở Chi tiết */}
                      {isCurrent && (
                        <div className={sceneStyles.quickMediaBar} onClick={(event) => event.stopPropagation()}>
                          <div className={sceneStyles.quickMediaHeader}>
                            <span>Thay media</span>
                            {isUploadingImage && (uploadTargetSceneIndex === idx || uploadTargetSceneIndex === null) && (
                              <span className={sceneStyles.uploadingText}>⏳ Đang tải file...</span>
                            )}
                          </div>
                          <div className={sceneStyles.quickMediaActions}>
                            <button
                              type="button"
                              onClick={() => handleTriggerUploadImage(idx)}
                              disabled={isUploadingImage}
                              className={`${sceneStyles.mediaAction} ${sceneStyles.mediaActionNeutral}`}
                              title="Tải ảnh hoặc video từ máy tính"
                            >
                              <span>📁</span><span>Tải lên</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenPexelsForScene(idx)}
                              className={`${sceneStyles.mediaAction} ${sceneStyles.mediaActionPexels}`}
                              title="Tìm ảnh hoặc video trên Pexels"
                            >
                              <span>🍀</span><span>Tìm Pexels</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleGenerateFlowForScene(idx)}
                              className={`${sceneStyles.mediaAction} ${sceneStyles.mediaActionFlow}`}
                              title="Tạo media mới bằng Google Flow"
                            >
                              <span>🚀</span><span>Tạo Flow</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyPrompt(idx)}
                              className={`${sceneStyles.mediaAction} ${sceneStyles.mediaActionNeutral}`}
                              title="Sao chép prompt của cảnh"
                            >
                              <span>📋</span><span>Copy</span>
                            </button>
                          </div>
                          {(uploadTargetSceneIndex === idx || uploadTargetSceneIndex === null) && imageUploadMsg && (
                            <span className={sceneStyles.mediaMessage}>
                              {imageUploadMsg}
                            </span>
                          )}
                        </div>
                      )}

                      {/* SỔ THÊM THÔNG TIN TEXT HOẶC AUDIO KHI BẤM "CHI TIẾT" */}
                      {isExpanded && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            paddingTop: '8px',
                            borderTop: '1px solid #333',
                            animation: 'fadeIn 0.15s ease-out'
                          }}
                        >
                          {/* Khối quản lý Ảnh & Tạo lại với Google Flow */}
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              padding: '8px',
                              background: '#202020',
                              borderRadius: '6px',
                              border: '1px solid #333'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.7rem', color: '#00e5ff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>{isVideo ? '🎥' : '🖼️'}</span> <span>Prompt hình ảnh</span>
                              </span>
                            </div>

                            {/* Prompt mô tả ảnh */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.65rem', color: '#888' }}>
                                  Prompt mô tả hình ảnh:
                                </span>
                                {getScenePrompt(seg, idx) !== getSceneDefaultPrompt(seg) && (
                                  <button
                                    type="button"
                                    onClick={() => handleSaveVisualPrompt(idx)}
                                    disabled={isSavingVisualPrompt}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#00e5ff',
                                      fontSize: '0.65rem',
                                      cursor: 'pointer',
                                      padding: 0,
                                      textDecoration: 'underline'
                                    }}
                                  >
                                    {isSavingVisualPrompt ? 'Đang lưu...' : 'Lưu prompt'}
                                  </button>
                                )}
                              </div>
                              <textarea
                                rows={2}
                                value={getScenePrompt(seg, idx)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setScenePromptDrafts(prev => ({ ...prev, [idx]: val }));
                                  if (idx === activeSceneIndex) {
                                    setCurrentVisualPromptDraft(val);
                                  }
                                }}
                                placeholder="Mô tả hình ảnh cho cảnh này..."
                                className="capcut-input"
                                style={{ width: '100%', padding: '5px 8px', fontSize: '0.7rem', lineHeight: 1.35, resize: 'vertical', boxSizing: 'border-box' }}
                              />
                            </div>

                            {isCurrent && visualPromptSaveMsg && (
                              <span style={{ fontSize: '0.68rem', color: '#69f0ae', textAlign: 'center', fontWeight: 600 }}>
                                {visualPromptSaveMsg}
                              </span>
                            )}
                          </div>

                          {/* Phụ đề hiển thị (Text) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.7rem', color: '#9a9a9a', fontWeight: 600 }}>
                              📝 Phụ đề hiển thị:
                            </span>
                            <textarea
                              rows={2}
                              value={isCurrent ? currentSubtitleDraft : (seg.subtitle || '')}
                              onChange={(e) => {
                                if (isCurrent) setCurrentSubtitleDraft(e.target.value);
                              }}
                              className="capcut-input"
                              style={{ width: '100%', padding: '6px 8px', lineHeight: 1.4, resize: 'vertical', boxSizing: 'border-box' }}
                            />
                          </div>

                          {/* Lời kể / Thuyết minh (Text) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.7rem', color: '#9a9a9a', fontWeight: 600 }}>
                              🎙️ Lời kể / Thuyết minh:
                            </span>
                            <textarea
                              rows={2}
                              value={isCurrent ? currentNarrationDraft : (seg.dialogueOrNarration || '')}
                              onChange={(e) => {
                                if (isCurrent) setCurrentNarrationDraft(e.target.value);
                              }}
                              className="capcut-input"
                              style={{ width: '100%', padding: '6px 8px', lineHeight: 1.4, resize: 'vertical', boxSizing: 'border-box' }}
                            />
                          </div>

                          {/* Audio & Lưu Cảnh Này */}
                          {hasTextChanges && (
                            <span className={sceneStyles.unsavedBadge}>● Có thay đổi chưa lưu</span>
                          )}
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={handlePlaySceneAudio}
                              disabled={!currentAudioSrc || isPlayingSceneAudio}
                              className="capcut-btn-secondary"
                              style={{ flex: 1, padding: '6px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                              <span>{isPlayingSceneAudio ? '🔊' : '▶'}</span>
                              <span>{isPlayingSceneAudio ? 'Đang phát...' : currentAudioSrc ? 'Nghe thử voice' : 'Chưa có voice'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleSaveCurrentScene}
                              disabled={isSavingScene || isResyncingVoice}
                              className="capcut-btn-primary"
                              style={{ flex: 1.3, padding: '6px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                              <span>{isSavingScene ? '⏳' : isResyncingVoice ? '🎙️' : '💾'}</span>
                              <span>{isSavingScene ? 'Đang lưu...' : isResyncingVoice ? 'Tạo voice...' : hasTextChanges ? 'Lưu thay đổi' : 'Lưu cảnh này'}</span>
                            </button>
                          </div>
                          {isCurrent && sceneSaveMsg && (
                            <span style={{ fontSize: '0.7rem', color: '#00e5ff', textAlign: 'center', fontWeight: 600 }}>
                              {sceneSaveMsg}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {visibleSceneEntries.length === 0 && (
                  <div className={sceneStyles.emptyState}>
                    <span style={{ fontSize: '1.4rem' }}>🔎</span>
                    <span>Không có cảnh phù hợp với tìm kiếm hoặc bộ lọc hiện tại.</span>
                    <button
                      type="button"
                      className={sceneStyles.resetButton}
                      onClick={() => {
                        setSceneListQuery('');
                        setSceneMediaFilter('all');
                      }}
                    >
                      Hiện tất cả cảnh
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
          6. TAB CÀI ĐẶT CHUNG (GENERAL SETTINGS)
          ======================================================== */}
        {currentTab === 'style' && (
          <div className="scrollable-col" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px', paddingBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Card 1: Màu sắc & Nền video */}
            <div className="capcut-card" style={CAPCUT_CARD_STYLE}>
              <CapCutSectionHeader
                title="Màu sắc &amp; Nền video"
                hasReset={false}
                hasKeyframe={false}
              />
              <p style={{ margin: 0, fontSize: '0.68rem', color: '#888', lineHeight: 1.4 }}>
                Cài đặt màu nền canvas và màu sắc điểm nhấn (Primary Highlight) áp dụng xuyên suốt video.
              </p>

              {/* Màu nền video */}
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
                    onUpdateRenderConfig?.({ videoBgColor: val });
                  }}
                  label="Nền video"
                  align="right"
                />
              </div>

              {/* Màu Primary / Highlight */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '28px' }}>
                <span className="capcut-label">Màu chủ đạo (Highlight):</span>
                <ColorPickerPopover
                  color={renderHighlightColor || '#FE2C55'}
                  onChange={(val) => {
                    setRenderHighlightColor && setRenderHighlightColor(val);
                    if (result) {
                      if (!result.remotionConfig) result.remotionConfig = {};
                      result.remotionConfig.highlightColor = val;
                    }
                    onUpdateRenderConfig?.({ highlightColor: val });
                  }}
                  label="Highlight"
                  align="right"
                />
              </div>
            </div>

            {/* Card 2: Chuyển cảnh slide (Scene Transitions) */}
            <div className="capcut-card" style={CAPCUT_CARD_STYLE}>
              <CapCutSectionHeader
                title="Chuyển cảnh slide (Scene Transitions)"
                hasReset={true}
                onReset={() => {
                  setRenderTransitionStyle && setRenderTransitionStyle('crossfade');
                  if (result) {
                    if (!result.remotionConfig) result.remotionConfig = {};
                    result.remotionConfig.transitionStyle = 'crossfade';
                  }
                  onUpdateRenderConfig?.({ transitionStyle: 'crossfade' });
                }}
                hasKeyframe={false}
              />
              <p style={{ margin: 0, fontSize: '0.68rem', color: '#888', lineHeight: 1.4 }}>
                Hiệu ứng chuyển tiếp chuyển động giữa các phân cảnh trong video.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {TRANSITION_STYLES.map((t) => {
                  const isActive = renderTransitionStyle === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      title={`${t.label} - ${t.desc || ''}`}
                      onClick={() => {
                        setRenderTransitionStyle && setRenderTransitionStyle(t.id);
                        if (result) {
                          if (!result.remotionConfig) result.remotionConfig = {};
                          result.remotionConfig.transitionStyle = t.id;
                        }
                        onUpdateRenderConfig?.({ transitionStyle: t.id });
                      }}
                      style={{
                        position: 'relative',
                        padding: '6px 2px 5px 2px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: isActive ? '1.5px solid #00e5ff' : '1px solid #303030',
                        background: isActive ? '#282828' : '#1c1c1c',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        height: '58px',
                        boxSizing: 'border-box',
                        transition: 'all 0.15s ease',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none', pointerEvents: 'none' }}>
                        {renderTransitionVisualPreview(t.id, isActive)}
                      </div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 600, color: isActive ? '#00e5ff' : '#9a9a9a', textAlign: 'center', width: '100%', lineHeight: 1.1, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {t.label}
                      </div>
                      {isActive && (
                        <div style={{ position: 'absolute', top: '3px', right: '3px', width: '10px', height: '10px', borderRadius: '50%', background: '#00e5ff', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6.5px', fontWeight: 900 }}>
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card 3: Tùy chọn hiển thị dùng chung */}
            <div className="capcut-card" style={CAPCUT_CARD_STYLE}>
              <CapCutSectionHeader
                title="Tùy chọn hiển thị dùng chung"
                hasReset={false}
                hasKeyframe={false}
              />

              {/* Bật/tắt phụ đề */}
              <CapCutSwitchRow
                label="Bật hiển thị phụ đề (Captions)"
                checked={Boolean(renderCaptionEnabled)}
                onChange={(val) => {
                  setRenderCaptionEnabled && setRenderCaptionEnabled(val);
                  if (result) {
                    if (!result.remotionConfig) result.remotionConfig = {};
                    result.remotionConfig.captionEnabled = val;
                    result.remotionConfig.showCaption = val;
                  }
                  onUpdateRenderConfig?.({ captionEnabled: val, showCaption: val });
                }}
              />

              {/* Tiêu đề song ngữ */}
              <CapCutSwitchRow
                label="Tiêu đề song ngữ (Bilingual)"
                checked={Boolean(renderBilingual)}
                onChange={(val) => {
                  setRenderBilingual && setRenderBilingual(val);
                  if (result) {
                    if (!result.remotionConfig) result.remotionConfig = {};
                    result.remotionConfig.bilingual = val;
                  }
                  onUpdateRenderConfig?.({ bilingual: val });
                }}
              />

              {/* Bật/tắt Logo thương hiệu */}
              <CapCutSwitchRow
                label="Hiển thị Logo thương hiệu"
                checked={Boolean(renderChannelLogo)}
                onChange={(val) => {
                  setRenderChannelLogo && setRenderChannelLogo(val);
                  if (result) {
                    if (!result.remotionConfig) result.remotionConfig = {};
                    result.remotionConfig.channelLogo = val;
                  }
                  onUpdateRenderConfig?.({ channelLogo: val });
                }}
              />
            </div>
          </div>
        )}

        {/* Nút lưu style chung cho tất cả các tab ở bottom */}
        <div
          style={{
            flexShrink: 0,
            padding: '10px 12px',
            borderTop: '1px solid #282828',
            background: '#181818',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {(onUndo || onRedo) && (
              <>
                <button
                  type="button"
                  onClick={onUndo}
                  disabled={!canUndo}
                  title="Hoàn tác bước trước (Ctrl + Z)"
                  style={{
                    padding: '9px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: canUndo ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    color: canUndo ? '#fff' : 'rgba(255, 255, 255, 0.25)',
                    cursor: canUndo ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>↩</span>
                  <span>Undo</span>
                </button>
                <button
                  type="button"
                  onClick={onRedo}
                  disabled={!canRedo}
                  title="Làm lại bước vừa hoàn tác (Ctrl + Y hoặc Ctrl + Shift + Z)"
                  style={{
                    padding: '9px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: canRedo ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    color: canRedo ? '#fff' : 'rgba(255, 255, 255, 0.25)',
                    cursor: canRedo ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>↪</span>
                  <span>Redo</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleSaveAndApply}
              disabled={isSavingStyle}
              className="capcut-btn-primary"
              style={{
                flex: 1,
                padding: '9px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              {isSavingStyle ? '⏳ Đang lưu...' : '💾 Lưu style'}
            </button>
          </div>
          {saveStyleMsg && (
            <span style={{ fontSize: '0.72rem', color: '#00e5ff', textAlign: 'center', fontWeight: 600 }}>
              {saveStyleMsg}
            </span>
          )}
        </div>

        {/* Hidden File Input để upload ảnh hoặc video từ máy tính */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageFileChange}
          accept="image/*,video/mp4,video/webm"
          style={{ display: 'none' }}
        />

        {/* Modal Tìm kiếm Kho Pexels (Ảnh & Video) kèm Trimming */}
        {pexelsPickerOpen && (
          <PexelsMediaPickerModal
            key={`pexels-scene-${pexelsTargetSceneIndex ?? activeSceneIndex}`}
            isOpen
            onClose={() => {
              setPexelsPickerOpen(false);
              setPexelsTargetSceneIndex(null);
            }}
            folderPath={folderPath}
            category={category}
            sceneNumber={pexelsTargetSceneIndex !== null ? (segments[pexelsTargetSceneIndex]?.segmentNumber || pexelsTargetSceneIndex + 1) : (activeSceneIndex + 1)}
            scenePrompt={pexelsTargetSceneIndex !== null ? getScenePrompt(segments[pexelsTargetSceneIndex], pexelsTargetSceneIndex) : currentVisualPromptDraft}
            sceneNarration={pexelsTargetSceneIndex !== null ? (segments[pexelsTargetSceneIndex]?.dialogueOrNarration || segments[pexelsTargetSceneIndex]?.subtitle || '') : (currentSegment?.dialogueOrNarration || '')}
            sceneDuration={pexelsTargetSceneIndex !== null ? (segments[pexelsTargetSceneIndex]?.durationSeconds || 5) : (currentSegment?.durationSeconds || 5)}
            sceneAudioFile={assetCounts?.audioFiles?.[pexelsTargetSceneIndex !== null ? (segments[pexelsTargetSceneIndex]?.segmentNumber || pexelsTargetSceneIndex + 1) : currentSceneNumber] || ''}
            onApplied={handlePexelsApplied}
            showToast={showToast}
          />
        )}
      </div>
    );
  }
