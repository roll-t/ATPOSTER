'use client';

import { useEffect, useRef, useState } from 'react';
import VoiceSplitPanel from '../VoiceSplitPanel.js';
import StepProgressBar from './StepProgressBar.js';
import { resolveVoiceBadgeInfo } from './utils.js';

const SPEEDS = [
  { value: 'slow', label: '🐢 Chậm' },
  { value: 'medium', label: '🚶 Vừa' },
  { value: 'fast', label: '🐇 Nhanh' },
];

export default function VoiceGenerationStep({ controller }) {
  const {
    result,
    assetCounts,
    isGeneratingVoice,
    isRenderingVideo,
    isExternalVoiceSkill,
    showVoiceSplit,
    setShowVoiceSplit,
    setShowVoiceConfig,
    handleGenerateVoice,
    showEmotionTags,
    checkAssets,
    isReadingPractice,
    renderReadingSpeed,
    setRenderReadingSpeed,
    voiceProgress,
    settings,
  } = controller;
  const total = result.segments.length;
  const complete = assetCounts.audioCount >= total;
  const [voiceMode, setVoiceMode] = useState('generate');
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false);
  const [showVoiceTooltip, setShowVoiceTooltip] = useState(false);
  const voiceMenuRef = useRef(null);
  const isElevenLabsMode = isExternalVoiceSkill && voiceMode === 'elevenlabs';
  const voiceInfo = resolveVoiceBadgeInfo({ result, settings, isExternalVoiceSkill, voiceMode });

  useEffect(() => {
    if (!voiceMenuOpen) return;
    const handlePointerDown = (event) => {
      if (voiceMenuRef.current && !voiceMenuRef.current.contains(event.target)) {
        setVoiceMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [voiceMenuOpen]);

  const selectVoiceMode = mode => {
    setVoiceMode(mode);
    setShowVoiceSplit(false);
    if (mode === 'elevenlabs') setShowVoiceConfig(false);
    setVoiceMenuOpen(false);
  };

  const handleVoiceAction = () => {
    if (isElevenLabsMode) {
      setShowVoiceSplit(value => !value);
      return;
    }
    handleGenerateVoice();
  };

  const selectedVoiceLabel = isElevenLabsMode
    ? (showVoiceSplit ? '▲ Đóng ghép giọng' : '🎧 Ghép giọng ElevenLabs')
    : (isGeneratingVoice ? '⏳ Đang tạo...' : complete ? '🎙️ Lồng Tiếng Lại' : '🎙️ Tạo Lồng Tiếng');

  return <div className={isGeneratingVoice ? 'running-glow-card' : ''} style={{
    display: 'flex', flexDirection: 'column', padding: '12px 16px', gap: '10px', borderRadius: '10px',
    background: 'rgba(255,255,255,.015)',
    border: isGeneratingVoice ? '1.5px solid transparent' : complete ? '1px solid rgba(16,185,129,.25)' : '1px solid rgba(255,255,255,.05)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: '0.8rem',
          background: complete ? '#10b981' : 'linear-gradient(135deg,#6366f1,#a855f7)',
          flexShrink: 0
        }}>
          {complete ? '✓' : '1'}
        </div>
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong style={{ fontSize: '.85rem', color: '#fff', whiteSpace: 'nowrap' }}>Tạo giọng lồng tiếng</strong>
          <div
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
            onMouseEnter={() => setShowVoiceTooltip(true)}
            onMouseLeave={() => setShowVoiceTooltip(false)}
          >
            <span
              title={`Giọng đọc: ${voiceInfo.voiceName} • Thư viện: ${voiceInfo.provider}`}
              onClick={() => setShowVoiceTooltip(v => !v)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '17px',
                height: '17px',
                borderRadius: '50%',
                fontSize: '0.68rem',
                fontWeight: 800,
                background: showVoiceTooltip
                  ? (complete ? 'rgba(46, 213, 115, 0.25)' : 'rgba(99, 102, 241, 0.25)')
                  : (complete ? 'rgba(46, 213, 115, 0.12)' : 'rgba(255, 255, 255, 0.08)'),
                color: complete ? '#2ed573' : 'rgba(255, 255, 255, 0.75)',
                border: complete ? '1px solid rgba(46, 213, 115, 0.4)' : '1px solid rgba(255, 255, 255, 0.18)',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              !
            </span>
            {showVoiceTooltip && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 7px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 60,
                  pointerEvents: 'none',
                  animation: 'fadeIn 0.15s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 10px',
                    borderRadius: '7px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    background: '#1d172e',
                    color: isElevenLabsMode ? '#fff' : complete ? '#2ed573' : '#a5b4fc',
                    border: complete ? '1px solid rgba(46, 213, 115, 0.4)' : '1px solid rgba(139, 92, 246, 0.35)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{voiceInfo.badgeLabel}</span>
                </div>
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: complete ? '5px solid rgba(46, 213, 115, 0.4)' : '5px solid rgba(139, 92, 246, 0.35)',
                    margin: '0 auto',
                  }}
                />
              </div>
            )}
          </div>
          {isExternalVoiceSkill && <span style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.5)', whiteSpace: 'nowrap' }}>tuỳ chọn</span>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {!isElevenLabsMode && <button
          type="button"
          className="btn btn-secondary"
          title="Cấu hình giọng đọc"
          onClick={() => setShowVoiceConfig(value => !value)}
          disabled={isGeneratingVoice || isRenderingVideo}
          style={{
            height: '32px',
            width: '32px',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            borderRadius: '8px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          ⚙️
        </button>}
        {isExternalVoiceSkill ? <div
          ref={voiceMenuRef}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: '32px',
            borderRadius: '8px',
            position: 'relative',
            background: isElevenLabsMode
              ? 'rgba(255, 255, 255, 0.08)'
              : complete
                ? 'rgba(46, 213, 115, 0.15)'
                : 'linear-gradient(135deg, #6366f1, #a855f7)',
            border: complete && !isElevenLabsMode
              ? '1px solid rgba(46, 213, 115, 0.35)'
              : isElevenLabsMode
                ? '1px solid rgba(255, 255, 255, 0.15)'
                : 'none',
            boxShadow: complete || isElevenLabsMode ? 'none' : '0 4px 14px rgba(168, 85, 247, 0.3)',
            boxSizing: 'border-box',
          }}
        >
          <button
            type="button"
            onClick={handleVoiceAction}
            disabled={isGeneratingVoice || isRenderingVideo}
            style={{
              height: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '0 12px',
              fontSize: '0.76rem',
              fontWeight: 700,
              color: isElevenLabsMode ? '#fff' : complete ? '#2ed573' : '#fff',
              background: 'transparent',
              border: 'none',
              borderRadius: '7px 0 0 7px',
              cursor: isGeneratingVoice || isRenderingVideo ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => {
              if (!isGeneratingVoice && !isRenderingVideo) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {selectedVoiceLabel}
          </button>
          <div
            style={{
              width: '1px',
              height: '16px',
              background: complete && !isElevenLabsMode
                ? 'rgba(46, 213, 115, 0.35)'
                : 'rgba(255, 255, 255, 0.22)',
              flexShrink: 0,
            }}
          />
          <button
            type="button"
            title="Chọn cách tạo giọng"
            aria-label="Chọn cách tạo giọng"
            aria-expanded={voiceMenuOpen}
            onClick={() => {
              if (!isGeneratingVoice && !isRenderingVideo) {
                setVoiceMenuOpen(value => !value);
              }
            }}
            disabled={isGeneratingVoice || isRenderingVideo}
            style={{
              height: '100%',
              width: '26px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: voiceMenuOpen ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              border: 'none',
              borderRadius: '0 7px 7px 0',
              color: isElevenLabsMode ? '#fff' : complete ? '#2ed573' : '#fff',
              cursor: isGeneratingVoice || isRenderingVideo ? 'not-allowed' : 'pointer',
              opacity: isGeneratingVoice || isRenderingVideo ? 0.55 : 1,
              padding: 0,
              flexShrink: 0,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => {
              if (!isGeneratingVoice && !isRenderingVideo) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              }
            }}
            onMouseLeave={e => {
              if (!voiceMenuOpen) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontSize: '.56rem',
                display: 'inline-block',
                transition: 'transform 0.2s ease',
                transform: voiceMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              ▼
            </span>
          </button>
          {voiceMenuOpen && <div
            role="menu"
            style={{
              background: '#211a31',
              border: '1px solid rgba(255,255,255,.12)',
              borderRadius: '10px',
              boxShadow: '0 14px 34px rgba(0,0,0,.45)',
              minWidth: '220px',
              overflow: 'hidden',
              padding: '6px',
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 7px)',
              zIndex: 30,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {[
              { value: 'generate', label: '🎙️ Tạo giọng lồng tiếng' },
              { value: 'elevenlabs', label: '🎧 Ghép giọng ElevenLabs' },
            ].map(option => <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={voiceMode === option.value}
              onClick={() => selectVoiceMode(option.value)}
              style={{
                background: voiceMode === option.value ? 'rgba(139,92,246,.2)' : 'transparent',
                border: 0,
                borderRadius: '7px',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                fontSize: '.78rem',
                gap: '10px',
                justifyContent: 'space-between',
                padding: '8px 12px',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={e => {
                if (voiceMode !== option.value) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                }
              }}
              onMouseLeave={e => {
                if (voiceMode !== option.value) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span>{option.label}</span>
              {voiceMode === option.value && <span aria-hidden="true" style={{ color: '#2ed573', fontWeight: 800 }}>✓</span>}
            </button>)}
          </div>}
        </div> : <button
            type="button"
            className="btn"
            onClick={handleGenerateVoice}
            disabled={isGeneratingVoice || isRenderingVideo}
            style={{
              background: complete ? 'rgba(46,213,115,.15)' : 'linear-gradient(135deg,#6366f1,#a855f7)',
              border: complete ? '1px solid rgba(46, 213, 115, 0.3)' : 'none',
              color: complete ? '#2ed573' : '#fff',
              padding: '7px 14px',
              fontSize: '0.76rem',
              borderRadius: '8px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              lineHeight: 1.4,
            }}
          >
            {selectedVoiceLabel}
          </button>}
      </div>
    </div>

    {isElevenLabsMode && showVoiceSplit && <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: '12px' }}>
      <VoiceSplitPanel segments={result.segments} folderPath={result.input?.folderPath || 'example'} category={result.category} keepTags={showEmotionTags} onApplied={checkAssets} />
    </div>}

    {isReadingPractice && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.7)' }}>🗣️ Tốc độ đọc:</span>
      {SPEEDS.map(speed => <button key={speed.value} type="button" onClick={() => setRenderReadingSpeed(speed.value)} disabled={isGeneratingVoice || isRenderingVideo} style={{ padding: '5px 12px', borderRadius: '7px', border: renderReadingSpeed === speed.value ? '1px solid var(--secondary)' : '1px solid rgba(255,255,255,.1)', background: renderReadingSpeed === speed.value ? 'rgba(37,244,238,.12)' : 'rgba(0,0,0,.3)', color: renderReadingSpeed === speed.value ? 'var(--secondary)' : '#fff' }}>{speed.label}</button>)}
    </div>}

    {isGeneratingVoice && <StepProgressBar percent={(voiceProgress / total) * 100} label={`${voiceProgress}/${total}`} color="#00f2fe" showShimmer />}
  </div>;
}
