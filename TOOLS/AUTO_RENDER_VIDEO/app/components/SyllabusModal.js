'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { READING_SYLLABUS } from '@/lib/prompts/readingSyllabus';

const LEVEL_TABS = [
  { key: 'a1', label: 'A1', sub: 'Mới bắt đầu', icon: '🌱' },
  { key: 'a2', label: 'A2', sub: 'Sơ cấp', icon: '🌿' },
  { key: 'b1', label: 'B1', sub: 'Trung cấp', icon: '🌳' },
  { key: 'b2', label: 'B2', sub: 'Cao cấp', icon: '🚀' },
  { key: 'c1', label: 'C1', sub: 'Thành thạo', icon: '👑' },
  { key: 'c2', label: 'C2', sub: 'Bậc thầy', icon: '🔥' }
];

export default function SyllabusModal({
  isOpen,
  onClose,
  currentLevel = 'a2',
  onSelectTopic,
  history = []
}) {
  const [createdVideoTitles, setCreatedVideoTitles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'completed' | 'uncompleted'
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tự động tải danh sách video đã render thành công để đối chiếu bài học
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/prompts/created-videos')
      .then(res => res.json())
      .then(data => {
        if (data.videos) {
          setCreatedVideoTitles(data.videos.map(v => v.title || v.folderName || ''));
        }
      })
      .catch(err => console.warn('Lỗi fetch created-videos trong SyllabusModal:', err));
  }, [isOpen]);

  // Lộ trình luôn đi theo ĐÚNG level đang chọn ở form chính (currentLevel)
  const activeLevelTab = useMemo(() => {
    const normalized = String(currentLevel || 'a2').toLowerCase();
    return LEVEL_TABS.find(t => normalized.startsWith(t.key)) || LEVEL_TABS[1];
  }, [currentLevel]);
  const activeLevel = activeLevelTab.key;

  // Tổng hợp tất cả tên/tiêu đề từ lịch sử và video đã tạo
  const allHistoryTexts = useMemo(() => {
    const texts = [];
    (history || []).forEach(item => {
      if (item.input?.scenario) texts.push(item.input.scenario.toLowerCase());
      if (item.input?.topic) texts.push(item.input.topic.toLowerCase());
      if (item.title) texts.push(item.title.toLowerCase());
    });
    createdVideoTitles.forEach(title => {
      if (title) texts.push(title.toLowerCase());
    });
    return texts;
  }, [history, createdVideoTitles]);

  // Hàm kiểm tra bài học đã được làm/tạo video chưa (thông minh)
  const checkIsCompleted = (topicText) => {
    if (!topicText) return false;
    const target = topicText.trim().toLowerCase();
    
    for (const hText of allHistoryTexts) {
      if (!hText) continue;
      // Khớp chính xác hoặc chứa toàn bộ cụm từ
      if (hText.includes(target) || target.includes(hText)) return true;
      
      // Khớp theo từ khóa chính (bỏ stop words)
      const stopWords = new Set(['a', 'an', 'the', 'my', 'in', 'on', 'at', 'to', 'for', 'with', 'and', 'of', 'is']);
      const targetWords = target.split(/\s+/).map(w => w.replace(/[^a-z0-9]/gi, '')).filter(w => w.length > 2 && !stopWords.has(w));
      const hWords = hText.split(/\s+/).map(w => w.replace(/[^a-z0-9]/gi, '')).filter(w => w.length > 2 && !stopWords.has(w));

      if (targetWords.length > 0) {
        const matchCount = targetWords.filter(w => hWords.includes(w) || hText.includes(w)).length;
        if (matchCount >= Math.min(2, targetWords.length)) {
          return true;
        }
      }
    }
    return false;
  };

  const levelTopics = READING_SYLLABUS[activeLevel] || READING_SYLLABUS.a2;

  // Tính số bài đã tạo video ở level này
  const completedCount = useMemo(() => {
    return levelTopics.filter(t => checkIsCompleted(t.text)).length;
  }, [levelTopics, allHistoryTexts]);

  const progressPercent = Math.round((completedCount / levelTopics.length) * 100);

  // Lọc chủ đề theo từ khóa và trạng thái
  const filteredTopics = useMemo(() => {
    return levelTopics.filter(t => {
      const textLower = t.text.toLowerCase();
      const descLower = (t.desc || '').toLowerCase();
      const searchLower = searchTerm.trim().toLowerCase();
      const matchesSearch = !searchLower || textLower.includes(searchLower) || descLower.includes(searchLower);

      const isCompleted = checkIsCompleted(t.text);
      let matchesFilter = true;
      if (filterType === 'completed') matchesFilter = isCompleted;
      if (filterType === 'uncompleted') matchesFilter = !isCompleted;

      return matchesSearch && matchesFilter;
    });
  }, [levelTopics, allHistoryTexts, searchTerm, filterType]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '88vh',
          background: '#12111A',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(37, 244, 238, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeInScale 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(180deg, rgba(37,244,238,0.06), transparent)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>📚</span> Lộ Trình Học Tiếng Anh Chuẩn CEFR
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: 'var(--secondary)',
                  background: 'rgba(37, 244, 238, 0.14)',
                  border: '1px solid rgba(37, 244, 238, 0.3)'
                }}>
                  {activeLevelTab.icon} {activeLevelTab.label} · {activeLevelTab.sub}
                </span>
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                50 bài học thực tế cho trình độ đang chọn ở form. Đổi trình độ ở ngoài form để xem lộ trình khác.
                Chủ đề đã tạo video sẽ được đánh dấu tích xanh ✓.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                fontSize: '1.2rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress & Search Controls */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, #4ade80, #00f2fe)',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4ade80', whiteSpace: 'nowrap' }}>
              ✓ Đã làm {completedCount}/50 bài ({progressPercent}%)
            </span>
          </div>

          {/* Search & Filter row */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="🔍 Tìm kiếm bài học (tiếng Anh hoặc tiếng Việt)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />

            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { key: 'all', label: `Tất cả (${levelTopics.length})` },
                { key: 'uncompleted', label: `Chưa học (${levelTopics.length - completedCount})` },
                { key: 'completed', label: `Đã làm ✓ (${completedCount})` }
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilterType(f.key)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: filterType === f.key ? 'var(--secondary)' : 'rgba(255,255,255,0.06)',
                    color: filterType === f.key ? '#000' : 'rgba(255,255,255,0.7)',
                    transition: 'all 0.15s'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Topics Grid */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '12px',
          alignContent: 'start'
        }}>
          {filteredTopics.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Bấm đổi bộ lọc hoặc tìm từ khóa khác để hiển thị bài học.
            </div>
          ) : (
            filteredTopics.map((topic) => {
              const isCompleted = checkIsCompleted(topic.text);

              return (
                <div
                  key={topic.id}
                  onClick={() => {
                    onSelectTopic(topic.text);
                    onClose();
                  }}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: isCompleted ? '1.5px solid #2ed573' : '1px solid rgba(255,255,255,0.08)',
                    background: isCompleted ? 'rgba(46, 213, 115, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = isCompleted ? '#2ed573' : 'var(--secondary)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isCompleted ? '#2ed573' : 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--secondary)', background: 'rgba(37,244,238,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                        Bài {String(topic.id).padStart(2, '0')}
                      </span>
                      {isCompleted ? (
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#2ed573', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          ✓ Đã tạo video
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>
                          Chưa học
                        </span>
                      )}
                    </div>

                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', margin: '0 0 4px 0', lineHeight: 1.3 }}>
                      {topic.text}
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.35 }}>
                      {topic.desc}
                    </p>
                  </div>

                  <button
                    type="button"
                    style={{
                      marginTop: '4px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      background: isCompleted ? 'rgba(46, 213, 115, 0.2)' : 'var(--primary)',
                      color: isCompleted ? '#2ed573' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    {isCompleted ? '✓ Chọn lại bài này' : '▶ Chọn bài này'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
