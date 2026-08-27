'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getJapaneseHistoryTheme } from '@/lib/prompts/japaneseHistoryThemes.js';
import { JAPANESE_HISTORY_SYLLABUS } from '@/lib/prompts/japaneseHistorySyllabus.js';

// Nhãn trạng thái sử liệu. Đây là thứ phân biệt modal này với modal Phật giáo: người dùng phải
// thấy NGAY một chủ đề là chính sử hay giai thoại TRƯỚC khi chọn, chứ không phải sau khi Gemini
// đã viết xong cả kịch bản.
const STATUS_BADGE = {
  record: { label: '📚 Có sử liệu', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.15)', border: 'rgba(74, 222, 128, 0.35)' },
  mixed: { label: '⚠️ Lẫn giai thoại', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.35)' },
  legend: { label: '🌫️ Truyền thuyết', color: '#f472b6', bg: 'rgba(244, 114, 182, 0.15)', border: 'rgba(244, 114, 182, 0.35)' }
};

export default function JapaneseHistorySyllabusModal({
  isOpen,
  onClose,
  currentTheme = 'japan_history',
  onSelectTopic,
  history = []
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'completed' | 'uncompleted'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'record' | 'mixed' | 'legend'
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const usedTopics = useMemo(() => {
    const set = new Set();
    (history || []).forEach(item => {
      if (item.input?.syllabusTopic) set.add(item.input.syllabusTopic.trim().toLowerCase());
      if (item.input?.scenario) set.add(item.input.scenario.trim().toLowerCase());
    });
    return set;
  }, [history]);

  const checkIsCompleted = (topicText, topicVi) => {
    if (!topicText) return false;
    const targetEn = topicText.trim().toLowerCase();
    const full = `${targetEn} (${topicVi ? topicVi.trim().toLowerCase() : ''})`;

    if (usedTopics.has(targetEn) || usedTopics.has(full)) return true;
    for (const hText of usedTopics) {
      if (hText.includes(targetEn) || targetEn.includes(hText)) return true;
    }
    return false;
  };

  const themeObj = getJapaneseHistoryTheme(currentTheme);
  const themeTopics = JAPANESE_HISTORY_SYLLABUS[currentTheme] || JAPANESE_HISTORY_SYLLABUS.japan_history;

  const completedCount = useMemo(
    () => themeTopics.filter(t => checkIsCompleted(t.text, t.vi)).length,
    [themeTopics, usedTopics]
  );
  const progressPercent = themeTopics.length ? Math.round((completedCount / themeTopics.length) * 100) : 0;

  const filteredList = useMemo(() => {
    return themeTopics.filter(item => {
      const isComp = checkIsCompleted(item.text, item.vi);
      if (filterType === 'completed' && !isComp) return false;
      if (filterType === 'uncompleted' && isComp) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (item.text && item.text.toLowerCase().includes(q)) ||
        (item.vi && item.vi.toLowerCase().includes(q)) ||
        (item.desc && item.desc.toLowerCase().includes(q)) ||
        (item.era && item.era.toLowerCase().includes(q))
      );
    });
  }, [themeTopics, searchQuery, filterType, statusFilter, usedTopics]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#14121a',
          border: '1.5px solid rgba(168, 139, 250, 0.35)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '960px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(168, 139, 250, 0.15)',
          overflow: 'hidden',
          animation: 'fadeInScale 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(180deg, rgba(168, 139, 250, 0.12), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '2rem' }}>{themeObj.icon}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {themeTopics.length} Chủ đề — {themeObj.sublabel}
                <span style={{
                  fontSize: '0.78rem',
                  padding: '3px 10px',
                  borderRadius: '8px',
                  background: 'rgba(168, 139, 250, 0.18)',
                  border: '1px solid rgba(168, 139, 250, 0.35)',
                  color: '#c4b5fd',
                  fontWeight: 800
                }}>
                  {themeObj.label}
                </span>
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.65)' }}>
                Mỗi chủ đề có ghi rõ niên đại và mức độ tin cậy sử liệu. Đổi nhóm chủ đề ở ngoài form để xem danh sách khác.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#fff',
              fontSize: '1.2rem',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
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

        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, #8b5cf6, #c4b5fd)',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#c4b5fd', whiteSpace: 'nowrap' }}>
              ✓ Đã làm {completedCount}/{themeTopics.length} bài ({progressPercent}%)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-control"
              placeholder="🔍 Tìm theo tên, niên đại hoặc nội dung..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: '1 1 240px',
                padding: '9px 14px',
                fontSize: '0.86rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'rgba(255, 255, 255, 0.12)'
              }}
            />
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.04)', padding: '3px', borderRadius: '8px' }}>
              {[
                { key: 'all', label: 'Tất cả' },
                { key: 'record', label: '📚 Chính sử' },
                { key: 'mixed', label: '⚠️ Lẫn' },
                { key: 'legend', label: '🌫️ Truyền thuyết' }
              ].map(f => (
                <button
                  type="button"
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  style={{
                    background: statusFilter === f.key ? 'rgba(168, 139, 250, 0.25)' : 'transparent',
                    border: statusFilter === f.key ? '1px solid rgba(168, 139, 250, 0.4)' : 'none',
                    borderRadius: '6px',
                    color: statusFilter === f.key ? '#c4b5fd' : 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.04)', padding: '3px', borderRadius: '8px' }}>
              {[
                { key: 'all', label: 'Tất cả' },
                { key: 'uncompleted', label: 'Chưa làm' },
                { key: 'completed', label: 'Đã làm' }
              ].map(f => (
                <button
                  type="button"
                  key={f.key}
                  onClick={() => setFilterType(f.key)}
                  style={{
                    background: filterType === f.key ? 'rgba(168, 139, 250, 0.25)' : 'transparent',
                    border: filterType === f.key ? '1px solid rgba(168, 139, 250, 0.4)' : 'none',
                    borderRadius: '6px',
                    color: filterType === f.key ? '#c4b5fd' : 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{
          padding: '18px 24px',
          overflowY: 'auto',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {filteredList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255, 255, 255, 0.4)' }}>
              Không tìm thấy chủ đề phù hợp
            </div>
          ) : (
            filteredList.map((item, idx) => {
              const fullTitle = `${item.text} (${item.vi})`;
              const isUsed = checkIsCompleted(item.text, item.vi);
              const badge = STATUS_BADGE[item.status] || STATUS_BADGE.record;

              return (
                <div
                  key={item.id || idx}
                  onClick={() => {
                    onSelectTopic(fullTitle);
                    onClose();
                  }}
                  style={{
                    background: isUsed ? 'rgba(34, 197, 94, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                    border: isUsed ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(168, 139, 250, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(168, 139, 250, 0.4)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isUsed ? 'rgba(34, 197, 94, 0.06)' : 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = isUsed ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        color: '#a78bfa',
                        background: 'rgba(168, 139, 250, 0.15)',
                        padding: '2px 7px',
                        borderRadius: '6px'
                      }}>
                        #{idx + 1}
                      </span>
                      <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#fff' }}>
                        {item.text}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: badge.color,
                        background: badge.bg,
                        border: `1px solid ${badge.border}`,
                        padding: '2px 8px',
                        borderRadius: '10px'
                      }}>
                        {badge.label}
                      </span>
                      {isUsed && (
                        <span style={{
                          fontSize: '0.68rem',
                          color: '#4ade80',
                          fontWeight: 800,
                          background: 'rgba(74, 222, 128, 0.15)',
                          padding: '2px 8px',
                          borderRadius: '10px'
                        }}>
                          ✓ Đã làm
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#c4b5fd', fontWeight: 700 }}>
                      🇻🇳 {item.vi}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700 }}>
                      🗓️ {item.era}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.35 }}>
                      💡 {item.desc}
                    </div>
                    {item.caution && (
                      <div style={{
                        fontSize: '0.72rem',
                        color: '#fcd34d',
                        lineHeight: 1.4,
                        background: 'rgba(251, 191, 36, 0.08)',
                        border: '1px solid rgba(251, 191, 36, 0.2)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        marginTop: '2px'
                      }}>
                        ⚠️ {item.caution}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    style={{
                      background: 'rgba(168, 139, 250, 0.15)',
                      border: '1px solid rgba(168, 139, 250, 0.3)',
                      borderRadius: '8px',
                      color: '#c4b5fd',
                      padding: '8px 14px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    Chọn chủ đề →
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
