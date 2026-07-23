'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MORAL_SYLLABUS } from '@/lib/prompts/moralSyllabus.js';

const THEME_TABS = [
  { key: 'self_help', label: 'Self-Help', sub: 'Động lực & Kỷ luật', icon: '💪' },
  { key: 'top_lists', label: 'Top Những Thứ', sub: 'Cảnh báo & Mẹo', icon: '📌' },
  { key: 'rules_of_life', label: 'Quy Tắc Ứng Xử', sub: 'Giao tiếp & Kỹ năng', icon: '🤝' }
];

export default function MoralSyllabusModal({
  isOpen,
  onClose,
  currentTheme = 'self_help',
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
      .catch(err => console.warn('Lỗi fetch created-videos trong MoralSyllabusModal:', err));
  }, [isOpen]);

  // Lộ trình luôn đi theo ĐÚNG theme đang chọn ở form chính (currentTheme)
  const activeThemeTab = useMemo(() => {
    const normalized = String(currentTheme || 'self_help').toLowerCase();
    return THEME_TABS.find(t => t.key === normalized) || THEME_TABS[0];
  }, [currentTheme]);
  const activeTheme = activeThemeTab.key;

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
    }
    return false;
  };

  const themeTopics = MORAL_SYLLABUS[activeTheme] || MORAL_SYLLABUS.self_help;

  // Tính số bài đã tạo video ở theme này
  const completedCount = useMemo(() => {
    return themeTopics.filter(t => checkIsCompleted(t.text)).length;
  }, [themeTopics, allHistoryTexts]);

  const progressPercent = Math.round((completedCount / themeTopics.length) * 100);

  // Lọc chủ đề theo từ khóa và trạng thái
  const filteredTopics = useMemo(() => {
    return themeTopics.filter(t => {
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
  }, [themeTopics, allHistoryTexts, searchTerm, filterType]);

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
                <span>📚</span> Danh sách 50 Chủ đề Video Đạo lý
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
                  {activeThemeTab.icon} {activeThemeTab.label} · {activeThemeTab.sub}
                </span>
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                50 bài học thực tế cho chủ đề đang chọn ở form. Đổi chủ đề ở ngoài form để xem lộ trình khác.
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
              placeholder="🔍 Tìm kiếm chủ đề..."
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
                { key: 'all', label: `Tất cả (${themeTopics.length})` },
                { key: 'uncompleted', label: `Chưa làm (${themeTopics.length - completedCount})` },
                { key: 'completed', label: `Đã làm ✓ (${completedCount})` }
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilterType(f.key)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    background: filterType === f.key ? 'rgba(37, 244, 238, 0.15)' : 'rgba(255,255,255,0.03)',
                    color: filterType === f.key ? 'var(--secondary)' : 'rgba(255,255,255,0.6)',
                    transition: 'all 0.15s'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Body - 50 items list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {filteredTopics.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Không tìm thấy chủ đề phù hợp.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {filteredTopics.map(topic => {
                const isCompleted = checkIsCompleted(topic.text);
                return (
                  <div
                    key={topic.id}
                    onClick={() => {
                      onSelectTopic(topic.text);
                      onClose();
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(37, 244, 238, 0.06)';
                      e.currentTarget.style.borderColor = 'rgba(37, 244, 238, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                    }}
                  >
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: isCompleted ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: isCompleted ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(255, 255, 255, 0.12)',
                      color: isCompleted ? '#4ade80' : 'rgba(255,255,255,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {isCompleted ? '✓' : topic.id}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {topic.text}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {topic.desc}
                      </span>
                    </div>

                    {isCompleted && (
                      <span style={{
                        fontSize: '0.68rem',
                        color: '#4ade80',
                        fontWeight: 700,
                        background: 'rgba(74, 222, 128, 0.1)',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        border: '1px solid rgba(74, 222, 128, 0.25)',
                        flexShrink: 0
                      }}>
                        Đã làm
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
