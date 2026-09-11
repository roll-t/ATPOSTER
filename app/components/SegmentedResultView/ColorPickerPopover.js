'use client';

import React, { useState, useRef, useEffect } from 'react';

// Bảng màu mẫu phong phú lấy cảm hứng từ CapCut (Monochrome, Neon, Pastel, Gold, Brand)
const PRESET_COLORS = [
  // Hàng 1: Trắng, xám, đen, đỏ thương hiệu
  '#FFFFFF', '#E5E7EB', '#9CA3AF', '#4B5563', '#1F2937', '#000000', '#FF4757', '#FE2C55',
  // Hàng 2: Hồng, tím, tím than, tím đậm
  '#FF6B81', '#EC4899', '#DB2777', '#BE185D', '#8B5CF6', '#7C3AED', '#6C5CE7', '#5352ED',
  // Hàng 3: Xanh dương, cyan neon, ngọc bích, xanh lá
  '#3742FA', '#1E90FF', '#0EA5E9', '#25F4EE', '#00D2D3', '#10B981', '#2ED573', '#059669',
  // Hàng 4: Vàng chanh, vàng kim đạo lý, cam, đào
  '#FFD32A', '#FED330', '#F59E0B', '#D9A620', '#FFA502', '#FF7F50', '#FF6348', '#ECCC68'
];

function formatDisplayColor(c) {
  if (!c) return '#000000';
  const str = String(c).trim();
  if (str.startsWith('#')) return str.toUpperCase();
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (m) {
    const r = Number(m[1]).toString(16).padStart(2, '0');
    const g = Number(m[2]).toString(16).padStart(2, '0');
    const b = Number(m[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toUpperCase();
  }
  return str.toUpperCase();
}

export default function ColorPickerPopover({
  color = '#d9a620',
  onChange,
  label = 'Chọn màu',
  align = 'right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(color || '#d9a620');
  const containerRef = useRef(null);
  const colorInputRef = useRef(null);

  // Đồng bộ hexInput khi prop color đổi
  useEffect(() => {
    setHexInput(color || '#d9a620');
  }, [color]);

  // Đóng popover khi click ra ngoài hoặc bấm phím Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleHexChange = (val) => {
    setHexInput(val);
    let formatted = val.trim();
    if (!formatted.startsWith('#')) formatted = '#' + formatted;
    if (/^#([0-9A-F]{3}){1,2}$/i.test(formatted)) {
      onChange?.(formatted);
    }
  };

  const handleSelectColor = (selected) => {
    setHexInput(selected);
    onChange?.(selected);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Nút bấm hiển thị 1 ô màu duy nhất theo kiểu CapCut */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 8px 4px 6px',
          background: 'rgba(255, 255, 255, 0.06)',
          border: isOpen ? '1px solid #25f4ee' : '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 10px rgba(37, 244, 238, 0.25)' : 'none',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap'
        }}
        title={`${label}: ${color}`}
      >
        <span
          style={{
            width: '28px',
            height: '20px',
            borderRadius: '5px',
            backgroundColor: color,
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: `0 0 6px ${color}66`,
            display: 'inline-block',
            flexShrink: 0
          }}
        />
        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
          {formatDisplayColor(color)}
        </span>
        <span
          style={{
            fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.6)',
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        >
          ▼
        </span>
      </button>

      {/* Popover bảng màu xổ ra khi ấn vào ô màu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            ...(align === 'left' ? { left: 0 } : { right: 0 }),
            width: '268px',
            backgroundColor: '#1b1c22',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '12px',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255,255,255,0.06)',
            padding: '12px',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Hàng trên: Xem trước màu, nút chọn màu tự do và ô nhập mã HEX */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: color,
                border: '1px solid rgba(255,255,255,0.25)',
                boxShadow: `0 0 10px ${color}88`,
                flexShrink: 0
              }}
              title="Màu hiện tại"
            />

            {/* Nút Eye Dropper / Native Color Picker */}
            <button
              type="button"
              onClick={() => colorInputRef.current?.click()}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
                fontSize: '0.85rem',
                flexShrink: 0
              }}
              title="Mở bảng pha màu chi tiết"
            >
              🎨
            </button>
            <input
              ref={colorInputRef}
              type="color"
              value={color}
              onChange={(e) => handleSelectColor(e.target.value)}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
            />

            {/* Ô nhập mã HEX */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flex: 1,
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                padding: '0 8px',
                height: '32px'
              }}
            >
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginRight: '4px', fontWeight: 600 }}>
                HEX
              </span>
              <input
                type="text"
                value={hexInput}
                onChange={(e) => handleHexChange(e.target.value)}
                maxLength={7}
                placeholder="#D9A620"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  fontFamily: 'monospace'
                }}
              />
            </div>
          </div>

          {/* Đường phân cách mảnh */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '2px 0' }} />

          {/* Tiêu đề phần bảng màu */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
              Bảng màu gợi ý (CapCut)
            </span>
          </div>

          {/* Lưới các ô màu mẫu */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: '6px'
            }}
          >
            {PRESET_COLORS.map((c) => {
              const isSelected = color?.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleSelectColor(c)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '5px',
                    backgroundColor: c,
                    border: isSelected ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.3)',
                    boxShadow: isSelected ? `0 0 8px ${c}` : 'none',
                    cursor: 'pointer',
                    transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.12s ease',
                    position: 'relative',
                    padding: 0
                  }}
                  title={c}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
