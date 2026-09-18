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
  enableScale = true,
  enableDrag = true,
  style = {},
  className = '',
  onClick,
  onPointerDown,
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

  const [lockedAxis, setLockedAxis] = useState(null); // 'x' | 'y' | null

  // Xử lý kéo di chuyển (Move) - Hỗ trợ ấn giữ Shift để khóa trục ngang hoặc dọc (Photoshop style)
  const handleMovePointerDown = useCallback((e) => {
    // Chỉ xử lý chuột trái hoặc touch
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const target = e.currentTarget;
    const pointerId = e.pointerId;
    if (pointerId !== undefined && target?.setPointerCapture) {
      try { target.setPointerCapture(pointerId); } catch (_) {}
    }

    setIsInteracting(true);
    setLockedAxis(null);
    onDragStartRef.current?.();

    const startX = e.clientX;
    const startY = e.clientY;
    let lastClientX = startX;
    let lastClientY = startY;

    const updatePosition = (clientX, clientY, isShiftHeld) => {
      lastClientX = clientX;
      lastClientY = clientY;

      let totalDeltaX = clientX - startX;
      let totalDeltaY = clientY - startY;
      let axis = null;

      // Khi ấn giữ Shift: khóa trục theo hướng di chuyển ưu thế
      if (isShiftHeld) {
        if (Math.abs(totalDeltaX) > Math.abs(totalDeltaY)) {
          totalDeltaY = 0;
          axis = 'x'; // Khóa trục ngang: chỉ di chuyển ngang
        } else {
          totalDeltaX = 0;
          axis = 'y'; // Khóa trục dọc: chỉ di chuyển dọc
        }
      }

      setLockedAxis(axis);
      onDragRef.current?.({
        deltaX: totalDeltaX,
        deltaY: totalDeltaY,
        shiftKey: isShiftHeld,
        lockedAxis: axis
      });
    };

    const handlePointerMove = (moveEvent) => {
      updatePosition(moveEvent.clientX, moveEvent.clientY, Boolean(moveEvent.shiftKey));
    };

    const handleKeyDown = (keyEvent) => {
      if (keyEvent.key === 'Shift') {
        updatePosition(lastClientX, lastClientY, true);
      }
    };

    const handleKeyUp = (keyEvent) => {
      if (keyEvent.key === 'Shift') {
        updatePosition(lastClientX, lastClientY, false);
      }
    };

    const handlePointerUp = () => {
      setIsInteracting(false);
      setLockedAxis(null);
      if (pointerId !== undefined && target?.releasePointerCapture) {
        try { target.releasePointerCapture(pointerId); } catch (_) {}
      }
      onDragEndRef.current?.();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  }, []);

  // Xử lý kéo 4 góc để thu phóng (Scale) - Tính tỉ lệ tổng (total ratio) từ tâm đối tượng
  const handleCornerScaleDown = useCallback((corner, e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const target = e.currentTarget;
    const pointerId = e.pointerId;
    if (pointerId !== undefined && target?.setPointerCapture) {
      try { target.setPointerCapture(pointerId); } catch (_) {}
    }

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
      if (pointerId !== undefined && target?.releasePointerCapture) {
        try { target.releasePointerCapture(pointerId); } catch (_) {}
      }
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

    const target = e.currentTarget;
    const pointerId = e.pointerId;
    if (pointerId !== undefined && target?.setPointerCapture) {
      try { target.setPointerCapture(pointerId); } catch (_) {}
    }

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
      if (pointerId !== undefined && target?.releasePointerCapture) {
        try { target.releasePointerCapture(pointerId); } catch (_) {}
      }
      onResizeWidthEndRef.current?.();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  }, []);

  const handleRootPointerDown = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target?.closest?.('button')) return;
    e.stopPropagation();
    onPointerDown?.(e);
    if (!active) {
      onClick?.(e);
    } else if (enableDrag) {
      handleMovePointerDown(e);
    }
  }, [active, enableDrag, onClick, onPointerDown, handleMovePointerDown]);

  const cornerSize = 8;
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
        height: '18px',
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
        touchAction: 'none',
        ...style
      }}
      onClick={onClick}
      onPointerDown={handleRootPointerDown}
    >
      {/* Nội dung thành phần gốc được bọc bên trong */}
      {children}

      {/* Khung Transform Bounding Box khi thành phần đang được kích hoạt */}
      {active && (
        <div
          style={{
            position: 'absolute',
            inset: boxInset,
            border: lockedAxis ? '1.5px dashed #FFE24A' : '1.5px dashed #25f4ee',
            borderRadius: '6px',
            pointerEvents: 'none',
            boxShadow: lockedAxis ? '0 0 14px rgba(254, 226, 74, 0.5)' : '0 0 12px rgba(37, 244, 238, 0.35)',
            zIndex: 20,
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          {/* Đường gióng trực quan khi khóa trục ngang (Shift) */}
          {lockedAxis === 'x' && (
            <div
              style={{
                position: 'absolute',
                left: '-2500px',
                right: '-2500px',
                top: '50%',
                height: '0px',
                borderTop: '1.5px dashed #FFE24A',
                boxShadow: '0 0 8px rgba(254, 226, 74, 0.8)',
                zIndex: 15,
                pointerEvents: 'none'
              }}
            />
          )}

          {/* Đường gióng trực quan khi khóa trục dọc (Shift) */}
          {lockedAxis === 'y' && (
            <div
              style={{
                position: 'absolute',
                top: '-2500px',
                bottom: '-2500px',
                left: '50%',
                width: '0px',
                borderLeft: '1.5px dashed #FFE24A',
                boxShadow: '0 0 8px rgba(254, 226, 74, 0.8)',
                zIndex: 15,
                pointerEvents: 'none'
              }}
            />
          )}

          {/* Badge thông tin & thanh điều hướng mini trên đỉnh Bounding Box */}
          {(() => {
            const invScale = counterScale > 0 ? Math.max(0.4, Math.min(2.5, 1 / counterScale)) : 1;
            const isOutsideBottom = badgePosition === 'outside-bottom';
            const isInsideBottom = badgePosition === 'inside-bottom';
            const isInsideTop = badgePosition === 'inside-top';
            const badgeTop = isInsideTop ? '8px' : (isOutsideBottom || isInsideBottom ? 'auto' : '-28px');
            const badgeBottom = isOutsideBottom ? '-28px' : (isInsideBottom ? '8px' : 'auto');
            const badgeOrigin = (isInsideTop || isOutsideBottom) ? 'top center' : 'bottom center';
            return (
              <div
                style={{
                  position: 'absolute',
                  top: badgeTop,
                  bottom: badgeBottom,
                  left: '50%',
                  transform: `translateX(-50%) scale(${invScale})`,
                  transformOrigin: badgeOrigin,
                  background: 'rgba(11, 15, 25, 0.94)',
                  border: lockedAxis ? '1px solid rgba(254, 226, 74, 0.65)' : '1px solid rgba(37, 244, 238, 0.45)',
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
            <span style={{ color: lockedAxis ? '#FFE24A' : '#25f4ee' }}>
              {lockedAxis ? '🔒' : '✥'}
            </span>
            <span>{label}</span>
            {lockedAxis === 'x' && (
              <span style={{ color: '#FFE24A', background: 'rgba(254, 226, 74, 0.18)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.58rem' }}>
                Khóa trục Ngang (Shift)
              </span>
            )}
            {lockedAxis === 'y' && (
              <span style={{ color: '#FFE24A', background: 'rgba(254, 226, 74, 0.18)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.58rem' }}>
                Khóa trục Dọc (Shift)
              </span>
            )}
            {detail && !lockedAxis && <span style={{ color: 'rgba(255, 255, 255, 0.65)' }}>• {detail}</span>}
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
          {enableScale && (() => {
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
