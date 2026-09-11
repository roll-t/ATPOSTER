'use client';

import React from 'react';

/**
 * Danh sách các nền tảng video ngắn phổ biến hỗ trợ mô phỏng
 */
export const PLATFORMS = [
  { id: 'none', label: 'Tắt', icon: '🚫', color: '#64748b', desc: 'Giao diện gốc không có che phủ' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵', color: '#00f2fe', badgeBg: '#000000', desc: 'Mô phỏng icon tim, cmt, chia sẻ, đĩa nhạc TikTok' },
  { id: 'shorts', label: 'Shorts', icon: '🔴', color: '#ff0000', badgeBg: '#282828', desc: 'Mô phỏng nút Like, Đăng ký, Remix YouTube Shorts' },
  { id: 'reels', label: 'Reels', icon: '🔵', color: '#1877f2', badgeBg: '#1e293b', desc: 'Mô phỏng nút Like, Theo dõi, Chia sẻ FB Reels' },
  { id: 'zalo', label: 'Zalo', icon: '💬', color: '#0068ff', badgeBg: '#0f172a', desc: 'Mô phỏng giao diện Zalo Video ngắn' }
];

/**
 * Thanh nút chọn nền tảng mô phỏng đặt ở bên phải khung video
 */
export function PlatformSelectorToolbar({
  activePlatform = 'none',
  setActivePlatform,
  showSafeZoneGrid = false,
  setShowSafeZoneGrid,
  overlayOpacity = 0.85,
  setOverlayOpacity
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 8px',
        background: 'rgba(15, 17, 26, 0.94)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '14px',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(37, 244, 238, 0.08)',
        backdropFilter: 'blur(16px)',
        zIndex: 30,
        userSelect: 'none',
        flexShrink: 0
      }}
    >
      <div
        style={{
          fontSize: '0.66rem',
          fontWeight: 800,
          color: 'rgba(255, 255, 255, 0.65)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          textAlign: 'center',
          marginBottom: '2px',
          whiteSpace: 'nowrap'
        }}
        title="Mô phỏng giao diện nền tảng để căn chỉnh phụ đề & hình ảnh tránh bị che khuất"
      >
        📱 Giao diện
      </div>

      {/* Danh sách nút các nền tảng */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        {PLATFORMS.map((p) => {
          const isActive = activePlatform === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setActivePlatform?.(p.id)}
              title={`${p.label}: ${p.desc}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: isActive ? 800 : 600,
                cursor: 'pointer',
                border: isActive ? `1.5px solid ${p.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                background: isActive
                  ? `linear-gradient(135deg, ${p.color}26 0%, rgba(255, 255, 255, 0.08) 100%)`
                  : 'rgba(255, 255, 255, 0.04)',
                color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                boxShadow: isActive ? `0 0 12px ${p.color}40` : 'none',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{ width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '4px 0' }} />

      {/* Nút bật tắt Lưới vùng an toàn (Safe Zone) */}
      <button
        type="button"
        onClick={() => setShowSafeZoneGrid?.(!showSafeZoneGrid)}
        title="Bật/tắt hiển thị khung viền Vùng An Toàn (Safe Zone) để canh chữ không bị nút che"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '5px 8px',
          borderRadius: '7px',
          fontSize: '0.68rem',
          fontWeight: 700,
          cursor: 'pointer',
          width: '100%',
          justifyContent: 'center',
          border: showSafeZoneGrid ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.12)',
          background: showSafeZoneGrid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
          color: showSafeZoneGrid ? '#34d399' : 'rgba(255, 255, 255, 0.65)',
          boxShadow: showSafeZoneGrid ? '0 0 8px rgba(16, 185, 129, 0.3)' : 'none',
          transition: 'all 0.18s ease'
        }}
      >
        <span>📐</span>
        <span>Lưới an toàn</span>
      </button>

      {/* Nút chỉnh độ trong suốt của UI mô phỏng */}
      {activePlatform !== 'none' && (
        <button
          type="button"
          onClick={() => {
            const next = overlayOpacity >= 0.85 ? 0.5 : overlayOpacity >= 0.5 ? 0.25 : 0.85;
            setOverlayOpacity?.(next);
          }}
          title="Đổi độ mờ của giao diện che phủ (85% -> 50% -> 25%) để nhìn rõ video bên dưới"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '0.65rem',
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.04)',
            color: 'rgba(255, 255, 255, 0.6)'
          }}
        >
          <span>👁️ Độ mờ: {Math.round(overlayOpacity * 100)}%</span>
        </button>
      )}
    </div>
  );
}

/**
 * Thanh trạng thái thiết bị thực tế (Status Bar với Giờ, Dynamic Island, Pin, Sóng, Wi-Fi)
 */
function DeviceStatusBar() {
  return (
    <div
      style={{
        position: 'relative',
        padding: '7px 14px 2px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        boxSizing: 'border-box',
        color: '#ffffff',
        userSelect: 'none',
        zIndex: 25
      }}
    >
      {/* Giờ theo phong cách smartphone (góc trái) */}
      <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '-0.02em', minWidth: '40px', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
        9:41
      </span>

      {/* Dynamic Island / Cụm mắt camera thiết bị - CĂN CHÍNH GIỮA 100% THEO CHIỀU NGANG */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '7px',
          transform: 'translateX(-50%)',
          width: '72px',
          height: '15px',
          background: '#000000',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
          pointerEvents: 'none'
        }}
      >
        {/* Mắt camera trước chính giữa */}
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#0a0f1d', border: '1.2px solid #1e293b', boxShadow: 'inset 0 0 2px #000' }} />
        {/* Cảm biến FaceID */}
        <div style={{ width: '3.5px', height: '3.5px', borderRadius: '50%', background: '#05070e', opacity: 0.8 }} />
      </div>

      {/* Biểu tượng Sóng, Wi-Fi, Pin (góc phải) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: '40px', justifyContent: 'flex-end' }}>
        {/* Vạch sóng di động */}
        <svg width="13" height="10" viewBox="0 0 13 10" fill="#ffffff" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
          <rect x="0" y="7" width="2" height="3" rx="0.5" />
          <rect x="3.5" y="5" width="2" height="5" rx="0.5" />
          <rect x="7" y="3" width="2" height="7" rx="0.5" />
          <rect x="10.5" y="0.5" width="2" height="9.5" rx="0.5" />
        </svg>

        {/* Wi-Fi */}
        <svg width="13" height="10" viewBox="0 0 13 10" fill="#ffffff" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
          <path d="M6.5 7.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4zm-3.2-2.5a4.8 4.8 0 0 1 6.4 0 .8.8 0 0 1-1.1 1.1 3.2 3.2 0 0 0-4.2 0 .8.8 0 0 1-1.1-1.1zm-2.4-2.5a8.2 8.2 0 0 1 11.2 0 .8.8 0 0 1-1.1 1.1 6.6 6.6 0 0 0-9 0 .8.8 0 0 1-1.1-1.1z" />
        </svg>

        {/* Biểu tượng Pin */}
        <div style={{ display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
          <div style={{ width: '18px', height: '9px', border: '1.2px solid rgba(255, 255, 255, 0.9)', borderRadius: '2.8px', padding: '1px', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
            <div style={{ width: '85%', height: '100%', background: '#ffffff', borderRadius: '1px' }} />
          </div>
          <div style={{ width: '1.5px', height: '4px', background: 'rgba(255, 255, 255, 0.8)', borderRadius: '0 1px 1px 0', marginLeft: '0.5px' }} />
        </div>
      </div>
    </div>
  );
}

/**
 * Thanh gạt Home ở đáy màn hình thiết bị (Home Indicator bar)
 */
function DeviceHomeIndicator() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '5px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '36%',
        height: '3.5px',
        background: 'rgba(255, 255, 255, 0.85)',
        borderRadius: '9999px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.6)',
        pointerEvents: 'none',
        zIndex: 25
      }}
    />
  );
}

/**
 * Khung giao diện mô phỏng nền tảng che phủ lên bề mặt video
 */
export function PlatformMockupOverlay({
  platform = 'none',
  showSafeZoneGrid = false,
  overlayOpacity = 0.85,
  title = '',
  channelName = 'ATPOSTER'
}) {
  if (platform === 'none' && !showSafeZoneGrid) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        opacity: overlayOpacity,
        transition: 'opacity 0.2s ease'
      }}
    >
      {/* VÙNG AN TOÀN (SAFE ZONE GRID GUIDES) */}
      {showSafeZoneGrid && (
        <div
          style={{
            position: 'absolute',
            top: '12%',
            bottom: '22%',
            left: '6%',
            right: '18%',
            border: '2px dashed rgba(16, 185, 129, 0.8)',
            borderRadius: '8px',
            boxShadow: 'inset 0 0 12px rgba(16, 185, 129, 0.15)',
            pointerEvents: 'none',
            zIndex: 1
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '4px',
              left: '6px',
              fontSize: '0.62rem',
              fontWeight: 800,
              color: '#34d399',
              background: 'rgba(0, 0, 0, 0.75)',
              padding: '1px 6px',
              borderRadius: '4px',
              letterSpacing: '0.04em'
            }}
          >
            ✓ VÙNG AN TOÀN (SAFE ZONE)
          </div>
        </div>
      )}

      {/* THANH GẠT HOME DƯỚI ĐÁY THIẾT BỊ */}
      {platform !== 'none' && <DeviceHomeIndicator />}

      {/* 1. MÔ PHỎNG TIKTOK */}
      {platform === 'tiktok' && (
        <>
          {/* Cụm Top Header gồm Status Bar thiết bị + App Bar TikTok theo tỉ lệ thật */}
          <div style={{ width: '100%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 65%, transparent 100%)', display: 'flex', flexDirection: 'column', zIndex: 20 }}>
            <DeviceStatusBar />
            {/* Top Bar TikTok */}
            <div style={{ padding: '3px 14px 6px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.9 }}>LIVE</span>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.82rem', fontWeight: 800 }}>
                <span style={{ opacity: 0.65 }}>Đang Follow</span>
                <span style={{ borderBottom: '2.5px solid #fff', paddingBottom: '3px' }}>Dành cho bạn</span>
              </div>
              <span style={{ fontSize: '0.88rem' }}>🔍</span>
            </div>
          </div>

          {/* Right Action Bar TikTok */}
          <div style={{ position: 'absolute', right: '8px', bottom: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#fff' }}>
            {/* Avatar & Follow Plus */}
            <div style={{ position: 'relative', width: '38px', height: '38px', borderRadius: '50%', border: '1.5px solid #fff', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem' }}>
              👤
              <div style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)', width: '16px', height: '16px', borderRadius: '50%', background: '#fe2c55', color: '#fff', fontSize: '0.7rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                +
              </div>
            </div>

            {/* Like */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <span style={{ fontSize: '1.45rem', filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.7))' }}>❤️</span>
              <span style={{ fontSize: '0.66rem', fontWeight: 700, textShadow: '0 1px 3px #000' }}>142.8K</span>
            </div>

            {/* Comment */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <span style={{ fontSize: '1.35rem', filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.7))' }}>💬</span>
              <span style={{ fontSize: '0.66rem', fontWeight: 700, textShadow: '0 1px 3px #000' }}>2,410</span>
            </div>

            {/* Bookmark */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <span style={{ fontSize: '1.35rem', filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.7))' }}>🔖</span>
              <span style={{ fontSize: '0.66rem', fontWeight: 700, textShadow: '0 1px 3px #000' }}>18.6K</span>
            </div>

            {/* Share */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <span style={{ fontSize: '1.35rem', filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.7))' }}>↪️</span>
              <span style={{ fontSize: '0.66rem', fontWeight: 700, textShadow: '0 1px 3px #000' }}>9,240</span>
            </div>

            {/* Rotating Disc */}
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'radial-gradient(circle, #222 30%, #000 70%)', border: '3px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', marginTop: '4px' }}>
              🎵
            </div>
          </div>

          {/* Bottom Caption & Sound Bar TikTok */}
          <div style={{ padding: '0 12px 10px 12px', display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '78%', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>@{channelName.toLowerCase().replace(/\s+/g, '_')}</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 500, lineHeight: 1.3, opacity: 0.95 }}>
              {title ? title.slice(0, 50) : 'Video chia sẻ bài học cuộc sống'} #fyp #viral #baihoccuocsong
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', opacity: 0.9 }}>
              <span>♫</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Âm thanh gốc - {channelName}</span>
            </div>
          </div>
        </>
      )}

      {/* 2. MÔ PHỎNG YOUTUBE SHORTS */}
      {platform === 'shorts' && (
        <>
          {/* Cụm Top Header gồm Status Bar thiết bị + App Bar YouTube Shorts theo tỉ lệ thật */}
          <div style={{ width: '100%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 65%, transparent 100%)', display: 'flex', flexDirection: 'column', zIndex: 20 }}>
            <DeviceStatusBar />
            {/* Top Bar Shorts */}
            <div style={{ padding: '3px 14px 6px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>Shorts</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '0.88rem' }}>🔍</span>
                <span style={{ fontSize: '0.88rem' }}>📷</span>
                <span style={{ fontSize: '0.88rem' }}>⋮</span>
              </div>
            </div>
          </div>

          {/* Right Action Bar Shorts */}
          <div style={{ position: 'absolute', right: '8px', bottom: '70px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', color: '#fff' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <span style={{ fontSize: '1.4rem' }}>👍</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>45K</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <span style={{ fontSize: '1.4rem' }}>👎</span>
              <span style={{ fontSize: '0.62rem', fontWeight: 600 }}>Không thích</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <span style={{ fontSize: '1.35rem' }}>💬</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>890</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <span style={{ fontSize: '1.35rem' }}>↪️</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Chia sẻ</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <span style={{ fontSize: '1.35rem' }}>✂️</span>
              <span style={{ fontSize: '0.62rem', fontWeight: 600 }}>Phối lại</span>
            </div>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#333', border: '1px solid #555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
              🎶
            </div>
          </div>

          {/* Bottom Channel Bar Shorts */}
          <div style={{ padding: '0 12px 8px 12px', display: 'flex', flexDirection: 'column', gap: '5px', maxWidth: '78%', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#dc2626', color: '#fff', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                ▶
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>@{channelName}</span>
              <span style={{ background: '#cc0000', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px' }}>
                Đăng ký
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title || 'Tên video YouTube Shorts bài học cuộc sống'}
            </span>
          </div>
        </>
      )}

      {/* 3. MÔ PHỎNG FACEBOOK REELS */}
      {platform === 'reels' && (
        <>
          {/* Cụm Top Header gồm Status Bar thiết bị + App Bar FB Reels theo tỉ lệ thật */}
          <div style={{ width: '100%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 65%, transparent 100%)', display: 'flex', flexDirection: 'column', zIndex: 20 }}>
            <DeviceStatusBar />
            {/* Top Bar Reels */}
            <div style={{ padding: '3px 14px 6px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>Reels</span>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.88rem' }}>
                <span>📷</span>
                <span>🔍</span>
                <span>⋮</span>
              </div>
            </div>
          </div>

          {/* Right Action Bar Reels */}
          <div style={{ position: 'absolute', right: '8px', bottom: '75px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '13px', color: '#fff' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <span style={{ fontSize: '1.4rem' }}>👍</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>28.5K</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <span style={{ fontSize: '1.35rem' }}>💬</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>342</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <span style={{ fontSize: '1.35rem' }}>↗️</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Chia sẻ</span>
            </div>
            <span style={{ fontSize: '1.2rem' }}>⋮</span>
          </div>

          {/* Bottom Channel Bar Reels */}
          <div style={{ padding: '0 12px 10px 12px', display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '78%', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#1877f2', color: '#fff', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                f
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{channelName}</span>
              <span style={{ border: '1px solid #fff', color: '#fff', fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>
                Theo dõi
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', opacity: 0.95, lineHeight: 1.3 }}>
              {title || 'Chia sẻ góc nhìn & bài học ứng xử trong cuộc sống.'}
            </span>
          </div>
        </>
      )}

      {/* 4. MÔ PHỎNG ZALO VIDEO */}
      {platform === 'zalo' && (
        <>
          {/* Cụm Top Header gồm Status Bar thiết bị + App Bar Zalo Video theo tỉ lệ thật */}
          <div style={{ width: '100%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 65%, transparent 100%)', display: 'flex', flexDirection: 'column', zIndex: 20 }}>
            <DeviceStatusBar />
            {/* Top Bar Zalo */}
            <div style={{ padding: '3px 14px 6px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.85rem' }}>←</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>Zalo Video</span>
              </div>
              <span style={{ fontSize: '0.88rem' }}>🔍</span>
            </div>
          </div>

          {/* Right Action Bar Zalo */}
          <div style={{ position: 'absolute', right: '8px', bottom: '75px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', color: '#fff' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <span style={{ fontSize: '1.4rem' }}>❤️</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>15.2K</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <span style={{ fontSize: '1.35rem' }}>💬</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>180</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <span style={{ fontSize: '1.35rem' }}>↗️</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Chia sẻ</span>
            </div>
          </div>

          {/* Bottom Channel Bar Zalo */}
          <div style={{ padding: '0 12px 10px 12px', display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '78%', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#0068ff', color: '#fff', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                Z
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{channelName}</span>
              <span style={{ background: '#0068ff', color: '#fff', fontSize: '0.62rem', fontWeight: 700, padding: '1px 7px', borderRadius: '9999px' }}>
                Quan tâm
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', opacity: 0.95, lineHeight: 1.3 }}>
              {title || 'Video ngắn tâm đắc mỗi ngày.'}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
