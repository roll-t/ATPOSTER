'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function PexelsMediaPickerModal({
  isOpen,
  onClose,
  folderPath,
  category,
  sceneNumber,
  scenePrompt = '',
  sceneNarration = '',
  sceneDuration = 5,
  onApplied,
  showToast
}) {
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState('videos'); // 'videos' | 'photos'
  const [orientation, setOrientation] = useState('portrait'); // 'portrait' | 'landscape' | ''
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  // Detail / Trim state
  const [selectedItem, setSelectedItem] = useState(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(5);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentPlayTime, setCurrentPlayTime] = useState(0);
  const [dragMode, setDragMode] = useState(null); // null | 'move' | 'left' | 'right'
  const timelineTrackRef = useRef(null);
  const dragInfoRef = useRef({ startX: 0, initialStart: 0, initialEnd: 5, totalDuration: 10 });
  const [isApplying, setIsApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState('');
  const [aiKeywords, setAiKeywords] = useState([]);
  const [isFetchingAiKeywords, setIsFetchingAiKeywords] = useState(false);
  const [probedVoiceDuration, setProbedVoiceDuration] = useState(null);

  const videoRef = useRef(null);

  // Probe thời lượng audio thực tế của cảnh từ file audio/scene-NN.mp3
  useEffect(() => {
    if (!isOpen || !folderPath || !sceneNumber) {
      setProbedVoiceDuration(null);
      return;
    }
    const pad = String(sceneNumber).padStart(2, '0');
    const audioSrc = `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderPath)}&file=audio/scene-${pad}.mp3&category=${encodeURIComponent(category || '')}`;
    const probe = new Audio();
    probe.src = audioSrc;
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      if (probe.duration && Number.isFinite(probe.duration) && probe.duration > 0) {
        const d = Math.round(probe.duration * 10) / 10;
        setProbedVoiceDuration(d);
      }
    };
  }, [isOpen, folderPath, sceneNumber, category]);

  // Voice thực tế của cảnh (từ audio thực tế hoặc estimate)
  const realVoiceSec = probedVoiceDuration || (Number(sceneDuration) > 0 ? Number(sceneDuration) : 3);
  // Khung hình hiển thị = voice + 0.5s chuyển cảnh + 0.5s buffer an toàn để video dài hơn frame một chút và chạy mượt mà
  const minRequiredDuration = Math.max(3.0, Math.round((realVoiceSec + 0.8) * 10) / 10);

  // Drag handler for timeline frame and handles
  useEffect(() => {
    if (!dragMode) return;

    const handlePointerMove = (e) => {
      const track = timelineTrackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return;

      const { startX, initialStart, initialEnd, totalDuration } = dragInfoRef.current;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - startX;
      const deltaSec = (deltaX / rect.width) * totalDuration;

      if (dragMode === 'move') {
        const dur = Math.max(minRequiredDuration, initialEnd - initialStart);
        let newStart = initialStart + deltaSec;
        newStart = Math.max(0, Math.min(totalDuration - dur, newStart));
        newStart = Math.round(newStart * 10) / 10;
        const newEnd = Math.round((newStart + dur) * 10) / 10;
        setTrimStart(newStart);
        setTrimEnd(newEnd);
        if (videoRef.current) {
          videoRef.current.currentTime = newStart;
        }
      } else if (dragMode === 'right') {
        let newEnd = initialEnd + deltaSec;
        // Cho phép người dùng kéo dài thêm tùy thích, không bao giờ thấp hơn độ dài cần thiết
        newEnd = Math.max(initialStart + minRequiredDuration, Math.min(totalDuration, newEnd));
        newEnd = Math.round(newEnd * 10) / 10;
        setTrimEnd(newEnd);
        if (videoRef.current) {
          videoRef.current.currentTime = newEnd;
        }
      }
    };

    const handlePointerUp = () => {
      setDragMode(null);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [dragMode, minRequiredDuration]);

  const handleStartDrag = (e, mode) => {
    e.stopPropagation();
    e.preventDefault();
    const totalDur = Math.max(videoDuration || selectedItem?.duration || 1, 0.5);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    dragInfoRef.current = {
      startX: clientX,
      initialStart: trimStart,
      initialEnd: trimEnd,
      totalDuration: totalDur
    };
    setDragMode(mode);
  };

  const handleTrackClick = (e) => {
    if (dragMode) return;
    const track = timelineTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const clientX = e.clientX;
    const clickX = clientX - rect.left;
    const totalDur = Math.max(videoDuration || selectedItem?.duration || 1, 0.5);
    const clickedSec = (clickX / rect.width) * totalDur;

    const currentDur = Math.max(0.5, trimEnd - trimStart);
    let newStart = clickedSec - (currentDur / 2);
    newStart = Math.max(0, Math.min(totalDur - currentDur, newStart));
    newStart = Math.round(newStart * 10) / 10;
    const newEnd = Math.round((newStart + currentDur) * 10) / 10;

    setTrimStart(newStart);
    setTrimEnd(newEnd);
    if (videoRef.current) {
      videoRef.current.currentTime = newStart;
    }
  };

  // Danh mục dịch gợi ý tiếng Anh thông minh từ nội dung kịch bản
  const deriveEnglishKeyword = (text) => {
    if (!text) return 'peaceful nature';
    const clean = String(text).toLowerCase();

    // Đối chiếu các chủ đề thông dụng trong video ngắn
    if (/lướt|mạng|điện thoại|smartphone|tiktok|facebook|màn hình|app|online/i.test(clean)) return 'scrolling phone screen';
    if (/máy tính|laptop|bàn phím|văn phòng|gõ phím|code|làm việc/i.test(clean)) return 'typing laptop keyboard';
    if (/áp lực|mệt mỏi|stress|suy nghĩ|buồn|cô đơn|thất vọng|bế tắc/i.test(clean)) return 'thoughtful person dark room';
    if (/thành phố|đường phố|xe cộ|phố xá|tấp nập|dòng người/i.test(clean)) return 'busy city street night';
    if (/thiên nhiên|rừng|cây|núi|phong cảnh|bình yên/i.test(clean)) return 'misty forest nature';
    if (/biển|sóng|nước|bờ biển|hồ/i.test(clean)) return 'calm ocean waves water';
    if (/mưa|cửa sổ|giọt nước|bão/i.test(clean)) return 'rain drops on window';
    if (/hoàng hôn|bình minh|mặt trời|chiều tà/i.test(clean)) return 'sunset golden hour sky';
    if (/cà phê|sách|đọc sách|quán cafe|thư giãn/i.test(clean)) return 'reading book coffee cup';
    if (/tiền|tài chính|kinh doanh|đầu tư|thành công/i.test(clean)) return 'finance money stock market';
    if (/chạy bộ|thể thao|tập luyện|sức khỏe|gym/i.test(clean)) return 'runner morning sunrise park';
    if (/gia đình|bạn bè|nói chuyện|cười|ấm áp/i.test(clean)) return 'friends walking together outdoors';
    if (/đêm|bóng tối|ngủ|giấc mơ|đèn/i.test(clean)) return 'neon lights night atmosphere';
    if (/thời gian|đồng hồ|quá khứ|tương lai/i.test(clean)) return 'clock timelapse passing time';

    // Nếu là tiếng Anh sẵn (không có dấu tiếng Việt)
    const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(clean);
    if (!hasVietnamese) {
      const words = clean.replace(/[^a-z0-9\s]/gi, ' ').split(/\s+/).filter(w => w.length > 2).slice(0, 4).join(' ');
      if (words) return words;
    }

    return 'atmospheric cinematic background';
  };

  useEffect(() => {
    if (isOpen) {
      const initialKeyword = deriveEnglishKeyword(scenePrompt || sceneNarration);
      setQuery(initialKeyword);
      setSelectedItem(null);
      setApplyMsg('');
      setPage(1);
      fetchPexelsData(initialKeyword, mediaType, orientation, 1);

      // Gọi API AI để phân tích và đề xuất thêm từ khóa tiếng Anh chuyên sâu cho cảnh này
      setIsFetchingAiKeywords(true);
      fetch('/api/prompts/pexels/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Scene ${sceneNumber}`,
          segments: [{ segmentNumber: sceneNumber, text: scenePrompt || sceneNarration }]
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data?.success && Array.isArray(data.segmentKeywords) && data.segmentKeywords[0]?.keyword) {
            const aiKw = data.segmentKeywords[0].keyword;
            setAiKeywords(prev => Array.from(new Set([aiKw, ...prev])));
            // Nếu người dùng chưa gõ từ khóa khác thì tự động cập nhật sang từ khóa AI chính xác hơn
            setQuery(prev => {
              if (prev === initialKeyword) {
                fetchPexelsData(aiKw, mediaType, orientation, 1);
                return aiKw;
              }
              return prev;
            });
          }
        })
        .catch(() => { })
        .finally(() => setIsFetchingAiKeywords(false));
    }
  }, [isOpen, sceneNumber]);

  useEffect(() => {
    if (selectedItem && mediaType === 'videos') {
      const totalDur = Number(selectedItem.duration) || 15;
      const targetDur = Math.max(minRequiredDuration, Number(sceneDuration) > 0 ? Number(sceneDuration) : 3.5);
      setVideoDuration(totalDur);
      setTrimStart(0);
      setTrimEnd(Math.min(Number(targetDur.toFixed(1)), totalDur));
      setCurrentPlayTime(0);
    }
  }, [selectedItem, mediaType]);

  // Khi đã probe được thời lượng audio thực tế của cảnh, tự động cập nhật trimEnd nếu đang bị ngắn hơn frame cần thiết
  useEffect(() => {
    if (selectedItem && mediaType === 'videos' && minRequiredDuration > 0) {
      const totalDur = Math.max(videoDuration || selectedItem.duration || 1, 0.5);
      setTrimEnd(prevEnd => {
        const curLength = prevEnd - trimStart;
        if (curLength < minRequiredDuration) {
          return Math.min(totalDur, Math.round((trimStart + minRequiredDuration) * 10) / 10);
        }
        return prevEnd;
      });
    }
  }, [minRequiredDuration]);

  const fetchPexelsData = async (q, type, orient, p = 1) => {
    if (!q || !q.trim()) return;
    setLoading(true);
    setError('');
    try {
      const orientParam = orient ? `&orientation=${orient}` : '';
      const res = await fetch(`/api/prompts/pexels?query=${encodeURIComponent(q.trim())}&type=${type}&page=${p}${orientParam}`);
      const data = await res.json();
      if (res.ok && data.success) {
        const list = type === 'videos' ? data.data?.videos : data.data?.photos;
        if (p === 1) {
          setResults(list || []);
        } else {
          setResults(prev => [...prev, ...(list || [])]);
        }
      } else {
        setError(data.error || 'Lỗi tìm kiếm từ Pexels');
      }
    } catch {
      setError('Lỗi kết nối máy chủ Pexels');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setPage(1);
    setSelectedItem(null);
    fetchPexelsData(query, mediaType, orientation, 1);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPexelsData(query, mediaType, orientation, nextPage);
  };

  const handleApplyToScene = async (isFull = false) => {
    if (!selectedItem) return;
    setIsApplying(true);
    setApplyMsg('⏳ Đang tải và xử lý media cho Cảnh ' + sceneNumber + '...');

    try {
      let mediaUrl = '';
      if (mediaType === 'videos') {
        const videoFiles = selectedItem.video_files || [];
        // Ưu tiên độ phân giải HD / 1080p hoặc 720p phù hợp
        const bestFile = videoFiles.find(f => (f.width === 1080 || f.height === 1080) && f.file_type === 'video/mp4') ||
          videoFiles.find(f => f.quality === 'hd' && f.file_type === 'video/mp4') ||
          videoFiles.find(f => f.quality === 'sd' && f.file_type === 'video/mp4') ||
          videoFiles[0];
        mediaUrl = bestFile?.link;
      } else {
        mediaUrl = selectedItem.src?.large2x || selectedItem.src?.large || selectedItem.src?.original;
      }

      if (!mediaUrl) {
        throw new Error('Không tìm thấy đường dẫn tải file hợp lệ.');
      }

      const trimPayload = (!isFull && mediaType === 'videos') ? {
        start: Number(trimStart) || 0,
        end: Number(trimEnd) || (Number(trimStart) + Number(sceneDuration)),
        duration: Math.max(0.5, (Number(trimEnd) - Number(trimStart)))
      } : null;

      const res = await fetch('/api/prompts/pexels/apply-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath,
          category,
          sceneNumber,
          type: mediaType === 'videos' ? 'video' : 'image',
          url: mediaUrl,
          trim: trimPayload
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const msg = `✓ Đã ghép ${mediaType === 'videos' ? 'video' : 'ảnh'} vào Cảnh ${sceneNumber} thành công!`;
        setApplyMsg(msg);
        showToast?.success?.(msg);
        onApplied?.({
          sceneNumber,
          mediaType: data.mediaType,
          filename: data.filename
        });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        const err = `Lỗi: ${data.error || 'Không thể ghép vào cảnh'}`;
        setApplyMsg(err);
        showToast?.error?.(err);
      }
    } catch (err) {
      const msg = err.message || 'Lỗi gửi yêu cầu xử lý';
      setApplyMsg(msg);
      showToast?.error?.(msg);
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out'
      }}
    >
      <div
        style={{
          width: '95%',
          maxWidth: '1000px',
          height: '88vh',
          maxHeight: '850px',
          background: '#161618',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
          color: '#fff'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '14px 20px',
            background: '#1c1c1f',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🍀</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Kho Pexels - Thay thế Cảnh #{sceneNumber}</span>
                <span style={{ fontSize: '0.68rem', background: 'rgba(0, 229, 255, 0.15)', color: '#00e5ff', border: '1px solid rgba(0, 229, 255, 0.3)', padding: '2px 8px', borderRadius: '4px' }}>
                  {sceneDuration ? `Thời lượng: ~${Number(sceneDuration).toFixed(1)}s` : 'Voice cảnh'}
                </span>
              </h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#888' }}>
                Tìm kiếm Video / Ảnh miễn phí từ Pexels, xem trước, cắt cảnh và ghép trực tiếp vào kịch bản.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              color: '#bbb',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.15s ease'
            }}
          >
            ✕
          </button>
        </div>

        {/* SEARCH & FILTER BAR */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            padding: '12px 20px',
            background: '#131315',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            flexShrink: 0
          }}
        >
          {/* Keyword Input */}
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Từ khóa tiếng Anh (vd: nature, business, rain, slow clouds)..."
              style={{
                width: '100%',
                background: '#202024',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '9px 12px',
                color: '#fff',
                fontSize: '0.82rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Type Toggle: Videos / Photos */}
          <div style={{ display: 'flex', background: '#202024', borderRadius: '8px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button
              type="button"
              onClick={() => {
                setMediaType('videos');
                setSelectedItem(null);
                setPage(1);
                fetchPexelsData(query, 'videos', orientation, 1);
              }}
              style={{
                background: mediaType === 'videos' ? 'linear-gradient(135deg, #00e5ff 0%, #0077ff 100%)' : 'transparent',
                color: mediaType === 'videos' ? '#000' : '#aaa',
                fontWeight: 700,
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.74rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>🎥</span>
              <span>Video</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMediaType('photos');
                setSelectedItem(null);
                setPage(1);
                fetchPexelsData(query, 'photos', orientation, 1);
              }}
              style={{
                background: mediaType === 'photos' ? 'linear-gradient(135deg, #00e5ff 0%, #0077ff 100%)' : 'transparent',
                color: mediaType === 'photos' ? '#000' : '#aaa',
                fontWeight: 700,
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.74rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>🖼️</span>
              <span>Hình ảnh</span>
            </button>
          </div>

          {/* Orientation Selector */}
          <select
            value={orientation}
            onChange={(e) => {
              const val = e.target.value;
              setOrientation(val);
              setPage(1);
              fetchPexelsData(query, mediaType, val, 1);
            }}
            style={{
              background: '#202024',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#ccc',
              fontSize: '0.76rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="portrait">📱 Khung dọc (9:16)</option>
            <option value="landscape">🖥️ Khung ngang (16:9)</option>
            <option value="square">⏹️ Khung vuông (1:1)</option>
            <option value="">🌐 Tất cả tỷ lệ</option>
          </select>

          {/* Submit Search Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#00e5ff',
              color: '#000',
              fontWeight: 800,
              border: 'none',
              borderRadius: '8px',
              padding: '9px 18px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {loading ? '⏳ Đang tìm...' : '🔍 Tìm kiếm'}
          </button>
        </form>

        {/* ROW GỢI Ý TỪ KHÓA TIẾNG ANH (ENGLISH SUGGESTIONS) */}
        <div
          style={{
            padding: '7px 20px',
            background: '#111114',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: '0.68rem', color: '#888', fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>💡</span> Gợi ý tiếng Anh:
          </span>

          {aiKeywords.map((kw, i) => (
            <button
              key={`ai-${i}`}
              type="button"
              onClick={() => {
                setQuery(kw);
                setPage(1);
                setSelectedItem(null);
                fetchPexelsData(kw, mediaType, orientation, 1);
              }}
              style={{
                background: query === kw ? 'rgba(0, 229, 255, 0.25)' : 'rgba(0, 229, 255, 0.1)',
                border: query === kw ? '1px solid #00e5ff' : '1px solid rgba(0, 229, 255, 0.25)',
                color: '#00e5ff',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.67rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title="Gợi ý từ AI bám sát nội dung cảnh này"
            >
              <span>✨</span> {kw}
            </button>
          ))}

          {[
            { label: '📱 Lướt điện thoại', kw: 'scrolling phone screen' },
            { label: '💻 Laptop / Gõ phím', kw: 'typing laptop keyboard' },
            { label: '🌿 Thiên nhiên', kw: 'misty forest nature' },
            { label: '🏙️ Thành phố', kw: 'city street night traffic' },
            { label: '🌧️ Mưa cửa sổ', kw: 'rain on window' },
            { label: '🌅 Hoàng hôn', kw: 'golden sunset sky' },
            { label: '☕ Cafe & Đọc sách', kw: 'reading book coffee' },
            { label: '🏃 Chạy bộ', kw: 'running sunrise' }
          ].map((item, i) => (
            <button
              key={`pop-${i}`}
              type="button"
              onClick={() => {
                setQuery(item.kw);
                setPage(1);
                setSelectedItem(null);
                fetchPexelsData(item.kw, mediaType, orientation, 1);
              }}
              style={{
                background: query === item.kw ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                border: query === item.kw ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.1)',
                color: query === item.kw ? '#00e5ff' : '#aaa',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.67rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {item.label}
            </button>
          ))}

          {isFetchingAiKeywords && (
            <span style={{ fontSize: '0.65rem', color: '#ffb300', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>⏳</span> Đang gợi ý...
            </span>
          )}
        </div>

        {/* ERROR / NOTIFICATION MESSAGE */}
        {error && (
          <div style={{ background: 'rgba(255, 71, 87, 0.15)', borderBottom: '1px solid rgba(255, 71, 87, 0.3)', padding: '8px 20px', color: '#ff6b81', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* MAIN CONTENT AREA: LIST OR DETAIL & TRIMMER */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {selectedItem ? (
            /* ========================================================
               DETAIL VIEW & VIDEO TRIMMER
               ======================================================== */
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#0e0e10', overflowY: 'auto' }}>
              {/* Back Bar */}
              <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>◀</span> <span>Quay lại danh sách kết quả</span>
                </button>

                <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
                  Tác giả: <strong style={{ color: '#fff' }}>{selectedItem.photographer || selectedItem.user?.name || 'Pexels Creator'}</strong>
                </span>
              </div>

              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', gap: '20px', padding: '20px', flexWrap: 'wrap', overflowY: 'auto' }}>
                {/* Media Preview Box */}
                <div
                  style={{
                    flex: '1 1 360px',
                    minHeight: '280px',
                    maxHeight: '440px',
                    background: '#000',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    position: 'relative'
                  }}
                >
                  {mediaType === 'videos' ? (
                    (() => {
                      const videoFiles = selectedItem.video_files || [];
                      const bestFile = videoFiles.find(f => f.quality === 'hd' && f.file_type === 'video/mp4') ||
                        videoFiles.find(f => f.quality === 'sd' && f.file_type === 'video/mp4') ||
                        videoFiles[0];
                      return (
                        <video
                          ref={videoRef}
                          src={bestFile?.link}
                          controls
                          playsInline
                          onLoadedMetadata={(e) => {
                            const d = e.currentTarget.duration || 0;
                            if (d > 0) {
                              setVideoDuration(d);
                              const targetDur = Math.max(minRequiredDuration, Number(sceneDuration) > 0 ? Number(sceneDuration) : 3.5);
                              if (trimEnd <= 0 || trimEnd > d || (trimEnd - trimStart) < minRequiredDuration) {
                                setTrimEnd(Math.min(d, Math.round((trimStart + targetDur) * 10) / 10));
                              }
                            }
                          }}
                          onTimeUpdate={(e) => {
                            const curr = e.currentTarget.currentTime;
                            setCurrentPlayTime(curr);
                            // Nếu đang preview trong khoảng trim, loop lại khi chạm trimEnd
                            if (trimEnd > trimStart && curr >= trimEnd) {
                              e.currentTarget.currentTime = trimStart;
                            }
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      );
                    })()
                  ) : (
                    <img
                      src={selectedItem.src?.large2x || selectedItem.src?.large || selectedItem.src?.original}
                      alt="Pexels Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  )}
                </div>

                {/* Trimmer & Apply Controls */}
                <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {mediaType === 'videos' ? (
                    (() => {
                      const totalDur = Math.max(videoDuration || selectedItem.duration || 1, 0.5);
                      const leftPercent = Math.max(0, Math.min(100, (trimStart / totalDur) * 100));
                      const widthPercent = Math.max(1, Math.min(100 - leftPercent, ((trimEnd - trimStart) / totalDur) * 100));
                      const playheadPercent = Math.max(0, Math.min(100, (currentPlayTime / totalDur) * 100));

                      return (
                        <div style={{ background: '#1c1c20', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#00e5ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>✂️</span> <span>Cắt cảnh (Video Trimmer)</span>
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#aaa', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                              Độ dài video gốc: {totalDur.toFixed(1)}s
                            </span>
                          </div>

                          <div style={{ fontSize: '0.72rem', color: '#aaa', lineHeight: 1.45 }}>
                            Thời lượng frame cần: <strong style={{ color: '#00e5ff' }}>~{minRequiredDuration}s</strong> (Voice: <strong style={{ color: '#69f0ae' }}>~{realVoiceSec.toFixed(1)}s</strong> + 0.5s chuyển cảnh).
                            <br />
                            Kéo <strong style={{ color: '#00e5ff' }}>khung sáng</strong> hoặc <strong style={{ color: '#00e5ff' }}>mép phải</strong> để kéo dài video. Đoạn cắt luôn bằng hoặc dài hơn frame để video phát liên tục mượt mà, không bị dừng giữa chừng.
                          </div>

                          {/* INTERACTIVE TIMELINE SLIDER */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {/* Ruler Labels */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: '#888' }}>
                              <span>0.0s</span>
                              <span style={{ color: '#00e5ff', fontWeight: 700 }}>
                                Khung đã chọn: {trimStart.toFixed(1)}s ➔ {trimEnd.toFixed(1)}s ({(trimEnd - trimStart).toFixed(1)}s) {((trimEnd - trimStart) >= minRequiredDuration ? '✓' : '⚠️')}
                              </span>
                              <span>{totalDur.toFixed(1)}s</span>
                            </div>

                            {/* Timeline Bar Track */}
                            <div
                              ref={timelineTrackRef}
                              onClick={handleTrackClick}
                              title="Bấm hoặc kéo khung trên thanh để chọn timeline"
                              style={{
                                position: 'relative',
                                height: '54px',
                                background: 'linear-gradient(180deg, #111215 0%, #191a20 100%)',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                userSelect: 'none',
                                boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.6)'
                              }}
                            >
                              {/* Background grid ticks */}
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', padding: '0 4px', pointerEvents: 'none', opacity: 0.15 }}>
                                {[...Array(11)].map((_, i) => (
                                  <div key={i} style={{ width: '1px', height: '100%', background: '#fff' }} />
                                ))}
                              </div>

                              {/* Left dimmed area */}
                              <div
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: `${leftPercent}%`,
                                  background: 'rgba(0, 0, 0, 0.72)',
                                  pointerEvents: 'none'
                                }}
                              />

                              {/* Right dimmed area */}
                              <div
                                style={{
                                  position: 'absolute',
                                  left: `${leftPercent + widthPercent}%`,
                                  right: 0,
                                  top: 0,
                                  bottom: 0,
                                  background: 'rgba(0, 0, 0, 0.72)',
                                  pointerEvents: 'none'
                                }}
                              />

                              {/* Live Playhead Needle (red) */}
                              <div
                                style={{
                                  position: 'absolute',
                                  left: `${playheadPercent}%`,
                                  top: 0,
                                  bottom: 0,
                                  width: '2px',
                                  background: '#ff4757',
                                  zIndex: 8,
                                  pointerEvents: 'none',
                                  boxShadow: '0 0 6px rgba(255, 71, 87, 0.9)'
                                }}
                              >
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: '-4px',
                                    width: '10px',
                                    height: '7px',
                                    background: '#ff4757',
                                    clipPath: 'polygon(0 0, 100% 0, 50% 100%)'
                                  }}
                                />
                              </div>

                              {/* Draggable Selection Window Frame */}
                              <div
                                onMouseDown={(e) => handleStartDrag(e, 'move')}
                                onTouchStart={(e) => handleStartDrag(e, 'move')}
                                title="Kéo khung sáng để di chuyển đoạn cắt (Độ dài luôn khớp hoặc lớn hơn frame hiển thị)"
                                style={{
                                  position: 'absolute',
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent}%`,
                                  top: '2px',
                                  bottom: '2px',
                                  minWidth: '40px',
                                  border: '2px solid #00e5ff',
                                  borderRadius: '6px',
                                  background: 'rgba(0, 229, 255, 0.25)',
                                  boxShadow: dragMode === 'move'
                                    ? '0 0 20px rgba(0, 229, 255, 0.8), inset 0 0 12px rgba(0, 229, 255, 0.4)'
                                    : '0 0 12px rgba(0, 229, 255, 0.5), inset 0 0 8px rgba(0, 229, 255, 0.2)',
                                  cursor: dragMode === 'move' ? 'grabbing' : 'grab',
                                  zIndex: 6,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxSizing: 'border-box'
                                }}
                              >
                                {/* Center Label / Grip icon */}
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    color: '#fff',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    pointerEvents: 'none',
                                    textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    padding: '0 16px'
                                  }}
                                >
                                  <span style={{ color: '#00e5ff' }}>⠿</span>
                                  <span>{(trimEnd - trimStart).toFixed(1)}s</span>
                                </div>

                                {/* Right handle to extend video length */}
                                <div
                                  onMouseDown={(e) => handleStartDrag(e, 'right')}
                                  onTouchStart={(e) => handleStartDrag(e, 'right')}
                                  title="Kéo sang phải để kéo dài video (dài hơn frame hiển thị)"
                                  style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: '14px',
                                    cursor: 'ew-resize',
                                    background: 'rgba(0, 229, 255, 0.55)',
                                    borderTopRightRadius: '4px',
                                    borderBottomRightRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 10
                                  }}
                                >
                                  <div style={{ width: '2px', height: '18px', background: '#000', borderRadius: '1px' }} />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Quick action helper buttons */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const targetDur = minRequiredDuration;
                                const newEnd = Math.min(totalDur, Math.round((trimStart + targetDur) * 10) / 10);
                                setTrimEnd(newEnd);
                                if (newEnd - trimStart < targetDur) {
                                  const newStart = Math.max(0, Math.round((newEnd - targetDur) * 10) / 10);
                                  setTrimStart(newStart);
                                }
                              }}
                              style={{
                                background: 'rgba(0, 229, 255, 0.12)',
                                border: '1px solid rgba(0, 229, 255, 0.35)',
                                color: '#00e5ff',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span>⚡</span> <span>Khớp frame (~{minRequiredDuration}s)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const newEnd = Math.min(totalDur, Math.round((trimEnd + 1.0) * 10) / 10);
                                setTrimEnd(newEnd);
                              }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.18)',
                                color: '#69f0ae',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <span>➕</span> <span>Dài thêm +1.0s video</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const dur = Math.max(minRequiredDuration, Math.round((trimEnd - trimStart) * 10) / 10);
                                const playSec = Math.round(currentPlayTime * 10) / 10;
                                let newStart = Math.max(0, Math.min(totalDur - dur, playSec));
                                let newEnd = Math.round((newStart + dur) * 10) / 10;
                                setTrimStart(newStart);
                                setTrimEnd(newEnd);
                                if (videoRef.current) videoRef.current.currentTime = newStart;
                              }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: '#fff',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '0.68rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <span>⏱️</span> <span>Bắt đầu từ vị trí phát ({currentPlayTime.toFixed(1)}s)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const dur = Math.max(minRequiredDuration, Math.round((trimEnd - trimStart) * 10) / 10);
                                setTrimStart(0);
                                setTrimEnd(Math.min(totalDur, dur));
                                if (videoRef.current) videoRef.current.currentTime = 0;
                              }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#bbb',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '0.68rem',
                                cursor: 'pointer'
                              }}
                            >
                              ⏮️ Về 0s
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const dur = Math.max(minRequiredDuration, Math.round((trimEnd - trimStart) * 10) / 10);
                                const newStart = Math.max(0, Math.round((totalDur - dur) * 10) / 10);
                                setTrimStart(newStart);
                                setTrimEnd(totalDur);
                                if (videoRef.current) videoRef.current.currentTime = newStart;
                              }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#bbb',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '0.68rem',
                                cursor: 'pointer'
                              }}
                            >
                              ⏭️ Về cuối video
                            </button>
                          </div>

                          {/* Fine Tuning Inputs */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span style={{ fontSize: '0.66rem', color: '#aaa' }}>Bắt đầu từ (giây):</span>
                              <div style={{ display: 'flex', gap: '3px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const dur = Math.max(minRequiredDuration, Math.round((trimEnd - trimStart) * 10) / 10);
                                    const val = Math.max(0, Math.round((trimStart - 0.5) * 10) / 10);
                                    setTrimStart(val);
                                    setTrimEnd(Math.round((val + dur) * 10) / 10);
                                    if (videoRef.current) videoRef.current.currentTime = val;
                                  }}
                                  style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '4px', padding: '0 6px', cursor: 'pointer', fontSize: '0.72rem' }}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max={Math.max(0, totalDur - (trimEnd - trimStart))}
                                  value={trimStart}
                                  onChange={(e) => {
                                    const dur = Math.max(minRequiredDuration, Math.round((trimEnd - trimStart) * 10) / 10);
                                    const val = Math.max(0, Math.min(totalDur - dur, Number(e.target.value)));
                                    setTrimStart(val);
                                    setTrimEnd(Math.round((val + dur) * 10) / 10);
                                    if (videoRef.current) videoRef.current.currentTime = val;
                                  }}
                                  style={{
                                    flex: 1,
                                    background: '#121214',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '4px',
                                    padding: '3px 6px',
                                    color: '#fff',
                                    fontSize: '0.76rem',
                                    textAlign: 'center'
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const dur = Math.max(minRequiredDuration, Math.round((trimEnd - trimStart) * 10) / 10);
                                    const val = Math.min(totalDur - dur, Math.round((trimStart + 0.5) * 10) / 10);
                                    setTrimStart(val);
                                    setTrimEnd(Math.round((val + dur) * 10) / 10);
                                    if (videoRef.current) videoRef.current.currentTime = val;
                                  }}
                                  style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '4px', padding: '0 6px', cursor: 'pointer', fontSize: '0.72rem' }}
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span style={{ fontSize: '0.66rem', color: '#aaa' }}>Kết thúc ở (giây):</span>
                              <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const minAllowedEnd = Math.round((trimStart + minRequiredDuration) * 10) / 10;
                                    const val = Math.max(minAllowedEnd, Math.round((trimEnd - 0.5) * 10) / 10);
                                    setTrimEnd(val);
                                  }}
                                  title="Giảm độ dài (không thấp hơn độ dài frame)"
                                  style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '4px', padding: '0 6px', cursor: 'pointer', fontSize: '0.72rem' }}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  step="0.1"
                                  min={Math.round((trimStart + minRequiredDuration) * 10) / 10}
                                  max={totalDur}
                                  value={trimEnd}
                                  onChange={(e) => {
                                    const minAllowedEnd = Math.round((trimStart + minRequiredDuration) * 10) / 10;
                                    const val = Math.max(minAllowedEnd, Math.min(totalDur, Number(e.target.value)));
                                    setTrimEnd(val);
                                  }}
                                  style={{
                                    flex: 1,
                                    background: '#121214',
                                    border: '1px solid rgba(0, 229, 255, 0.4)',
                                    borderRadius: '4px',
                                    padding: '3px 6px',
                                    color: '#00e5ff',
                                    fontWeight: 700,
                                    fontSize: '0.76rem',
                                    textAlign: 'center'
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const val = Math.min(totalDur, Math.round((trimEnd + 0.5) * 10) / 10);
                                    setTrimEnd(val);
                                  }}
                                  title="Tăng thêm độ dài video"
                                  style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '4px', padding: '0 6px', cursor: 'pointer', fontSize: '0.72rem' }}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div style={{ background: '#1c1c20', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#00e5ff', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span>🖼️</span> <span>Hình ảnh Pexels</span>
                      </span>
                      <p style={{ margin: 0, fontSize: '0.74rem', color: '#aaa', lineHeight: 1.45 }}>
                        Hình ảnh độ phân giải cao sẽ được tự động lưu vào Cảnh #{sceneNumber}. Hiệu ứng Ken Burns phóng to/thu nhỏ sẽ áp dụng mượt mà khi phát video.
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                    {applyMsg && (
                      <div style={{ padding: '8px 12px', borderRadius: '6px', background: applyMsg.startsWith('✓') ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 179, 0, 0.15)', color: applyMsg.startsWith('✓') ? '#00e5ff' : '#ffb300', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}>
                        {applyMsg}
                      </div>
                    )}

                    {mediaType === 'videos' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApplyToScene(false)}
                          disabled={isApplying}
                          style={{
                            background: 'linear-gradient(135deg, #00e5ff 0%, #0077ff 100%)',
                            color: '#000',
                            fontWeight: 800,
                            border: 'none',
                            borderRadius: '8px',
                            padding: '11px',
                            fontSize: '0.82rem',
                            cursor: isApplying ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 15px rgba(0, 229, 255, 0.3)'
                          }}
                        >
                          {isApplying ? '⏳ Đang cắt & ghép...' : `✂️ Cắt [${trimStart}s - ${trimEnd}s] & Ghép vào Cảnh #${sceneNumber}`}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApplyToScene(true)}
                          disabled={isApplying}
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#fff',
                            fontWeight: 600,
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '8px',
                            padding: '8px',
                            fontSize: '0.74rem',
                            cursor: isApplying ? 'not-allowed' : 'pointer'
                          }}
                        >
                          📥 Dùng toàn bộ video (tự động lặp)
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApplyToScene(true)}
                        disabled={isApplying}
                        style={{
                          background: 'linear-gradient(135deg, #00e5ff 0%, #0077ff 100%)',
                          color: '#000',
                          fontWeight: 800,
                          border: 'none',
                          borderRadius: '8px',
                          padding: '11px',
                          fontSize: '0.82rem',
                          cursor: isApplying ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 15px rgba(0, 229, 255, 0.3)'
                        }}
                      >
                        {isApplying ? '⏳ Đang lưu ảnh...' : `📥 Áp dụng ảnh này vào Cảnh #${sceneNumber}`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================
               RESULTS GRID VIEW
               ======================================================== */
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px' }}>
              {loading && results.length === 0 ? (
                <div style={{ height: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#888' }}>
                  <span style={{ fontSize: '2rem' }}>⏳</span>
                  <span style={{ fontSize: '0.85rem' }}>Đang nạp dữ liệu từ kho Pexels...</span>
                </div>
              ) : results.length === 0 ? (
                <div style={{ height: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#777' }}>
                  <span style={{ fontSize: '2rem' }}>🔍</span>
                  <span style={{ fontSize: '0.85rem' }}>Không tìm thấy kết quả phù hợp. Hãy thử đổi từ khóa tiếng Anh khác.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                      gap: '8px'
                    }}
                  >
                    {results.map((item) => {
                      const previewSrc = mediaType === 'videos' ? item.image : item.src?.medium || item.src?.large;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          style={{
                            position: 'relative',
                            width: '100%',
                            aspectRatio: orientation === 'landscape' ? '16/9' : (orientation === 'square' ? '1/1' : '9/16'),
                            borderRadius: '10px',
                            overflow: 'hidden',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: '#111',
                            cursor: 'pointer',
                            transition: 'all 0.18s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.borderColor = '#00e5ff';
                            e.currentTarget.style.boxShadow = '0 6px 18px rgba(0, 229, 255, 0.25)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <img
                            src={previewSrc}
                            alt=""
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />

                          {/* Hover Gradient & Info */}
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'flex-end',
                              padding: '8px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                              <span style={{ fontSize: '0.66rem', color: '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                                {item.photographer || item.user?.name}
                              </span>
                              {mediaType === 'videos' && (
                                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#00e5ff', background: 'rgba(0,0,0,0.6)', padding: '1px 5px', borderRadius: '3px' }}>
                                  {item.duration}s
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Load More Button */}
                  {!loading && (
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      style={{
                        alignSelf: 'center',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#fff',
                        borderRadius: '8px',
                        padding: '8px 24px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginBottom: '16px'
                      }}
                    >
                      Tải thêm kết quả
                    </button>
                  )}
                  {loading && (
                    <div style={{ textAlign: 'center', padding: '10px', color: '#888', fontSize: '0.78rem' }}>
                      ⏳ Đang tải thêm kết quả...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
