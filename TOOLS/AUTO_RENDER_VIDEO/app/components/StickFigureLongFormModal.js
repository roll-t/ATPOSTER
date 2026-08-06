'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  STICK_FIGURE_LONGFORM_GROUPS,
  STICK_FIGURE_LONGFORM_TOPIC_COUNT
} from '@/lib/prompts/stickFigureLongFormTopics.js';

/**
 * Kho chủ đề dành cho VIDEO DÀI của skill "Kịch Bản & Slide Ảnh Người Que".
 *
 * Cùng khuôn với MoralSyllabusModal (đánh dấu chủ đề đã làm, tìm kiếm, lọc) nhưng dữ liệu chia
 * theo NHÓM tự chọn ngay trong modal, không bám theo một lựa chọn ngoài form như moralTheme —
 * skill này không có khái niệm "nhóm chủ đề" ở form chính, nên tab nhóm phải nằm ngay đây.
 */
export default function StickFigureLongFormModal({ isOpen, onClose, onSelectTopic, history = [] }) {
  const [createdVideoTitles, setCreatedVideoTitles] = useState([]);
  const [activeGroup, setActiveGroup] = useState(STICK_FIGURE_LONGFORM_GROUPS[0].key);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'completed' | 'uncompleted'
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Đối chiếu với video ĐÃ RENDER (không chỉ lịch sử kịch bản) để biết chủ đề nào thực sự đã ra
  // thành phẩm — cùng cách MoralSyllabusModal đang làm.
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/prompts/created-videos')
      .then((res) => res.json())
      .then((data) => {
        if (data.videos) setCreatedVideoTitles(data.videos.map((v) => v.title || v.folderName || ''));
      })
      .catch((err) => console.warn('Lỗi fetch created-videos trong StickFigureLongFormModal:', err));
  }, [isOpen]);

  const allHistoryTexts = useMemo(() => {
    const texts = [];
    (history || []).forEach((item) => {
      if (item.input?.scenario) texts.push(item.input.scenario.toLowerCase());
      if (item.title) texts.push(item.title.toLowerCase());
    });
    createdVideoTitles.forEach((t) => {
      if (t) texts.push(t.toLowerCase());
    });
    return texts;
  }, [history, createdVideoTitles]);

  const checkIsCompleted = (topicText) => {
    if (!topicText) return false;
    const target = topicText.trim().toLowerCase();
    for (const h of allHistoryTexts) {
      if (!h) continue;
      if (h.includes(target) || target.includes(h)) return true;
    }
    return false;
  };

  const group = STICK_FIGURE_LONGFORM_GROUPS.find((g) => g.key === activeGroup) || STICK_FIGURE_LONGFORM_GROUPS[0];
  const groupTopics = group.topics;

  const completedCount = useMemo(
    () => groupTopics.filter((t) => checkIsCompleted(t.text)).length,
    [groupTopics, allHistoryTexts]
  );
  const progressPercent = groupTopics.length > 0 ? Math.round((completedCount / groupTopics.length) * 100) : 0;

  const filteredTopics = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return groupTopics.filter((t) => {
      const matchesSearch =
        !q || t.text.toLowerCase().includes(q) || (t.desc || '').toLowerCase().includes(q);
      const done = checkIsCompleted(t.text);
      if (filterType === 'completed') return matchesSearch && done;
      if (filterType === 'uncompleted') return matchesSearch && !done;
      return matchesSearch;
    });
  }, [groupTopics, allHistoryTexts, searchTerm, filterType]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      onClick={onClose}
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
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(37,244,238,0.06), transparent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                🎬 Kho chủ đề Video Dài ({STICK_FIGURE_LONGFORM_TOPIC_COUNT} chủ đề)
              </h3>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Chủ đề đủ chiều sâu để khai triển 4–10 phút, không bị lặp ý như chủ đề video ngắn.
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', fontSize: '1.05rem', cursor: 'pointer', flexShrink: 0 }}
            >
              ✕
            </button>
          </div>

          {/* Tab nhóm chủ đề */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
            {STICK_FIGURE_LONGFORM_GROUPS.map((g) => {
              const active = g.key === activeGroup;
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setActiveGroup(g.key)}
                  title={g.sublabel}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                    background: active ? 'linear-gradient(135deg, rgba(37,244,238,0.25), rgba(254,44,85,0.2))' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${active ? 'rgba(37,244,238,0.45)' : 'rgba(255,255,255,0.1)'}`
                  }}
                >
                  {g.icon} {g.label}
                </button>
              );
            })}
          </div>

          {/* Tiến độ nhóm đang xem */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
            <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #25f4ee, #FE2C55)', transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {completedCount}/{groupTopics.length} đã làm
            </span>
          </div>

          {/* Tìm kiếm + lọc */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Tìm chủ đề..."
              style={{ flex: 1, minWidth: '180px', padding: '7px 11px', fontSize: '0.78rem', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
            />
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'uncompleted', label: 'Chưa làm' },
              { id: 'completed', label: 'Đã làm' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: filterType === f.id ? '#000' : 'rgba(255,255,255,0.7)',
                  background: filterType === f.id ? 'var(--secondary)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Danh sách chủ đề */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 22px' }}>
          {filteredTopics.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '30px 0' }}>
              Không có chủ đề nào khớp bộ lọc.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredTopics.map((t) => {
                const done = checkIsCompleted(t.text);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSelectTopic?.(t.text);
                      onClose?.();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      textAlign: 'left',
                      padding: '11px 13px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: done ? 'rgba(46,213,115,0.07)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${done ? 'rgba(46,213,115,0.28)' : 'rgba(255,255,255,0.08)'}`
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', flexShrink: 0, marginTop: '1px' }}>{done ? '✅' : '▫️'}</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: done ? '#2ed573' : '#fff', lineHeight: 1.35 }}>
                        {t.text}
                      </span>
                      {t.desc && (
                        <span style={{ display: 'block', fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.35 }}>
                          {t.desc}
                        </span>
                      )}
                    </span>
                  </button>
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
