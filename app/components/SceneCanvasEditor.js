'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';

// Phải khớp với hằng số trong SceneCanvas.tsx
const BASE_SIZE_FRACTION = 0.32;
const CANVAS_W = 270;
const CANVAS_H = 480;
const BASE_SIZE = CANVAS_H * BASE_SIZE_FRACTION; // 153.6px

const CATEGORY_LABELS = {
  pose: '🧍 Pose',
  prop: '📦 Prop',
  sym: '✨ Symbol',
  bg: '🌄 Phông nền',
};

function assetUrl(id) {
  return `/api/prompts/asset-image?id=${encodeURIComponent(id)}`;
}

// Element data → tọa độ CSS pixel trên canvas xem trước
function elementToPx(el) {
  const size = BASE_SIZE * (el.scale ?? 1);
  const left = (el.x / 100) * CANVAS_W - size / 2;
  const top = (el.y / 100) * CANVAS_H - (el.anchor === 'bottom' ? size : size / 2);
  return { left, top, size };
}

// Tọa độ pixel sau khi kéo → x/y % để lưu vào element
function pxToPercent(left, top, size, anchor) {
  const x = ((left + size / 2) / CANVAS_W) * 100;
  const y = anchor === 'bottom'
    ? ((top + size) / CANVAS_H) * 100
    : ((top + size / 2) / CANVAS_H) * 100;
  // Cho phép hơi ra ngoài canvas (0-120) để dễ dàng đặt phần tử sát mép
  return {
    x: Math.round(Math.max(-20, Math.min(120, x))),
    y: Math.round(Math.max(-20, Math.min(120, y))),
  };
}

// Gán _id tạm thời chỉ dùng trong editor (không lưu ra file)
let _nextId = 0;
function withIds(elements) {
  return (elements || []).map(el => ({ ...el, _id: _nextId++ }));
}

export default function SceneCanvasEditor({ segmentNumber, elements: initialElements, bgColor, onSave, onClose }) {
  const [elements, setElements] = useState(() => withIds(initialElements));
  const [selectedId, setSelectedId] = useState(null);
  const [assets, setAssets] = useState(null);
  const [assetTab, setAssetTab] = useState('pose');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Trạng thái kéo — ref thay vì state để tránh re-render trong mousemove
  const dragRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetch('/api/prompts/assets')
      .then(r => r.json())
      .then(setAssets)
      .catch(() => setAssets({ pose: [], prop: [], sym: [], bg: [] }));
  }, []);

  const selectedEl = elements.find(el => el._id === selectedId) ?? null;

  // ── Kéo thả ──────────────────────────────────────────────────────────────

  const handleElementMouseDown = useCallback((e, el) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(el._id);
    const rect = canvasRef.current.getBoundingClientRect();
    const { left, top } = elementToPx(el);
    dragRef.current = {
      id: el._id,
      startMouseX: e.clientX - rect.left,
      startMouseY: e.clientY - rect.top,
      origLeft: left,
      origTop: top,
    };
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!dragRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = (e.clientX - rect.left) - dragRef.current.startMouseX;
    const dy = (e.clientY - rect.top)  - dragRef.current.startMouseY;
    const newLeft = dragRef.current.origLeft + dx;
    const newTop  = dragRef.current.origTop  + dy;

    setElements(prev => prev.map(el => {
      if (el._id !== dragRef.current.id) return el;
      const size = BASE_SIZE * (el.scale ?? 1);
      const { x, y } = pxToPercent(newLeft, newTop, size, el.anchor ?? 'center');
      return { ...el, x, y };
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // ── Cập nhật phần tử được chọn ───────────────────────────────────────────

  const updateSelected = (field, value) => {
    if (selectedId === null) return;
    setElements(prev => prev.map(el => el._id === selectedId ? { ...el, [field]: value } : el));
  };

  const removeSelected = () => {
    setElements(prev => prev.filter(el => el._id !== selectedId));
    setSelectedId(null);
  };

  const bringForward = () => {
    if (!selectedEl) return;
    updateSelected('zIndex', (selectedEl.zIndex ?? 0) + 1);
  };

  const sendBackward = () => {
    if (!selectedEl) return;
    updateSelected('zIndex', Math.max(0, (selectedEl.zIndex ?? 0) - 1));
  };

  // ── Thêm asset từ thư viện ───────────────────────────────────────────────

  const addAsset = (assetId) => {
    const isBottomAnchored = assetId.startsWith('pose_') || assetId.startsWith('prop_');
    const newEl = {
      asset: assetId,
      x: 50,
      y: isBottomAnchored ? 85 : 40,
      scale: 1,
      flip: false,
      delay: 0,
      anchor: isBottomAnchored ? 'bottom' : 'center',
      zIndex: elements.length,
      _id: _nextId++,
    };
    setElements(prev => [...prev, newEl]);
    setSelectedId(newEl._id);
  };

  // ── Xuất elements (bỏ _id nội bộ trước khi lưu) ─────────────────────────

  const exportElements = () =>
    elements.map(({ _id, ...rest }) => rest);

  // ── Lưu ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg('');
    try {
      await onSave(exportElements());
      // onSave sẽ đóng modal nếu thành công
    } catch (err) {
      setSaveMsg(`Lỗi: ${err.message}`);
      setIsSaving(false);
    }
  };

  const sortedElements = [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '12px',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div style={{
        background: '#16162a',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '16px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        width: 'min(820px, 100%)',
        maxHeight: '94vh',
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
      }}>

        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
              ✏️ Sửa Canvas — Slide {segmentNumber}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', marginLeft: '10px' }}>
              Kéo thả để di chuyển · Click để chọn · Click asset để thêm
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.7)',
              borderRadius: '8px', padding: '5px 12px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>

        {/* ─── Body ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '18px', flex: 1, minHeight: 0 }}>

          {/* Canvas */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div
              ref={canvasRef}
              style={{
                position: 'relative',
                width: `${CANVAS_W}px`,
                height: `${CANVAS_H}px`,
                background: bgColor || '#FFFFFF',
                borderRadius: '10px',
                overflow: 'hidden',
                boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
                cursor: dragRef.current ? 'grabbing' : 'default',
                userSelect: 'none',
                flexShrink: 0,
                outline: '2px solid rgba(255,255,255,0.15)',
              }}
              onClick={e => {
                if (e.target === canvasRef.current) setSelectedId(null);
              }}
            >
              {sortedElements.map(el => {
                const { left, top, size } = elementToPx(el);
                const isSelected = el._id === selectedId;
                return (
                  <div
                    key={el._id}
                    style={{
                      position: 'absolute',
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${size}px`,
                      height: `${size}px`,
                      transform: el.flip ? 'scaleX(-1)' : undefined,
                      cursor: 'grab',
                      outline: isSelected ? '2px solid #fe2c55' : '2px solid transparent',
                      outlineOffset: '2px',
                      borderRadius: '3px',
                      boxSizing: 'border-box',
                    }}
                    onMouseDown={e => handleElementMouseDown(e, el)}
                  >
                    <img
                      src={assetUrl(el.asset)}
                      alt={el.asset}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', display: 'block' }}
                      draggable={false}
                    />
                  </div>
                );
              })}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem' }}>
              {elements.length} phần tử · 9:16
            </span>
          </div>

          {/* Controls + Asset Library */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0, overflow: 'hidden' }}>

            {/* Controls cho phần tử được chọn */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${selectedEl ? 'rgba(254,44,85,0.3)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '10px',
              padding: '12px',
              flexShrink: 0,
              minHeight: '130px',
            }}>
              {selectedEl ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <img src={assetUrl(selectedEl.asset)} style={{ width: '28px', height: '28px', objectFit: 'contain' }} alt="" />
                    <span style={{ color: '#fe2c55', fontWeight: 700, fontSize: '0.82rem' }}>
                      {selectedEl.asset}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', marginLeft: 'auto' }}>
                      x:{selectedEl.x} y:{selectedEl.y} z:{selectedEl.zIndex ?? 0}
                    </span>
                  </div>

                  <label style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📐 Scale
                    <strong style={{ color: '#fff', minWidth: '28px' }}>{(selectedEl.scale ?? 1).toFixed(2)}x</strong>
                    <input
                      type="range" min={0.2} max={3.5} step={0.05}
                      value={selectedEl.scale ?? 1}
                      onChange={e => updateSelected('scale', parseFloat(e.target.value))}
                      style={{ flex: 1 }}
                    />
                  </label>

                  <label style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⏱️ Delay
                    <strong style={{ color: '#fff', minWidth: '28px' }}>{(selectedEl.delay ?? 0).toFixed(1)}s</strong>
                    <input
                      type="range" min={0} max={2} step={0.1}
                      value={selectedEl.delay ?? 0}
                      onChange={e => updateSelected('delay', parseFloat(e.target.value))}
                      style={{ flex: 1 }}
                    />
                  </label>

                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {[
                      {
                        label: selectedEl.flip ? '↔️ Lật ON' : '↔️ Lật OFF',
                        active: selectedEl.flip,
                        onClick: () => updateSelected('flip', !selectedEl.flip),
                      },
                      {
                        label: selectedEl.anchor === 'bottom' ? '⚓ Neo Đáy' : '⚓ Neo Tâm',
                        active: false,
                        onClick: () => updateSelected('anchor', selectedEl.anchor === 'bottom' ? 'center' : 'bottom'),
                      },
                      { label: '↑ Lên', active: false, onClick: bringForward },
                      { label: '↓ Xuống', active: false, onClick: sendBackward },
                    ].map(btn => (
                      <button
                        key={btn.label}
                        onClick={btn.onClick}
                        style={{
                          padding: '4px 10px', fontSize: '0.72rem', borderRadius: '7px', fontWeight: 700,
                          background: btn.active ? '#fe2c55' : 'rgba(255,255,255,0.09)',
                          color: '#fff', border: 'none', cursor: 'pointer',
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                    <button
                      onClick={removeSelected}
                      style={{
                        padding: '4px 10px', fontSize: '0.72rem', borderRadius: '7px', fontWeight: 700,
                        background: 'rgba(255,50,50,0.18)', color: '#ff7675',
                        border: '1px solid rgba(255,50,50,0.3)', cursor: 'pointer',
                      }}
                    >
                      🗑️ Xóa
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '100%', color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', textAlign: 'center'
                }}>
                  Click vào phần tử trên canvas để chọn và chỉnh sửa
                </div>
              )}
            </div>

            {/* Thư viện Assets */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px', minHeight: 0 }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, flexShrink: 0 }}>
                📦 Thư viện — click để thêm vào canvas
              </div>

              {/* Tab buttons */}
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setAssetTab(key)}
                    style={{
                      padding: '4px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700,
                      background: assetTab === key ? '#fe2c55' : 'rgba(255,255,255,0.07)',
                      color: '#fff', border: 'none', cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Asset grid */}
              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {!assets ? (
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', textAlign: 'center', padding: '24px' }}>
                    Đang tải...
                  </div>
                ) : assets[assetTab]?.length === 0 ? (
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', textAlign: 'center', padding: '24px' }}>
                    Không có asset
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
                    gap: '5px',
                    padding: '2px',
                  }}>
                    {(assets[assetTab] || []).map(assetId => (
                      <AssetTile key={assetId} id={assetId} onClick={() => addAsset(assetId)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Footer ─────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '12px', flexShrink: 0
        }}>
          {saveMsg && (
            <span style={{
              fontSize: '0.78rem', fontWeight: 600, flex: 1,
              color: saveMsg.startsWith('Lỗi') ? '#ff7675' : '#55efc4'
            }}>
              {saveMsg}
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 18px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700,
                background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', cursor: 'pointer'
              }}
            >
              ✕ Huỷ
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: '8px 22px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700,
                background: isSaving ? 'rgba(254,44,85,0.45)' : '#fe2c55',
                color: '#fff', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {isSaving ? '⏳ Đang lưu...' : '💾 Lưu Canvas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component tile riêng để tránh closure stale trong hover
function AssetTile({ id, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={id}
      style={{
        background: hovered ? 'rgba(254,44,85,0.18)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${hovered ? 'rgba(254,44,85,0.45)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '7px',
        padding: '5px',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'background 0.12s, border-color 0.12s',
      }}
    >
      <img
        src={assetUrl(id)}
        alt={id}
        style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain', display: 'block' }}
      />
      <div style={{
        color: 'rgba(255,255,255,0.5)',
        fontSize: '0.58rem',
        marginTop: '3px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}>
        {id.replace(/^(pose|prop|sym|bg)_/, '')}
      </div>
    </div>
  );
}
