'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PROMPT_CATEGORIES } from '@/lib/prompts/index.js';

import { usePromptStudio } from './usePromptStudio.js';
import VideoCategoryGrid from './components/VideoCategoryGrid.js';
import ContentForm from './components/ContentForm.js';
import StyleEditor from './components/StyleEditor.js';
import VideoEditor from './components/VideoEditor.js';
import SegmentedResultView from './components/SegmentedResultView.js';
import HistoryList from './components/HistoryList.js';
import CreatedVideosGrid from './components/CreatedVideosGrid.js';
import PexelsSearchPanel from './components/PexelsSearchPanel.js';
import SettingsModal from './components/SettingsModal.js';

function PromptsStudioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const categoryParam = searchParams.get('category');
  const tabParam = searchParams.get('tab');
  const isPexelsTab = tabParam === 'pexels';
  const isVideosTab = tabParam === 'videos';
  const isGridMode = !isPexelsTab && !isVideosTab && (!categoryParam || !PROMPT_CATEGORIES[categoryParam]);

  const initialCategory = categoryParam && PROMPT_CATEGORIES[categoryParam] ? categoryParam : undefined;
  const s = usePromptStudio(initialCategory);

  const [activeRightTab, setActiveRightTab] = useState('videos');
  const [wasGenerating, setWasGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Xử lý tham số drive_status từ callback URL
  useEffect(() => {
    const driveStatus = searchParams.get('drive_status');
    if (driveStatus === 'success') {
      s.fetchSettings();
      s.setShowSettings(true);
      s.setSettingsMsg('✓ Liên kết tài khoản Google Drive thành công! Bạn hãy chọn thư mục lưu trữ phía dưới.');
      router.replace('/');
    } else if (driveStatus === 'error') {
      const errMsg = searchParams.get('error_msg') || 'Lỗi không xác định khi liên kết.';
      s.fetchSettings();
      s.setShowSettings(true);
      s.setSettingsMsg(`Lỗi liên kết Drive: ${errMsg}`);
      router.replace('/');
    }
  }, [searchParams]);

  // Tự động đồng bộ state chủ đề với URL query parameter
  useEffect(() => {
    if (categoryParam && PROMPT_CATEGORIES[categoryParam]) {
      s.setActiveCategory(categoryParam);
    }
  }, [categoryParam]);

  useEffect(() => {
    if (s.isGenerating) {
      setWasGenerating(true);
    } else if (wasGenerating && s.result) {
      setActiveRightTab('script');
      setWasGenerating(false);
    }
  }, [s.isGenerating, s.result, wasGenerating]);

  useEffect(() => {
    if (!s.result && activeRightTab !== 'videos' && activeRightTab !== 'history') {
      setActiveRightTab('videos');
    }
  }, [s.result]);

  const handleSelectCategory = (key) => {
    s.setActiveCategory(key);
    s.setPromptType('slideshow');
    router.push(`/?category=${key}`);
  };

  const handleBackToGrid = () => {
    router.push('/');
  };

  return (
    <div className="main-layout">
      {/* Sidebar dành riêng cho Prompt AI Studio */}
      <aside className="sidebar-nav">
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="Prompt AI Logo" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 className="gradient-text" style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, lineHeight: 1.1 }}>
              Prompt AI
            </h2>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>v1.0.0 Alpha</span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '32px' }}>

          <button
            type="button"
            onClick={handleBackToGrid}
            className={`nav-item ${isGridMode ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            Tạo Video
          </button>

          <button
            type="button"
            onClick={() => router.push('/?tab=videos')}
            className={`nav-item ${isVideosTab ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
              <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
            </svg>
            Video Đã Tạo
          </button>

          <button
            type="button"
            onClick={() => router.push('/?tab=pexels')}
            className={`nav-item ${isPexelsTab ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            Stock Pexels
          </button>
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              s.fetchSettings();
              s.setShowSettings(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#fff',
              fontSize: '0.75rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: '0.2s',
              marginTop: '20px'
            }}
            className="sidebar-settings-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0.0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Cài đặt AI & DB Settings
          </button>
        </div>
      </aside>

      {/* Nội dung chính bên phải */}
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

          {isPexelsTab ? (
            /* Màn hình Kho Stock Pexels độc lập */
            <div className="scrollable-col" style={{ minWidth: 0, paddingRight: '12px', paddingBottom: '36px', height: '100%' }}>
              <PexelsSearchPanel />
            </div>
          ) : isVideosTab ? (
            /* Màn hình Video đã tạo độc lập */
            <div className="scrollable-col" style={{ minWidth: 0, paddingRight: '12px', paddingBottom: '36px', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="glass-card" style={{ flex: 1, minHeight: 0, padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🎬 Danh sách Video đã Render
                </h2>
                <CreatedVideosGrid
                  isDriveLinked={s.settings.googleDrive?.isLinked}
                  onSelectScript={(video) => {
                    // Chuyển sang chủ đề tương ứng và tự động load kịch bản đó lên để review
                    router.push(`/?category=${video.category}`);
                    setTimeout(() => {
                      const item = s.history.find((h) => h.input?.folderPath === video.folderPath);
                      if (item) {
                        s.setResult(item);
                        setActiveRightTab('process');
                      }
                    }, 500);
                  }}
                />
              </div>
            </div>
          ) : isGridMode ? (
            /* Màn hình Grid chọn chủ đề video */
            <div className="scrollable-col" style={{ minWidth: 0, paddingRight: '12px', paddingBottom: '36px' }}>
              <VideoCategoryGrid onSelectCategory={handleSelectCategory} />
            </div>
          ) : (
            /* Màn hình không gian làm việc chi tiết cho chủ đề đã chọn */
            <>
              {/* Header điều hướng workspace */}
              <div style={{ marginBottom: '16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={handleBackToGrid}
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
                    <span>Chọn loại Video khác</span>
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                      {s.currentCategory?.label}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Grid 2 cột workspace */}
              <div style={{ display: 'grid', gridTemplateColumns: '4fr 6fr', gap: '30px', alignItems: 'start', minWidth: 0, flex: 1, minHeight: 0 }}>
                {/* Cột trái: form nhập nội dung */}
                <div className="scrollable-col" style={{ minWidth: 0 }}>
                  <ContentForm
                    category={s.currentCategory}
                    activeCategory={s.activeCategory}
                    currentInput={s.currentInput}
                    useGemini={s.useGemini}
                    setUseGemini={s.setUseGemini}
                    durationRange={s.durationRange}
                    setDurationRange={s.setDurationRange}
                    onFieldChange={s.handleFieldChange}
                    onToggleCharacter={s.handleToggleCharacter}
                    errorMsg={s.errorMsg}
                    isGenerating={s.isGenerating}
                    onGenerate={s.handleGenerate}
                    onOpenStyleEditor={s.handleOpenStyleEditor}
                    characters={s.characters}
                    onDeleteCustomChar={s.handleDeleteCustomCharacter}
                    onUploadChar={s.handleUploadCharacter}
                    onUpdateChar={s.handleUpdateCharacter}
                    history={s.history}
                  />

                  {/* StyleEditor rendered as portal — see below */}
                </div>

                {/* Cột phải: kết quả + lịch sử */}
                <div className="scrollable-col" style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                      {/* Tab bar */}
                      <div style={{
                        display: 'flex',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '10px',
                        padding: '4px',
                        marginBottom: '16px',
                        gap: '4px',
                        flexShrink: 0
                      }}>
                        {[
                          { id: 'videos', label: '🎥 Video đã tạo', disabled: false },
                          { id: 'history', label: '🗂️ Lịch sử đã tạo', disabled: false },
                          { id: 'script', label: '📜 Kịch bản chi tiết', disabled: !s.result },
                          { id: 'process', label: '🎬 Quy trình & Review', disabled: !s.result }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => !tab.disabled && setActiveRightTab(tab.id)}
                            style={{
                              flex: 1,
                              padding: '8px 10px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              borderRadius: '8px',
                              border: 'none',
                              background: activeRightTab === tab.id ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'transparent',
                              color: activeRightTab === tab.id ? '#fff' : tab.disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
                              cursor: tab.disabled ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s ease',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Tab contents */}
                      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: (activeRightTab === 'history' || activeRightTab === 'videos') ? 'hidden' : 'auto' }}>
                        {activeRightTab === 'videos' && (
                          <div className="glass-card" style={{ flex: 1, minHeight: 0, padding: '16px', display: 'flex', flexDirection: 'column' }}>
                            <CreatedVideosGrid
                              category={s.activeCategory}
                              categoryLabel={PROMPT_CATEGORIES[s.activeCategory]?.label}
                              isDriveLinked={s.settings.googleDrive?.isLinked}
                              onSelectScript={(video) => {
                                // Nút "✏️ Sửa" trên thẻ video -> tìm đúng bản ghi kịch bản gốc trong
                                // lịch sử (khớp theo folderPath) rồi nhảy thẳng qua tab Quy trình &
                                // Review của kịch bản đó, giống hệt nút "Xem Video" ở tab Lịch sử.
                                const item = s.history.find((h) => h.input?.folderPath === video.folderPath);
                                if (item) {
                                  s.setResult(item);
                                  setActiveRightTab('process');
                                } else {
                                  alert('Không tìm thấy kịch bản gốc của video này trong lịch sử (có thể đã bị xoá khỏi Lịch sử prompt).');
                                }
                              }}
                            />
                          </div>
                        )}

                        {activeRightTab === 'process' && s.result && (
                          <div className="glass-card" style={{ marginBottom: '20px' }}>
                            <SegmentedResultView key={s.result.id ? `process_${s.result.id}` : 'process'} result={s.result} copiedKey={s.copiedKey} onCopy={s.handleCopy} activeTab="process" onResult={s.setResult} onHistoryRefresh={() => s.fetchHistory(s.activeCategory)} />
                          </div>
                        )}

                        {activeRightTab === 'script' && s.result && (
                          <div className="glass-card" style={{ marginBottom: '20px' }}>
                            <SegmentedResultView key={s.result.id ? `script_${s.result.id}` : 'script'} result={s.result} copiedKey={s.copiedKey} onCopy={s.handleCopy} activeTab="script" onResult={s.setResult} onHistoryRefresh={() => s.fetchHistory(s.activeCategory)} />
                          </div>
                        )}

                        {activeRightTab === 'history' && (
                          <HistoryList
                            history={s.history}
                            historyLoading={s.historyLoading}
                            selectedIds={s.selectedHistoryIds}
                            copiedKey={s.copiedKey}
                            onCopy={s.handleCopy}
                            onView={(item, targetTab) => {
                              s.setResult(item);
                              if (targetTab) {
                                setActiveRightTab(targetTab);
                              }
                            }}
                            onDelete={s.handleDeleteHistory}
                            onToggleSelect={s.handleToggleSelectHistory}
                            onToggleSelectAll={s.handleToggleSelectAllHistory}
                            onDeleteSelected={s.handleDeleteSelectedHistory}
                          />
                        )}

                        {!s.result && activeRightTab !== 'history' && activeRightTab !== 'videos' && (
                          <div className="glowing-placeholder" style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '2.8rem', marginBottom: '16px', filter: 'drop-shadow(0 0 12px rgba(37, 244, 238, 0.2))' }}>
                              🎬
                            </div>
                            <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>
                              Chưa có kịch bản hoạt động
                            </h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '320px', margin: '0 auto', lineHeight: 1.5, textAlign: 'center' }}>
                              Hãy điền thông tin bên trái để tạo kịch bản mới, hoặc chọn tab &quot;Lịch sử đã tạo&quot; để xem lại các kịch bản cũ.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
            </>
          )}

        </div>
      </main>

      {/* VideoEditor modal — visual drag-and-drop editor */}
      {s.showStyleEditor && mounted && createPortal(
        <VideoEditor
          result={s.result}
          onSave={(updatedResult) => {
            s.setResult(updatedResult);
            s.fetchHistory(s.activeCategory);
          }}
          onClose={() => s.setShowStyleEditor(false)}
        />,
        document.body
      )}

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
    </div>
  );
}

export default function PromptsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: '#fff' }}>Đang tải...</div>}>
      <PromptsStudioContent />
    </Suspense>
  );
}
