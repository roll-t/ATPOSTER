'use client';

import React from 'react';
import StepProgressBar from './StepProgressBar.js';

export default function VideoResultPanel({
  result,
  allHaveElements = false,
  assetCounts = {},
  videoVersion = 0,
  isRenderingVideo = false,
  renderProgress = 0,
  handleOpenVideoFolder,
  isOpeningFolder = false,
  openFolderError = '',
  musicChangedSinceRender = false,
  isRenderDone = false,
  handleRenderVideo
}) {
  const isPortrait =
    result?.remotionConfig?.orientation
      ? result.remotionConfig.orientation === 'portrait'
      : (result?.input?.aspectRatio ? result.input.aspectRatio === '9:16' : true);

  const isPexelsTalk = result?.category === 'pexels_talk_video';
  const isAutoImage = isPexelsTalk;

  const total = result?.segments?.length || 0;
  const isAudioReady = (assetCounts?.audioCount || 0) >= total && total > 0;
  const isImageReady = isAutoImage
    ? (isPexelsTalk ? !!assetCounts?.hasBgVideo : true)
    : ((assetCounts?.imageCount || 0) >= total && total > 0);
  const hasVideo = !!assetCounts?.videoCreated;

  const folderPath = result?.input?.folderPath || 'example';
  const category = result?.category || '';
  const videoSrc = `/api/prompts/video-stream?folderPath=${encodeURIComponent(folderPath)}&category=${encodeURIComponent(category)}&v=${videoVersion}`;
  const downloadSrc = `/api/prompts/video-stream?folderPath=${encodeURIComponent(folderPath)}&category=${encodeURIComponent(category)}&download=1`;

  return (
    <div
      className="glass-card"
      style={{
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        background: 'rgba(255, 255, 255, 0.025)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.36)'
      }}
    >
      {/* Header của cột Kết quả */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>🎬</span>
          <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#fff' }}>
            Kết quả Video
          </h4>
        </div>

        {/* Badge trạng thái */}
        <span
          style={{
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.3px',
            background: isRenderingVideo
              ? 'rgba(99, 102, 241, 0.2)'
              : hasVideo
              ? 'rgba(16, 185, 129, 0.15)'
              : 'rgba(255, 255, 255, 0.06)',
            color: isRenderingVideo
              ? '#818cf8'
              : hasVideo
              ? '#10b981'
              : 'rgba(255, 255, 255, 0.65)',
            border: isRenderingVideo
              ? '1px solid rgba(99, 102, 241, 0.4)'
              : hasVideo
              ? '1px solid rgba(16, 185, 129, 0.3)'
              : '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {isRenderingVideo ? `⏳ Đang xuất (${renderProgress}%)` : hasVideo ? '✓ Video thành phẩm' : 'Chờ xuất bản'}
        </span>
      </div>

      {/* Trường hợp 1: ĐÃ CÓ VIDEO THÀNH PHẨM */}
      {hasVideo ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Video Player */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              borderRadius: '10px',
              overflow: 'hidden',
              background: '#000',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <video
              key={`${folderPath}-${videoVersion}`}
              src={videoSrc}
              controls
              playsInline
              style={{
                width: '100%',
                maxHeight: isPortrait ? '480px' : '340px',
                display: 'block',
                outline: 'none',
                background: '#000'
              }}
            />
          </div>

          {/* Thanh công cụ thao tác */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                flex: 1,
                padding: '6px 12px',
                fontSize: '0.76rem',
                borderRadius: '7px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
              onClick={handleOpenVideoFolder}
              disabled={isOpeningFolder}
            >
              <span>{isOpeningFolder ? '⏳' : '📂'}</span>
              <span>{isOpeningFolder ? 'Đang mở...' : 'Mở thư mục'}</span>
            </button>

            <a
              href={downloadSrc}
              download
              className="btn btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.76rem',
                borderRadius: '7px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
                color: 'inherit',
                whiteSpace: 'nowrap'
              }}
              title="Tải video về máy tính"
            >
              <span>⬇️</span>
              <span>Tải về</span>
            </a>

            {handleRenderVideo && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.76rem',
                  borderRadius: '7px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
                onClick={() => handleRenderVideo(result?.segments)}
                disabled={isRenderingVideo}
                title="Xuất lại video với các thay đổi mới"
              >
                <span>🔄</span>
                <span>Tạo lại</span>
              </button>
            )}
          </div>

          {openFolderError && (
            <div style={{ fontSize: '0.74rem', color: 'var(--danger)', background: 'rgba(255, 71, 87, 0.08)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255, 71, 87, 0.2)' }}>
              ⚠️ {openFolderError}
            </div>
          )}

          {/* Cảnh báo nhạc nền thay đổi */}
          {musicChangedSinceRender && isRenderDone && !isRenderingVideo && (
            <div style={{ fontSize: '0.76rem', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.25)', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🎵 Nhạc nền vừa thay đổi — nhấn <strong>"Tạo lại"</strong> để cập nhật vào video.
            </div>
          )}

          {/* Thông số video tóm tắt */}
          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '0.78rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255, 255, 255, 0.6)' }}>
              <span>Định dạng khung hình:</span>
              <strong style={{ color: '#fff' }}>{isPortrait ? 'Dọc 9:16 (Shorts/TikTok/Reels)' : 'Ngang 16:9 (YouTube)'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255, 255, 255, 0.6)' }}>
              <span>Tổng số phân cảnh:</span>
              <strong style={{ color: '#fff' }}>{total} cảnh</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255, 255, 255, 0.6)' }}>
              <span>Thư mục tài nguyên:</span>
              <span style={{ color: 'var(--secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={folderPath}>
                {folderPath}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Trường hợp 2: MÀN HÌNH CHỜ KẾT QUẢ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Khung mô phỏng màn hình phát video */}
          <div
            style={{
              width: '100%',
              aspectRatio: isPortrait ? '9 / 16' : '16 / 9',
              maxHeight: isPortrait ? '440px' : '280px',
              borderRadius: '12px',
              background: isRenderingVideo
                ? 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.12) 0%, rgba(10, 15, 30, 0.8) 100%)'
                : 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.03) 0%, rgba(0, 0, 0, 0.6) 100%)',
              border: isRenderingVideo
                ? '1.5px solid rgba(99, 102, 241, 0.5)'
                : '1.5px dashed rgba(255, 255, 255, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 20px',
              textAlign: 'center',
              position: 'relative',
              boxShadow: isRenderingVideo
                ? '0 0 30px rgba(99, 102, 241, 0.2)'
                : 'inset 0 2px 10px rgba(0, 0, 0, 0.4)',
              overflow: 'hidden'
            }}
          >
            {isRenderingVideo ? (
              /* Trạng thái đang render video */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%', maxWidth: '300px' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    border: '3px solid rgba(255, 255, 255, 0.1)',
                    borderTopColor: '#10b981',
                    borderRightColor: '#6366f1',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                <div>
                  <h5 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '0.96rem', fontWeight: 800 }}>
                    Đang render video...
                  </h5>
                  <span style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    Đang ghép hình ảnh, lồng tiếng &amp; Remotion
                  </span>
                </div>
                <div style={{ width: '100%' }}>
                  <StepProgressBar
                    percent={renderProgress}
                    label={`${renderProgress}%`}
                    color="#10b981"
                    showShimmer={true}
                  />
                </div>
              </div>
            ) : (
              /* Trạng thái chờ kết quả */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.22))',
                    border: '1px solid rgba(168, 85, 247, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    boxShadow: '0 4px 18px rgba(168, 85, 247, 0.25)'
                  }}
                >
                  🎬
                </div>
                <h5 style={{ margin: 0, color: '#fff', fontSize: '0.92rem', fontWeight: 700 }}>
                  Màn hình chờ kết quả
                </h5>
                <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.55)', fontSize: '0.76rem', maxWidth: '280px', lineHeight: 1.5 }}>
                  Hoàn thành các bước bên trái và nhấn <strong>&quot;Tạo Video (Render)&quot;</strong> ở Bước {isAutoImage ? '3' : '4'} để xem video thành phẩm tại đây.
                </p>
              </div>
            )}
          </div>

          {/* Bảng checklist trạng thái chuẩn bị */}
          <div
            style={{
              padding: '14px 16px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Tiến độ chuẩn bị:
            </div>

            {/* Giọng lồng tiếng */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.85)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🎙️</span> Lồng tiếng (Bước 1):
              </span>
              <span style={{ fontWeight: 700, color: isAudioReady ? '#10b981' : '#fbbf24' }}>
                {isAudioReady ? `✓ Đã sẵn sàng (${assetCounts.audioCount || 0}/${total})` : `Chưa đủ (${assetCounts.audioCount || 0}/${total})`}
              </span>
            </div>

            {/* Hình ảnh */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.85)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🖼️</span> Hình ảnh {isAutoImage ? '' : '(Bước 2)'}:
              </span>
              <span style={{ fontWeight: 700, color: (isAutoImage ? '#10b981' : (isImageReady ? '#10b981' : '#fbbf24')) }}>
                {isPexelsTalk
                  ? (assetCounts?.hasBgVideo ? '✓ Đã tải video Pexels' : 'Chưa chọn video')
                  : isImageReady
                  ? `✓ Đã đủ ảnh (${assetCounts.imageCount || 0}/${total})`
                  : `Chưa đủ (${assetCounts.imageCount || 0}/${total})`}
              </span>
            </div>

            {/* Nhạc nền */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.85)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🎵</span> Nhạc nền {isAutoImage ? '(Bước 2)' : '(Bước 3)'}:
              </span>
              <span style={{ fontWeight: 700, color: '#10b981' }}>
                {assetCounts.hasBgMusic ? '✓ Đã chọn file nhạc' : '✓ Nhạc nền mặc định'}
              </span>
            </div>

            {/* Video thành phẩm */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.85)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🎬</span> Video thành phẩm {isAutoImage ? '(Bước 3)' : '(Bước 4)'}:
              </span>
              <span style={{ fontWeight: 700, color: isRenderingVideo ? '#818cf8' : 'rgba(255, 255, 255, 0.45)' }}>
                {isRenderingVideo ? '⏳ Đang render...' : 'Chưa xuất'}
              </span>
            </div>
          </div>

          {/* Nút Tạo video ngay nếu mọi tài nguyên đã sẵn sàng */}
          {isAudioReady && isImageReady && !isRenderingVideo && handleRenderVideo && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleRenderVideo(result?.segments)}
              style={{
                padding: '11px 16px',
                borderRadius: '8px',
                fontSize: '0.86rem',
                fontWeight: 800,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                cursor: 'pointer',
                border: 'none',
                color: '#fff',
                transition: 'all 0.15s ease'
              }}
            >
              <span>🎬</span>
              <span>Tạo Video ngay (Render)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
