'use client';

import React, { useState } from 'react';

const SUGGESTIONS = [
  'Chiến binh Samurai mặc giáp đỏ đứng giữa bão tuyết rơi',
  'Cô gái cyberpunk đeo tai nghe phát sáng dưới mưa đêm phố Tokyo',
  'Đức Phật ngồi thiền tỏa ánh hào quang vàng dưới gốc cây bồ đề',
  'Lâu đài kỳ ảo cổ kính bay lơ lửng giữa các tầng mây hoàng hôn',
  'Rồng phương Đông uy nghi uốn lượn quanh đỉnh núi tuyết phủ',
  'Chân dung cận cảnh cụ già với ánh mắt nhân hậu và nếp nhăn thời gian',
  'Căn phòng đọc sách ấm cúng với lò sưởi và tách cà phê bốc khói',
  'Thành phố tương lai năm 2150 với xe bay và cây xanh thẳng đứng',
];

const STYLES = [
  { value: 'Cinematic 8K Photography', label: '🎬 Cinematic 8K Film (Ảnh điện ảnh siêu thực)' },
  { value: 'Anime Style by Makoto Shinkai', label: '🌸 Anime Nhật Bản (Phong cách Makoto Shinkai)' },
  { value: 'Traditional Japanese Ink & Watercolor (Ukiyo-e)', label: '🖌️ Thủy Mặc & Màu Nước Cổ Phong (Ukiyo-e)' },
  { value: '3D Render Unreal Engine 5 / Octane', label: '🎮 3D Render Siêu Thực (Unreal Engine 5)' },
  { value: 'Baroque Oil Painting (Rembrandt style)', label: '🎨 Tranh Sơn Dầu Cổ Điển (Phong cách Phục Hưng)' },
  { value: 'Cyberpunk Neon Noir Art', label: '🏙️ Cyberpunk Neon Rực Rỡ' },
  { value: 'Studio Portrait Photography (Vogue style)', label: '📸 Nhiếp Ảnh Chân Dung Studio Thời Trang' },
  { value: 'National Geographic Wildlife Photography', label: '🦁 Thiên Nhiên Hoang Dã (National Geographic)' },
];

const ASPECT_RATIOS = [
  { value: '16:9', label: '16:9 (Màn ngang YouTube / Desktop)' },
  { value: '9:16', label: '9:16 (Màn dọc TikTok / Reels / Shorts)' },
  { value: '1:1', label: '1:1 (Vuông Instagram / Avatar)' },
  { value: '4:5', label: '4:5 (Dọc bài đăng mạng xã hội)' },
  { value: '21:9', label: '21:9 (Ultrawide điện ảnh cực rộng)' },
];

const LIGHTINGS = [
  { value: 'Cinematic Dramatic Lighting with deep shadows and rim light', label: 'Điện ảnh tương phản cao (Rim light & Shadow)' },
  { value: 'Golden hour warm sunlight with soft lens flare', label: 'Hoàng hôn rực rỡ (Golden Hour ấm áp)' },
  { value: 'Neon glow with colorful reflections on wet surfaces', label: 'Đèn Neon rực rỡ phản chiếu mặt đường ướt' },
  { value: 'Soft diffused studio lighting, gentle fill light', label: 'Ánh sáng studio êm dịu (Softbox)' },
  { value: 'Mystical moonlight, volumetric fog and god rays', label: 'Ánh trăng huyền ảo, sương mù & tia sáng' },
];

const CAMERAS = [
  { value: 'Eye-level shot, 85mm portrait lens, f/1.4 shallow depth of field', label: 'Chân dung 85mm f/1.4 xóa phông mượt mà' },
  { value: 'Wide-angle 24mm landscape perspective, immense depth', label: 'Góc rộng 24mm bao quát không gian hùng vĩ' },
  { value: 'Extreme close-up macro lens, ultra fine textures', label: 'Cận cảnh Macro sắc nét từng chi tiết nhỏ' },
  { value: 'Low-angle heroic shot, dramatic upward view', label: 'Góc thấp từ dưới lên (Hùng dũng, quyền lực)' },
  { value: 'Top-down aerial drone view, symmetrical composition', label: 'Góc nhìn từ trên cao (Flycam / Drone)' },
];

const CURATED_PRESETS = [
  {
    title: 'Chiến Binh Samurai Mùa Đông',
    style: 'Ukiyo-e & Cinematic',
    prompt: 'A solitary Sengoku-period samurai warrior standing in heavy falling snow, wearing weathered crimson lacquer armor and kabuto helmet with golden crescent crest, hand resting on the hilt of a katana, intense focused gaze, ancient snow-covered pine trees in the background, misty winter atmosphere, traditional Japanese sumi-e ink wash blended with cinematic photorealism, volumetric snowflakes, 8k resolution --ar 16:9 --v 6.1 --stylize 250',
  },
  {
    title: 'Thiền Định Tĩnh Lặng',
    style: 'Zen Spiritual Art',
    prompt: 'Majestic ancient stone Buddha statue seated in deep meditation beneath an enormous glowing Bodhi tree, soft golden dawn sunlight breaking through dense morning mountain mist, floating lotus flowers on a calm reflective pond, serene and transcendental atmosphere, cinematic lighting, ultra-high detail, sacred zen aesthetic --ar 16:9 --v 6.1 --stylize 200',
  },
  {
    title: 'Phố Cyberpunk Mưa Đêm',
    style: 'Cyberpunk Neon',
    prompt: 'A young female cyberpunk hacker with subtle neon glowing cyberware on her temple, wearing a holographic transparent trench coat, walking through a rain-drenched alleyway in Neo-Tokyo at night, neon signs in kanji reflecting on puddles, steam rising from manholes, cinematic bokeh, shot on 35mm lens, atmospheric depth --ar 9:16 --v 6.1 --stylize 300',
  },
  {
    title: 'Kỷ Băng Hà & Voi Ma Mút',
    style: 'Prehistoric Documentary',
    prompt: 'A herd of massive woolly mammoths migrating across a vast frozen tundra during an Ice Age blizzard, colossal curved tusks, thick matted brown fur dusted with frost, a dramatic orange sunset piercing through dark snow clouds on the Arctic horizon, National Geographic documentary photography style, extreme realism, raw nature --ar 16:9 --v 6.1 --stylize 250',
  },
];

export default function ImagePromptPanel({ onBackToGrid, categoryInfo } = {}) {
  const [activeTab, setActiveTab] = useState('generator'); // 'generator' | 'presets'
  const [idea, setIdea] = useState(categoryInfo?.defaultIdea || '');
  const [style, setStyle] = useState(categoryInfo?.defaultStyle || STYLES[0].value);
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0].value);
  const [lighting, setLighting] = useState(categoryInfo?.defaultLighting || LIGHTINGS[0].value);
  const [camera, setCamera] = useState(categoryInfo?.defaultCamera || CAMERAS[0].value);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copiedKey, setCopiedKey] = useState('');

  const handleCopy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2000);
    } catch {
      // Fallback
    }
  };

  const handleGenerate = async () => {
    if (!idea.trim()) {
      setError('Vui lòng nhập ý tưởng hoặc mô tả hình ảnh muốn tạo.');
      return;
    }
    setIsGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/prompts/image-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, style, aspectRatio, lighting, camera }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data.result);
      } else {
        setError(data.error || 'Không thể tạo prompt ảnh.');
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease-out' }}>
      {onBackToGrid && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <button
            type="button"
            onClick={onBackToGrid}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '6px 14px',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              lineHeight: 1,
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Chọn phong cách Ảnh khác</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>{categoryInfo?.icon || '🎨'}</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              {categoryInfo?.label || 'Studio Sinh Prompt Ảnh AI'}
            </h2>
          </div>
        </div>
      )}

      {/* Header Panel */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🖼️ Prompt Ảnh — Midjourney & Flux
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', margin: 0, maxWidth: '720px', lineHeight: 1.5 }}>
              Nhập ý tưởng bằng tiếng Việt, chọn phong cách & tỉ lệ — Gemini AI sẽ viết câu lệnh tiếng Anh chuyên sâu chuẩn nghệ thuật thị giác cho Midjourney v6.1, Flux 1.1 Pro và Stable Diffusion.
            </p>
          </div>

          {/* Tab Switcher */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.06)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('generator')}
              style={{
                background: activeTab === 'generator' ? 'linear-gradient(135deg, #fe2c55, #25f4ee)' : 'transparent',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              ✨ AI Tạo Prompt
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              style={{
                background: activeTab === 'presets' ? 'linear-gradient(135deg, #fe2c55, #25f4ee)' : 'transparent',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              📚 Kho Prompt Mẫu ({CURATED_PRESETS.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'presets' ? (
        /* Tab Kho Prompt Mẫu */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {CURATED_PRESETS.map((preset, idx) => (
            <div key={idx} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>{preset.title}</span>
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '8px', background: 'rgba(37, 244, 238, 0.15)', color: 'var(--secondary)', fontWeight: 700 }}>
                  {preset.style}
                </span>
              </div>
              <div style={{
                background: 'rgba(0,0,0,0.35)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.5,
                fontFamily: 'monospace',
                maxHeight: '120px',
                overflowY: 'auto',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                {preset.prompt}
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleCopy(preset.prompt, `preset_${idx}`)}
                style={{ alignSelf: 'flex-start', padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
              >
                {copiedKey === `preset_${idx}` ? '✓ Đã sao chép!' : '📋 Copy Prompt'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* Tab AI Tạo Prompt */
        <div style={{ display: 'grid', gridTemplateColumns: '5fr 6fr', gap: '24px', alignItems: 'start' }}>
          {/* Cột trái: Form nhập */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                💡 Ý tưởng / Mô tả bức ảnh muốn tạo *
              </label>
              <textarea
                className="form-control"
                rows={4}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Ví dụ: Chiến binh samurai giáp đỏ đứng giữa bão tuyết rơi, tay cầm kiếm katana..."
                style={{ fontSize: '0.88rem' }}
              />
            </div>

            {/* Gợi ý nhanh */}
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Gợi ý nhanh (click để điền):
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {SUGGESTIONS.slice(0, 5).map((sug, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setIdea(sug)}
                    className="suggestion-pill"
                    style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Phong cách */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>🎨 Phong cách nghệ thuật</label>
              <select className="form-control" value={style} onChange={(e) => setStyle(e.target.value)}>
                {STYLES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Tỉ lệ khung hình */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>📐 Tỉ lệ khung hình (Aspect Ratio)</label>
              <select className="form-control" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                {ASPECT_RATIOS.map((ar) => (
                  <option key={ar.value} value={ar.value}>{ar.label}</option>
                ))}
              </select>
            </div>

            {/* Ánh sáng & Tâm trạng */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>💡 Ánh sáng & Không khí</label>
              <select className="form-control" value={lighting} onChange={(e) => setLighting(e.target.value)}>
                {LIGHTINGS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Góc máy & Ống kính */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>🎥 Góc máy & Tiêu cự</label>
              <select className="form-control" value={camera} onChange={(e) => setCamera(e.target.value)}>
                {CAMERAS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {error && (
              <div style={{ color: 'var(--danger)', fontSize: '0.82rem', background: 'var(--danger-bg)', padding: '10px 12px', borderRadius: '8px' }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary"
              disabled={isGenerating}
              onClick={handleGenerate}
              style={{ padding: '12px 18px', fontSize: '0.95rem', fontWeight: 800 }}
            >
              {isGenerating ? '⏳ Gemini đang sáng tác Prompt...' : '🚀 Tạo Prompt Ảnh (Gemini AI)'}
            </button>
          </div>

          {/* Cột phải: Kết quả */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {result ? (
              <>
                {/* Thẻ Midjourney Prompt */}
                <div className="glass-card" style={{ padding: '22px', border: '1px solid rgba(254, 44, 85, 0.35)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>⛵</span>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>Midjourney v6.1 Prompt</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleCopy(result.midjourneyPrompt, 'mj')}
                      style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
                    >
                      {copiedKey === 'mj' ? '✓ Đã sao chép!' : '📋 Copy Midjourney'}
                    </button>
                  </div>
                  <div style={{
                    background: 'rgba(0,0,0,0.4)',
                    padding: '14px',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    color: '#fff',
                    lineHeight: 1.6,
                    fontFamily: 'monospace',
                    border: '1px solid rgba(255,255,255,0.08)',
                    userSelect: 'all',
                  }}>
                    {result.midjourneyPrompt}
                  </div>
                </div>

                {/* Thẻ Flux / SD Prompt */}
                <div className="glass-card" style={{ padding: '22px', border: '1px solid rgba(37, 244, 238, 0.35)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>⚡</span>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>Flux 1.1 / SD Prompt</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleCopy(result.fluxPrompt, 'flux')}
                      style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
                    >
                      {copiedKey === 'flux' ? '✓ Đã sao chép!' : '📋 Copy Flux'}
                    </button>
                  </div>
                  <div style={{
                    background: 'rgba(0,0,0,0.4)',
                    padding: '14px',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    color: 'rgba(255,255,255,0.9)',
                    lineHeight: 1.6,
                    fontFamily: 'monospace',
                    border: '1px solid rgba(255,255,255,0.08)',
                    userSelect: 'all',
                  }}>
                    {result.fluxPrompt}
                  </div>
                </div>

                {/* Giải thích tiếng Việt */}
                {result.vietnameseExplanation && (
                  <div className="glass-card" style={{ padding: '18px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--secondary)', display: 'block', marginBottom: '6px' }}>
                      💡 Bố cục & Yếu tố thị giác
                    </span>
                    <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.5 }}>
                      {result.vietnameseExplanation}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>🎨</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', display: 'block', marginBottom: '6px' }}>
                  Chưa có Prompt Ảnh nào được tạo
                </span>
                <p style={{ fontSize: '0.82rem', margin: 0, maxWidth: '400px', display: 'inline-block', lineHeight: 1.5 }}>
                  Hãy nhập ý tưởng ở cột bên trái và bấm <b>Tạo Prompt Ảnh</b> để Gemini AI sinh câu lệnh chuyên nghiệp cho bạn.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
