'use client';

import { useState } from 'react';

// Ảnh xem trước kiểu phụ đề — cập nhật thời gian thực (Real-time live preview) theo Font, Cỡ chữ,
// Màu chữ & Màu nền đang nhập.
export default function CaptionStylePreview({
  style,
  isLandscape = false,
  textColor,
  bgColor,
  font,
  fontSize,
  secondaryFontSize,
  highlightColor,
  isFullLiveScreen = false,
  showSafeZone = false,
  imageUrl = '',
  imageScale = 1,
  imageTranslateY = 0,
  captionMarginY = 0
}) {
  const strokeShadow = '-1.5px -1.5px 0 #000, 0 -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 0 0 #000, 1.5px 0 0 #000, -1.5px 1.5px 0 #000, 0 1.5px 0 #000, 1.5px 1.5px 0 #000';

  // Ảnh minh hoạ của slide 1 có thể chưa tồn tại (kịch bản vừa tạo, chưa chạy Bước 2 sinh ảnh) —
  // theo dõi lỗi tải để ẩn ảnh vỡ đi. Nhớ ĐÚNG URL đã hỏng thay vì một cờ boolean, để khi ảnh được
  // sinh xong (URL đổi vì có tham số phá cache) là tự thử lại ngay, không cần effect reset.
  const [failedImageUrl, setFailedImageUrl] = useState(null);
  const imageFailed = Boolean(imageUrl) && failedImageUrl === imageUrl;

  // Tính cỡ chữ xem trước trực quan. Trần trên (max) phải phủ hết khoảng giá trị người dùng có
  // thể nhập ở ô "Cỡ chữ nội dung" (16-120px, xem input type="number" bên dưới) — trước đây trần
  // chỉ 26px/17px (tính vừa đủ cho khoảng 40-58px thực), nên mọi giá trị lớn hơn ~58px đều bị ép
  // về CÙNG 1 kích thước hiển thị y hệt nhau trên preview — tăng cỡ chữ (vd 60 -> 100) trông như
  // không có tác dụng gì dù giá trị đã lưu đúng, khiến người dùng tưởng nhầm là "không lưu được".
  const defaultSize = isFullLiveScreen ? (isLandscape ? 16 : 15) : (isLandscape ? 12 : 11);
  const customPx = fontSize ? Number(fontSize) : null;
  const calcSize = customPx
    ? (isFullLiveScreen ? Math.min(58, Math.max(10, Math.round(customPx * 0.45))) : Math.min(34, Math.max(8, Math.round(customPx * 0.26))))
    : defaultSize;

  const mainFontSize = `${calcSize}px`;
  // Nếu người dùng đã đặt riêng "Cỡ chữ dòng dịch / Sub", tính preview theo đúng giá trị đó
  // (cùng công thức scale với dòng chính) thay vì luôn suy ra từ calcSize - 3px cố định.
  const customSubPx = secondaryFontSize ? Number(secondaryFontSize) : null;
  const calcSubSize = customSubPx
    ? (isFullLiveScreen ? Math.min(58, Math.max(8, Math.round(customSubPx * 0.45))) : Math.min(34, Math.max(7, Math.round(customSubPx * 0.26))))
    : Math.max(7, calcSize - 3);
  const subFontSize = `${calcSubSize}px`;
  const padding = isLandscape ? '6px 12px' : '5px 8px';
  const isTransparentBg = bgColor === 'transparent';

  const fontFamily = 'inherit';

  // Tỉ lệ scale dịch chuyển phụ đề trong preview so với thực tế (1080x1920)
  const scaleFactor = isFullLiveScreen ? 0.25 : 0.1;
  const visualMarginY = captionMarginY * scaleFactor;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: style === 'page' ? 'center' : style === 'hook' ? 'flex-start' : 'flex-end',
      justifyContent: 'center',
      padding: style === 'hook'
        ? (isFullLiveScreen ? (isLandscape ? '14px 12px 0' : '16px 10px 0') : (isLandscape ? '6px 8px 0' : '8px 8px 0'))
        : (isFullLiveScreen ? (isLandscape ? '0 12px 14px' : '0 10px 16px') : (isLandscape ? '0 8px 6px' : '0 8px 10px')),
      fontFamily,
      overflow: 'hidden'
    }}>
      {imageUrl && !imageFailed && (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
          <img
            src={imageUrl}
            alt=""
            // Kịch bản chưa sinh ảnh (hoặc ảnh chưa tải về xong) thì URL này trả 404 và trình duyệt
            // vẽ ra biểu tượng "ảnh vỡ" giữa khung xem trước — trông như giao diện bị lỗi. Ẩn hẳn
            // ảnh đi và để phần chú thích bên dưới giải thích, vì nền đen trống mới đúng là thứ
            // người dùng sẽ thấy ở những slide chưa có ảnh.
            onError={() => setFailedImageUrl(imageUrl)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${imageScale}) translateY(${imageTranslateY}%)`,
              transformOrigin: 'center center'
            }}
          />
        </div>
      )}
      {imageUrl && imageFailed && isFullLiveScreen && (
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '12%',
          textAlign: 'center',
          fontSize: '0.62rem',
          color: 'rgba(255,255,255,0.28)',
          padding: '0 12px',
          zIndex: 0
        }}>
          Chưa có ảnh minh hoạ — xem trước phần chữ trên nền đen
        </div>
      )}

      {/* Lớp phủ VÙNG AN TOÀN cho nền tảng short (chỉ khung dọc 9:16).
          Video render ra đúng chuẩn 1080x1920, nhưng khi xem thực tế có 2 thứ ăn mất nội dung:
            1. Máy màn hình DÀI (iPhone 14 Pro tỉ lệ 19.5:9): app lấp đầy chiều cao nên CẮT
               ~9% mỗi bên trái/phải (đo được: 97px trên khung 1080px).
            2. Giao diện TikTok/Reels ĐÈ LÊN video: thanh trên, khối caption + tên kênh + nhạc
               ở dưới, và cột nút Tim/Bình luận/Chia sẻ bên phải.
          Nội dung nằm trong các dải này vẫn được render nhưng người xem KHÔNG thấy. */}
      {isFullLiveScreen && showSafeZone && !isLandscape && (() => {
        const band = (extra) => ({
          position: 'absolute',
          background: 'rgba(255, 71, 87, 0.16)',
          borderColor: 'rgba(255, 71, 87, 0.55)',
          borderStyle: 'dashed',
          borderWidth: 0,
          zIndex: 5,
          pointerEvents: 'none',
          ...extra
        });
        const label = {
          position: 'absolute',
          fontSize: '0.5rem',
          fontWeight: 800,
          color: 'rgba(255,255,255,0.85)',
          textShadow: '0 1px 3px #000',
          whiteSpace: 'nowrap'
        };
        return (
          <>
            {/* Cắt 2 bên trên máy màn hình dài: 97/1080 = 9% mỗi bên */}
            <div style={band({ left: 0, top: 0, bottom: 0, width: '9%', borderRightWidth: 1 })} />
            <div style={band({ right: 0, top: 0, bottom: 0, width: '9%', borderLeftWidth: 1 })} />
            {/* UI TikTok che phía trên: ~220/1920 = 11.5% */}
            <div style={band({ left: 0, right: 0, top: 0, height: '11.5%', borderBottomWidth: 1 })} />
            {/* UI TikTok che phía dưới (caption/tên kênh/nhạc): từ 1570/1920 = 81.8% */}
            <div style={band({ left: 0, right: 0, top: '81.8%', bottom: 0, borderTopWidth: 1 })} />
            {/* Cột nút bên phải (Tim/Bình luận/Chia sẻ): x từ 900/1080 = 83.3% */}
            <div style={band({ right: 0, top: '31%', height: '51%', width: '16.7%', borderLeftWidth: 1 })} />
            <span style={{ ...label, left: '10.5%', top: '12.5%' }}>▲ UI che</span>
            <span style={{ ...label, left: '10.5%', bottom: '19%' }}>▼ UI che (caption, tên kênh)</span>
          </>
        );
      })()}

      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 1,
        transform: `translateY(${-visualMarginY}px)`
      }}>
        {style === 'tiktok' ? (
          <div style={{ textAlign: 'center', width: isFullLiveScreen ? '92%' : 'auto' }}>
            <div style={{ fontSize: mainFontSize, fontWeight: 700, color: textColor || '#fff', textShadow: strokeShadow, letterSpacing: '0.3px' }}>DON&apos;T</div>
            <div style={{ fontSize: subFontSize, fontWeight: 600, color: '#FFE14D', textShadow: strokeShadow, marginTop: '2px' }}>Đừng bỏ cuộc</div>
          </div>
        ) : style === 'karaoke' ? (
          <div style={{ background: isTransparentBg ? 'transparent' : (bgColor || 'rgba(10,10,14,0.85)'), borderRadius: '6px', padding, textAlign: 'center', width: isFullLiveScreen ? '90%' : 'auto', maxWidth: '95%' }}>
            <div style={{ fontSize: mainFontSize, fontWeight: 700, whiteSpace: 'nowrap' }}>
              <span style={{ background: '#FE2C55', color: '#fff', borderRadius: '3px', padding: '0 4px' }}>Don&apos;t</span>{' '}
              <span style={{ color: textColor || '#fff' }}>give up</span>
            </div>
            <div style={{ fontSize: subFontSize, fontWeight: 500, color: 'rgba(255,255,255,0.85)', marginTop: '2px', whiteSpace: 'nowrap' }}>Đừng bỏ cuộc</div>
          </div>
        ) : style === 'page' ? (
          <div style={{ background: isTransparentBg ? 'transparent' : (bgColor || '#FBF3E3'), border: isTransparentBg ? 'none' : '1px solid rgba(42,33,24,0.08)', borderRadius: '8px', padding, textAlign: 'center', width: isFullLiveScreen ? '88%' : 'auto', maxWidth: '92%' }}>
            <div style={{ fontSize: mainFontSize, fontWeight: 700, color: textColor || '#2A2118', lineHeight: 1.4 }}>
              Don&apos;t{' '}
              <span style={{ background: '#FFCB4D', color: '#2A2118', borderRadius: '3px', padding: '0 4px' }}>give</span>{' '}
              up.
            </div>
            <div style={{ fontSize: subFontSize, fontWeight: 500, color: 'rgba(42,33,24,0.65)', marginTop: '2px' }}>Đừng bỏ cuộc.</div>
          </div>
        ) : style === 'hook' ? (
          <div style={{ background: isTransparentBg ? 'transparent' : (bgColor || 'rgba(8,8,11,0.88)'), borderRadius: '10px', padding: isLandscape ? '18px 24px' : '16px 20px', textAlign: 'center', width: isFullLiveScreen ? '92%' : 'auto', maxWidth: '95%' }}>
            {/* Chữ hoa gõ SẴN trong text, không dùng CSS text-transform: uppercase — Chromium
                (engine Remotion dùng để render) không luôn ghép đúng dấu thanh tiếng Việt khi
                transform bằng CSS (vd "ừ" -> "Ừ" bị vỡ dấu), trong khi gõ hoa sẵn thì luôn đúng. */}
            <div style={{ fontSize: mainFontSize, fontWeight: 800, color: textColor || '#fff', lineHeight: 1.3, letterSpacing: '0.3px' }}>
              ĐỪNG <span style={{ color: highlightColor || '#FE2C55' }}>BỎ CUỘC</span>
            </div>
            <div style={{ fontSize: subFontSize, fontWeight: 500, color: 'rgba(255,255,255,0.75)', marginTop: '4px' }}>
              Don&apos;t give up
            </div>
          </div>
        ) : (
          <div style={{ background: isTransparentBg ? 'transparent' : (bgColor || 'rgba(10,10,14,0.85)'), borderRadius: '6px', padding, textAlign: 'center', width: isFullLiveScreen ? '90%' : 'auto', maxWidth: '95%' }}>
            <div style={{ fontSize: mainFontSize, fontWeight: 700, color: textColor || '#fff', whiteSpace: 'nowrap' }}>Don&apos;t give up</div>
            <div style={{ fontSize: subFontSize, fontWeight: 500, color: 'rgba(255,255,255,0.85)', marginTop: '2px', whiteSpace: 'nowrap' }}>Đừng bỏ cuộc</div>
          </div>
        )}
      </div>
    </div>
  );
}
