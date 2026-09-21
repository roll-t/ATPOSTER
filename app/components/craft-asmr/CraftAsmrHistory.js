'use client';

import React, { useMemo, useState } from 'react';
import styles from './CraftAsmrPanel.module.css';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date);
}

export default function CraftAsmrHistory({ history, selectedId, onLoad, onDelete }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('vi');
    if (!keyword) return history;
    return history.filter((item) => [item.title, item.material, item.subject]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('vi')
      .includes(keyword));
  }, [history, query]);

  if (history.length === 0) return null;

  return (
    <section className={`glass-card ${styles.historyCard}`} aria-label="Lịch sử prompt chế tác">
      <div className={styles.historyHeader}>
        <div>
          <div className={styles.eyebrow}>THƯ VIỆN Ý TƯỞNG</div>
          <h3>Prompt đã tạo <span>{history.length}</span></h3>
        </div>
        <label className={styles.historySearch}>
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm mô hình, vật liệu…"
            aria-label="Tìm trong lịch sử prompt"
          />
        </label>
      </div>

      <div className={`${styles.historyGrid} custom-scrollbar`}>
        {filtered.map((item) => {
          const selected = selectedId === item.id;
          const clips = item.clipCount || 1;
          const seconds = item.totalDuration || clips * (item.durationSeconds || 10);
          return (
            <article key={item.id} className={`${styles.historyItem} ${selected ? styles.historyItemSelected : ''}`}>
              <button type="button" className={styles.historyMain} onClick={() => onLoad(item)}>
                <span className={styles.historyIcon}>{selected ? '✓' : '↗'}</span>
                <span className={styles.historyText}>
                  <strong>{item.title}</strong>
                  <span>{item.material} <b>→</b> {item.subject}</span>
                  <small>
                    <i>{clips} clip</i>
                    <i>{seconds}s</i>
                    {item.aspectRatio && <i>{item.aspectRatio}</i>}
                    {formatDate(item.createdAt) && <i>{formatDate(item.createdAt)}</i>}
                  </small>
                </span>
              </button>
              <button
                type="button"
                className={styles.deleteHistory}
                onClick={(event) => onDelete(item.id, event)}
                aria-label={`Xoá ${item.title}`}
                title="Xoá prompt"
              >
                ×
              </button>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className={styles.historyEmpty}>Không tìm thấy prompt phù hợp.</div>
      )}
    </section>
  );
}
