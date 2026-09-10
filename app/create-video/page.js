'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PROMPT_CATEGORIES } from '@/src/domain/content/index.js';
import { usePromptStudio } from '../usePromptStudio.js';
import SegmentedResultView from '../components/SegmentedResultView.js';
import SettingsModal from '../components/SettingsModal.js';
import ScriptDetailModal from '../components/ScriptDetailModal.js';
import { showToast } from '../components/Toast.js';

function CreateVideoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = searchParams.get('id');
  const categoryParam = searchParams.get('category');
  const s = usePromptStudio(categoryParam);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showScriptModal, setShowScriptModal] = useState(false);

  const loadScript = async () => {
    if (!id) {
      setLoading(false);
      setLoadError('Không tìm thấy mã kịch bản trong đường dẫn.');
      return;
    }

    // 1. Lấy nhanh từ sessionStorage để hiển thị ngay lập tức không cần chờ mạng
    try {
      const cached = sessionStorage.getItem('active_script_' + id);
      if (cached) {
        const parsed = JSON.parse(cached);
        s.setResult(parsed);
        if (parsed.category) {
          s.setActiveCategory(parsed.category);
        }
        setLoading(false);
      }
    } catch (e) {
      console.warn('Lỗi đọc cache script:', e);
    }

    // 2. Tải từ API để đồng bộ dữ liệu mới nhất
    try {
      const res = await fetch(`/api/prompts/history?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (data.success && data.item) {
        s.setResult(data.item);
        if (data.item.category) {
          s.setActiveCategory(data.item.category);
        }
        try {
          sessionStorage.setItem('active_script_' + id, JSON.stringify(data.item));
        } catch (e) {}
        setLoadError('');
      } else if (!s.result) {
        setLoadError('Không tìm thấy kịch bản trong hệ thống (có thể đã bị xoá).');
      }
    } catch (err) {
      console.error('[CreateVideo] Lỗi tải kịch bản:', err);
      if (!s.result) {
        setLoadError('Lỗi kết nối khi tải kịch bản: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScript();
  }, [id]);

  const activeCategory = s.result?.category || categoryParam || s.activeCategory;
  const categoryInfo = PROMPT_CATEGORIES[activeCategory] || PROMPT_CATEGORIES.stick_figure;

  const handleBackToList = () => {
    if (activeCategory) {
      router.push(`/?category=${activeCategory}`);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="main-layout">
      <main
        className="main-content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          padding: '12px 10px 16px 10px',
          width: '100%'
        }}
      >
        <div style={{ width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          
          {/* Header điều hướng workspace */}
          <div style={{ marginBottom: '16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }} aria-label="Breadcrumb">
                {/* 1. Nút Back */}
                <button
                  type="button"
                  onClick={handleBackToList}
                  title="Quay lại danh sách kịch bản & video"
                  style={{
                    height: '34px',
                    boxSizing: 'border-box',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '0 12px',
                    color: 'rgba(255, 255, 255, 0.85)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                  <span>Back</span>
                </button>

                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>/</span>

                {/* 2. Trình tạo video */}
                <div style={{
                  height: '34px',
                  boxSizing: 'border-box',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(168, 85, 247, 0.22))',
                  border: '1px solid rgba(168, 85, 247, 0.35)',
                  padding: '0 12px',
                  borderRadius: '8px',
                  whiteSpace: 'nowrap'
                }}>
                  <span style={{ fontSize: '0.95rem' }}>🎬</span>
                  <h2 style={{ fontSize: '0.84rem', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1 }}>
                    Trình tạo video
                  </h2>
                </div>

                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>/</span>

                {/* 3. Tên skill */}
                <button
                  type="button"
                  onClick={handleBackToList}
                  title={`Quay lại skill ${categoryInfo.label}`}
                  style={{
                    height: '34px',
                    boxSizing: 'border-box',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '0 12px',
                    color: 'rgba(255, 255, 255, 0.85)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)';
                  }}
                >
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>{categoryInfo.icon}</span>
                  <span>{categoryInfo.label}</span>
                </button>
              </nav>
            </div>

            {/* Nút Cài đặt AI */}
            <button
              type="button"
              onClick={() => {
                s.fetchSettings();
                s.setShowSettings(true);
              }}
              style={{
                height: '34px',
                boxSizing: 'border-box',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '0 12px',
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: '0.8rem',
                fontWeight: 600,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Cài đặt AI</span>
            </button>
          </div>

          {/* Vùng nội dung chính của Trình tạo video */}
          <div className="scrollable-col" style={{ minWidth: 0, paddingRight: '4px', paddingBottom: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {loading && !s.result ? (
              <div className="glass-card" style={{ flex: 1, minHeight: 0, padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', fontWeight: 600 }}>Đang tải kịch bản...</span>
              </div>
            ) : loadError && !s.result ? (
              <div className="glass-card" style={{ flex: 1, minHeight: 0, padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center' }}>
                <span style={{ fontSize: '3rem' }}>⚠️</span>
                <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{loadError}</h3>
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '0.85rem' }}
                >
                  Quay lại Danh sách kịch bản
                </button>
              </div>
            ) : s.result ? (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginBottom: '20px' }}>
                <SegmentedResultView
                  key={s.result.id ? `process_${s.result.id}` : 'process'}
                  result={s.result}
                  copiedKey={s.copiedKey}
                  onCopy={s.handleCopy}
                  activeTab="process"
                  onOpenScriptDetail={() => setShowScriptModal(true)}
                  onResult={(updated) => {
                    s.setResult(updated);
                    try {
                      sessionStorage.setItem('active_script_' + updated.id, JSON.stringify(updated));
                    } catch (e) {}
                  }}
                  onHistoryRefresh={loadScript}
                />
              </div>
            ) : null}
          </div>

        </div>
      </main>

      <SettingsModal
        show={s.showSettings}
        onClose={() => s.setShowSettings(false)}
        settings={s.settings}
        setSettings={s.setSettings}
        settingsMsg={s.settingsMsg}
        setSettingsMsg={s.setSettingsMsg}
        apiKeyVisible={s.apiKeyVisible}
        setApiKeyVisible={s.setApiKeyVisible}
        isSavingSettings={s.isSavingSettings}
        onSave={s.handleSaveSettings}
      />

      {showScriptModal && s.result && (
        <ScriptDetailModal
          item={s.result}
          onClose={() => setShowScriptModal(false)}
          copiedKey={s.copiedKey}
          onCopy={s.handleCopy}
          onResult={(updated) => {
            s.setResult(updated);
            try {
              sessionStorage.setItem('active_script_' + updated.id, JSON.stringify(updated));
            } catch (e) {}
          }}
          onHistoryRefresh={loadScript}
        />
      )}
    </div>
  );
}

export default function CreateVideoPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Đang tải...</div>}>
      <CreateVideoContent />
    </Suspense>
  );
}
