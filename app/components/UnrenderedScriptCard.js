'use client';

import { useState } from 'react';

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

export default function UnrenderedScriptCard({
  item,
  onSelectProcess,
  onSelectScript,
  onDelete,
  isDeleting
}) {
  const [thumbError, setThumbError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [localDeleting, setLocalDeleting] = useState(false);

  const isLandscape = (item?.input?.aspectRatio || '9:16') === '16:9';
  const segmentCount = item?.segmentCount ?? item?.segments?.length ?? 0;
  const firstPreviewText =
    item?.segments?.[0]?.dialogueOrNarration ||
    item?.segments?.[0]?.visualDescription ||
    item?.textPrompt ||
    '';

  const folderPath = item?.input?.folderPath;
  const ext = item?.input?.imageExt || 'jpg';
  const category = item?.category || '';
  // Nếu kịch bản chưa có ảnh trên máy (hasThumbnail: false), không gửi request để tránh lỗi 404 trong console
  const thumbUrl = item?.thumbnailUrl !== undefined
    ? item.thumbnailUrl
    : (item?.hasThumbnail === false
      ? null
      : (folderPath
        ? `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=images/scene-01.${ext}&category=${encodeURIComponent(category)}`
        : null));

  const formattedDate = item?.createdAt
    ? new Date(item.createdAt).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    : '';

  return (
    <div
      className="glass-card"
      style={{
        padding: '12px',
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(22, 20, 38, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.35)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Media Preview Box - Tỷ lệ 100% khớp với VideoCard */}
      <div
        onClick={() => onSelectProcess(item)}
        title="Nhấn để chọn và chuyển qua tab Tạo video"
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: isLandscape ? '56.25%' : '140%',
          borderRadius: '10px',
          overflow: 'hidden',
          background: '#090810',
          marginBottom: '10px',
          cursor: 'pointer'
        }}
      >
        {/* Lớp nội dung bên trong tỷ lệ cố định */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(165deg, #0e0c1a 0%, #1a142e 50%, #100d20 100%)'
          }}
        >
          {/* Nếu có ảnh thumbnail thật thì hiển thị, nếu lỗi chuyển về bảng thảo AI */}
          {thumbUrl && !thumbError ? (
            <>
              <img
                src={thumbUrl}
                alt={item.title || 'Ảnh trích đoạn'}
                onError={() => setThumbError(true)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: isHovered
                    ? 'rgba(0,0,0,0.45)'
                    : 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)',
                  transition: 'background 0.2s ease'
                }}
              />
            </>
          ) : (
            /* Phông nền Storyboard Art phong cách điện ảnh cao cấp */
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'radial-gradient(ellipse at 50% 30%, rgba(168, 85, 247, 0.16) 0%, transparent 70%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
              }}
            >
              {/* Vòng tròn biểu tượng kịch bản */}
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.35))',
                  border: '1px solid rgba(168, 85, 247, 0.45)',
                  boxShadow: '0 4px 16px rgba(168, 85, 247, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  marginBottom: '10px'
                }}
              >
                🎬
              </div>

              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: 'rgba(255, 255, 255, 0.88)',
                  textTransform: 'uppercase',
                  marginBottom: '4px'
                }}
              >
                Kịch Bản Sẵn Sàng
              </span>

              <span
                style={{
                  fontSize: '0.68rem',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontWeight: 600
                }}
              >
                {segmentCount > 0 ? `${segmentCount} phân cảnh đã tạo` : 'Chờ sinh phân cảnh'}
              </span>

              {/* Trích đoạn kịch bản dạng thẻ kính frosted (cho 9:16 dọc) */}
              {!isLandscape && firstPreviewText && (
                <div
                  style={{
                    marginTop: '14px',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(6px)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.25)'
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.62rem',
                      color: '#c084fc',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '3px'
                    }}
                  >
                    💬 Cảnh mở đầu
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.73rem',
                      color: 'rgba(255, 255, 255, 0.72)',
                      lineHeight: 1.35,
                      fontStyle: 'italic',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    "{firstPreviewText}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Nút bấm Tạo video nổi bật khi hover */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isHovered ? 1 : 0,
              transform: isHovered ? 'scale(1)' : 'scale(0.92)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              background: 'rgba(10, 8, 20, 0.45)',
              backdropFilter: 'blur(2px)',
              pointerEvents: 'none',
              zIndex: 8
            }}
          >
            <div
              style={{
                padding: '7px 14px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#fff',
                fontSize: '0.78rem',
                fontWeight: 800,
                boxShadow: '0 4px 16px rgba(168, 85, 247, 0.5)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🎬</span>
              <span>Dựng video ngay</span>
            </div>
          </div>

          {/* Badge góc trên trái: Tỷ lệ màn hình */}
          <span
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(4px)',
              color: isLandscape ? '#38bdf8' : '#c084fc',
              fontSize: '0.7rem',
              fontWeight: 800,
              zIndex: 9
            }}
          >
            {isLandscape ? '💻 16:9' : '📱 9:16'}
          </span>

          {/* Badge góc trên phải: Trạng thái chưa render */}
          <span
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(245, 158, 11, 0.18)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              backdropFilter: 'blur(4px)',
              color: '#fbbf24',
              fontSize: '0.7rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              zIndex: 9
            }}
          >
            <span>⏳</span>
            <span>Chưa tạo video</span>
          </span>

          {/* Badge góc dưới trái: Định dạng kịch bản AI */}
          <span
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              padding: '2px 7px',
              borderRadius: '5px',
              background: 'rgba(99, 102, 241, 0.22)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              backdropFilter: 'blur(4px)',
              color: '#c084fc',
              fontSize: '0.66rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              zIndex: 9
            }}
          >
            <span>📜</span>
            <span>Kịch bản AI</span>
          </span>

          {/* Badge góc dưới phải: Số lượng cảnh */}
          <span
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(0,0,0,0.75)',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '0.68rem',
              fontWeight: 700,
              zIndex: 9
            }}
          >
            {segmentCount} slide
          </span>
        </div>
      </div>

      {/* Tiêu đề & Thông tin - Căn lề và kích thước chữ đồng nhất với VideoCard */}
      <div
        onClick={() => onSelectProcess(item)}
        style={{ cursor: 'pointer', marginBottom: '10px' }}
        title="Nhấn để mở quy trình tạo video"
      >
        <h5
          style={{
            fontSize: '0.88rem',
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 4px 0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {item.title || item.jsonPrompt?.title || '(Kịch bản chưa đặt tên)'}
        </h5>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.73rem',
            color: 'var(--text-muted)'
          }}
        >
          <span>📅 {formattedDate}</span>
          <span>🖼️ {segmentCount} slide</span>
        </div>
      </div>

      {/* Chân thẻ: Thanh thao tác đồng bộ chiều cao và khoảng cách với VideoCard */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginTop: 'auto',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255,255,255,0.05)'
        }}
      >
        {/* Nút hành động chính Tạo video */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectProcess(item);
          }}
          className="btn btn-primary"
          style={{
            flex: 2,
            padding: '7px 10px',
            fontSize: '0.82rem',
            fontWeight: 700,
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            border: 'none',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
            transition: 'all 0.2s ease'
          }}
          title="Chuyển sang trình tạo video ngay"
        >
          <span>🎬</span>
          <span>Tạo video ngay</span>
        </button>

        {/* Nút xem kịch bản chi tiết */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectScript(item);
          }}
          className="btn btn-secondary vc-act"
          style={ACTION_BTN_STYLE}
          data-tip="Xem kịch bản chi tiết"
          aria-label="Xem kịch bản chi tiết"
        >
          📜
        </button>

        {/* Nút xóa kịch bản */}
        {onDelete && (
          <button
            type="button"
            disabled={isDeleting || localDeleting}
            onClick={async (e) => {
              e.stopPropagation();
              if (localDeleting || isDeleting) return;
              setLocalDeleting(true);
              try {
                await onDelete(item.id);
              } finally {
                setLocalDeleting(false);
              }
            }}
            className="btn vc-act"
            style={{
              ...ACTION_BTN_STYLE,
              border: '1px solid rgba(239, 68, 68, 0.35)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ff8080',
              cursor: isDeleting || localDeleting ? 'wait' : 'pointer'
            }}
            data-tip="Xoá kịch bản này"
            aria-label="Xoá kịch bản này"
          >
            {isDeleting || localDeleting ? '⏳' : '🗑️'}
          </button>
        )}
      </div>
    </div>
  );
}
