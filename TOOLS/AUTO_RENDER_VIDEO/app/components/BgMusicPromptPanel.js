'use client';

import { useState } from 'react';
import {
  BG_MUSIC_PROMPTS,
  BG_MUSIC_EXCLUDE_STYLES,
  BG_MUSIC_SUNO_SETTINGS,
  BG_MUSIC_CONSTRAINTS,
} from '@/lib/prompts/bgMusicPrompts.js';

// Một nút chép dùng lại nhiều chỗ. Tự đổi nhãn 1.6 giây rồi trả về như cũ — đủ để thấy đã bấm
// trúng mà không cần thêm toast hay state toàn trang.
function CopyButton({ text, label = 'Chép', small = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Trình duyệt chặn clipboard API (http, quyền bị từ chối) — vẫn chép được bằng cách cũ.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* đành chịu */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        background: copied ? 'rgba(74, 222, 128, 0.2)' : 'rgba(168, 139, 250, 0.15)',
        border: `1px solid ${copied ? 'rgba(74, 222, 128, 0.45)' : 'rgba(168, 139, 250, 0.35)'}`,
        borderRadius: '8px',
        color: copied ? '#4ade80' : '#c4b5fd',
        padding: small ? '4px 10px' : '6px 14px',
        fontSize: small ? '0.72rem' : '0.78rem',
        fontWeight: 800,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'all 0.15s ease',
      }}
    >
      {copied ? '✓ Đã chép' : label}
    </button>
  );
}

function FieldLabel({ children }) {
  return (
    <span style={{
      fontSize: '0.68rem',
      letterSpacing: '0.13em',
      textTransform: 'uppercase',
      fontWeight: 800,
      color: 'rgba(255, 255, 255, 0.45)',
    }}>
      {children}
    </span>
  );
}

function PromptBox({ text }) {
  return (
    <pre style={{
      margin: 0,
      background: 'rgba(0, 0, 0, 0.28)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderLeft: '3px solid #a78bfa',
      borderRadius: '8px',
      padding: '13px 15px',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '0.8rem',
      lineHeight: 1.7,
      color: 'rgba(255, 255, 255, 0.88)',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      overflowX: 'auto',
    }}>
      {text}
    </pre>
  );
}

export default function BgMusicPromptPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Tiêu đề */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{
          fontSize: '1.4rem',
          fontWeight: 800,
          color: '#fff',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
        }}>
          🎵 Prompt Nhạc Nền — Suno
          <span style={{
            fontSize: '0.72rem',
            padding: '3px 10px',
            borderRadius: '8px',
            background: 'rgba(168, 139, 250, 0.18)',
            border: '1px solid rgba(168, 139, 250, 0.35)',
            color: '#c4b5fd',
            fontWeight: 800,
          }}>
            {BG_MUSIC_PROMPTS.length} bản · Lịch Sử Nhật Bản
          </span>
        </h2>
        <p style={{
          margin: '10px 0 0 0',
          fontSize: '0.88rem',
          color: 'rgba(255, 255, 255, 0.6)',
          lineHeight: 1.6,
          maxWidth: '68ch',
        }}>
          Mỗi nhóm chủ đề có một bản nhạc nền riêng. Tất cả đều không lời, âm lượng đều, không cao trào —
          vì nhạc phát ở mức cố định 35% dưới giọng đọc và bị lặp lại suốt video 8–20 phút.
          Dán khối <b style={{ color: '#c4b5fd' }}>Style</b> vào Suno, dán khối{' '}
          <b style={{ color: '#c4b5fd' }}>Exclude Styles</b> dùng chung bên dưới.
        </p>
      </div>

      {/* Cài đặt dùng chung + Exclude */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
          共通設定 — Cài đặt dùng chung cho mọi bản
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '14px 22px',
        }}>
          {BG_MUSIC_SUNO_SETTINGS.map((s) => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <FieldLabel>{s.label}</FieldLabel>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                {s.value}{' '}
                <span style={{ fontWeight: 400, color: 'rgba(255, 255, 255, 0.5)' }}>— {s.note}</span>
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <FieldLabel>Exclude Styles — dán cho cả {BG_MUSIC_PROMPTS.length} bản</FieldLabel>
            <CopyButton text={BG_MUSIC_EXCLUDE_STYLES} small />
          </div>
          <PromptBox text={BG_MUSIC_EXCLUDE_STYLES} />
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.6 }}>
            Ô này chặn thứ phá giọng đọc: <b style={{ color: '#93c5fd' }}>tiếng hát và ngâm nga</b> (Suno hay tự chèn dù đã bật Instrumental),{' '}
            <b style={{ color: '#93c5fd' }}>riser và crescendo</b> (đang đọc thì nhạc trào lên át tiếng), và{' '}
            <b style={{ color: '#93c5fd' }}>fade out</b> (làm đoạn lặp bị hụt cuối).
          </p>
        </div>
      </div>

      {/* Sáu bản nhạc */}
      {BG_MUSIC_PROMPTS.map((item, idx) => (
        <div key={item.id} className="glass-card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 900,
              color: '#a78bfa',
              background: 'rgba(168, 139, 250, 0.15)',
              padding: '2px 8px',
              borderRadius: '6px',
            }}>
              #{idx + 1}
            </span>
            <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', letterSpacing: '0.03em' }}>
              {item.label}
            </span>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#c4b5fd' }}>
              {item.sublabel}
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.62)', lineHeight: 1.6, maxWidth: '70ch' }}>
            {item.useCase}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <FieldLabel>Style</FieldLabel>
              <CopyButton text={item.prompt} label="Chép prompt" />
            </div>
            <PromptBox text={item.prompt} />
            <p style={{ margin: 0, fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.45)', lineHeight: 1.6 }}>
              🎼 {item.instruments}
            </p>
          </div>
        </div>
      ))}

      {/* Ràng buộc bắt buộc giữ lại */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
          ⚠️ Sửa prompt thì giữ lại mấy cụm này
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {BG_MUSIC_CONSTRAINTS.map((c) => (
            <div key={c.phrase} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              borderLeft: '2px solid rgba(251, 191, 36, 0.4)',
              paddingLeft: '14px',
            }}>
              <code style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '0.8rem',
                color: '#fcd34d',
                fontWeight: 700,
              }}>
                {c.phrase}
              </code>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.55)', lineHeight: 1.6 }}>
                {c.why}
              </span>
            </div>
          ))}
        </div>
        <p style={{
          margin: 0,
          fontSize: '0.8rem',
          color: 'rgba(255, 255, 255, 0.5)',
          lineHeight: 1.6,
          background: 'rgba(168, 139, 250, 0.07)',
          border: '1px solid rgba(168, 139, 250, 0.18)',
          borderRadius: '8px',
          padding: '12px 14px',
        }}>
          💡 Tạo xong tải file về, rồi vào <b style={{ color: '#c4b5fd' }}>Studio Thiết Kế Trang Đọc Video</b> chọn
          nhạc nền tuỳ chỉnh thay cho ba bản có sẵn — ba bản đó là nhạc ambient chữa lành dựng cho kênh Phật giáo,
          không hợp giọng lịch sử.
        </p>
      </div>

    </div>
  );
}
