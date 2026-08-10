'use client';

import { useState, useEffect } from 'react';

// Bốn nút hành động ở chân thẻ đều là ô vuông chỉ chứa icon, chia đều bề ngang thẻ. Trước đây mỗi
// nút một bề rộng khác nhau vì kèm chữ dài ngắn khác nhau, khiến hàng nút so le giữa các thẻ.
const ACTION_BTN_STYLE = {
  flex: 1,
  padding: '7px 0',
  fontSize: '0.95rem',
  lineHeight: 1,
  borderRadius: '6px',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

// Tooltip tự vẽ cho các nút chỉ-có-icon. Đặt một lần cho cả lưới thay vì nhét vào từng thẻ — 39
// thẻ là 39 khối <style> giống hệt nhau nếu để trong VideoCard.
const ACTION_TOOLTIP_CSS = `
.vc-act { position: relative; }
.vc-act::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 7px);
  left: 50%;
  transform: translateX(-50%);
  padding: 5px 9px;
  border-radius: 6px;
  background: rgba(10, 9, 18, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #f4f4f7;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.1px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s ease;
  z-index: 30;
}
.vc-act:hover::after,
.vc-act:focus-visible::after { opacity: 1; }

/* Tooltip rộng hơn hẳn nút (chữ mô tả ~135px trên nút ~59px). Canh giữa thì hai nút ngoài cùng sẽ
   thò tooltip ra khỏi mép thẻ và đè sang thẻ bên cạnh — neo theo mép cho hai nút đó. */
.vc-act:first-child::after { left: 0; transform: none; }
.vc-act:last-child::after { left: auto; right: 0; transform: none; }
`;

function VideoCard({ video, isPlaying, onTogglePlay, openingFolderId, onOpenFolder, onEdit, onBackupToDrive, backingUpVideoId, isDriveLinked, onRequestDelete, isDeleting }) {
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

            {/* Level Badge */}
            {video.level && (
              <span style={{
                position: 'absolute',
                top: '8px',
                right: isDriveLinked ? '42px' : '8px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(4px)',
                color: '#fbbf24',
                fontSize: '0.7rem',
                fontWeight: 800,
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                zIndex: 9
              }}>
                ⚡ {String(video.level).toUpperCase().slice(0, 2)}
              </span>
            )}

            {/* Google Drive Upload Button Overlay */}
            {isDriveLinked && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); // Ngăn chặn sự kiện click phát video
                  if (onBackupToDrive) onBackupToDrive(video, e);
                }}
                disabled={backingUpVideoId === video.id}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: video.driveUrl 
                    ? 'rgba(46, 213, 115, 0.9)' 
                    : 'rgba(0, 242, 254, 0.9)',
                  border: 'none',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.35)',
                  transition: 'all 0.2s ease',
                  zIndex: 10,
                  opacity: backingUpVideoId === video.id ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  if (video.driveUrl) {
                    e.currentTarget.style.background = '#2ed573';
                  } else {
                    e.currentTarget.style.background = '#00f2fe';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = video.driveUrl 
                    ? 'rgba(46, 213, 115, 0.9)' 
                    : 'rgba(0, 242, 254, 0.9)';
                }}
                title={video.driveUrl ? "Mở video trên Google Drive" : "Sao lưu lên Google Drive"}
              >
                {backingUpVideoId === video.id ? (
                  <span style={{ fontSize: '0.7rem' }}>⏳</span>
                ) : video.driveUrl ? (
                  '✓'
                ) : (
                  '☁️'
                )}
              </button>
            )}

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

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.73rem',
        color: 'var(--text-muted)',
        marginBottom: '10px'
      }}>
        <span>📅 {video.createdAt}</span>
        <span>🖼️ {video.scenesCount} slide</span>
      </div>

      {/* Actions Footer */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginTop: 'auto',
        paddingTop: '8px',
        borderTop: '1px solid rgba(255,255,255,0.05)'
      }}>
        {/* Chỉ hiện icon; chữ mô tả nổi lên khi rê chuột (xem .vc-act ở khối <style> bên dưới).
            Dùng aria-label thay cho title: title sẽ đẻ thêm tooltip mặc định của trình duyệt chồng
            lên tooltip tự vẽ, mà lại chậm cả giây mới hiện. aria-label vẫn cho trình đọc màn hình
            đọc đúng, vì nút chỉ còn mỗi emoji thì tự nó không nói lên điều gì. */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onEdit) onEdit(video);
          }}
          className="btn btn-secondary vc-act"
          style={ACTION_BTN_STYLE}
          data-tip="Sửa kịch bản / cấu hình"
          aria-label="Sửa kịch bản / cấu hình"
        >
          ✏️
        </button>

        <button
          type="button"
          onClick={(e) => onOpenFolder(video.folderPath, e)}
          disabled={openingFolderId === video.folderPath}
          className="btn btn-secondary vc-act"
          style={ACTION_BTN_STYLE}
          data-tip="Mở thư mục trên máy"
          aria-label="Mở thư mục trên máy"
        >
          {openingFolderId === video.folderPath ? '⏳' : '📂'}
        </button>

        <a
          href={video.videoUrl}
          download={`${video.folderPath}-video.mp4`}
          className="btn btn-primary vc-act"
          style={{ ...ACTION_BTN_STYLE, textDecoration: 'none' }}
          data-tip="Tải tệp MP4 về máy"
          aria-label="Tải tệp MP4 về máy"
        >
          ⬇️
        </a>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete(video);
          }}
          disabled={isDeleting}
          className="btn vc-act"
          style={{
            ...ACTION_BTN_STYLE,
            border: '1px solid rgba(239, 68, 68, 0.35)',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ff8080',
            cursor: isDeleting ? 'wait' : 'pointer'
          }}
          data-tip="Xoá video hoặc cả dự án"
          aria-label="Xoá video hoặc cả dự án"
        >
          {isDeleting ? '⏳' : '🗑️'}
        </button>
      </div>
    </div>
  );
}

export default function CreatedVideosGrid({ onSelectScript, category, categoryLabel, isDriveLinked }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'portrait', 'landscape'
  const [selectedLevel, setSelectedLevel] = useState('all'); // 'all', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2'
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [openingFolderId, setOpeningFolderId] = useState(null);
  // Video đang chờ xác nhận xoá (null = không có hộp thoại nào mở).
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [backingUpVideoId, setBackingUpVideoId] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  const handleBackupToDrive = async (video, e) => {
    if (e) e.stopPropagation();
    if (video.driveUrl) {
      window.open(video.driveUrl, '_blank');
      return;
    }
    
    setBackingUpVideoId(video.id);
    try {
      const res = await fetch('/api/prompts/drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: video.folderPath,
          category: video.category
        })
      });
      const data = await res.json();
      if (data.success && data.driveUrl) {
        setVideos(prev => prev.map(v => {
          if (v.id === video.id) {
            return { ...v, driveFileId: data.fileId, driveUrl: data.driveUrl };
          }
          return v;
        }));
        alert(`✓ Sao lưu video "${video.title}" lên Google Drive thành công!`);
      } else {
        alert('Lỗi sao lưu: ' + (data.error || 'Vui lòng liên kết tài khoản Google Drive trong phần cài đặt trước.'));
      }
    } catch (err) {
      console.error('Lỗi kết nối upload Drive:', err);
      alert('Lỗi kết nối máy chủ khi sao lưu.');
    } finally {
      setBackingUpVideoId(null);
    }
  };

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

  /**
   * Xoá video (mode 'video') hoặc xoá trọn dự án (mode 'project').
   *
   * Cố ý KHÔNG dùng window.confirm: hai lựa chọn này khác nhau một trời một vực — xoá dự án là mất
   * luôn ảnh đã sinh và giọng đọc đã lồng, không lấy lại được — nên phải bày rõ hậu quả từng cái
   * cho người dùng chọn, thay vì một câu "Bạn có chắc không?" chung chung.
   */
  const handleDelete = async (video, mode) => {
    setDeletingId(video.folderPath);
    setDeleteError('');
    try {
      const res = await fetch('/api/prompts/created-videos/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: video.folderPath, category: video.category, mode })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setDeleteError(data.error || 'Không xoá được.');
        return;
      }
      // Bỏ khỏi danh sách ngay để giao diện phản hồi tức thì, rồi vẫn tải lại từ server để chắc
      // chắn khớp với đĩa (vd tệp đã bị xoá tay từ trước).
      setVideos((prev) => prev.filter((v) => v.folderPath !== video.folderPath));
      setPendingDelete(null);
      fetchVideos();
    } catch (err) {
      setDeleteError('Lỗi kết nối máy chủ khi xoá.');
    } finally {
      setDeletingId(null);
    }
  };

  // Chỉ hiện video của đúng chủ đề/skill đang mở — mỗi trang chủ đề chỉ nên thấy video
  // do chính chủ đề đó tạo ra, hoặc lọc theo dropdown ở trang video tổng hợp.
  const categoryVideos = category
    ? videos.filter(v => {
        if (v.category === category) return true;
        if (category === 'stick_figure_slideshow' && (!v.category || v.category === 'stick_figure')) return true;
        if (category === 'reading_practice' && (!v.category || v.category === 'reading_page_video')) return true;
        return false;
      })
    : videos.filter(v => {
        if (selectedSkill === 'all') return true;
        if (v.category === selectedSkill) return true;
        if (selectedSkill === 'stick_figure_slideshow' && (!v.category || v.category === 'stick_figure')) return true;
        if (selectedSkill === 'reading_practice' && (!v.category || v.category === 'reading_page_video')) return true;
        return false;
      });

  const levelFilteredVideos = categoryVideos.filter(v => {
    if (selectedLevel === 'all') return true;
    if (!v.level) return false;
    const l = String(v.level).toLowerCase();
    return l.startsWith(selectedLevel.toLowerCase());
  });

  const searchFilteredVideos = levelFilteredVideos.filter(v =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.folderPath.toLowerCase().includes(search.toLowerCase())
  );

  const filteredVideos = [...searchFilteredVideos].sort((a, b) => {
    return sortOrder === 'newest' ? b.mtimeMs - a.mtimeMs : a.mtimeMs - b.mtimeMs;
  });

  const portraitVideos = filteredVideos.filter(v => v.aspectRatio !== '16:9');
  const landscapeVideos = filteredVideos.filter(v => v.aspectRatio === '16:9');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <style>{ACTION_TOOLTIP_CSS}</style>

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

          {/* Level Filter Tabs (Chỉ áp dụng cho skill Trang Đọc Luyện Tiếng Anh) */}
          {category === 'reading_practice' && (
            <div style={{
              display: 'flex',
              gap: '3px',
              padding: '3px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              {[
                { id: 'all', label: 'Tất cả Level' },
                { id: 'a1', label: '🌱 A1' },
                { id: 'a2', label: '🌿 A2' },
                { id: 'b1', label: '🌳 B1' },
                { id: 'b2', label: '🚀 B2' },
                { id: 'c1', label: '👑 C1' },
                { id: 'c2', label: '🔥 C2' }
              ].map(lTab => {
                const active = selectedLevel === lTab.id;
                return (
                  <button
                    key={lTab.id}
                    type="button"
                    onClick={() => setSelectedLevel(lTab.id)}
                    style={{
                      padding: '4px 9px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      borderRadius: '7px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: active ? 'rgba(251, 191, 36, 0.22)' : 'transparent',
                      color: active ? '#fbbf24' : 'rgba(255, 255, 255, 0.6)',
                      boxShadow: active ? '0 2px 8px rgba(251, 191, 36, 0.25)' : 'none'
                    }}
                  >
                    {lTab.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
          {/* Dropdown lọc theo Skill (Chỉ hiện khi ở tab Tất cả video chung) */}
          {!category && (
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="form-control"
              style={{
                width: '180px',
                fontSize: '0.78rem',
                padding: '6px 10px',
                borderRadius: '8px',
                background: 'rgba(22, 20, 38, 0.8)',
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.1)'
              }}
            >
              <option value="all">📁 Tất cả chủ đề</option>
              <option value="moral_talk_slideshow">🎙️ Nói Chuyện Đạo Lý</option>
              <option value="reading_practice">📖 Luyện Đọc Tiếng Anh</option>
              <option value="stick_figure_slideshow">✏️ Clip Người Que</option>
              <option value="pexels_talk_video">📹 Pexels Talk Video</option>
            </select>
          )}

          {/* Dropdown sắp xếp theo thời gian */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="form-control"
            style={{
              width: '130px',
              fontSize: '0.78rem',
              padding: '6px 10px',
              borderRadius: '8px',
              background: 'rgba(22, 20, 38, 0.8)',
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.1)'
            }}
          >
            <option value="newest">🕒 Mới nhất</option>
            <option value="oldest">🕒 Cũ nhất</option>
          </select>

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
                      onEdit={onSelectScript}
                      onBackupToDrive={handleBackupToDrive}
                      backingUpVideoId={backingUpVideoId}
                      isDriveLinked={isDriveLinked}
                      onRequestDelete={setPendingDelete}
                      isDeleting={deletingId === video.folderPath}
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
                      onEdit={onSelectScript}
                      onBackupToDrive={handleBackupToDrive}
                      backingUpVideoId={backingUpVideoId}
                      isDriveLinked={isDriveLinked}
                      onRequestDelete={setPendingDelete}
                      isDeleting={deletingId === video.folderPath}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {pendingDelete && (
        <div
          onClick={() => { if (!deletingId) { setPendingDelete(null); setDeleteError(''); } }}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 460,
              background: 'rgba(20, 18, 30, 0.98)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 16, padding: 22,
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
            }}
          >
            <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 800, color: '#f4f4f7' }}>
              🗑️ Xoá video
            </h4>
            <p style={{ margin: '0 0 18px', fontSize: '0.82rem', color: '#8e8d9f', wordBreak: 'break-word' }}>
              {pendingDelete.title}
              <span style={{ opacity: 0.6 }}> · {pendingDelete.sizeMB}</span>
            </p>

            <button
              type="button"
              onClick={() => handleDelete(pendingDelete, 'video')}
              disabled={!!deletingId}
              style={{
                width: '100%', textAlign: 'left', padding: '12px 14px', marginBottom: 10,
                borderRadius: 10, cursor: deletingId ? 'wait' : 'pointer',
                border: '1px solid rgba(37, 244, 238, 0.3)',
                background: 'rgba(37, 244, 238, 0.08)', color: '#f4f4f7',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 3 }}>Chỉ xoá video</div>
              <div style={{ fontSize: '0.75rem', color: '#8e8d9f', lineHeight: 1.5 }}>
                Xoá tệp MP4. Kịch bản, ảnh và giọng đọc vẫn còn — render lại được ngay, không phải tạo lại từ đầu.
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleDelete(pendingDelete, 'project')}
              disabled={!!deletingId}
              style={{
                width: '100%', textAlign: 'left', padding: '12px 14px',
                borderRadius: 10, cursor: deletingId ? 'wait' : 'pointer',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                background: 'rgba(239, 68, 68, 0.08)', color: '#f4f4f7',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 3, color: '#ff8080' }}>
                Xoá cả dự án
              </div>
              <div style={{ fontSize: '0.75rem', color: '#8e8d9f', lineHeight: 1.5 }}>
                Xoá luôn ảnh đã sinh và giọng đọc đã lồng. Lấy lại toàn bộ dung lượng, nhưng <strong style={{ color: '#ff8080' }}>không khôi phục được</strong>.
              </div>
            </button>

            {deleteError && (
              <div style={{ marginTop: 12, fontSize: '0.78rem', color: '#ff8080' }}>{deleteError}</div>
            )}

            <button
              type="button"
              onClick={() => { setPendingDelete(null); setDeleteError(''); }}
              disabled={!!deletingId}
              style={{
                width: '100%', marginTop: 14, padding: '9px', borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.12)', background: 'transparent',
                color: '#8e8d9f', fontSize: '0.8rem', fontWeight: 600,
                cursor: deletingId ? 'wait' : 'pointer',
              }}
            >
              {deletingId ? 'Đang xoá…' : 'Huỷ'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
