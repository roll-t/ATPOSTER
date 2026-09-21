'use client';

import React, { useState, useEffect } from 'react';
import {
  CRAFT_ASMR_CLIP_DURATIONS,
  CRAFT_ASMR_CLIP_COUNTS,
  CRAFT_ASMR_ASPECT_RATIOS,
  CRAFT_ASMR_FPS,
  CRAFT_ASMR_FIDELITY_OPTIONS,
  CRAFT_ASMR_DEFAULTS,
} from '@/src/domain/content/craftAsmr.js';
import {
  CraftAsmrFlowButton,
  CraftAsmrFlowNotice,
  useCraftAsmrFlow,
} from './craft-asmr/CraftAsmrFlowControls.js';
import CraftAsmrHistory from './craft-asmr/CraftAsmrHistory.js';
import styles from './craft-asmr/CraftAsmrPanel.module.css';

// Gợi ý bấm-là-điền. Cố tình để vật liệu và thành phẩm ở 2 danh sách RỜI nhau thay vì ghép sẵn
// từng cặp: cái hay của dòng video này nằm ở chỗ ghép chéo (vỏ lon → giáp samurai, ống nhựa →
// mô hình rồng), nên để người dùng tự bắt cặp sẽ ra nhiều ý tưởng hơn là chọn từ combo dựng sẵn.
const SUBJECT_SUGGESTIONS = [
  'mô hình giáp samurai Nhật Bản',
  'mô hình rồng phương Đông',
  'mô hình xe mô tô cổ điển',
  'mô hình phi hành gia',
  'mô hình lâu đài trung cổ',
  'mô hình tàu chiến buồm',
  'mặt nạ tuồng cổ',
  'mô hình robot cơ khí',
];

const MATERIAL_SUGGESTIONS = [
  'vỏ lon nước ngọt màu đỏ',
  'vỏ lon bia màu xanh dương',
  'ống nhựa PVC trắng',
  'bìa carton nâu tái chế',
  'gỗ pallet cũ',
  'dây đồng và bảng mạch điện tử cũ',
  'chai nhựa trong suốt',
  'đất sét polymer đen',
];

/**
 * Gộp mọi prompt của một bản ghi thành MỘT danh sách tab thống nhất: sheet nhân vật trước, rồi
 * tới từng clip video. Nhờ vậy phần hiển thị bên dưới chỉ cần biết đúng một dạng dữ liệu.
 *
 * Cũng là chỗ đỡ cho các bản ghi CŨ: bản trước khi có nhiều clip chỉ có `promptText`, bản trước
 * khi có sheet thì thiếu `sheetPrompt` — cả hai vẫn mở xem lại được bình thường.
 */
function tabsOf(record) {
  if (!record) return [];
  const tabs = [];

  if (record.sheetPrompt) {
    tabs.push({
      key: 'sheet',
      label: '🎨 Sheet nhân vật (ảnh)',
      promptText: record.sheetPrompt,
    });
  }

  const clips =
    Array.isArray(record.clips) && record.clips.length > 0
      ? record.clips
      : [{ index: 1, label: `Prompt · ~${record.durationSeconds || 10}s`, promptText: record.promptText || '' }];

  clips.forEach((c) => tabs.push({ key: `clip-${c.index}`, label: c.label, promptText: c.promptText }));

  // Tiêu đề + hashtag đứng CUỐI: nó là việc làm sau khi đã có video, không phải thứ đọc trước.
  if (record.social?.plainText) {
    tabs.push({
      key: 'social',
      label: '📣 Tiêu đề & Hashtag',
      promptText: record.social.plainText,
      social: record.social,
    });
  }
  return tabs;
}

/**
 * Tiêu đề + hashtag hiển thị dạng 2 THẺ RIÊNG chứ không phải một khối text thô như các tab kia:
 * thực tế lúc đăng bài, người dùng copy tiêu đề YouTube ở một chỗ và caption TikTok ở chỗ khác,
 * mỗi lần một nền tảng. Gộp chung một khối thì lần nào cũng phải bôi đen cắt tay.
 */
function SocialCopyView({ social, copied, onCopy }) {
  const cards = [
    {
      key: 'yt',
      icon: '▶️',
      name: 'YouTube Shorts',
      color: '#ff4757',
      mainLabel: 'Tiêu đề',
      main: social.youtubeTitle,
      tags: social.youtubeHashtags,
      block: social.youtubeBlock,
      hint: `${(social.youtubeTitle || '').length}/70 ký tự`,
    },
    {
      key: 'tt',
      icon: '🎵',
      name: 'TikTok',
      color: '#25f4ee',
      mainLabel: 'Caption',
      main: social.tiktokCaption,
      tags: social.tiktokHashtags,
      block: social.tiktokBlock,
      hint: `${(social.tiktokCaption || '').length}/100 ký tự`,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {cards.map((c) => (
        <div
          key={c.key}
          style={{
            background: 'rgba(10, 9, 18, 0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            padding: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: c.color }}>
              {c.icon} {c.name}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{c.hint}</span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '5px 12px', fontSize: '0.74rem' }}
                onClick={() => onCopy(c.block, c.key)}
              >
                {copied === c.key ? '✓ Đã chép' : 'Copy'}
              </button>
            </div>
          </div>

          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            {c.mainLabel}
          </div>
          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#fff',
              lineHeight: 1.5,
              marginBottom: '12px',
              wordBreak: 'break-word',
            }}
          >
            {c.main}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {(c.tags || []).map((t) => (
              <span
                key={t}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '999px',
                  padding: '3px 10px',
                  fontSize: '0.72rem',
                  color: 'rgba(255,255,255,0.8)',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CraftAsmrPanel({ onBackToGrid, categoryInfo } = {}) {
  const [subject, setSubject] = useState(categoryInfo?.defaultSubject || '');
  const [material, setMaterial] = useState(categoryInfo?.defaultMaterial || '');
  const [notes, setNotes] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(CRAFT_ASMR_DEFAULTS.durationSeconds);
  const [clipCount, setClipCount] = useState(CRAFT_ASMR_DEFAULTS.clipCount);
  const [fidelity, setFidelity] = useState(CRAFT_ASMR_DEFAULTS.fidelity);
  const [aspectRatio, setAspectRatio] = useState(CRAFT_ASMR_DEFAULTS.aspectRatio);
  const [fps, setFps] = useState(CRAFT_ASMR_DEFAULTS.fps);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [activeClip, setActiveClip] = useState(0);
  const [copied, setCopied] = useState('');
  const [history, setHistory] = useState([]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/prompts/craft-asmr');
      const data = await res.json();
      if (data.success) setHistory(data.items || []);
    } catch (err) {
      // Lịch sử chỉ là tiện ích — hỏng thì im lặng, đừng chặn màn hình tạo prompt.
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleGenerate = async () => {
    if (!subject.trim() || !material.trim()) {
      setError('Vui lòng nhập cả "Nhân vật / mô hình muốn tạo" và "Vật liệu chế tác".');
      return;
    }
    setIsGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/prompts/craft-asmr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, material, notes, durationSeconds, clipCount, fidelity, aspectRatio, fps }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data.result);
        setActiveClip(0);
        setCopied('');
        flow.resetNotice();
        fetchHistory();
      } else {
        setError(data.error || 'Không tạo được prompt.');
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyText = async (text, tag) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied(''), 2000);
    } catch (err) {
      setError('Trình duyệt chặn clipboard. Bạn hãy bôi đen nội dung rồi Ctrl+C thủ công.');
    }
  };

  const handleLoadHistory = (item) => {
    setResult(item);
    setActiveClip(0);
    setSubject(item.subject || '');
    setMaterial(item.material || '');
    setNotes(item.notes || '');
    setDurationSeconds(item.durationSeconds || CRAFT_ASMR_DEFAULTS.durationSeconds);
    setClipCount(item.clipCount || 1);
    setFidelity(item.fidelity || CRAFT_ASMR_DEFAULTS.fidelity);
    setAspectRatio(item.aspectRatio || CRAFT_ASMR_DEFAULTS.aspectRatio);
    setFps(item.fps || CRAFT_ASMR_DEFAULTS.fps);
    setCopied('');
    flow.resetNotice();
  };

  const handleDeleteHistory = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Xoá prompt này khỏi lịch sử?')) return;
    try {
      await fetch(`/api/prompts/craft-asmr?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      setHistory((prev) => prev.filter((h) => h.id !== id));
      if (result?.id === id) setResult(null);
    } catch (err) {
      setError('Không xoá được prompt.');
    }
  };

  const tabs = tabsOf(result);
  const currentTab = tabs[activeClip] || tabs[0];
  const hasTabs = tabs.length > 1;
  const onSheet = currentTab?.key === 'sheet';
  const onSocial = currentTab?.key === 'social';
  const clipCountOf = tabs.filter((t) => t.key !== 'sheet' && t.key !== 'social').length;
  const flow = useCraftAsmrFlow({ result, clipCount: clipCountOf, durationSeconds, aspectRatio, onError: setError });

  return (
    <div className={styles.workspace}>
      {onBackToGrid && (
        <header className={styles.pageHeader}>
          <div className={styles.titleGroup}>
            <span className={styles.titleIcon}>{categoryInfo?.icon || '🎬'}</span>
            <div>
              <div className={styles.eyebrow}>AI VIDEO WORKSPACE</div>
              <h1>{categoryInfo?.label || 'Chế Tác Thủ Công & Tái Chế ASMR'}</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={onBackToGrid}
            className={styles.backButton}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Danh sách thể loại</span>
          </button>
        </header>
      )}

      {/* ---------------- Cột trái: form nhập ---------------- */}
      <section className={`glass-card ${styles.formCard}`}>
        <div className={styles.formInner}>
          <div className={styles.cardTitle}>
            <span className={styles.cardTitleIcon}>🎨</span>
            <div>
              <h2>Thiết kế prompt chế tác</h2>
              <p>Chọn thành phẩm, vật liệu và cấu hình clip. AI sẽ dựng sẵn toàn bộ tiến trình cắt, tạo hình, lắp ghép và trình diễn thành phẩm.</p>
            </div>
          </div>

          <div className={styles.sectionHeading}>
            <span>1</span>
            <div><strong>Ý tưởng chế tác</strong><small>Hai thông tin quan trọng nhất để AI dựng cảnh</small></div>
          </div>

        <div className="form-group">
          <label className="form-label">Nhân vật / mô hình muốn tạo *</label>
          <input
            className="form-control"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="mô hình giáp samurai Nhật Bản"
          />
          <div className={styles.suggestions}>
            {SUBJECT_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className={`${styles.suggestion} ${subject === s ? styles.suggestionActive : ''}`}
                onClick={() => setSubject(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Vật liệu chế tác *</label>
          <input
            className="form-control"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            placeholder="vỏ lon nước ngọt màu đỏ"
          />
          <div className={styles.suggestions}>
            {MATERIAL_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className={`${styles.suggestion} ${material === s ? styles.suggestionActive : ''}`}
                onClick={() => setMaterial(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.sectionHeading}>
          <span>2</span>
          <div><strong>Cấu hình video</strong><small>Chọn phong cách, thời lượng và khung hình đầu ra</small></div>
        </div>

        <div className="form-group">
          <label className="form-label">Phong cách chế tác</label>
          <select className="form-control" value={fidelity} onChange={(e) => setFidelity(e.target.value)}>
            {CRAFT_ASMR_FIDELITY_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <div className={styles.helpText}>
            <b>Đinh tán</b> = kiểu mô hình lon đang viral: tấm nhôm cong ghép bằng
            đinh tán bạc lộ thiên, chia đốt, hai tông đỏ–bạc, bề mặt sạch. · <b>Thô mộc</b> = ít mảnh, to bản,
            móp méo có duyên. · <b>Tinh xảo</b> = bóng bẩy như mô hình bán sẵn (dễ mất chất tự làm).
          </div>
        </div>

        <div className={styles.settingsGrid}>
        <div className={`form-group ${styles.wideSetting}`}>
          <label className="form-label">Số clip (mỗi clip sinh 1 lượt rồi ghép lại)</label>
          <select
            className="form-control"
            value={clipCount}
            onChange={(e) => setClipCount(Number(e.target.value))}
          >
            {CRAFT_ASMR_CLIP_COUNTS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <div className={styles.helpText}>
            Tổng video: <b>~{durationSeconds * clipCount} giây</b> ({clipCount} ×{' '}
            {durationSeconds}s)
          </div>
        </div>

          <div className="form-group">
            <label className="form-label">Dài mỗi clip</label>
            <select
              className="form-control"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(Number(e.target.value))}
            >
              {CRAFT_ASMR_CLIP_DURATIONS.map((d) => (
                <option key={d} value={d}>
                  ~{d} giây
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">FPS</label>
            <select className="form-control" value={fps} onChange={(e) => setFps(Number(e.target.value))}>
              {CRAFT_ASMR_FPS.map((f) => (
                <option key={f} value={f}>
                  {f} fps
                </option>
              ))}
            </select>
          </div>

        <div className={`form-group ${styles.wideSetting}`}>
          <label className="form-label">Khung hình</label>
          <select className="form-control" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
            {CRAFT_ASMR_ASPECT_RATIOS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        </div>

        <div className="form-group">
          <label className="form-label">Yêu cầu riêng (tuỳ chọn)</label>
          <textarea
            className="form-control"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="VD: tông màu đen-vàng đồng, thêm cảnh đánh bóng bằng giấy nhám, không dùng mannequin..."
          />
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(255, 71, 87, 0.1)',
              border: '1px solid rgba(255, 71, 87, 0.25)',
              color: '#ff6b7a',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '0.8rem',
              marginBottom: '14px',
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        </div>
        <div className={styles.actionBar}>
          <div className={styles.actionSummary}>
            <span>🎞️</span>
            <div>
              <strong>{clipCount} clip · khoảng {durationSeconds * clipCount} giây</strong>
              <small>{aspectRatio} · {fps} fps · {CRAFT_ASMR_FIDELITY_OPTIONS.find((item) => item.value === fidelity)?.label.replace(/^\S+\s/, '')}</small>
            </div>
          </div>
          <button
            type="button"
            className={`btn btn-primary ${styles.generateButton} ${isGenerating ? 'btn-disabled' : ''}`}
            disabled={isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? '⏳ Đang viết prompt...' : `✨ Tạo ${clipCount > 1 ? `${clipCount} prompt` : 'prompt'}`}
          </button>
        </div>
      </section>

      {/* ---------------- Cột phải: kết quả + lịch sử ---------------- */}
      <div className={styles.resultsColumn}>
        <section className={`glass-card ${styles.resultCard}`}>
          {result ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    📋 {result.title}
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {result.aspectRatio} · {result.fps}fps ·{' '}
                    {clipCountOf > 1
                      ? `${clipCountOf} clip × ${result.durationSeconds}s = ~${result.totalDuration || clipCountOf * result.durationSeconds}s`
                      : `~${result.durationSeconds}s`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <CraftAsmrFlowButton flow={flow} />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    🔄 Tạo lại
                  </button>
                  {clipCountOf > 1 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                      onClick={() => copyText(result.promptText, 'all')}
                    >
                      {copied === 'all' ? '✓ Đã chép' : '📚 Copy cả bộ clip'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-accent"
                    style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                    onClick={() => copyText(currentTab?.promptText || '', 'one')}
                  >
                    {copied === 'one'
                      ? '✓ Đã chép'
                      : onSheet
                        ? '🎨 Copy prompt ảnh'
                        : onSocial
                          ? '📣 Copy tất cả'
                          : clipCountOf > 1
                            ? '📋 Copy clip này'
                            : '📋 Copy Prompt'}
                  </button>
                </div>
              </div>

              <CraftAsmrFlowNotice flow={flow} />

              {hasTabs && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  {tabs.map((t, i) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setActiveClip(i);
                        setCopied('');
                      }}
                      style={{
                        background:
                          i === activeClip
                            ? t.key === 'sheet'
                              ? 'linear-gradient(135deg, #25f4ee, #1e90ff)'
                              : 'linear-gradient(135deg, #fe2c55, #a020f0)'
                            : 'rgba(255,255,255,0.05)',
                        border: i === activeClip ? 'none' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '7px 14px',
                        color: i === activeClip && t.key === 'sheet' ? '#08131a' : '#fff',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              {onSheet ? (
                <div
                  style={{
                    background: 'rgba(37, 244, 238, 0.06)',
                    border: '1px solid rgba(37, 244, 238, 0.2)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    marginBottom: '14px',
                    fontSize: '0.76rem',
                    color: 'rgba(255,255,255,0.8)',
                    lineHeight: 1.7,
                  }}
                >
                  <b style={{ color: '#25f4ee' }}>Làm bước này TRƯỚC:</b> dán prompt này vào công cụ sinh{' '}
                  <b>ảnh</b> (Flow/Whisk, Midjourney, Nano Banana...) để ra bảng tham chiếu nhân vật trên nền
                  trắng — turnaround 4 góc, các bộ phận rời, mẫu vật liệu, cận cảnh mép cắt. Xem ưng rồi mới đi
                  tiếp sang các clip video. Sau đó <b>dùng chính tấm sheet này làm ảnh tham chiếu</b> khi sinh
                  clip: đó là cách rẻ nhất để cả {clipCountOf > 1 ? `${clipCountOf} clip` : 'video'} cùng nhìn
                  vào một mô hình thay vì mỗi lượt tự bịa một kiểu. Sheet cố ý <b>không có chữ</b> — model sinh
                  ảnh viết chữ luôn sai và làm hỏng giá trị tham chiếu.
                </div>
              ) : clipCountOf > 1 ? (
                <div
                  style={{
                    background: 'rgba(254, 44, 85, 0.07)',
                    border: '1px solid rgba(254, 44, 85, 0.25)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    marginBottom: '14px',
                    fontSize: '0.76rem',
                    color: 'rgba(255,255,255,0.8)',
                    lineHeight: 1.7,
                  }}
                >
                  <b style={{ color: '#ff6b8a' }}>Cách nối cho liền mạch:</b> sinh clip 1 trước → lấy{' '}
                  <b>khung hình CUỐI</b> của nó (screenshot / export frame) → dùng chính khung đó làm{' '}
                  <b>ảnh đầu vào</b> cho clip 2 (chức năng nối tiếp clip hoặc image-to-video của công cụ bạn
                  dùng) → làm tương tự cho clip 3. Prompt của mỗi clip đã ghi sẵn khối 🔗 mô tả khung đầu và
                  khung cuối phải trông thế nào, nên kể cả khi công cụ không hỗ trợ nối khung, các clip vẫn
                  khớp nhau về vật liệu, bố cục và ánh sáng.
                </div>
              ) : null}

              {onSocial ? (
                <SocialCopyView
                  social={currentTab.social}
                  copied={copied}
                  onCopy={copyText}
                />
              ) : (
                <pre
                  className="custom-scrollbar"
                  style={{
                    background: 'rgba(10, 9, 18, 0.6)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '16px',
                    color: 'rgba(255,255,255,0.88)',
                    fontSize: '0.8rem',
                    lineHeight: 1.65,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '55vh',
                    overflowY: 'auto',
                    margin: 0,
                    fontFamily: "'Be Vietnam Pro', system-ui, sans-serif",
                  }}
                >
                  {currentTab?.promptText}
                </pre>
              )}
            </>
          ) : (
            <div className={styles.emptyResult}>
              <div>
                <div className={styles.emptyVisual}>🔨</div>
                <h3>Sẵn sàng dựng prompt đầu tiên</h3>
                <p>Nhập thành phẩm và vật liệu ở panel bên trái. AI sẽ tạo sheet tham chiếu, prompt video và nội dung đăng mạng xã hội.</p>
                <div className={styles.emptySteps}>
                  <span>1 · Nhập ý tưởng</span>
                  <span>2 · Tạo prompt</span>
                  <span>3 · Chuyển qua Flow</span>
                </div>
              </div>
            </div>
          )}
        </section>

        <CraftAsmrHistory
          history={history}
          selectedId={result?.id}
          onLoad={handleLoadHistory}
          onDelete={handleDeleteHistory}
        />
      </div>
    </div>
  );
}
