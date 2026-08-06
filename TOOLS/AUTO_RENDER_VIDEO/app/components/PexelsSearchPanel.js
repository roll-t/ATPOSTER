'use client';

import React, { useState, useEffect } from 'react';

export default function PexelsSearchPanel() {
  const [query, setQuery] = useState('nature');
  const [type, setType] = useState('photos'); // 'photos' | 'videos'
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    handleSearch(query, type, 1);
  }, []);

  const handleSearch = async (searchQuery, searchType, searchPage) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/prompts/pexels?query=${encodeURIComponent(searchQuery)}&type=${searchType}&page=${searchPage}`);
      const data = await res.json();
      if (data.success) {
        const list = searchType === 'videos' ? data.data.videos : data.data.photos;
        if (searchPage === 1) {
          setResults(list || []);
        } else {
          setResults(prev => [...prev, ...(list || [])]);
        }
      } else {
        setError(data.error || 'Lỗi tìm kiếm từ Pexels.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    handleSearch(query, type, nextPage);
  };

  const handleDownload = async (item) => {
    let url = '';
    let filename = '';
    if (type === 'videos') {
      const videoFiles = item.video_files || [];
      const bestFile = videoFiles.find(f => f.quality === 'hd' && f.file_type === 'video/mp4') ||
                       videoFiles.find(f => f.quality === 'sd' && f.file_type === 'video/mp4') ||
                       videoFiles[0];
      url = bestFile?.link;
      filename = `pexels-video-${item.id}.mp4`;
    } else {
      url = item.src.original;
      filename = `pexels-photo-${item.id}.jpg`;
    }

    if (!url) return;

    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      color: '#fff',
      padding: '20px'
    }}>
      {/* Title */}
      <div style={{ marginBottom: '24px' }}>
        <h1 className="gradient-text" style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 8px 0' }}>
          🍀 Thư viện Kho Stock Pexels
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Tìm kiếm hình ảnh và video chất lượng cao từ Pexels hoàn toàn miễn phí để làm tài nguyên sáng tạo.
        </p>
      </div>

      {/* Search Filter Bar */}
      <div style={{
        display: 'flex',
        gap: '12px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '24px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập từ khóa tìm kiếm tiếng Anh (vd: nature, business, technology)..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                handleSearch(query, type, 1);
              }
            }}
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '12px 16px',
              color: '#fff',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        </div>

        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
            handleSearch(query, e.target.value, 1);
          }}
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '12px 20px',
            color: '#fff',
            fontSize: '0.9rem',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="photos">🖼️ Hình Ảnh (Photos)</option>
          <option value="videos">🎥 Thước Phim (Videos)</option>
        </select>

        <button
          type="button"
          onClick={() => {
            setPage(1);
            handleSearch(query, type, 1);
          }}
          style={{
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 28px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(254, 44, 85, 0.25)'
          }}
        >
          Tìm Kiếm
        </button>
      </div>

      {/* Error Block */}
      {error && (
        <div style={{
          color: 'var(--danger)',
          background: 'rgba(255, 71, 87, 0.1)',
          border: '1px solid rgba(255, 71, 87, 0.25)',
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '0.85rem',
          marginBottom: '20px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Grid Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
        {loading && results.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' }}>
            <span style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>⏳</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Đang nạp dữ liệu từ Pexels...</span>
          </div>
        ) : results.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Không tìm thấy dữ liệu phù hợp. Vui lòng nhập từ khóa khác bằng tiếng Anh.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              {results.map((item) => {
                const previewSrc = type === 'videos' ? item.image : item.src.large || item.src.medium;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    style={{
                      position: 'relative',
                      aspectRatio: type === 'videos' ? '16/9' : '3/4',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, border-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    }}
                  >
                    <img
                      src={previewSrc}
                      alt="Pexels Stock Item"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                    
                    {/* Hover Info Overlay */}
                    <div style={{
                      position: 'absolute',
                      bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '0.72rem', color: '#fff', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                        👤 {item.photographer || item.user?.name}
                      </span>
                      {type === 'videos' && (
                        <span style={{ fontSize: '0.68rem', color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px' }}>
                          🎥 {item.duration}s
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More Button */}
            {!loading && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={loadMore}
                style={{
                  alignSelf: 'center',
                  padding: '10px 32px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  marginBottom: '24px',
                  cursor: 'pointer'
                }}
              >
                Tải Thêm Kết Quả
              </button>
            )}
            {loading && (
              <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                ⏳ Đang tải thêm kết quả...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox / Detail view modal */}
      {selectedItem && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(8px)'
        }} onClick={() => setSelectedItem(null)}>
          <div style={{
            background: '#14131d',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                Tác giả: {selectedItem.photographer || selectedItem.user?.name}
              </h4>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Media body */}
            <div style={{
              flex: 1,
              background: '#0a0912',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: '12px',
              minHeight: '300px'
            }}>
              {type === 'videos' ? (
                (() => {
                  const videoFiles = selectedItem.video_files || [];
                  const bestFile = videoFiles.find(f => f.quality === 'hd' && f.file_type === 'video/mp4') ||
                                   videoFiles.find(f => f.quality === 'sd' && f.file_type === 'video/mp4') ||
                                   videoFiles[0];
                  return (
                    <video
                      src={bestFile?.link}
                      controls
                      autoPlay
                      style={{ maxWidth: '100%', maxHeight: '55vh', objectFit: 'contain' }}
                    />
                  );
                })()
              ) : (
                <img
                  src={selectedItem.src.large2x || selectedItem.src.original}
                  alt="Pexels Stock"
                  style={{ maxWidth: '100%', maxHeight: '55vh', objectFit: 'contain' }}
                />
              )}
            </div>

            {/* Footer actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => window.open(selectedItem.url, '_blank')}
                style={{ padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Xem trên Pexels
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handleDownload(selectedItem)}
                style={{
                  background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 24px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                💾 Tải Xuống
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
