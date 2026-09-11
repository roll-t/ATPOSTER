'use client';

import React, { useRef, useState, useCallback } from 'react';

/**
 * Component hiển thị khung bao và điểm neo điều khiển tương tác (Photoshop-style Transform Gizmo)
 * Hỗ trợ:
 * - Kéo rê thân đối tượng để dịch chuyển vị trí (Drag to Move).
 * - Kéo 4 góc neo để thu phóng kích thước (Corner Scale Handles).
 * - Badge thông số trực quan và nút đóng chọn.
 */
export default function TransformGizmoOverlay({
  active = false,
  label = 'Thành phần',
  detail = '',
  boxInset = '-4px',
  counterScale = 1,
  badgePosition = 'outside-top', // 'outside-top' | 'inside-top'
  enableHorizontalResize = false,
  style = {},
  className = '',
  onClick,
  onDragStart,
  onDrag,
  onDragEnd,
  onScaleStart,
  onScale,
  onScaleEnd,
  onResizeWidthStart,
  onResizeWidth,
  onResizeWidthEnd,
  onDeselect,
  onReset,
  children
}) {
  const containerRef = useRef(null);
  const [isInteracting, setIsInteracting] = useState(false);

  // Lưu ref cho các callback để luôn gọi bản mới nhất trong sự kiện window pointermove mà không lo stale closure
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragRef = useRef(onDrag);
  onDragRef.current = onDrag;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const onScaleStartRef = useRef(onScaleStart);
  onScaleStartRef.current = onScaleStart;
  const onScaleRef = useRef(onScale);
  onScaleRef.current = onScale;
  const onScaleEndRef = useRef(onScaleEnd);
  onScaleEndRef.current = onScaleEnd;

  const onResizeWidthStartRef = useRef(onResizeWidthStart);
  onResizeWidthStartRef.current = onResizeWidthStart;
  const onResizeWidthRef = useRef(onResizeWidth);
  onResizeWidthRef.current = onResizeWidth;
  const onResizeWidthEndRef = useRef(onResizeWidthEnd);
  onResizeWidthEndRef.current = onResizeWidthEnd;

  // Xử lý kéo di chuyển (Move) - Tính độ dịch chuyển tổng (total delta) từ điểm xuất phát
  const handleMovePointerDown = useCallback((e) => {
    // Chỉ xử lý chuột trái hoặc touch
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();

    setIsInteracting(true);
    onDragStartRef.current?.();

    const startX = e.clientX;
    const startY = e.clientY;

    const handlePointerMove = (moveEvent) => {
      const totalDeltaX = moveEvent.clientX - startX;
      const totalDeltaY = moveEvent.clientY - startY;
      onDragRef.current?.({ deltaX: totalDeltaX, deltaY: totalDeltaY });
    };

    const handlePointerUp = () => {
      setIsInteracting(false);
      onDragEndRef.current?.();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  }, []);

  // Xử lý kéo 4 góc để thu phóng (Scale) - Tính tỉ lệ tổng (total ratio) từ tâm đối tượng
  const handleCornerScaleDown = useCallback((corner, e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    setIsInteracting(true);
    onScaleStartRef.current?.(corner);

    const rect = containerRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : e.clientX;
    const centerY = rect ? rect.top + rect.height / 2 : e.clientY;

    const initialDistance = Math.hypot(e.clientX - centerX, e.clientY - centerY) || 1;

    const handlePointerMove = (moveEvent) => {
      const currentDistance = Math.hypot(moveEvent.clientX - centerX, moveEvent.clientY - centerY);
      const ratio = currentDistance / initialDistance;
      const deltaDistance = currentDistance - initialDistance;
      onScaleRef.current?.({ ratio, deltaDistance, corner });
    };

    const handlePointerUp = () => {
      setIsInteracting(false);
      onScaleEndRef.current?.();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  }, []);

  // Xử lý kéo tay cầm trái/phải để co giãn độ rộng ngang (Horizontal Resize Width)
  const handleHorizontalResizeDown = useCallback((side, e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    setIsInteracting(true);
    onResizeWidthStartRef.current?.(side);

    const startX = e.clientX;
    const rect = containerRef.current?.getBoundingClientRect();
    const initialWidth = rect ? rect.width : 200;

    const handlePointerMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // Kéo tay cầm phải (e): kéo sang phải (deltaX > 0) -> tăng độ rộng
      // Kéo tay cầm trái (w): kéo sang trái (deltaX < 0) -> tăng độ rộng
      const effectiveDeltaX = side === 'e' ? deltaX : -deltaX;
      onResizeWidthRef.current?.({
        deltaX,
        effectiveDeltaX,
        side,
        initialWidth
      });
    };

    const handlePointerUp = () => {
      setIsInteracting(false);
      onResizeWidthEndRef.current?.();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  }, []);

  const cornerSize = 10;
  const hitSize = 24;
  const hitOffset = -hitSize / 2;

  const hitStyle = {
    position: 'absolute',
    width: `${hitSize}px`,
    height: `${hitSize}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 35,
    pointerEvents: 'auto',
    touchAction: 'none'
  };

  const handleVisual = (
    <div
      style={{
        width: `${cornerSize}px`,
        height: `${cornerSize}px`,
        background: '#ffffff',
        border: '1.5px solid #25f4ee',
        borderRadius: '2px',
        boxShadow: '0 0 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(37, 244, 238, 0.7)',
        boxSizing: 'border-box'
      }}
    />
  );

  const horizontalHandleVisual = (
    <div
      style={{
        width: '6px',
        height: '16px',
        background: '#ffffff',
        border: '1.5px solid #25f4ee',
        borderRadius: '3px',
        boxShadow: '0 0 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(37, 244, 238, 0.7)',
        boxSizing: 'border-box'
      }}
    />
  );

  return (
    <div
      ref={containerRef}
      data-transform-gizmo={active ? 'active' : 'inactive'}
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: active ? 'move' : 'pointer',
        userSelect: 'none',
        ...style
      }}
      onClick={onClick}
      onPointerDown={active ? handleMovePointerDown : undefined}
    >
      {/* Nội dung thành phần gốc được bọc bên trong */}
      {children}

      {/* Khung Transform Bounding Box khi thành phần đang được kích hoạt */}
      {active && (
        <div
          style={{
            position: 'absolute',
            inset: boxInset,
            border: '1.5px dashed #25f4ee',
            borderRadius: '6px',
            pointerEvents: 'none',
            boxShadow: '0 0 12px rgba(37, 244, 238, 0.35)',
            zIndex: 20
          }}
        >
          {/* Badge thông tin & thanh điều hướng mini trên đỉnh Bounding Box */}
          {(() => {
            const invScale = counterScale > 0 ? Math.max(0.4, Math.min(2.5, 1 / counterScale)) : 1;
            return (
              <div
                style={{
                  position: 'absolute',
                  top: badgePosition === 'inside-top' ? '8px' : '-28px',
                  left: '50%',
                  transform: `translateX(-50%) scale(${invScale})`,
                  transformOrigin: badgePosition === 'inside-top' ? 'top center' : 'bottom center',
                  background: 'rgba(11, 15, 25, 0.94)',
              border: '1px solid rgba(37, 244, 238, 0.45)',
              borderRadius: '9999px',
              padding: '2px 8px 2px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#ffffff',
              fontSize: '0.62rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.8)',
              pointerEvents: 'auto',
              backdropFilter: 'blur(8px)',
              zIndex: 30
            }}
          >
            <span style={{ color: '#25f4ee' }}>✥</span>
            <span>{label}</span>
            {detail && <span style={{ color: 'rgba(255, 255, 255, 0.65)' }}>• {detail}</span>}
            {onReset && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onReset();
                }}
                title="Đặt lại vị trí/kích thước mặc định"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                  padding: '1px 3px',
                  borderRadius: '3px'
                }}
              >
                ↺
              </button>
            )}
            {onDeselect && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeselect();
                }}
                title="Bỏ chọn (hoặc nhấn Escape)"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  padding: '1px 3px',
                  borderRadius: '3px'
                }}
              >
                ✕
              </button>
            )}
              </div>
            );
          })()}

          {/* 4 ĐIỂM NEO THU PHÓNG (CORNER SCALE HANDLES) - Vùng bấm rộng 24px dễ trúng */}
          {(() => {
            const invScale = counterScale > 0 ? Math.max(0.4, Math.min(2.5, 1 / counterScale)) : 1;
            const handleScaleStyle = {
              transform: `scale(${invScale})`,
              transformOrigin: 'center center'
            };
            return (
              <>
                {/* Top-Left */}
                <div
                  onPointerDown={(e) => handleCornerScaleDown('nw', e)}
                  style={{
                    ...hitStyle,
                    ...handleScaleStyle,
                    top: `${hitOffset}px`,
                    left: `${hitOffset}px`,
                    cursor: 'nwse-resize'
                  }}
                  title="Kéo góc để thu phóng kích thước"
                >
                  {handleVisual}
                </div>
                {/* Top-Right */}
                <div
                  onPointerDown={(e) => handleCornerScaleDown('ne', e)}
                  style={{
                    ...hitStyle,
                    ...handleScaleStyle,
                    top: `${hitOffset}px`,
                    right: `${hitOffset}px`,
                    cursor: 'nesw-resize'
                  }}
                  title="Kéo góc để thu phóng kích thước"
                >
                  {handleVisual}
                </div>
                {/* Bottom-Left */}
                <div
                  onPointerDown={(e) => handleCornerScaleDown('sw', e)}
                  style={{
                    ...hitStyle,
                    ...handleScaleStyle,
                    bottom: `${hitOffset}px`,
                    left: `${hitOffset}px`,
                    cursor: 'nesw-resize'
                  }}
                  title="Kéo góc để thu phóng kích thước"
                >
                  {handleVisual}
                </div>
                {/* Bottom-Right */}
                <div
                  onPointerDown={(e) => handleCornerScaleDown('se', e)}
                  style={{
                    ...hitStyle,
                    ...handleScaleStyle,
                    bottom: `${hitOffset}px`,
                    right: `${hitOffset}px`,
                    cursor: 'nwse-resize'
                  }}
                  title="Kéo góc để thu phóng kích thước"
                >
                  {handleVisual}
                </div>

                {/* 2 TAY CẦM KÉO CO GIÃN ĐỘ RỘNG NGANG (LEFT & RIGHT RESIZE HANDLES) */}
                {enableHorizontalResize && (
                  <>
                    {/* Middle-Left */}
                    <div
                      onPointerDown={(e) => handleHorizontalResizeDown('w', e)}
                      style={{
                        ...hitStyle,
                        top: '50%',
                        left: `${hitOffset}px`,
                        transform: `translateY(-50%) scale(${invScale})`,
                        transformOrigin: 'center center',
                        cursor: 'ew-resize'
                      }}
                      title="Kéo sang hai bên để co giãn độ rộng chữ"
                    >
                      {horizontalHandleVisual}
                    </div>
                    {/* Middle-Right */}
                    <div
                      onPointerDown={(e) => handleHorizontalResizeDown('e', e)}
                      style={{
                        ...hitStyle,
                        top: '50%',
                        right: `${hitOffset}px`,
                        transform: `translateY(-50%) scale(${invScale})`,
                        transformOrigin: 'center center',
                        cursor: 'ew-resize'
                      }}
                      title="Kéo sang hai bên để co giãn độ rộng chữ"
                    >
                      {horizontalHandleVisual}
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
