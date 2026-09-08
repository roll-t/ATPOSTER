'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MORAL_SYLLABUS } from '@/src/domain/content/moralSyllabus.js';
import { MORAL_THEMES, isBookMoralTheme } from '@/src/domain/content/moralThemes.js';

// Nguồn duy nhất: moralThemes.js — thêm 1 nhóm chủ đề ở đó là tab ở đây tự có
const THEME_TABS = MORAL_THEMES;

/**
 * Component hiển thị Bìa Sách 3D chân thực:
 * - Có gáy sách dập nếp gấp & bóng đổ 3D
 * - Hiệu ứng xếp chồng trang giấy ở mép phải
 * - Hiển thị ảnh bìa thực tế (vector SVG / image) hoặc bìa dập kim sang trọng dự phòng
 */
function BookCoverBadge({ coverImage, bookTitle, author, coverTheme }) {
  const [imgError, setImgError] = useState(false);
  const showImg = Boolean(coverImage && !imgError);

  const bg = coverTheme?.bg || 'linear-gradient(135deg, #1e1b4b, #0f172a)';
  const accent = coverTheme?.accent || '#fbbf24';
  const icon = coverTheme?.icon || '📖';

  return (
    <div
      style={{
        width: '68px',
        height: '96px',
        borderRadius: '3px 8px 8px 3px',
        position: 'relative',
        flexShrink: 0,
        boxShadow: '3px 0 0 -1px #fff, 4px 0 0 -1px #cbd5e1, 5px 3px 14px rgba(0, 0, 0, 0.65)',
        overflow: 'hidden',
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '6px 7px',
        boxSizing: 'border-box',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        transition: 'transform 0.2s ease'
      }}
    >
      {/* 3D Spine Crease Highlight */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '7px',
          background: 'linear-gradient(90deg, rgba(0, 0, 0, 0.45) 0%, rgba(255, 255, 255, 0.25) 35%, transparent 100%)',
          zIndex: 3,
          pointerEvents: 'none'
        }}
      />

      {/* Glossy Sheen Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 60%)',
          zIndex: 2,
          pointerEvents: 'none'
        }}
      />

      {showImg ? (
        <img
          src={coverImage}
          alt={bookTitle || 'Book Cover'}
          onError={() => setImgError(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1
          }}
        />
      ) : (
        /* Stylized Foil Book Jacket */
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '1rem', lineHeight: 1, marginBottom: '3px' }}>{icon}</div>
            <div
              style={{
                fontSize: '0.62rem',
                fontWeight: 900,
                color: '#fff',
                lineHeight: 1.15,
                letterSpacing: '-0.2px',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textTransform: 'uppercase'
              }}
            >
              {bookTitle}
            </div>
          </div>
          <div
            style={{
              fontSize: '0.52rem',
              color: accent,
              fontWeight: 800,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '0.2px'
            }}
          >
            {author}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [selectedBookFilter, setSelectedBookFilter] = useState('all'); // 'all' | bookTitle
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
  const isBook = isBookMoralTheme(activeTheme);

  // Reset book filter khi chuyển theme
  useEffect(() => {
    setSelectedBookFilter('all');
    setSearchTerm('');
  }, [activeTheme]);

  // Tập hợp NGUYÊN VĂN chủ đề đã chọn
  const exactSyllabusTopics = useMemo(() => {
    const set = new Set();
    (history || []).forEach(item => {
      if (item.input?.syllabusTopic) set.add(item.input.syllabusTopic.trim().toLowerCase());
    });
    return set;
  }, [history]);

  // Dự phòng bằng so khớp mờ cho các video đã tạo trước
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

  // Kiểm tra bài học đã được làm video chưa
  const checkIsCompleted = (topicText) => {
    if (!topicText) return false;
    const target = topicText.trim().toLowerCase();

    if (exactSyllabusTopics.has(target)) return true;

    for (const hText of allHistoryTexts) {
      if (!hText) continue;
      if (hText.includes(target) || target.includes(hText)) return true;
    }
    return false;
  };

  const themeTopics = MORAL_SYLLABUS[activeTheme] || MORAL_SYLLABUS.self_help;

  // Danh sách các đầu sách duy nhất trong nhóm hiện tại (kèm số góc nhìn)
  const uniqueBooks = useMemo(() => {
    if (!isBook) return [];
    const booksMap = new Map();
    themeTopics.forEach(t => {
      const bTitle = t.bookTitle || (t.text ? t.text.split('(')[0].trim() : '');
      if (bTitle) {
        const existing = booksMap.get(bTitle) || {
          title: bTitle,
          author: t.author || '',
          count: 0
        };
        existing.count += 1;
        booksMap.set(bTitle, existing);
      }
    });
    return Array.from(booksMap.values());
  }, [themeTopics, isBook]);

  // Tính số bài đã tạo video ở theme này
  const completedCount = useMemo(() => {
    return themeTopics.filter(t => checkIsCompleted(t.text)).length;
  }, [themeTopics, allHistoryTexts, exactSyllabusTopics]);

  const progressPercent = Math.round((completedCount / (themeTopics.length || 1)) * 100);

  // Lọc chủ đề theo từ khóa, trạng thái và cuốn sách đã chọn
  const filteredTopics = useMemo(() => {
    return themeTopics.filter(t => {
      const textLower = (t.text || '').toLowerCase();
      const descLower = (t.desc || '').toLowerCase();
      const bookLower = (t.bookTitle || '').toLowerCase();
      const authorLower = (t.author || '').toLowerCase();
      const angleLower = (t.angle || '').toLowerCase();
      const painLower = (t.painPoint || '').toLowerCase();
      const searchLower = searchTerm.trim().toLowerCase();

      const matchesSearch =
        !searchLower ||
        textLower.includes(searchLower) ||
        descLower.includes(searchLower) ||
        bookLower.includes(searchLower) ||
        authorLower.includes(searchLower) ||
        angleLower.includes(searchLower) ||
        painLower.includes(searchLower);

      const isCompleted = checkIsCompleted(t.text);
      let matchesFilter = true;
      if (filterType === 'completed') matchesFilter = isCompleted;
      if (filterType === 'uncompleted') matchesFilter = !isCompleted;

      let matchesBook = true;
      if (isBook && selectedBookFilter !== 'all') {
        const curBookTitle = t.bookTitle || (t.text ? t.text.split('(')[0].trim() : '');
        matchesBook = curBookTitle === selectedBookFilter;
      }

      return matchesSearch && matchesFilter && matchesBook;
    });
  }, [themeTopics, allHistoryTexts, searchTerm, filterType, selectedBookFilter, isBook]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: isBook ? '1040px' : '920px',
          maxHeight: '90vh',
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
          background: isBook
            ? 'linear-gradient(180deg, rgba(245,158,11,0.1), transparent)'
            : 'linear-gradient(180deg, rgba(37,244,238,0.06), transparent)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span>📚</span> Danh sách {themeTopics.length} Chủ đề {isBook ? 'Giới Thiệu Sách' : 'Video Đạo lý'}
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 12px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: isBook ? '#fbbf24' : 'var(--secondary)',
                  background: isBook ? 'rgba(245, 158, 11, 0.16)' : 'rgba(37, 244, 238, 0.14)',
                  border: isBook ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(37, 244, 238, 0.3)'
                }}>
                  {activeThemeTab.icon} {activeThemeTab.label} · {activeThemeTab.sub}
                </span>
              </h2>
              <p style={{ margin: '5px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {isBook
                  ? `Mỗi cuốn sách bao gồm tên tác giả và nhiều góc nhìn/nỗi đau khác nhau. Bấm chọn góc nhìn để AI viết kịch bản bán sách chuẩn BookTok.`
                  : `${themeTopics.length} bài học thực tế cho chủ đề đang chọn ở form. Chủ đề đã tạo video sẽ được đánh dấu tích xanh ✓.`
                }
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#fff',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                fontSize: '1.2rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress & Search & Filter Controls */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.22)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: isBook ? 'linear-gradient(90deg, #f59e0b, #eab308)' : 'linear-gradient(90deg, #4ade80, #00f2fe)',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isBook ? '#fbbf24' : '#4ade80', whiteSpace: 'nowrap' }}>
              ✓ Đã làm {completedCount}/{themeTopics.length} góc nhìn ({progressPercent}%)
            </span>
          </div>

          {/* Search & Filter row */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder={isBook ? "🔍 Tìm theo tên sách, tác giả (James Clear, Vãn Tình...), góc nhìn..." : "🔍 Tìm kiếm chủ đề..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '9px 14px',
                borderRadius: '9px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                fontSize: '0.82rem',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />

            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { key: 'all', label: `Tất cả (${themeTopics.length})` },
                { key: 'uncompleted', label: `Chưa làm (${themeTopics.length - completedCount})` },
                { key: 'completed', label: `Đã làm ✓ (${completedCount})` }
              ].map(f => {
                const isSelected = filterType === f.key;
                const activeColor = isBook ? '#fbbf24' : 'var(--secondary)';
                const activeBg = isBook ? 'rgba(245, 158, 11, 0.16)' : 'rgba(37, 244, 238, 0.15)';
                return (
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
                      background: isSelected ? activeBg : 'rgba(255,255,255,0.03)',
                      color: isSelected ? activeColor : 'rgba(255,255,255,0.6)',
                      transition: 'all 0.15s',
                      fontFamily: 'inherit'
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Book Filter Chips Bar (Chỉ hiển thị ở tab Giới Thiệu Sách để chọn nhanh từng đầu sách) */}
          {isBook && uniqueBooks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📖 Lọc theo từng cuốn sách ({uniqueBooks.length} đầu sách):
                </span>
                {selectedBookFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedBookFilter('all')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#fbbf24',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    ✕ Xem tất cả sách
                  </button>
                )}
              </div>
              <div style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '4px',
                scrollbarWidth: 'thin'
              }}>
                <button
                  type="button"
                  onClick={() => setSelectedBookFilter('all')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: selectedBookFilter === 'all' ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                    background: selectedBookFilter === 'all' ? 'rgba(245, 158, 11, 0.22)' : 'rgba(255,255,255,0.04)',
                    color: selectedBookFilter === 'all' ? '#fbbf24' : 'rgba(255,255,255,0.7)',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit'
                  }}
                >
                  📚 Tất cả ({themeTopics.length})
                </button>
                {uniqueBooks.map(b => {
                  const isSelected = selectedBookFilter === b.title;
                  return (
                    <button
                      key={b.title}
                      type="button"
                      onClick={() => setSelectedBookFilter(isSelected ? 'all' : b.title)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        border: isSelected ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.08)',
                        background: isSelected ? 'rgba(245, 158, 11, 0.22)' : 'rgba(255,255,255,0.03)',
                        color: isSelected ? '#fbbf24' : 'rgba(255,255,255,0.8)',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s',
                        fontFamily: 'inherit'
                      }}
                    >
                      <span>📖 {b.title}</span>
                      <span style={{
                        fontSize: '0.68rem',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: isSelected ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255,255,255,0.08)',
                        color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)'
                      }}>
                        {b.count} góc nhìn
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Body - Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {filteredTopics.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔍</div>
              <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>Không tìm thấy chủ đề hoặc góc nhìn phù hợp.</div>
              <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Thử tìm bằng tên tác giả, tên cuốn sách hoặc chọn &quot;Tất cả&quot;.</div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isBook ? 'repeat(auto-fill, minmax(440px, 1fr))' : '1fr 1fr',
              gap: '14px'
            }}>
              {filteredTopics.map(topic => {
                const isCompleted = checkIsCompleted(topic.text);
                const isBookTopic = Boolean(isBook || topic.bookTitle);

                if (isBookTopic) {
                  return (
                    <div
                      key={topic.id}
                      onClick={() => {
                        onSelectTopic(topic.text);
                        onClose();
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.025)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(245, 158, 11, 0.06)';
                        e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.35)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 15px rgba(245, 158, 11, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.025)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {/* Left: 3D Book Cover Badge */}
                      <BookCoverBadge
                        coverImage={topic.coverImage}
                        bookTitle={topic.bookTitle || topic.text.split('(')[0].trim()}
                        author={topic.author || ''}
                        coverTheme={topic.coverTheme}
                      />

                      {/* Right: Content details */}
                      <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {/* Header row: Book title & Author tag & Completed pill */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.2px' }}>
                              {topic.bookTitle || topic.text.split('(')[0].trim()}
                            </span>
                            {topic.author && (
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: '#fbbf24',
                                background: 'rgba(245, 158, 11, 0.14)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                padding: '2px 8px',
                                borderRadius: '10px'
                              }}>
                                ✍️ {topic.author}
                              </span>
                            )}
                          </div>

                          {isCompleted && (
                            <span style={{
                              fontSize: '0.68rem',
                              color: '#4ade80',
                              fontWeight: 700,
                              background: 'rgba(74, 222, 128, 0.12)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(74, 222, 128, 0.3)',
                              flexShrink: 0
                            }}>
                              ✓ Đã làm
                            </span>
                          )}
                        </div>

                        {/* Angle badge */}
                        {topic.angle && (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(37, 244, 238, 0.1)',
                            border: '1px solid rgba(37, 244, 238, 0.25)',
                            color: 'var(--secondary, #25f4ee)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            width: 'fit-content'
                          }}>
                            <span>🎯 Góc nhìn:</span>
                            <span>{topic.angle}</span>
                          </div>
                        )}

                        {/* Pain point if available */}
                        {topic.painPoint && (
                          <div style={{
                            fontSize: '0.76rem',
                            color: '#fca5a5',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '5px',
                            lineHeight: 1.35
                          }}>
                            <span style={{ flexShrink: 0 }}>⚠️</span>
                            <span>{topic.painPoint}</span>
                          </div>
                        )}

                        {/* Lesson description */}
                        <div style={{
                          fontSize: '0.73rem',
                          color: 'rgba(255, 255, 255, 0.65)',
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          💡 {topic.desc}
                        </div>

                        {/* Click to select CTA */}
                        <div style={{
                          marginTop: '2px',
                          fontSize: '0.7rem',
                          color: '#fbbf24',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span>Chọn góc nhìn này</span>
                          <span>➔</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Standard moral topic card
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
