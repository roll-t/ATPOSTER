'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  handleCancelRender,
  activeSceneIndex,
  onSceneIndexChange,
  selectedElement,
  onSelectedElementChange,
  onResult,
  resyncVoiceForSegments,
  checkAssets,
  bgMusicVersion,
  logoVersion,
  imageVersion,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onInteractionStart,
  onInteractionEnd,
  historyToast,
  onUpdateRenderConfig
}) {
  const [viewMode, setViewMode] = useState('auto'); // 'auto' | 'rendered' | 'simulator'
  const videoRef = useRef(null);
  const [isCapturingThumbnail, setIsCapturingThumbnail] = useState(false);
  const [capturedThumbnail, setCapturedThumbnail] = useState(null);
  const [shutterFlash, setShutterFlash] = useState(false);

  // Khi người dùng chuyển sang tab/chế độ Mô phỏng, tự động rà soát lại tài nguyên mới nhất
  useEffect(() => {
    if (viewMode === 'simulator' && checkAssets) {
      checkAssets();
    }
  }, [viewMode]);

  // Tự động chuyển sang xem mô phỏng trực tiếp khi người dùng chọn một thành phần (như Logo, Phụ đề)
  useEffect(() => {
    if (selectedElement && selectedElement !== 'none') {
      setViewMode('simulator');
    }
  }, [selectedElement]);

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

  const handleCaptureThumbnail = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      setIsCapturingThumbnail(true);

      // Hiệu ứng chớp nháy màn trập máy ảnh
      setShutterFlash(true);
      setTimeout(() => setShutterFlash(false), 240);

      const currentTime = video.currentTime || 0;
      const mins = Math.floor(currentTime / 60);
      const secs = Math.floor(currentTime % 60);
      const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      // Chụp frame qua canvas với độ phân giải gốc của video
      let dataUrl = null;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || (isPortrait ? 1080 : 1920);
        canvas.height = video.videoHeight || (isPortrait ? 1920 : 1080);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      } catch (canvasErr) {
        console.warn('[VideoResultPanel] Lỗi canvas drawImage (sẽ dùng server trích xuất frame):', canvasErr);
      }

      // Tự động tải ảnh về máy người dùng ngay lập tức
      if (dataUrl) {
        const safeTitle = (result?.title || folderPath || 'video')
          .trim()
          .replace(/[\\/:*?"<>|]/g, '')
          .replace(/\s+/g, '_')
          .slice(0, 45);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${safeTitle}_thumbnail_${timeStr.replace(':', 'm')}s.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      // Đồng thời gửi lên server để lưu vào thư mục dự án (images/cover.jpg và final/thumbnail.jpg)
      const res = await fetch('/api/prompts/capture-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath,
          category,
          dataUrl,
          timestamp: currentTime
        })
      });

      const resData = await res.json();
      if (resData.success) {
        setCapturedThumbnail({
          url: resData.thumbnailUrl || dataUrl,
          dataUrl,
          timeStr
        });
      } else {
        throw new Error(resData.error || 'Không thể lưu thumbnail');
      }
    } catch (err) {
      console.error('[VideoResultPanel] Lỗi chụp thumbnail:', err);
      alert('Không thể chụp thumbnail: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setIsCapturingThumbnail(false);
    }
  }, [folderPath, category, isPortrait, result?.title]);

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
        background: 'linear-gradient(180deg, rgba(16, 13, 30, 0.5) 0%, rgba(11, 9, 20, 0.85) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.12)',
        borderRight: 'none',
        borderTop: 'none',
        borderBottom: 'none',
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
                border: '1px solid rgba(168, 85, 247, 0.2)',
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
                  background: viewMode !== 'simulator' ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'transparent',
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
                  background: viewMode === 'simulator' ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'transparent',
                  color: viewMode === 'simulator' ? '#fff' : 'rgba(255, 255, 255, 0.65)',
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
            <button
              type="button"
              className="btn"
              onClick={() => (handleCancelRender ? handleCancelRender() : handleRenderVideo?.())}
              title="Nhấn để dừng xuất video"
              style={{
                padding: '4px 12px',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 800,
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#ff6b6b',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <span>⏹</span>
              <span>Dừng tạo video ({renderProgress}%)</span>
            </button>
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
                  ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
                  : 'rgba(255, 255, 255, 0.08)',
                boxShadow: (isAudioReady && isImageReady)
                  ? '0 2px 14px rgba(168, 85, 247, 0.45)'
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
              selectedElement={selectedElement}
              onSelectedElementChange={onSelectedElementChange}
              onResult={onResult}
              resyncVoiceForSegments={resyncVoiceForSegments}
              checkAssets={checkAssets}
              bgMusicVersion={bgMusicVersion}
              logoVersion={logoVersion}
              imageVersion={imageVersion}
              onInteractionStart={onInteractionStart}
              onInteractionEnd={onInteractionEnd}
              historyToast={historyToast}
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
              {/* Nút chụp nhanh thumbnail nổi góc trên video */}
              <button
                type="button"
                onClick={handleCaptureThumbnail}
                disabled={isCapturingThumbnail}
                style={{
                  position: 'absolute',
                  top: isPortrait ? '24px' : '14px',
                  right: isPortrait ? '20px' : '14px',
                  zIndex: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  background: 'rgba(15, 12, 29, 0.82)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(236, 72, 153, 0.45)',
                  color: '#fff',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: isCapturingThumbnail ? 'wait' : 'pointer',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 10px rgba(236, 72, 153, 0.25)',
                  transition: 'all 0.2s ease',
                  opacity: 0.95
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.95'; e.currentTarget.style.transform = 'scale(1)'; }}
                title="Chụp frame đang dừng làm ảnh bìa Thumbnail và tự động tải về máy"
              >
                <span>{isCapturingThumbnail ? '⏳' : '📸'}</span>
                <span>{isCapturingThumbnail ? 'Đang chụp...' : 'Chụp Thumbnail'}</span>
              </button>

              {/* Hiệu ứng chớp nháy màn trập máy ảnh khi chụp */}
              {shutterFlash && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.88)',
                    zIndex: 20,
                    pointerEvents: 'none',
                    transition: 'opacity 0.2s ease-out'
                  }}
                />
              )}

              <video
                ref={videoRef}
                key={`${folderPath}-${videoVersion}`}
                src={videoSrc}
                controls
                playsInline
                crossOrigin="anonymous"
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
                padding: '7px 12px',
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
                flex: 1,
                padding: '7px 12px',
                fontSize: '0.76rem',
                borderRadius: '7px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                textDecoration: 'none',
                color: 'inherit',
                whiteSpace: 'nowrap'
              }}
              title="Tải video về máy tính"
            >
              <span>⬇️</span>
              <span>Tải video</span>
            </a>
          </div>

          {/* Hộp thông báo và xem trước thumbnail vừa chụp */}
          {capturedThumbnail && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.32)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                animation: 'fadeIn 0.2s ease-out'
              }}
            >
              {capturedThumbnail.dataUrl && (
                <img
                  src={capturedThumbnail.dataUrl}
                  alt="Thumbnail Preview"
                  style={{
                    width: isPortrait ? '36px' : '64px',
                    height: isPortrait ? '64px' : '36px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    flexShrink: 0
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#34d399' }}>
                  ✅ Đã chụp Thumbnail tại {capturedThumbnail.timeStr}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: '2px', wordBreak: 'break-word' }}>
                  Đã lưu làm bìa video (images/cover.jpg) & tải ảnh về máy.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {capturedThumbnail.dataUrl && (
                  <a
                    href={capturedThumbnail.dataUrl}
                    download={`${(result?.title || folderPath || 'video').trim().replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9-]/g, '_')}_thumbnail.jpg`}
                    className="btn btn-secondary"
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.7rem',
                      borderRadius: '5px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Tải lại file ảnh thumbnail về máy"
                  >
                    <span>⬇️</span>
                    <span>Tải lại</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setCapturedThumbnail(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.45)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    padding: '2px 4px',
                    lineHeight: 1
                  }}
                  title="Đóng thông báo"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {openFolderError && (
            <div style={{ fontSize: '0.74rem', color: 'var(--danger)', background: 'rgba(255, 71, 87, 0.08)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255, 71, 87, 0.2)' }}>
              ⚠️ {openFolderError}
            </div>
          )}

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
                    borderTopColor: '#a855f7',
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
                    color="#a855f7"
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
              selectedElement={selectedElement}
              onSelectedElementChange={onSelectedElementChange}
              onResult={onResult}
              resyncVoiceForSegments={resyncVoiceForSegments}
              checkAssets={checkAssets}
              bgMusicVersion={bgMusicVersion}
              logoVersion={logoVersion}
              imageVersion={imageVersion}
              onInteractionStart={onInteractionStart}
              onInteractionEnd={onInteractionEnd}
              historyToast={historyToast}
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
