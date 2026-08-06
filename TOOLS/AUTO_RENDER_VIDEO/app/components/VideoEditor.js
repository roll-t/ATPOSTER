'use client';

import { useState, useRef } from 'react';

const CAPTION_STYLES = [
  { value: 'tiktok', label: '⚡ TikTok' },
  { value: 'box', label: '📦 Box' },
  { value: 'karaoke', label: '🎤 Karaoke' },
  { value: 'page', label: '📄 Page' },
  { value: 'hook', label: '🪝 Hook' },
];
const TRANSITION_STYLES = [
  { value: 'crossfade', label: '🌅 Crossfade' },
  { value: 'slide-left', label: '◀ Slide Left' },
  { value: 'slide-right', label: '▶ Slide Right' },
  { value: 'slide-up', label: '▲ Slide Up' },
  { value: 'zoom', label: '🔍 Zoom' },
];
const CAPTION_FONTS = [
  { value: 'be-vietnam-pro', label: 'Be Vietnam Pro' },
  { value: 'roboto', label: 'Roboto' },
  { value: 'montserrat', label: 'Montserrat' },
  { value: 'nunito', label: 'Nunito' },
  { value: 'inter', label: 'Inter' },
  { value: 'oswald', label: 'Oswald' },
];
const FONT_CSS = {
  'be-vietnam-pro': '"Be Vietnam Pro", sans-serif',
  roboto: '"Roboto", sans-serif',
  montserrat: '"Montserrat", sans-serif',
  nunito: '"Nunito", sans-serif',
  inter: '"Inter", sans-serif',
  oswald: '"Oswald", sans-serif',
};

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', border: 'none',
        background: value ? 'var(--primary)' : 'rgba(255,255,255,0.15)',
        cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', width: '18px', height: '18px', borderRadius: '50%',
        background: '#fff', top: '3px', left: value ? '23px' : '3px', transition: 'left 0.2s',
      }} />
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px',
    }}>
      {children}
    </div>
  );
}

function CaptionPreview({ config, sampleText, isLandscape }) {
  const w = isLandscape ? 224 : 126;
  const h = isLandscape ? 126 : 224;
  const fs = Math.max(8, config.captionFontSize * 0.24);
  const font = FONT_CSS[config.captionFont] || 'sans-serif';

  const captionBase = {
    position: 'absolute', left: '8px', right: '8px', bottom: '14px',
    fontFamily: font, fontSize: `${fs}px`, color: config.captionTextColor,
    textAlign: 'center', lineHeight: 1.35, fontWeight: 700,
  };

  const words = (sampleText || 'Sample caption text here').split(' ');
  const short = words.slice(0, 6).join(' ');

  let captionEl;
  switch (config.captionStyle) {
    case 'box':
      captionEl = (
        <div style={{ ...captionBase, background: config.captionBgColor, padding: '3px 6px', borderRadius: '4px' }}>
          {short}
        </div>
      );
      break;
    case 'karaoke':
      captionEl = (
        <div style={{ ...captionBase, background: 'rgba(0,0,0,0.7)', padding: '3px 8px', borderRadius: '20px' }}>
          <span style={{ color: config.highlightColor }}>{words[0]}</span>
          {' '}{words.slice(1, 5).join(' ')}
        </div>
      );
      break;
    case 'page':
      captionEl = (
        <div style={{ ...captionBase, left: 0, right: 0, bottom: 0, borderRadius: 0, background: config.captionBgColor, padding: '5px 8px' }}>
          {short}
        </div>
      );
      break;
    case 'hook':
      captionEl = (
        <div style={{ ...captionBase, color: config.highlightColor, fontSize: `${fs * 1.2}px`, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
          {short}
        </div>
      );
      break;
    default: // tiktok
      captionEl = (
        <div style={{ ...captionBase, textShadow: '0 0 10px rgba(0,0,0,0.9)', letterSpacing: '0.2px' }}>
          {short}
        </div>
      );
  }

  return (
    <div style={{
      width: `${w}px`, height: `${h}px`, borderRadius: '8px', overflow: 'hidden',
      position: 'relative', border: '1px solid rgba(255,255,255,0.12)',
      background: 'linear-gradient(160deg, #0f0f1a, #1a1a3e, #0a0a14)',
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 50%)',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '40%', height: '30%', borderRadius: '6px',
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
      }} />
      {captionEl}
    </div>
  );
}

export default function VideoEditor({ result, onSave, onClose }) {
  const rc = result?.remotionConfig || {};
  const isLandscape = rc.orientation === 'landscape' || result?.input?.aspectRatio === '16:9';

  const [config, setConfig] = useState({
    captionStyle:    rc.captionStyle    || 'tiktok',
    transitionStyle: rc.transitionStyle || 'crossfade',
    captionFont:     rc.captionFont     || 'be-vietnam-pro',
    captionFontSize: rc.captionFontSize ?? 36,
    captionTextColor: rc.captionTextColor || '#FFFFFF',
    captionBgColor:   rc.captionBgColor  || 'rgba(0,0,0,0.65)',
    captionBgOpacity: rc.captionBgOpacity ?? 80,
    highlightColor:   rc.highlightColor  || '#FE2C55',
    bilingual:        rc.bilingual       ?? true,
    bgMusicEnabled:   rc.bgMusicEnabled  ?? true,
    bgMusicVolume:    rc.bgMusicVolume   ?? 0.3,
    orientation:      rc.orientation     || (isLandscape ? 'landscape' : 'portrait'),
  });

  const [segments, setSegments] = useState(() => [...(result?.segments || [])]);
  const [isSaving, setIsSaving] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const dragRef = useRef(null);

  const set = (key, val) => setConfig(prev => ({ ...prev, [key]: val }));

  // ── Drag-and-drop ──────────────────────────────────────────────────
  const onDragStart = (e, idx) => {
    dragRef.current = idx;
    setDraggingIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e, idx) => {
    e.preventDefault();
    if (dragRef.current !== null && idx !== dragRef.current) setDragOverIdx(idx);
  };
  const onDrop = (e, dropIdx) => {
    e.preventDefault();
    const fromIdx = dragRef.current;
    if (fromIdx === null || fromIdx === dropIdx) return;
    setSegments(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(dropIdx, 0, moved);
      return arr;
    });
    dragRef.current = null;
    setDraggingIdx(null);
    setDragOverIdx(null);
  };
  const onDragEnd = () => {
    dragRef.current = null;
    setDraggingIdx(null);
    setDragOverIdx(null);
  };

  // ── Save ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!result?.id) { setStatusMsg('Lỗi: Kịch bản chưa có ID'); return; }
    setIsSaving(true); setStatusMsg('');
    try {
      const res = await fetch('/api/prompts/update-video-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: result.id,
          remotionConfig: config,
          segmentsOrder: segments.map(s => s.segmentNumber),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg('✓ Đã lưu thay đổi!');
        onSave?.({ ...result, remotionConfig: data.remotionConfig, segments: data.segments });
        setTimeout(() => setStatusMsg(''), 3000);
      } else {
        setStatusMsg(`Lỗi: ${data.error || 'Lưu thất bại'}`);
      }
    } catch (err) {
      setStatusMsg(`Lỗi: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────
  const handleRender = async () => {
    if (!result) return;
    const folderPath = result.input?.folderPath;
    if (!folderPath) { setStatusMsg('Lỗi: Không tìm thấy thư mục project.'); return; }
    setIsRendering(true); setStatusMsg('');
    try {
      const res = await fetch('/api/prompts/render-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath, category: result.category,
          ...config,
          segments: result.segments, title: result.title,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg('✓ Render thành công! Video đã được tạo.');
      } else {
        setStatusMsg(`Lỗi render: ${data.error || data.details || 'Thất bại'}`);
      }
    } catch (err) {
      setStatusMsg(`Lỗi: ${err.message}`);
    } finally {
      setIsRendering(false);
    }
  };

  const sampleText = segments[0]?.dialogueOrNarration || segments[0]?.subtitle || 'Sample caption text';
  const totalDuration = segments.reduce((a, s) => a + (s.durationSeconds || 5), 0);
  const isOk = statusMsg.startsWith('✓');
  const isErr = statusMsg.startsWith('Lỗi');

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '1020px', maxHeight: '92vh',
        background: 'var(--card-bg, #16161e)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0,
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>🎬</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>Video Editor</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                {result?.title || 'Chưa có kịch bản'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            {statusMsg && (
              <div style={{
                fontSize: '0.75rem', fontWeight: 700, padding: '5px 10px', borderRadius: '7px',
                color: isErr ? 'var(--danger)' : 'var(--success)',
                background: isErr ? 'var(--danger-bg)' : 'var(--success-bg)',
                maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {statusMsg}
              </div>
            )}
            <button type="button" onClick={handleSave} disabled={isSaving || !result}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {isSaving ? '⏳...' : '💾 Lưu'}
            </button>
            <button type="button" onClick={handleRender} disabled={isRendering || !result}
              style={{
                padding: '8px 16px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '8px',
                border: 'none', whiteSpace: 'nowrap', cursor: (isRendering || !result) ? 'not-allowed' : 'pointer',
                background: (isRendering || !result) ? 'rgba(37,244,238,0.12)' : 'linear-gradient(135deg, var(--secondary), #00f2fe)',
                color: (isRendering || !result) ? 'rgba(37,244,238,0.4)' : '#000',
                transition: 'opacity 0.15s',
              }}>
              {isRendering ? '⏳ Rendering...' : '🎥 Render Video'}
            </button>
            <button type="button" onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer', padding: '4px 6px', lineHeight: 1 }}>
              ✕
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* LEFT: Style controls */}
          <div style={{
            width: '290px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.07)',
            overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px',
          }}>

            {/* Preview */}
            <div>
              <SectionLabel>Xem trước (Preview)</SectionLabel>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <CaptionPreview config={config} sampleText={sampleText} isLandscape={config.orientation === 'landscape'} />
              </div>
            </div>

            {/* Caption Style */}
            <div>
              <SectionLabel>Caption Style</SectionLabel>
              <select className="form-control" value={config.captionStyle} onChange={e => set('captionStyle', e.target.value)}
                style={{ fontSize: '0.82rem', padding: '7px 10px' }}>
                {CAPTION_STYLES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Transition */}
            <div>
              <SectionLabel>Chuyển cảnh (Transition)</SectionLabel>
              <select className="form-control" value={config.transitionStyle} onChange={e => set('transitionStyle', e.target.value)}
                style={{ fontSize: '0.82rem', padding: '7px 10px' }}>
                {TRANSITION_STYLES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Font */}
            <div>
              <SectionLabel>Font chữ</SectionLabel>
              <select className="form-control" value={config.captionFont} onChange={e => set('captionFont', e.target.value)}
                style={{ fontSize: '0.82rem', padding: '7px 10px', fontFamily: FONT_CSS[config.captionFont] }}>
                {CAPTION_FONTS.map(o => (
                  <option key={o.value} value={o.value} style={{ fontFamily: FONT_CSS[o.value] }}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div>
              <SectionLabel>Cỡ chữ: <span style={{ color: '#fff', fontWeight: 700 }}>{config.captionFontSize}px</span></SectionLabel>
              <input type="range" min="16" max="80" step="1"
                value={config.captionFontSize} onChange={e => set('captionFontSize', Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)' }} />
            </div>

            {/* Colors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <SectionLabel>Màu sắc</SectionLabel>
              {[
                { key: 'captionTextColor', label: 'Chữ' },
                { key: 'captionBgColor', label: 'Nền' },
                { key: 'highlightColor', label: 'Highlight' },
              ].map(({ key, label }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <input type="color"
                    value={/^#[0-9a-fA-F]{6}/.test(config[key]) ? config[key] : '#000000'}
                    onChange={e => set(key, e.target.value)}
                    style={{ width: '32px', height: '26px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', padding: '1px', background: 'transparent' }} />
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', width: '58px', flexShrink: 0 }}>{label}</span>
                  <input type="text" value={config[key] || ''}
                    onChange={e => set(key, e.target.value)}
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '5px', color: '#fff', fontSize: '0.68rem', padding: '4px 6px', fontFamily: 'monospace',
                    }} />
                </div>
              ))}
            </div>

            {/* BG Opacity */}
            <div>
              <SectionLabel>Độ mờ nền: <span style={{ color: '#fff', fontWeight: 700 }}>{config.captionBgOpacity}%</span></SectionLabel>
              <input type="range" min="0" max="100" step="5"
                value={config.captionBgOpacity} onChange={e => set('captionBgOpacity', Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)' }} />
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <SectionLabel>Tuỳ chọn</SectionLabel>
              {[
                { key: 'bilingual', label: '🌏 Song ngữ' },
                { key: 'bgMusicEnabled', label: '🎵 Nhạc nền' },
              ].map(({ key, label }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)' }}>{label}</span>
                  <Toggle value={config[key]} onChange={val => set(key, val)} />
                </div>
              ))}
              {config.bgMusicEnabled && (
                <div>
                  <SectionLabel>Âm lượng nhạc: <span style={{ color: '#fff', fontWeight: 700 }}>{Math.round(config.bgMusicVolume * 100)}%</span></SectionLabel>
                  <input type="range" min="0" max="1" step="0.05"
                    value={config.bgMusicVolume} onChange={e => set('bgMusicVolume', Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }} />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Timeline */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Timeline header */}
            <div style={{
              padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
            }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>📋 Timeline Phân Đoạn</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {segments.length} scene — kéo thả để đổi thứ tự
              </span>
            </div>

            {/* Segment cards */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {segments.map((seg, idx) => (
                <div
                  key={`${seg.segmentNumber}-${idx}`}
                  draggable
                  onDragStart={e => onDragStart(e, idx)}
                  onDragOver={e => onDragOver(e, idx)}
                  onDrop={e => onDrop(e, idx)}
                  onDragEnd={onDragEnd}
                  style={{
                    padding: '10px 12px', borderRadius: '9px', userSelect: 'none', cursor: 'grab',
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    opacity: draggingIdx === idx ? 0.4 : 1,
                    background: dragOverIdx === idx
                      ? 'rgba(37,244,238,0.07)'
                      : draggingIdx === idx
                        ? 'rgba(254,44,85,0.1)'
                        : 'rgba(255,255,255,0.035)',
                    border: `1px solid ${dragOverIdx === idx ? 'rgba(37,244,238,0.35)' : draggingIdx === idx ? 'rgba(254,44,85,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    transition: 'all 0.12s',
                  }}
                >
                  {/* Drag handle + number */}
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', paddingTop: '2px' }}>
                    <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.2)', lineHeight: 1 }}>⠿</span>
                    <div style={{
                      width: '26px', height: '26px', borderRadius: '7px',
                      background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.72rem', fontWeight: 800, color: '#fff',
                    }}>
                      {idx + 1}
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.88)', lineHeight: 1.45, marginBottom: '5px' }}>
                      {(seg.dialogueOrNarration || '').slice(0, 120)}
                      {(seg.dialogueOrNarration || '').length > 120 ? '…' : ''}
                    </div>
                    {seg.subtitle && (
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', lineHeight: 1.3, marginBottom: '5px' }}>
                        {seg.subtitle.slice(0, 80)}{seg.subtitle.length > 80 ? '…' : ''}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {seg.durationSeconds && (
                        <span style={{ fontSize: '0.65rem', color: 'rgba(37,244,238,0.75)', background: 'rgba(37,244,238,0.08)', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>
                          ⏱ {seg.durationSeconds}s
                        </span>
                      )}
                      {seg.status === 'completed' && (
                        <span style={{ fontSize: '0.65rem', color: 'rgba(100,220,100,0.8)', background: 'rgba(100,220,100,0.07)', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>
                          ✓ Xong
                        </span>
                      )}
                      {Array.isArray(seg.elements) && seg.elements.length > 0 && (
                        <span style={{ fontSize: '0.65rem', color: 'rgba(254,200,44,0.8)', background: 'rgba(254,200,44,0.07)', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>
                          🖼 {seg.elements.length} phần tử
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {segments.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '60px 20px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '12px', opacity: 0.4 }}>🎬</div>
                  Chưa có phân đoạn. Hãy tạo kịch bản trước.
                </div>
              )}
            </div>

            {/* Footer */}
            {segments.length > 0 && (
              <div style={{
                padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
              }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  ℹ️ Kéo card lên/xuống để đổi thứ tự xuất hiện
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Tổng: <strong style={{ color: '#fff' }}>{totalDuration}s</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
