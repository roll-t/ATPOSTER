'use client';

import { useMemo, useRef, useState } from 'react';
import { buildTtsSlideParts, stripEmotionTagsForDisplay, ttsChunkLimitFor } from './SegmentedResultView/utils.js';
import { countNarrationUnits } from '@/lib/speechRate.js';
import {
  decodeAudioFile,
  autoDetectBoundaries,
  proportionalBoundaries,
  slicesFromBoundaries,
  encodeWavSlice,
  formatSeconds,
} from './SegmentedResultView/audioSlicer.js';

/**
 * Ghép giọng đọc ElevenLabs vào dự án: thả file dài -> cắt theo slide -> xem trước -> ghi 52 file.
 *
 * Luồng này tồn tại vì Remotion đòi mỗi slide một file audio riêng (thời lượng slide = độ dài file
 * của chính slide đó), trong khi ElevenLabs bản web chỉ trả về một file dài cho mỗi lượt render.
 *
 * Bảng xem trước là phần KHÔNG được bỏ: dò khoảng lặng có thể bắt nhầm một chỗ lấy hơi giữa slide,
 * và phát hiện chuyện đó SAU KHI render xong 9 phút video thì quá muộn. Ở đây nghe thử từng lát mất
 * vài giây, sửa cũng chỉ là bấm mũi tên nhảy sang quãng lặng kế bên.
 */

const UPLOAD_CONCURRENCY = 4;

function partWeights(part, segmentsByNumber) {
  // Trọng số theo số ký tự lời NÓI (đã bỏ [tag] vì tag không được đọc thành tiếng) — dùng để đoán
  // thời điểm kỳ vọng của từng ranh giới trước khi bám vào quãng lặng gần nhất.
  return part.segmentNumbers.map((n) => {
    const seg = segmentsByNumber.get(n);
    const spoken = stripEmotionTagsForDisplay(seg?.dialogueOrNarration || '');
    return Math.max(1, spoken.length);
  });
}

export default function VoiceSplitPanel({ segments, folderPath, category, keepTags, onApplied }) {
  const parts = useMemo(() => buildTtsSlideParts(segments, { keepTags }), [segments, keepTags]);
  const segmentsByNumber = useMemo(
    () => new Map((segments || []).map((s) => [Number(s.segmentNumber), s])),
    [segments]
  );

  // state[i] = { name, buffer, silences, indexes, fallback, settings, error }
  const [state, setState] = useState({});
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(null);
  const [copiedPart, setCopiedPart] = useState(null);
  const playerRef = useRef(null);

  const setPart = (i, patch) => setState((prev) => ({ ...prev, [i]: { ...(prev[i] || {}), ...patch } }));

  const handleFile = async (partIndex, file) => {
    if (!file) return;
    setBusy(`Đang giải mã ${file.name}...`);
    setPart(partIndex, { error: '', name: file.name });
    try {
      const buffer = await decodeAudioFile(file);
      const weights = partWeights(parts[partIndex], segmentsByNumber);
      const { silences, indexes, settings, needed } = autoDetectBoundaries(buffer, weights);

      if (indexes) {
        setPart(partIndex, { buffer, silences, indexes, fallback: false, settings, error: '' });
      } else {
        // Không đủ quãng lặng: vẫn cắt được bằng tỉ lệ ký tự, nhưng phải nói rõ đây là bản ước lượng.
        setPart(partIndex, {
          buffer,
          silences,
          indexes: null,
          fallback: proportionalBoundaries(weights, buffer.duration),
          settings,
          error: `Chỉ dò được ${silences.length} quãng lặng, cần ${needed}. File này nhiều khả năng đọc từ bản TTS CŨ (chưa mỗi slide một đoạn). Đang tạm cắt đều theo số ký tự — nghe thử trước khi áp dụng.`,
        });
      }
    } catch (err) {
      setPart(partIndex, { error: `Không giải mã được file: ${err.message}` });
    } finally {
      setBusy('');
    }
  };

  const boundariesOf = (partIndex) => {
    const p = state[partIndex];
    if (!p || !p.buffer) return null;
    if (p.indexes) return p.indexes.map((idx) => p.silences[idx].mid);
    return p.fallback || null;
  };

  const nudge = (partIndex, boundaryIndex, direction) => {
    const p = state[partIndex];
    if (!p || !p.indexes) return;
    const next = [...p.indexes];
    const target = next[boundaryIndex] + direction;
    const lower = boundaryIndex === 0 ? -1 : next[boundaryIndex - 1];
    const upper = boundaryIndex === next.length - 1 ? p.silences.length : next[boundaryIndex + 1];
    if (target <= lower || target >= upper) return; // giữ thứ tự tăng dần, không cho vượt hàng xóm
    next[boundaryIndex] = target;
    setPart(partIndex, { indexes: next });
  };

  const playSlice = (partIndex, start, end) => {
    const p = state[partIndex];
    if (!p || !p.buffer) return;
    if (playerRef.current) { try { playerRef.current.stop(); } catch (_) { /* đã dừng rồi */ } }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const src = ctx.createBufferSource();
    src.buffer = p.buffer;
    src.connect(ctx.destination);
    src.onended = () => ctx.close();
    src.start(0, start, Math.max(0.05, end - start));
    playerRef.current = src;
  };

  const apply = async () => {
    const jobs = [];
    for (let i = 0; i < parts.length; i++) {
      const boundaries = boundariesOf(i);
      if (!boundaries) continue;
      const slices = slicesFromBoundaries(boundaries, state[i].buffer.duration);
      parts[i].segmentNumbers.forEach((segmentNumber, k) => {
        jobs.push({ partIndex: i, segmentNumber, slice: slices[k] });
      });
    }
    if (!jobs.length) return;

    setBusy('Đang ghi file...');
    setProgress({ done: 0, total: jobs.length });
    let done = 0;
    let failed = 0;

    const worker = async (queue) => {
      while (queue.length) {
        const job = queue.shift();
        try {
          const blob = encodeWavSlice(state[job.partIndex].buffer, job.slice.start, job.slice.end);
          const form = new FormData();
          form.append('folderPath', folderPath);
          if (category) form.append('category', category);
          form.append('segmentNumber', String(job.segmentNumber));
          form.append('file', blob, `scene-${String(job.segmentNumber).padStart(2, '0')}.wav`);
          const res = await fetch('/api/prompts/upload-scene-audio', { method: 'POST', body: form });
          const data = await res.json();
          if (!res.ok || !data.success) failed++;
        } catch (_) {
          failed++;
        }
        done++;
        setProgress({ done, total: jobs.length });
      }
    };

    const queue = [...jobs];
    await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, () => worker(queue)));

    setBusy('');
    setProgress(null);
    if (failed > 0) {
      setPart(0, { error: `Ghi xong ${jobs.length - failed}/${jobs.length} file, ${failed} file lỗi. Bấm Áp dụng lại để ghi bù.` });
    } else if (onApplied) {
      onApplied();
    }
  };

  const readyCount = parts.reduce((sum, _, i) => sum + (boundariesOf(i) ? 1 : 0), 0);
  const totalSlides = parts.reduce((sum, p) => sum + p.segmentNumbers.length, 0);

  const copyPart = async (i) => {
    try {
      await navigator.clipboard.writeText(parts[i].text);
      setCopiedPart(i);
      setTimeout(() => setCopiedPart(null), 1500);
    } catch (_) { /* trình duyệt chặn clipboard thì người dùng bôi đen copy tay */ }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Bản dưới đây <strong>mỗi slide một đoạn</strong>, khác bản &quot;Copy giọng đọc&quot; ở dưới trang
        (bản kia gộp cả bài rồi chia lại theo câu, nên chỗ nghỉ hơi không trùng ranh giới slide).
        Copy từng phần đem render ở ElevenLabs, tải file về rồi thả lại vào đây — tool sẽ cắt theo
        đúng {totalSlides} slide.
      </div>

      {parts.map((part, i) => {
        const p = state[i] || {};
        const boundaries = boundariesOf(i);
        const slices = boundaries && p.buffer ? slicesFromBoundaries(boundaries, p.buffer.duration) : null;

        // Tốc độ đọc của TỪNG lát (ký tự mỗi giây). Một lát bị cắt cụt sẽ có tốc độ vọt lên bất
        // thường: cùng ngần ấy chữ nhưng chỉ còn nửa thời gian.
        const rates = slices
          ? part.segmentNumbers.map((n, k) => {
            const seg = segmentsByNumber.get(n);
            const chars = countNarrationUnits(stripEmotionTagsForDisplay(seg?.dialogueOrNarration || ''));
            const seconds = slices[k].end - slices[k].start;
            return seconds > 0 ? chars / seconds : 0;
          })
          : null;

        // So với HÀNG XÓM chứ không so với trung bình cả bài: người đọc chậm dần về cuối tập (đoạn
        // ru ngủ đọc chậm hẳn so với đoạn kể chuyện), nên lấy trung bình toàn bài làm mốc sẽ báo
        // nhầm hàng loạt lát vốn bình thường ở cuối. Điểm cắt lệch thì lệch so với ngay xung quanh.
        const neighbourRate = (k) => {
          const window = rates
            .slice(Math.max(0, k - 5), k + 6)
            .filter((x, idx) => x > 0 && idx !== Math.min(k, 5))
            .sort((a, b) => a - b);
          return window.length ? window[Math.floor(window.length / 2)] : 0;
        };

        return (
          <div key={i} style={{
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px',
            background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>
                ▶️ Phần {i + 1}
              </strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                slide {part.segmentNumbers[0]}–{part.segmentNumbers[part.segmentNumbers.length - 1]}
                {' · '}{part.segmentNumbers.length} slide
                {' · '}{part.text.length.toLocaleString('vi-VN')} / {ttsChunkLimitFor(part.text).toLocaleString('vi-VN')} ký tự
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '6px', fontWeight: 700 }}
                onClick={() => copyPart(i)}
              >
                {copiedPart === i ? '✓ Đã chép!' : `📋 Copy phần ${i + 1}`}
              </button>
              <label
                className="btn btn-secondary"
                style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', margin: 0 }}
              >
                {p.name ? `🎧 ${p.name}` : '📥 Thả file mp3 đã render'}
                <input
                  type="file"
                  accept="audio/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFile(i, e.target.files?.[0])}
                />
              </label>
              {p.buffer && (
                <span style={{ fontSize: '0.7rem', color: '#2ed573' }}>
                  {formatSeconds(p.buffer.duration)}
                  {p.settings && !p.fallback ? ` · ngưỡng ${p.settings.thresholdDb}dB / ${p.settings.minSilenceMs}ms` : ''}
                </span>
              )}
            </div>

            {p.error && (
              <div style={{
                fontSize: '0.72rem', color: '#fbbf24', background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.25)', borderRadius: '8px', padding: '8px 10px', lineHeight: 1.5
              }}>
                ⚠️ {p.error}
              </div>
            )}

            {slices && (
              <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}>
                {part.segmentNumbers.map((segmentNumber, k) => {
                  const slice = slices[k];
                  const seg = segmentsByNumber.get(segmentNumber);
                  const spoken = stripEmotionTagsForDisplay(seg?.dialogueOrNarration || '');
                  const length = slice.end - slice.start;
                  // Ngưỡng cũ chỉ bắt lát dưới 1,5 giây, và nó ĐÃ BỎ SÓT trên file thật: hai lát bị
                  // cắt cụt dài 2,1s và 2,4s lọt lưới vì vẫn trên 1,5s. Cái tố giác thật sự không
                  // phải độ dài tuyệt đối mà là TỐC ĐỘ ĐỌC: cùng chừng ấy chữ mà thời gian ngắn hơn
                  // hẳn hàng xóm thì chắc chắn có phần lời đã rơi sang lát bên cạnh.
                  const rate = rates[k];
                  const reference = neighbourRate(k);
                  const drift = reference > 0 && rate > 0 ? rate / reference - 1 : 0;
                  const suspicious = length < 1.2 || length > 40 || Math.abs(drift) > 0.4;
                  return (
                    <div key={segmentNumber} style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: suspicious ? 'rgba(248,113,113,0.08)' : 'transparent'
                    }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: '30px', flexShrink: 0 }}>
                        {String(segmentNumber).padStart(2, '0')}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '2px 7px', fontSize: '0.66rem', borderRadius: '5px', flexShrink: 0 }}
                        onClick={() => playSlice(i, slice.start, slice.end)}
                      >
                        ▶
                      </button>
                      <span
                        title={reference > 0
                          ? `${rate.toFixed(1)} ký tự/giây — hàng xóm quanh đây đọc ${reference.toFixed(1)} ký tự/giây`
                          : `${length.toFixed(1)} giây`}
                        style={{
                          fontSize: '0.7rem', width: '52px', flexShrink: 0, fontWeight: 700,
                          color: suspicious ? '#f87171' : '#2ed573'
                        }}
                      >
                        {length.toFixed(1)}s
                      </span>
                      {suspicious && Math.abs(drift) > 0.4 && (
                        <span
                          title="Lát này đọc nhanh/chậm khác hẳn xung quanh — nhiều khả năng điểm cắt lệch. Nghe thử rồi dùng ◀ ▶ để dời."
                          style={{ fontSize: '0.66rem', color: '#f87171', flexShrink: 0, fontWeight: 700 }}
                        >
                          {drift > 0 ? '⚠ cụt' : '⚠ dư'}
                        </span>
                      )}
                      <span style={{
                        fontSize: '0.7rem', color: 'var(--text-muted)', flex: 1, minWidth: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {spoken}
                      </span>
                      {p.indexes && k > 0 && (
                        <span style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            title="Đẩy điểm cắt sang quãng lặng TRƯỚC đó"
                            style={{ padding: '2px 6px', fontSize: '0.66rem', borderRadius: '5px' }}
                            onClick={() => nudge(i, k - 1, -1)}
                          >
                            ◀
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            title="Đẩy điểm cắt sang quãng lặng SAU đó"
                            style={{ padding: '2px 6px', fontSize: '0.66rem', borderRadius: '5px' }}
                            onClick={() => nudge(i, k - 1, 1)}
                          >
                            ▶
                          </button>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn"
          style={{
            padding: '7px 16px', fontSize: '0.78rem', borderRadius: '8px', fontWeight: 700,
            background: readyCount ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'rgba(255,255,255,0.05)',
            color: readyCount ? '#fff' : 'rgba(255,255,255,0.3)',
            border: 'none',
            cursor: readyCount && !busy ? 'pointer' : 'not-allowed'
          }}
          onClick={apply}
          disabled={!readyCount || Boolean(busy)}
        >
          {busy || `✅ Áp dụng — ghi ${totalSlides} file vào audio/`}
        </button>
        {progress && (
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            {progress.done}/{progress.total} file
          </span>
        )}
        {readyCount < parts.length && !busy && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            còn {parts.length - readyCount} phần chưa thả file
          </span>
        )}
      </div>
    </div>
  );
}
