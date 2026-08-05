'use client';

import React, { useState, useRef, useCallback } from 'react';

// ── Helpers ────────────────────────────────────────────────────────────────────

function slugify(str) {
  const now = new Date();
  const ts = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
  const slug = (str || 'playlist')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[đĐ]/g,'d')
    .replace(/[^a-z0-9]+/g,'_')
    .replace(/^_+|_+$/g,'')
    .slice(0, 28);
  return `${slug || 'playlist'}_${ts}`;
}

function emptyS() {
  return { title: '', artist: '', audioFile: null, durationSeconds: '', uploading: false };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SongRow({ song, idx, onChange, onRemove, onUpload, canRemove }) {
  const fileRef = useRef(null);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
          BÀI {idx + 1}
        </span>
        {canRemove && (
          <button onClick={() => onRemove(idx)} style={{
            background: 'none', border: 'none', color: 'rgba(255,80,80,0.7)',
            cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 4px',
          }}>×</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <input
          placeholder="Tên bài hát *"
          value={song.title}
          onChange={e => onChange(idx, 'title', e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Tên nghệ sĩ"
          value={song.artist}
          onChange={e => onChange(idx, 'artist', e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
        <input
          placeholder="Thời lượng (giây) *  vd: 210"
          type="number"
          min="5"
          max="3600"
          value={song.durationSeconds}
          onChange={e => onChange(idx, 'durationSeconds', e.target.value)}
          style={inputStyle}
        />
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".mp3,.m4a,.ogg,.wav,.aac"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files[0]) onUpload(idx, e.target.files[0]); }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={song.uploading}
            style={{
              ...btnStyle,
              background: song.audioFile
                ? 'rgba(74,222,128,0.12)'
                : 'rgba(167,139,250,0.12)',
              border: `1px solid ${song.audioFile ? 'rgba(74,222,128,0.3)' : 'rgba(167,139,250,0.3)'}`,
              color: song.audioFile ? '#4ade80' : '#a78bfa',
              whiteSpace: 'nowrap',
              fontSize: '12px',
              padding: '8px 14px',
            }}
          >
            {song.uploading ? '⏳ Đang tải...' : song.audioFile ? '✓ File nhạc' : '📁 Chọn MP3'}
          </button>
        </div>
      </div>

      {song.audioFile && (
        <div style={{ fontSize: '11px', color: 'rgba(74,222,128,0.7)', marginTop: '-4px' }}>
          ✓ {song.audioFile.split('/').pop()}
        </div>
      )}
    </div>
  );
}

function PexelsVideoPicker({ folderPath, bgVideo, onBgVideoPicked }) {
  const [query, setQuery] = useState('nature relaxing');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const search = useCallback(async (q, p) => {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/prompts/pexels?query=${encodeURIComponent(q)}&type=videos&page=${p}`);
      const data = await res.json();
      if (data.success) {
        const list = data.data.videos || [];
        setResults(p === 1 ? list : prev => [...prev, ...list]);
        setPage(p);
      } else {
        setError(data.error || 'Lỗi tìm kiếm');
      }
    } catch {
      setError('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDownload = async (video) => {
    if (!folderPath) { setError('Vui lòng khởi tạo dự án trước (nhấn "Lưu cài đặt").'); return; }
    const files = video.video_files || [];
    const best = files.find(f => f.quality === 'hd' && f.file_type === 'video/mp4')
      || files.find(f => f.file_type === 'video/mp4')
      || files[0];
    if (!best?.link) { setError('Không tìm thấy link video.'); return; }

    setDownloading(video.id);
    setError('');
    try {
      const res = await fetch('/api/prompts/music-player/download-bg-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath, videoUrl: best.link, pexelsId: video.id }),
      });
      const data = await res.json();
      if (data.success) {
        onBgVideoPicked(data.backgroundVideo, video);
      } else {
        setError(data.error || 'Lỗi tải video');
      }
    } catch {
      setError('Lỗi kết nối');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search(query, 1)}
          placeholder="Tìm video nền (e.g. nature, coffee shop, rain...)"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={() => search(query, 1)} disabled={loading} style={{
          ...btnStyle,
          background: 'rgba(167,139,250,0.15)',
          border: '1px solid rgba(167,139,250,0.3)',
          color: '#a78bfa', padding: '8px 16px', whiteSpace: 'nowrap',
        }}>
          {loading ? '⏳' : '🔍 Tìm'}
        </button>
      </div>

      {bgVideo && (
        <div style={{
          fontSize: '12px', color: '#4ade80',
          background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
          borderRadius: '8px', padding: '8px 12px',
        }}>
          ✓ Đã chọn: <strong>{bgVideo.split('/').pop()}</strong>
        </div>
      )}

      {error && (
        <div style={{ fontSize: '12px', color: '#f87171', padding: '8px 12px',
          background: 'rgba(248,113,113,0.08)', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.2)' }}>
          {error}
        </div>
      )}

      {results.length > 0 && (
        <>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px', maxHeight: '280px', overflowY: 'auto',
          }}>
            {results.map(v => {
              const thumb = v.image || v.video_pictures?.[0]?.picture;
              const isDownloading = downloading === v.id;
              const isDone = bgVideo && bgVideo.includes(String(v.id));
              return (
                <div key={v.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}
                  onClick={() => !isDownloading && handleDownload(v)}>
                  {thumb && (
                    <img src={thumb} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                  )}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: isDone ? 'rgba(74,222,128,0.4)' : isDownloading ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: isDownloading ? '12px' : '20px', color: '#fff', fontWeight: 700,
                    transition: 'background 0.2s',
                  }}>
                    {isDownloading ? '⏳ Tải...' : isDone ? '✓' : '▶'}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 4, right: 6,
                    fontSize: '10px', color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.5)',
                    padding: '2px 5px', borderRadius: '4px',
                  }}>
                    {v.duration}s
                  </div>
                </div>
              );
            })}
          </div>
          {results.length % 15 === 0 && (
            <button onClick={() => search(query, page + 1)} disabled={loading}
              style={{ ...btnStyle, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px' }}>
              {loading ? '⏳ Đang tải...' : 'Xem thêm'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  padding: '9px 12px',
  color: '#fff',
  fontSize: '13px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const btnStyle = {
  border: 'none',
  borderRadius: '8px',
  padding: '9px 18px',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.2s',
};

const sectionTitle = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)',
  marginBottom: '10px',
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function MusicPlayerStudio({ onBack }) {
  const [step, setStep] = useState('setup'); // 'setup' | 'edit' | 'rendering' | 'done'

  // Project state
  const [folderPath, setFolderPath] = useState('');
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [orientation, setOrientation] = useState('portrait');
  const [playerStyle, setPlayerStyle] = useState('glass');
  const [accentColor, setAccentColor] = useState('#A78BFA');
  const [barCount, setBarCount] = useState(32);
  const [bgVideoOpacity, setBgVideoOpacity] = useState(0.35);

  const [bgVideo, setBgVideo] = useState('');
  const [songs, setSongs] = useState([emptyS()]);

  const [saving, setSaving] = useState(false);
  const [renderMsg, setRenderMsg] = useState('');
  const [error, setError] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const initProject = async () => {
    if (!playlistTitle.trim()) { setError('Vui lòng nhập tên playlist.'); return; }
    setSaving(true); setError('');
    try {
      const folder = folderPath || slugify(playlistTitle);
      const res = await fetch('/api/prompts/music-player/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: folder, title: playlistTitle, orientation,
          playerStyle, accentColor, barCount, bgVideoOpacity,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFolderPath(folder);
        setStep('edit');
      } else {
        setError(data.error || 'Lỗi khởi tạo dự án');
      }
    } catch { setError('Lỗi kết nối'); }
    finally { setSaving(false); }
  };

  const handleSongChange = (idx, field, val) => {
    setSongs(prev => {
      const next = prev.map((s, i) => i === idx ? { ...s, [field]: val } : s);
      return next;
    });
  };

  const handleAddSong = () => setSongs(prev => [...prev, emptyS()]);

  const handleRemoveSong = (idx) => setSongs(prev => prev.filter((_, i) => i !== idx));

  const handleUploadAudio = async (idx, file) => {
    setSongs(prev => prev.map((s, i) => i === idx ? { ...s, uploading: true } : s));
    try {
      const fd = new FormData();
      fd.append('folderPath', folderPath);
      fd.append('songIndex', String(idx));
      fd.append('file', file);
      const res = await fetch('/api/prompts/music-player/upload-audio', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setSongs(prev => prev.map((s, i) => i === idx ? { ...s, audioFile: data.audioFile, uploading: false } : s));
      } else {
        setError(data.error || 'Lỗi upload');
        setSongs(prev => prev.map((s, i) => i === idx ? { ...s, uploading: false } : s));
      }
    } catch {
      setError('Lỗi kết nối');
      setSongs(prev => prev.map((s, i) => i === idx ? { ...s, uploading: false } : s));
    }
  };

  const handleBgVideoPicked = (bgVideoPath) => {
    setBgVideo(bgVideoPath);
  };

  const handleSaveAndRender = async () => {
    // Validate
    const validSongs = songs.filter(s => s.title && s.audioFile && Number(s.durationSeconds) > 0);
    if (validSongs.length === 0) {
      setError('Cần ít nhất 1 bài hát có đủ thông tin (tên, file nhạc, thời lượng).');
      return;
    }

    setStep('rendering');
    setError('');
    setRenderMsg('Đang lưu cài đặt...');

    try {
      // 1. Save all settings + songs to manifest in one call
      const setupRes = await fetch('/api/prompts/music-player/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath, title: playlistTitle, orientation,
          playerStyle, accentColor, barCount, bgVideoOpacity,
          songs: validSongs.map(s => ({
            title: s.title,
            artist: s.artist,
            audioFile: s.audioFile,
            durationSeconds: Number(s.durationSeconds),
          })),
        }),
      });
      if (!setupRes.ok) throw new Error('Không lưu được manifest');

      setRenderMsg('Đang render video...');

      // 3. Call render-video API
      const res = await fetch('/api/prompts/render-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath,
          category: 'music_player_video',
          orientation,
          bgMusicEnabled: false,
        }),
      });

      const data = await res.json();
      if (data.success || data.videoPath) {
        setVideoUrl(data.videoPath || `/api/prompts/video-stream?folder=${folderPath}&category=music_player_video`);
        setStep('done');
      } else {
        setError(data.error || 'Lỗi render video');
        setStep('edit');
      }
    } catch (e) {
      setError(e.message || 'Lỗi không xác định');
      setStep('edit');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (step === 'rendering') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '20px' }}>
        <div style={{ fontSize: '48px', animation: 'spin 1.5s linear infinite' }}>🎵</div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{renderMsg}</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Remotion đang render video — có thể mất vài phút...</div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '20px', padding: '32px' }}>
        <div style={{ fontSize: '56px' }}>🎉</div>
        <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>Video đã sẵn sàng!</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => {
            const link = document.createElement('a');
            link.href = videoUrl;
            link.download = `${playlistTitle || 'music-player'}.mp4`;
            link.click();
          }} style={{ ...btnStyle, background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: '#fff', padding: '12px 24px' }}>
            ⬇️ Tải xuống MP4
          </button>
          <button onClick={() => { setStep('edit'); setError(''); }} style={{
            ...btnStyle, background: 'rgba(255,255,255,0.06)', color: '#fff',
            border: '1px solid rgba(255,255,255,0.12)', padding: '12px 24px'
          }}>
            ✏️ Chỉnh sửa & render lại
          </button>
          <button onClick={onBack} style={{
            ...btnStyle, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.08)', padding: '12px 24px'
          }}>
            ← Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <button onClick={onBack} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', padding: '6px 12px', color: 'rgba(255,255,255,0.6)',
            fontSize: '12px', cursor: 'pointer', fontWeight: 600,
          }}>← Quay lại</button>
          <span style={{ fontSize: '22px' }}>🎵</span>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>Video Music Player</h2>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
          Nền video Pexels · Thanh sóng nhạc · Giao diện player · Xuất MP4
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {error && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
            borderRadius: '10px', padding: '10px 14px', color: '#f87171', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── SECTION 1: Cài đặt playlist ── */}
        <div>
          <div style={sectionTitle}>🎼 Thông tin Playlist</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              placeholder="Tên playlist *  (vd: Chill Study Session)"
              value={playlistTitle}
              onChange={e => setPlaylistTitle(e.target.value)}
              disabled={step === 'edit'}
              style={inputStyle}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <select value={orientation} onChange={e => setOrientation(e.target.value)}
                style={{ ...inputStyle, appearance: 'none' }}>
                <option value="portrait">📱 Dọc 9:16 (TikTok)</option>
                <option value="landscape">💻 Ngang 16:9 (YouTube)</option>
              </select>
              <select value={playerStyle} onChange={e => setPlayerStyle(e.target.value)}
                style={{ ...inputStyle, appearance: 'none' }}>
                <option value="glass">🪟 Glass (mờ trong)</option>
                <option value="dark">🌑 Dark (đặc tối)</option>
                <option value="minimal">✨ Minimal (trong suốt)</option>
              </select>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                  style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', padding: '2px', background: 'rgba(255,255,255,0.05)' }} />
                <input placeholder="Màu accent" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Số thanh EQ: {barCount}</span>
                <input type="range" min="8" max="64" step="4" value={barCount}
                  onChange={e => setBarCount(Number(e.target.value))} style={{ accentColor }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Độ tối nền: {Math.round(bgVideoOpacity * 100)}%</span>
                <input type="range" min="0" max="0.8" step="0.05" value={bgVideoOpacity}
                  onChange={e => setBgVideoOpacity(Number(e.target.value))} style={{ accentColor }} />
              </label>
            </div>

            {step === 'setup' && (
              <button onClick={initProject} disabled={saving} style={{
                ...btnStyle, background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                color: '#fff', padding: '10px 20px', alignSelf: 'flex-start',
              }}>
                {saving ? '⏳ Đang tạo...' : '✓ Lưu cài đặt & tiếp tục'}
              </button>
            )}
          </div>
        </div>

        {step === 'edit' && (
          <>
            {/* ── SECTION 2: Background video ── */}
            <div>
              <div style={sectionTitle}>🎞️ Video Nền (Pexels)</div>
              <PexelsVideoPicker
                folderPath={folderPath}
                bgVideo={bgVideo}
                onBgVideoPicked={handleBgVideoPicked}
              />
            </div>

            {/* ── SECTION 3: Danh sách bài hát ── */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={sectionTitle}>🎵 Danh Sách Bài Hát ({songs.length})</div>
                <button onClick={handleAddSong} style={{
                  ...btnStyle, background: 'rgba(167,139,250,0.12)',
                  border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa',
                  fontSize: '12px', padding: '6px 12px',
                }}>
                  + Thêm bài
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {songs.map((s, idx) => (
                  <SongRow
                    key={idx} song={s} idx={idx}
                    onChange={handleSongChange}
                    onRemove={handleRemoveSong}
                    onUpload={handleUploadAudio}
                    canRemove={songs.length > 1}
                  />
                ))}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>
                * Thời lượng tính bằng giây (vd: bài 3 phút = 180)
              </div>
            </div>

            {/* ── Render button ── */}
            <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {!bgVideo && (
                <div style={{ fontSize: '12px', color: 'rgba(251,191,36,0.8)', marginBottom: '10px' }}>
                  ⚠️ Chưa chọn video nền — video sẽ dùng nền gradient mặc định.
                </div>
              )}
              <button
                onClick={handleSaveAndRender}
                style={{
                  ...btnStyle,
                  background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                  color: '#fff', padding: '14px 32px',
                  fontSize: '15px', fontWeight: 900,
                  boxShadow: '0 8px 24px rgba(167,139,250,0.35)',
                  width: '100%', justifyContent: 'center',
                }}
              >
                🎥 Tạo Video (Render)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
