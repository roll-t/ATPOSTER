'use client';

import { useState, useEffect } from 'react';

function VideoCard({ video, isPlaying, onTogglePlay, openingFolderId, onOpenFolder }) {
  const isLandscape = video.aspectRatio === '16:9';

  return (
    <div
      className="glass-card"
      style={{
        padding: '12px',
        borderRadius: '14px',
        border: isPlaying ? '1px solid var(--secondary)' : '1px solid rgba(255, 255, 255, 0.08)',
        background: isPlaying ? 'rgba(37, 244, 238, 0.04)' : 'rgba(22, 20, 38, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: isPlaying ? '0 6px 20px rgba(37, 244, 238, 0.15)' : 'none'
      }}
    >
      {/* Media Preview Box */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: isLandscape ? '56.25%' : '140%', // 16:9 or 9:16
          borderRadius: '10px',
          overflow: 'hidden',
          background: '#090810',
          marginBottom: '10px',
          cursor: 'pointer'
        }}
        onClick={onTogglePlay}
      >
        {isPlaying ? (
          <video
            src={video.videoUrl}
            controls
            autoPlay
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        ) : (
          <>
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                color: 'rgba(255,255,255,0.2)'
              }}>
                🎬
              </div>
            )}

            {/* Play Button Overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '1.2rem',
                paddingLeft: '3px',
                boxShadow: '0 4px 15px rgba(254, 44, 85, 0.4)'
              }}>
                ▶
              </div>
            </div>

            {/* Aspect Ratio Badge */}
            <span style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(4px)',
              color: isLandscape ? 'var(--secondary)' : 'var(--primary)',
              fontSize: '0.7rem',
              fontWeight: 800
            }}>
              {isLandscape ? '💻 16:9' : '📱 9:16'}
            </span>

            {/* Size Badge */}
            <span style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(0,0,0,0.75)',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '0.68rem',
              fontWeight: 700
            }}>
              {video.sizeMB}
            </span>
          </>
        )}
      </div>

      {/* Title & Info */}
      <h5 style={{
        fontSize: '0.88rem',
        fontWeight: 700,
        color: '#fff',
        margin: '0 0 4px 0',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }} title={video.title}>
        {video.title}
      </h5>

      <p style={{
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        margin: '0 0 12px 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>📅 {video.createdAt}</span>
        {video.scenesCount > 0 && <span>🖼️ {video.scenesCount} slide</span>}
      </p>

      {/* Actions Footer */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginTop: 'auto',
        paddingTop: '8px',
        borderTop: '1px solid rgba(255,255,255,0.05)'
      }}>
        <button
          type="button"
          onClick={(e) => onOpenFolder(video.folderPath, e)}
          disabled={openingFolderId === video.folderPath}
          className="btn btn-secondary"
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: '0.73rem',
            borderRadius: '6px',
            fontWeight: 700,
            whiteSpace: 'nowrap'
          }}
          title="Mở thư mục trên máy tính"
        >
          {openingFolderId === video.folderPath ? '⏳...' : '📂 Mở Thư Mục'}
        </button>

        <a
          href={video.videoUrl}
          download={`${video.folderPath}-video.mp4`}
          className="btn btn-primary"
          style={{
            padding: '6px 10px',
            fontSize: '0.73rem',
            borderRadius: '6px',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
          title="Tải tệp MP4 về máy"
        >
          ⬇️ Tải
        </a>
      </div>
    </div>
  );
}

export default function CreatedVideosGrid({ onSelectScript, category, categoryLabel }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'portrait', 'landscape'
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [openingFolderId, setOpeningFolderId] = useState(null);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/prompts/created-videos');
      const data = await res.json();
      if (data.success) {
        setVideos(data.videos || []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách video:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleOpenFolder = async (folderPath, e) => {
    if (e) e.stopPropagation();
    setOpeningFolderId(folderPath);
    try {
      await fetch('/api/prompts/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath })
      });
    } catch (err) {
      console.error('Lỗi mở thư mục:', err);
    } finally {
      setOpeningFolderId(null);
    }
  };

  // Chỉ hiện video của đúng chủ đề/skill đang mở — mỗi trang chủ đề chỉ nên thấy video
  // do chính chủ đề đó tạo ra, thay vì gộp chung video của mọi skill lại một chỗ.
  const categoryVideos = category
    ? videos.filter(v => {
        if (v.category === category) return true;
        if (category === 'stick_figure_slideshow' && (!v.category || v.category === 'stick_figure')) return true;
        if (category === 'reading_practice' && (!v.category || v.category === 'reading_page_video')) return true;
        return false;
      })
    : videos;
  const filteredVideos = categoryVideos.filter(v =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.folderPath.toLowerCase().includes(search.toLowerCase())
  );

  const portraitVideos = filteredVideos.filter(v => v.aspectRatio !== '16:9');
  const landscapeVideos = filteredVideos.filter(v => v.aspectRatio === '16:9');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Header & Filter Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
        flexWrap: 'wrap',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎥</span> Danh sách Video đã tạo{categoryLabel ? ` — ${categoryLabel}` : ''}
          </h4>

          {/* Category Tabs: Tất cả | Màn Dọc (9:16) | Màn Ngang (16:9) */}
          <div style={{
            display: 'flex',
            gap: '4px',
            padding: '3px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            {[
              { id: 'all', label: '🎞️ Tất cả', count: filteredVideos.length },
              { id: 'portrait', label: '📱 Màn Dọc 9:16', count: portraitVideos.length },
              { id: 'landscape', label: '💻 Màn Ngang 16:9', count: landscapeVideos.length }
            ].map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: active ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'transparent',
                    color: active ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                    boxShadow: active ? '0 3px 10px rgba(254, 44, 85, 0.3)' : 'none'
                  }}
                >
                  {tab.label} <span style={{ opacity: 0.85, fontSize: '0.7rem' }}>({tab.count})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-control"
            placeholder="🔍 Tìm theo tên video..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '190px', fontSize: '0.78rem', padding: '6px 12px', borderRadius: '8px' }}
          />

          <button
            type="button"
            onClick={fetchVideos}
            disabled={loading}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '8px', fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            {loading ? '⏳...' : '🔄 Làm mới'}
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <div className="animate-spin" style={{ fontSize: '1.8rem', marginBottom: '8px' }}>⏳</div>
            <p style={{ fontSize: '0.85rem' }}>Đang quét kho video đã tạo...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="glowing-placeholder" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎬</div>
            <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
              {search ? 'Không tìm thấy video phù hợp' : 'Chưa có video MP4 nào được tạo cho chủ đề này'}
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: '360px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
              {search
                ? 'Hãy thử tìm kiếm với từ khóa khác.'
                : `Sau khi bạn render xong video bằng Remotion${categoryLabel ? ` cho "${categoryLabel}"` : ''}, tệp video MP4 hoàn chỉnh sẽ tự động hiển thị ở đây.`}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Section 1: Video Màn Dọc 9:16 */}
            {(activeTab === 'all' || activeTab === 'portrait') && portraitVideos.length > 0 && (
              <div>
                {activeTab === 'all' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <h5 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📱</span> Video Màn Dọc (9:16)
                    </h5>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>({portraitVideos.length} video)</span>
                  </div>
                )}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                  gap: '16px'
                }}>
                  {portraitVideos.map(video => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      isPlaying={activeVideoId === video.id}
                      onTogglePlay={() => setActiveVideoId(activeVideoId === video.id ? null : video.id)}
                      openingFolderId={openingFolderId}
                      onOpenFolder={handleOpenFolder}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: Video Màn Ngang 16:9 */}
            {(activeTab === 'all' || activeTab === 'landscape') && landscapeVideos.length > 0 && (
              <div>
                {activeTab === 'all' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <h5 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>💻</span> Video Màn Ngang (16:9)
                    </h5>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>({landscapeVideos.length} video)</span>
                  </div>
                )}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
                  gap: '16px'
                }}>
                  {landscapeVideos.map(video => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      isPlaying={activeVideoId === video.id}
                      onTogglePlay={() => setActiveVideoId(activeVideoId === video.id ? null : video.id)}
                      openingFolderId={openingFolderId}
                      onOpenFolder={handleOpenFolder}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
