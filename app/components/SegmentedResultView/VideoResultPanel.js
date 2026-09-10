'use client';

import React, { useState } from 'react';
import StepProgressBar from './StepProgressBar.js';
import LiveVideoSimulator from './LiveVideoSimulator.js';

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
  handleRenderVideo,
  activeSceneIndex,
  onSceneIndexChange,
  onResult,
  resyncVoiceForSegments,
  checkAssets,
  bgMusicVersion,
  onUpdateRenderConfig
}) {
  const [viewMode, setViewMode] = useState('auto'); // 'auto' | 'rendered' | 'simulator'

  const isPortrait =
    result?.remotionConfig?.aspectRatio
      ? result.remotionConfig.aspectRatio === '9:16'
      : (result?.remotionConfig?.orientation
          ? result.remotionConfig.orientation === 'portrait'
          : (result?.input?.aspectRatio ? result.input.aspectRatio === '9:16' : (result?.aspectRatio ? result.aspectRatio === '9:16' : true)));

  const isPexelsTalk = result?.category === 'pexels_talk_video';
  const isAutoImage = isPexelsTalk;

  const total = result?.segments?.length || 0;
  const isAudioReady = (assetCounts?.audioCount || 0) >= total && total > 0;
  const isImageReady = isAutoImage
    ? (isPexelsTalk ? !!assetCounts?.hasBgVideo : true)
    : ((assetCounts?.imageCount || 0) >= total && total > 0);
  const hasVideo = !!assetCounts?.videoCreated;
  const canSimulate = (assetCounts?.audioCount > 0 || assetCounts?.imageCount > 0) && total > 0;

  const folderPath = result?.input?.folderPath || 'example';
  const category = result?.category || '';
  const videoSrc = `/api/prompts/video-stream?folderPath=${encodeURIComponent(folderPath)}&category=${encodeURIComponent(category)}&v=${videoVersion}`;
  const downloadSrc = `/api/prompts/video-stream?folderPath=${encodeURIComponent(folderPath)}&category=${encodeURIComponent(category)}&download=1`;

  return (
    <div
      style={{
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: '100%',
        maxHeight: '100%',
        boxSizing: 'border-box',
        overflowY: 'auto',
        background: 'rgba(255, 255, 255, 0.025)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRight: 'none',
        borderRadius: '0px',
        boxShadow: 'none',
        transform: 'none',
        transition: 'none'
      }}
    >
      {/* Header của cột Kết quả */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>🎬</span>
          <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#fff' }}>
            {hasVideo ? (viewMode === 'simulator' ? 'Mô phỏng Video Live' : 'Kết quả Video') : canSimulate ? 'Mô phỏng Video Trực tiếp' : 'Kết quả Video'}
          </h4>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {hasVideo && canSimulate && (
            <div
              style={{
                display: 'inline-flex',
                background: 'rgba(0, 0, 0, 0.45)',
                padding: '2px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                gap: '2px'
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('rendered')}
                style={{
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode !== 'simulator' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                  color: viewMode !== 'simulator' ? '#fff' : 'rgba(255, 255, 255, 0.65)',
                  transition: 'all 0.15s ease'
                }}
                title="Xem video MP4 đã xuất"
              >
                🎬 MP4
              </button>
              <button
                type="button"
                onClick={() => setViewMode('simulator')}
                style={{
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === 'simulator' ? 'linear-gradient(135deg, #25f4ee, #00bdff)' : 'transparent',
                  color: viewMode === 'simulator' ? '#0b1120' : 'rgba(255, 255, 255, 0.65)',
                  transition: 'all 0.15s ease'
                }}
                title="Xem mô phỏng video tức thì"
              >
                👁️ Mô phỏng
              </button>
            </div>
          )}


          {/* Nút Tạo Video thay cho chỗ xem trước mô phỏng */}
          {isRenderingVideo ? (
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ⏳ Đang xuất ({renderProgress}%)
            </span>
          ) : handleRenderVideo ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleRenderVideo(result?.segments)}
              disabled={isRenderingVideo || !(isAudioReady && isImageReady)}
              style={{
                padding: '4px 12px',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: (isAudioReady && isImageReady)
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'rgba(255, 255, 255, 0.08)',
                boxShadow: (isAudioReady && isImageReady)
                  ? '0 2px 12px rgba(16, 185, 129, 0.4)'
                  : 'none',
                cursor: (isAudioReady && isImageReady) ? 'pointer' : 'not-allowed',
                border: (isAudioReady && isImageReady) ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                color: (isAudioReady && isImageReady) ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
              title={isAudioReady && isImageReady ? 'Nhấn để bắt đầu xuất/render video' : 'Cần hoàn thành lồng tiếng và hình ảnh trước khi tạo video'}
            >
              <span>🎬</span>
              <span>{hasVideo ? 'Tạo lại video' : 'Tạo video'}</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Trường hợp 1: ĐÃ CÓ VIDEO THÀNH PHẨM */}
      {hasVideo ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Video Player hoặc Trình mô phỏng Live */}
          {viewMode === 'simulator' ? (
            <LiveVideoSimulator
              result={result}
              assetCounts={assetCounts}
              isPortrait={isPortrait}
              category={category}
              folderPath={folderPath}
              activeSceneIndex={activeSceneIndex}
              onSceneIndexChange={onSceneIndexChange}
              onResult={onResult}
              resyncVoiceForSegments={resyncVoiceForSegments}
              checkAssets={checkAssets}
              bgMusicVersion={bgMusicVersion}
              onUpdateRenderConfig={onUpdateRenderConfig}
            />
          ) : (
            <div
              style={{
                position: 'relative',
                width: '100%',
                borderRadius: '12px',
                overflow: 'hidden',
                background: isPortrait ? 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.04) 0%, rgba(0, 0, 0, 0.5) 100%)' : '#000',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: isPortrait ? '14px 10px' : 0
              }}
            >
              <video
                key={`${folderPath}-${videoVersion}`}
                src={videoSrc}
                controls
                playsInline
                style={{
                  height: isPortrait ? 'min(620px, calc(100vh - 240px))' : 'auto',
                  maxHeight: isPortrait ? '620px' : '400px',
                  width: isPortrait ? 'calc(min(620px, calc(100vh - 240px)) * 9 / 16)' : '100%',
                  aspectRatio: isPortrait ? '9 / 16' : '16 / 9',
                  maxWidth: '100%',
                  borderRadius: 0,
                  display: 'block',
                  outline: 'none',
                  background: '#000',
                  boxShadow: 'none'
                }}
              />
            </div>
          )}

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
        /* Trường hợp 2: MÀN HÌNH CHỜ KẾT QUẢ HOẶC MÔ PHỎNG LIVE */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isRenderingVideo ? (
            /* Khung khi đang render video */
            <div
              style={{
                width: '100%',
                aspectRatio: isPortrait ? '9 / 16' : '16 / 9',
                maxHeight: isPortrait ? '440px' : '280px',
                borderRadius: '12px',
                background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.12) 0%, rgba(10, 15, 30, 0.8) 100%)',
                border: '1.5px solid rgba(99, 102, 241, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 20px',
                textAlign: 'center',
                position: 'relative',
                boxShadow: '0 0 30px rgba(99, 102, 241, 0.2)',
                overflow: 'hidden'
              }}
            >
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
            </div>
          ) : canSimulate ? (
            /* Có tài nguyên đã tạo -> Hiển thị Trình mô phỏng Live Video */
            <LiveVideoSimulator
              result={result}
              assetCounts={assetCounts}
              isPortrait={isPortrait}
              category={category}
              folderPath={folderPath}
              activeSceneIndex={activeSceneIndex}
              onSceneIndexChange={onSceneIndexChange}
              onResult={onResult}
              resyncVoiceForSegments={resyncVoiceForSegments}
              checkAssets={checkAssets}
              bgMusicVersion={bgMusicVersion}
              onUpdateRenderConfig={onUpdateRenderConfig}
            />
          ) : (
            /* Khung mô phỏng màn hình chờ kết quả mặc định */
            <div
              style={{
                width: isPortrait ? 'calc(min(440px, calc(100vh - 320px)) * 9 / 16)' : '100%',
                height: isPortrait ? '440px' : 'auto',
                aspectRatio: isPortrait ? '9 / 16' : '16 / 9',
                maxHeight: isPortrait ? 'calc(100vh - 320px)' : '280px',
                margin: '0 auto',
                borderRadius: '12px',
                background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.03) 0%, rgba(0, 0, 0, 0.6) 100%)',
                border: '1.5px dashed rgba(255, 255, 255, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 20px',
                textAlign: 'center',
                position: 'relative',
                boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.4)',
                overflow: 'hidden'
              }}
            >
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
                  Hoàn thành các bước bên trái để xem mô phỏng tức thì hoặc nhấn nút <strong>&quot;Tạo video&quot;</strong> ở góc trên để xuất file MP4.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
