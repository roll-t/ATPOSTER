'use client';

import { useState, useEffect } from 'react';
import { showToast } from './Toast.js';
import UnrenderedScriptCard from './UnrenderedScriptCard.js';

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

function VideoCard({ video, isPlaying, onTogglePlay, openingFolderId, onOpenFolder, onEdit, onViewScript, onBackupToDrive, backingUpVideoId, isDriveLinked, onRequestDelete, isDeleting }) {
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

            {/* Status Badge: Đã tạo video */}
            <span style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              padding: '2px 7px',
              borderRadius: '5px',
              background: 'rgba(16, 185, 129, 0.25)',
              border: '1px solid rgba(16, 185, 129, 0.45)',
              backdropFilter: 'blur(4px)',
              color: '#10b981',
              fontSize: '0.66rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              zIndex: 9
            }}>
              <span>✓</span>
              <span>Đã tạo video</span>
            </span>
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
      <div
        onClick={() => onEdit && onEdit(video)}
        style={{ cursor: 'pointer', marginBottom: '10px' }}
        title="Nhấn để mở quy trình tạo video"
      >
        <h5 style={{
          fontSize: '0.88rem',
          fontWeight: 700,
          color: '#fff',
          margin: '0 0 4px 0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {video.title}
        </h5>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.73rem',
          color: 'var(--text-muted)'
        }}>
          <span>📅 {video.createdAt}</span>
          <span>🖼️ {video.scenesCount} slide</span>
        </div>
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

        {onViewScript && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewScript(video);
            }}
            className="btn btn-secondary vc-act"
            style={ACTION_BTN_STYLE}
            data-tip="Xem kịch bản chi tiết"
            aria-label="Xem kịch bản chi tiết"
          >
            📜
          </button>
        )}

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

export default function CreatedVideosGrid({ onSelectScript, category, categoryLabel, isDriveLinked, history = [], onDeleteHistory }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'portrait', 'landscape'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'rendered', 'unrendered'
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
        showToast.success(`Sao lưu video "${video.title}" lên Google Drive thành công!`);
      } else {
        showToast.error('Lỗi sao lưu: ' + (data.error || 'Vui lòng liên kết tài khoản Google Drive trong phần cài đặt trước.'));
      }
    } catch (err) {
      console.error('Lỗi kết nối upload Drive:', err);
      showToast.error('Lỗi kết nối máy chủ khi sao lưu.');
    } finally {
      setBackingUpVideoId(null);
    }
  };

  const fetchVideos = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const url = forceRefresh ? '/api/prompts/created-videos?refresh=1' : '/api/prompts/created-videos';
      const res = await fetch(url);
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
      fetchVideos(true);
    } catch (err) {
      setDeleteError('Lỗi kết nối máy chủ khi xoá.');
    } finally {
      setDeletingId(null);
    }
  };

  // 1. Lọc video theo category
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

  // 2. Lọc history theo category
  const categoryHistory = (history || []).filter(h => {
    if (!category) return true;
    if (h.category === category) return true;
    if (category === 'stick_figure_slideshow' && (!h.category || h.category === 'stick_figure')) return true;
    if (category === 'reading_practice' && (!h.category || h.category === 'reading_page_video')) return true;
    return false;
  });

  // 3. Ghép nối: Video nào tương ứng với History item nào
  const matchedHistoryIds = new Set();
  const renderedItems = categoryVideos.map(v => {
    const matched = categoryHistory.find(h => h.input?.folderPath === v.folderPath || h.input?.folderPath === v.id);
    if (matched) {
      matchedHistoryIds.add(matched.id);
    }
    return {
      id: 'vid_' + v.id,
      type: 'video',
      video: v,
      historyItem: matched || null,
      title: v.title || '',
      folderPath: v.folderPath || '',
      aspectRatio: v.aspectRatio || '9:16',
      level: v.level || matched?.input?.level,
      mtimeMs: v.mtimeMs || (v.createdAt ? new Date(v.createdAt).getTime() : 0)
    };
  });

  // 4. Các bản ghi history CHƯA render video
  const unrenderedItems = categoryHistory
    .filter(h => !matchedHistoryIds.has(h.id))
    .map(h => ({
      id: 'hist_' + h.id,
      type: 'unrendered',
      video: null,
      historyItem: h,
      title: h.title || h.jsonPrompt?.title || '(Kịch bản chưa đặt tên)',
      folderPath: h.input?.folderPath || '',
      aspectRatio: h.input?.aspectRatio || '9:16',
      level: h.input?.level || h.level,
      mtimeMs: h.createdAt ? new Date(h.createdAt).getTime() : 0
    }));

  const allItems = [...renderedItems, ...unrenderedItems];

  const searchFilteredItems = allItems.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return item.title.toLowerCase().includes(s) || item.folderPath.toLowerCase().includes(s);
  });

  const levelFilteredItems = searchFilteredItems.filter(item => {
    if (selectedLevel === 'all') return true;
    if (!item.level) return false;
    const l = String(item.level).toLowerCase();
    return l.startsWith(selectedLevel.toLowerCase());
  });

  const ratioFilteredItems = levelFilteredItems.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'portrait') return item.aspectRatio !== '16:9';
    if (activeTab === 'landscape') return item.aspectRatio === '16:9';
    return true;
  });

  const statusFilteredItems = ratioFilteredItems.filter(item => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'rendered') return item.type === 'video';
    if (statusFilter === 'unrendered') return item.type === 'unrendered';
    return true;
  });

  const sortedItems = [...statusFilteredItems].sort((a, b) => {
    return sortOrder === 'newest' ? b.mtimeMs - a.mtimeMs : a.mtimeMs - b.mtimeMs;
  });

  const portraitItems = sortedItems.filter(v => v.aspectRatio !== '16:9');
  const landscapeItems = sortedItems.filter(v => v.aspectRatio === '16:9');

  const totalCount = ratioFilteredItems.length;
  const renderedCount = ratioFilteredItems.filter(i => i.type === 'video').length;
  const unrenderedCount = ratioFilteredItems.filter(i => i.type === 'unrendered').length;

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
            <span>🎬</span> Lịch sử & Video đã tạo{categoryLabel ? ` — ${categoryLabel}` : ''}
          </h4>

          {/* Status Tabs: Tất cả | ✅ Đã tạo video | ⏳ Chưa tạo video */}
          <div style={{
            display: 'flex',
            gap: '3px',
            padding: '3px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            {[
              { id: 'all', label: 'Tất cả', count: totalCount },
              { id: 'rendered', label: '✅ Đã có video', count: renderedCount },
              { id: 'unrendered', label: '⏳ Chưa dựng video', count: unrenderedCount }
            ].map(sTab => {
              const active = statusFilter === sTab.id;
              return (
                <button
                  key={sTab.id}
                  type="button"
                  onClick={() => setStatusFilter(sTab.id)}
                  style={{
                    padding: '5px 11px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: active ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255, 255, 255, 0.65)',
                    boxShadow: active ? '0 2px 8px rgba(168, 85, 247, 0.3)' : 'none'
                  }}
                >
                  {sTab.label} <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>({sTab.count})</span>
                </button>
              );
            })}
          </div>

          {/* Ratio filter */}
          <div style={{
            display: 'flex',
            gap: '2px',
            padding: '2px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            {[
              { id: 'all', label: 'Mọi tỉ lệ' },
              { id: 'portrait', label: '📱 9:16' },
              { id: 'landscape', label: '💻 16:9' }
            ].map(rTab => {
              const active = activeTab === rTab.id;
              return (
                <button
                  key={rTab.id}
                  type="button"
                  onClick={() => setActiveTab(rTab.id)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: active ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255, 255, 255, 0.5)'
                  }}
                >
                  {rTab.label}
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
            onClick={() => fetchVideos(true)}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              <span className="animate-spin" style={{ display: 'inline-block' }}>⚡</span>
              <span>Đang quét kho video đã tạo...</span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255, 255, 255, 0.025)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    height: '220px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.04)', opacity: 0.6 }} />
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ height: '12px', width: '80%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px' }} />
                    <div style={{ height: '10px', width: '50%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : sortedItems.length === 0 ? (
          search ? (
            <div className="glowing-placeholder" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔍</div>
              <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
                Không tìm thấy video hoặc kịch bản phù hợp
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: '360px', margin: '0 auto', lineHeight: 1.5 }}>
                Hãy thử tìm kiếm với từ khóa khác hoặc chuyển bộ lọc sang &quot;Tất cả&quot;.
              </p>
            </div>
          ) : (
            <div style={{
              padding: '28px 24px',
              borderRadius: '16px',
              background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(19, 17, 32, 0.6) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}>
              <div style={{ textAlign: 'center', maxWidth: '520px', margin: '0 auto' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(254, 44, 85, 0.15), rgba(37, 244, 238, 0.15))',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  fontSize: '1.8rem',
                  marginBottom: '14px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)'
                }}>
                  🎬
                </div>
                <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.3px' }}>
                  Kho video chưa có bản ghi nào
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.55, margin: 0 }}>
                  Sau khi bạn tạo kịch bản và render video{categoryLabel ? ` cho "${categoryLabel}"` : ''}, toàn bộ lịch sử kịch bản và video MP4 hoàn chỉnh sẽ hiển thị ở đây.
                </p>
              </div>

              {/* 3-step workflow diagram */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px'
              }}>
                {[
                  {
                    step: '1',
                    icon: '💡',
                    title: 'Chọn ý tưởng',
                    desc: 'Chọn dạng dọc/ngang, nhóm chủ đề hoặc bốc ngẫu nhiên với nút 🎲'
                  },
                  {
                    step: '2',
                    icon: '⚡',
                    title: 'AI lập kịch bản',
                    desc: 'Gemini tự động phân đoạn, tạo lời thoại thuyết minh và gắn động tác'
                  },
                  {
                    step: '3',
                    icon: '🚀',
                    title: 'Dựng Remotion',
                    desc: 'Kiểm tra review, tinh chỉnh âm thanh & bấm dựng video 1 chạm'
                  }
                ].map((st) => (
                  <div
                    key={st.step}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.025)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '1.25rem' }}>{st.icon}</span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: 'var(--secondary)',
                        background: 'rgba(37, 244, 238, 0.1)',
                        padding: '2px 7px',
                        borderRadius: '10px'
                      }}>
                        Bước {st.step}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', marginTop: '4px' }}>
                      {st.title}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {st.desc}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pro-tip banner */}
              <div style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'linear-gradient(90deg, rgba(37, 244, 238, 0.08) 0%, rgba(254, 44, 85, 0.08) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.78rem',
                color: 'rgba(255, 255, 255, 0.85)'
              }}>
                <span style={{ fontSize: '1.1rem' }}>💡</span>
                <span>
                  <b>Mẹo nhanh:</b> Ở form bên trái, hãy bấm nút <b>🎲 Gợi ý ngẫu nhiên</b> rồi ấn <kbd style={{ background: 'rgba(255,255,255,0.12)', padding: '1px 5px', borderRadius: '4px' }}>Ctrl + Enter</kbd> để tạo kịch bản ngay lập tức!
                </span>
              </div>
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Section 1: Màn Dọc 9:16 */}
            {(activeTab === 'all' || activeTab === 'portrait') && portraitItems.length > 0 && (
              <div>
                {activeTab === 'all' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <h5 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📱</span> Màn Dọc (9:16)
                    </h5>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>({portraitItems.length} mục)</span>
                  </div>
                )}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
                  gap: '18px'
                }}>
                  {portraitItems.map(item => {
                    if (item.type === 'video') {
                      return (
                        <VideoCard
                          key={item.id}
                          video={item.video}
                          isPlaying={activeVideoId === item.video.id}
                          onTogglePlay={() => setActiveVideoId(activeVideoId === item.video.id ? null : item.video.id)}
                          openingFolderId={openingFolderId}
                          onOpenFolder={handleOpenFolder}
                          onEdit={() => onSelectScript(item.historyItem || item.video, 'process')}
                          onViewScript={() => onSelectScript(item.historyItem || item.video, 'script')}
                          onBackupToDrive={handleBackupToDrive}
                          backingUpVideoId={backingUpVideoId}
                          isDriveLinked={isDriveLinked}
                          onRequestDelete={setPendingDelete}
                          isDeleting={deletingId === item.video.folderPath}
                        />
                      );
                    }
                    return (
                      <UnrenderedScriptCard
                        key={item.id}
                        item={item.historyItem}
                        onSelectProcess={(h) => onSelectScript(h, 'process')}
                        onSelectScript={(h) => onSelectScript(h, 'script')}
                        onDelete={onDeleteHistory}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 2: Màn Ngang 16:9 */}
            {(activeTab === 'all' || activeTab === 'landscape') && landscapeItems.length > 0 && (
              <div>
                {activeTab === 'all' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <h5 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>💻</span> Màn Ngang (16:9)
                    </h5>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>({landscapeItems.length} mục)</span>
                  </div>
                )}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                  gap: '18px'
                }}>
                  {landscapeItems.map(item => {
                    if (item.type === 'video') {
                      return (
                        <VideoCard
                          key={item.id}
                          video={item.video}
                          isPlaying={activeVideoId === item.video.id}
                          onTogglePlay={() => setActiveVideoId(activeVideoId === item.video.id ? null : item.video.id)}
                          openingFolderId={openingFolderId}
                          onOpenFolder={handleOpenFolder}
                          onEdit={() => onSelectScript(item.historyItem || item.video, 'process')}
                          onViewScript={() => onSelectScript(item.historyItem || item.video, 'script')}
                          onBackupToDrive={handleBackupToDrive}
                          backingUpVideoId={backingUpVideoId}
                          isDriveLinked={isDriveLinked}
                          onRequestDelete={setPendingDelete}
                          isDeleting={deletingId === item.video.folderPath}
                        />
                      );
                    }
                    return (
                      <UnrenderedScriptCard
                        key={item.id}
                        item={item.historyItem}
                        onSelectProcess={(h) => onSelectScript(h, 'process')}
                        onSelectScript={(h) => onSelectScript(h, 'script')}
                        onDelete={onDeleteHistory}
                      />
                    );
                  })}
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
