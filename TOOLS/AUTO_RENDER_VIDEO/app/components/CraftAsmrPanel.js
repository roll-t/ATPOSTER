'use client';

import React, { useState, useEffect } from 'react';
import {
  CRAFT_ASMR_CLIP_DURATIONS,
  CRAFT_ASMR_CLIP_COUNTS,
  CRAFT_ASMR_ASPECT_RATIOS,
  CRAFT_ASMR_FPS,
  CRAFT_ASMR_FIDELITY_OPTIONS,
  CRAFT_ASMR_DEFAULTS,
} from '@/lib/prompts/craftAsmr.js';

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

export default function CraftAsmrPanel() {
  const [subject, setSubject] = useState('');
  const [material, setMaterial] = useState('');
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

  const chipStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '999px',
    padding: '5px 12px',
    color: 'rgba(255,255,255,0.75)',
    fontSize: '0.72rem',
    cursor: 'pointer',
    transition: '0.15s',
    whiteSpace: 'nowrap',
  };

  const tabs = tabsOf(result);
  const currentTab = tabs[activeClip] || tabs[0];
  const hasTabs = tabs.length > 1;
  const onSheet = currentTab?.key === 'sheet';
  const onSocial = currentTab?.key === 'social';
  const clipCountOf = tabs.filter((t) => t.key !== 'sheet' && t.key !== 'social').length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '4fr 6fr', gap: '24px', alignItems: 'start' }}>
      {/* ---------------- Cột trái: form nhập ---------------- */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h2
          style={{
            fontSize: '1.3rem',
            fontWeight: 800,
            color: '#fff',
            margin: '0 0 6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          🔨 Prompt Video ASMR Chế Tác
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 22px', lineHeight: 1.5 }}>
          Nhập <b>vật liệu</b> và <b>thành phẩm muốn làm ra</b> — hệ thống sinh sẵn prompt đúng khuôn
          (cắt → tạo hình → lắp ghép → khoe thành phẩm) kèm mốc thời gian, để dán thẳng vào Veo / Sora / Kling.
          Muốn video dài hơn 10s thì chọn nhiều clip: mỗi clip là một lượt sinh riêng, đã có sẵn khối lệnh nối
          để 2-3 clip ghép lại trông như một cú quay liền.
        </p>

        <div className="form-group">
          <label className="form-label">Nhân vật / mô hình muốn tạo *</label>
          <input
            className="form-control"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="mô hình giáp samurai Nhật Bản"
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
            {SUBJECT_SUGGESTIONS.map((s) => (
              <button key={s} type="button" style={chipStyle} onClick={() => setSubject(s)}>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
            {MATERIAL_SUGGESTIONS.map((s) => (
              <button key={s} type="button" style={chipStyle} onClick={() => setMaterial(s)}>
                {s}
              </button>
            ))}
          </div>
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
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.6 }}>
            <b style={{ color: '#25f4ee' }}>Đinh tán</b> = kiểu mô hình lon đang viral: tấm nhôm cong ghép bằng
            đinh tán bạc lộ thiên, chia đốt, hai tông đỏ–bạc, bề mặt sạch. · <b>Thô mộc</b> = ít mảnh, to bản,
            móp méo có duyên. · <b>Tinh xảo</b> = bóng bẩy như mô hình bán sẵn (dễ mất chất tự làm).
          </div>
        </div>

        <div className="form-group">
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
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Tổng video: <b style={{ color: '#25f4ee' }}>~{durationSeconds * clipCount} giây</b> ({clipCount} ×{' '}
            {durationSeconds}s)
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
        </div>

        <div className="form-group">
          <label className="form-label">Khung hình</label>
          <select className="form-control" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
            {CRAFT_ASMR_ASPECT_RATIOS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
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

        <button
          type="button"
          className={`btn btn-primary ${isGenerating ? 'btn-disabled' : ''}`}
          style={{ width: '100%' }}
          disabled={isGenerating}
          onClick={handleGenerate}
        >
          {isGenerating ? '⏳ Đang viết prompt...' : `✨ Tạo ${clipCount > 1 ? `${clipCount} Prompt` : 'Prompt'}`}
        </button>
      </div>

      {/* ---------------- Cột phải: kết quả + lịch sử ---------------- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
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
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔨</div>
              <p style={{ fontSize: '0.9rem', margin: 0 }}>
                Chưa có prompt nào. Nhập vật liệu + thành phẩm bên trái rồi bấm <b>Tạo Prompt</b>.
              </p>
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="glass-card" style={{ padding: '20px 24px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', margin: '0 0 14px' }}>
              🕘 Prompt đã tạo ({history.length})
            </h3>
            <div
              className="custom-scrollbar"
              style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleLoadHistory(item)}
                  style={{
                    background: result?.id === item.id ? 'rgba(37, 244, 238, 0.08)' : 'rgba(255,255,255,0.03)',
                    border:
                      result?.id === item.id
                        ? '1px solid rgba(37, 244, 238, 0.3)'
                        : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#fff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.title}
                      {item.clipCount > 1 && (
                        <span
                          style={{
                            marginLeft: '8px',
                            fontSize: '0.66rem',
                            color: '#25f4ee',
                            border: '1px solid rgba(37,244,238,0.3)',
                            borderRadius: '999px',
                            padding: '1px 7px',
                          }}
                        >
                          {item.clipCount} clip · {item.totalDuration || item.clipCount * item.durationSeconds}s
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {item.material} → {item.subject}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteHistory(item.id, e)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255,107,122,0.7)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      flexShrink: 0,
                    }}
                    title="Xoá"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
