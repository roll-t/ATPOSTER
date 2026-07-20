'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PROMPT_CATEGORIES } from '@/lib/prompts/index.js';

import { usePromptStudio } from './usePromptStudio.js';
import VideoCategoryGrid from './components/VideoCategoryGrid.js';
import ContentForm from './components/ContentForm.js';
import StyleEditor from './components/StyleEditor.js';
import SegmentedResultView from './components/SegmentedResultView.js';
import ManualResultView from './components/ManualResultView.js';
import HistoryList from './components/HistoryList.js';
import CreatedVideosGrid from './components/CreatedVideosGrid.js';

function PromptsStudioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const s = usePromptStudio();

  const [activeRightTab, setActiveRightTab] = useState('process');
  const [wasGenerating, setWasGenerating] = useState(false);

  const categoryParam = searchParams.get('category');
  const isGridMode = !categoryParam || !PROMPT_CATEGORIES[categoryParam];

  // Tự động đồng bộ state chủ đề với URL query parameter
  useEffect(() => {
    if (categoryParam && PROMPT_CATEGORIES[categoryParam]) {
      s.setActiveCategory(categoryParam);
      const catType = PROMPT_CATEGORIES[categoryParam].type || 'video';
      s.setPromptType(catType === 'image' ? 'image' : 'slideshow');
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
      setActiveRightTab('history');
    }
  }, [s.result]);

  const handleSelectCategory = (key) => {
    s.setActiveCategory(key);
    const catType = PROMPT_CATEGORIES[key]?.type || 'video';
    s.setPromptType(catType === 'image' ? 'image' : 'slideshow');
    router.push(`/prompts?category=${key}`);
  };

  const handleBackToGrid = () => {
    router.push('/prompts');
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

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '32px' }}>
          <Link
            href="/"
            className="nav-item"
            style={{ marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', color: 'var(--text-muted)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Đổi Công Cụ
          </Link>

          <button
            type="button"
            onClick={handleBackToGrid}
            className={`nav-item ${isGridMode || s.promptType === 'slideshow' ? 'active' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            Tạo Video
          </button>

          <button
            type="button"
            onClick={() => handleSelectCategory('character_ref')}
            className={`nav-item ${!isGridMode && s.promptType === 'image' ? 'active' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            Prompt Ảnh
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
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Cài đặt AI & DB Settings
          </button>
        </div>
      </aside>

      {/* Nội dung chính bên phải */}
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          
          {isGridMode ? (
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

                  {s.showStyleEditor && (
                    <StyleEditor
                      category={s.currentCategory}
                      styleEditorText={s.styleEditorText}
                      setStyleEditorText={s.setStyleEditorText}
                      styleSaveError={s.styleSaveError}
                      isSavingStyle={s.isSavingStyle}
                      onSave={s.handleSaveStyle}
                      onClose={() => s.setShowStyleEditor(false)}
                    />
                  )}
                </div>

                {/* Cột phải: kết quả + lịch sử */}
                <div className="scrollable-col" style={{ minWidth: 0 }}>
                  {s.promptType === 'slideshow' ? (
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
                            <CreatedVideosGrid category={s.activeCategory} categoryLabel={PROMPT_CATEGORIES[s.activeCategory]?.label} />
                          </div>
                        )}

                        {activeRightTab === 'process' && s.result && (
                          <div className="glass-card" style={{ marginBottom: '20px' }}>
                            <SegmentedResultView result={s.result} copiedKey={s.copiedKey} onCopy={s.handleCopy} activeTab="process" onResult={s.setResult} onHistoryRefresh={() => s.fetchHistory(s.activeCategory)} />
                          </div>
                        )}

                        {activeRightTab === 'script' && s.result && (
                          <div className="glass-card" style={{ marginBottom: '20px' }}>
                            <SegmentedResultView result={s.result} copiedKey={s.copiedKey} onCopy={s.handleCopy} activeTab="script" onResult={s.setResult} onHistoryRefresh={() => s.fetchHistory(s.activeCategory)} />
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
                  ) : (
                    <>
                      {s.result ? (
                        <div className="glass-card" style={{ marginBottom: '20px' }}>
                          <ManualResultView
                            result={s.result}
                            showJson={s.showJson}
                            setShowJson={s.setShowJson}
                            copiedKey={s.copiedKey}
                            onCopy={s.handleCopy}
                          />
                        </div>
                      ) : (
                        <div className="glowing-placeholder" style={{ marginBottom: '20px' }}>
                          <div style={{
                            fontSize: '2.8rem',
                            marginBottom: '16px',
                            filter: 'drop-shadow(0 0 12px rgba(37, 244, 238, 0.2))'
                          }}>
                            {s.currentCategory?.icon}
                          </div>
                          <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>
                            Sẵn sàng tạo câu lệnh
                          </h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '320px', margin: '0 auto', lineHeight: 1.5, textAlign: 'center' }}>
                            Điền nội dung bên trái rồi chọn "Tạo bằng Gemini AI" hoặc bấm "Tạo Prompt" để nhận kết quả.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      </main>

      {/* Modal Settings */}
      {s.showSettings && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(5, 5, 12, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => s.setShowSettings(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '620px',
              maxHeight: '90vh',
              background: 'linear-gradient(145deg, rgba(24, 22, 37, 0.95), rgba(15, 14, 25, 0.98))',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(122, 18, 255, 0.15)',
              overflowY: 'auto',
              textAlign: 'left',
              color: '#fff',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.3rem' }}>⚙️</span> Cấu hình API Key & Database
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                  Quản lý API Key và kết nối cơ sở dữ liệu cho hệ thống.
                </p>
              </div>
              <button
                type="button"
                onClick={() => s.setShowSettings(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
              >
                ✕
              </button>
            </div>

            {/* Content Sections Container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Section 1: Gemini API Keys */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '14px',
                padding: '18px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1rem' }}>🔑</span>
                    <div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', display: 'block' }}>Gemini API Key</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tự động chuyển Key khác khi hết token</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', color: '#00f2fe', background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.25)', padding: '3px 10px', borderRadius: '20px', fontWeight: 700 }}>
                      {(s.settings.geminiApiKey ? s.settings.geminiApiKey.split('\n').filter(Boolean).length : 0)} Key
                    </span>
                    <button
                      type="button"
                      onClick={() => s.setApiKeyVisible(!s.apiKeyVisible)}
                      style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.75rem', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {s.apiKeyVisible ? '🙈 Ẩn Key' : '👁️ Hiện Key'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const current = s.settings.geminiApiKey ? s.settings.geminiApiKey.split('\n') : [''];
                        s.setSettings(prev => ({ ...prev, geminiApiKey: [...current, ''].join('\n') }));
                      }}
                      style={{ background: 'rgba(46, 213, 115, 0.15)', border: '1px solid rgba(46, 213, 115, 0.3)', borderRadius: '6px', color: '#2ed573', fontSize: '0.75rem', padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}
                    >
                      + Thêm Key
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {((s.settings.geminiApiKey || '').split('\n').length === 0 ? [''] : s.settings.geminiApiKey.split('\n')).map((keyVal, idx, arr) => {
                    return (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type={s.apiKeyVisible ? 'text' : 'password'}
                          className="form-control"
                          placeholder={`Nhập Gemini API Key #${idx + 1}...`}
                          value={keyVal}
                          onChange={(e) => {
                            const updated = [...arr];
                            updated[idx] = e.target.value;
                            s.setSettings(prev => ({ ...prev, geminiApiKey: updated.join('\n') }));
                          }}
                          onPaste={(e) => {
                            const pasted = e.clipboardData.getData('text');
                            if (pasted.includes('\n') || pasted.includes(',')) {
                              e.preventDefault();
                              const newKeys = pasted.split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
                              const updated = [...arr];
                              updated.splice(idx, 1, ...newKeys);
                              s.setSettings(prev => ({ ...prev, geminiApiKey: updated.join('\n') }));
                            }
                          }}
                          style={{
                            flex: 1,
                            fontSize: '0.82rem',
                            padding: '9px 12px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontFamily: s.apiKeyVisible ? 'monospace' : 'inherit'
                          }}
                        />
                        {arr.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = arr.filter((_, i) => i !== idx);
                              s.setSettings(prev => ({ ...prev, geminiApiKey: updated.join('\n') }));
                            }}
                            style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.25)', color: '#ff4757', borderRadius: '8px', padding: '9px 12px', cursor: 'pointer', fontSize: '0.85rem' }}
                            title="Xóa Key này"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: ElevenLabs API Keys */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '14px',
                padding: '18px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1rem' }}>🔊</span>
                    <div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', display: 'block' }}>ElevenLabs API Key</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tự động chuyển Key khác khi hết quota</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', color: '#00f2fe', background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.25)', padding: '3px 10px', borderRadius: '20px', fontWeight: 700 }}>
                      {(s.settings.elevenlabsApiKey ? s.settings.elevenlabsApiKey.split('\n').filter(Boolean).length : 0)} Key
                    </span>
                    <button
                      type="button"
                      onClick={() => s.setElApiKeyVisible(!s.elApiKeyVisible)}
                      style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.75rem', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {s.elApiKeyVisible ? '🙈 Ẩn Key' : '👁️ Hiện Key'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const current = s.settings.elevenlabsApiKey ? s.settings.elevenlabsApiKey.split('\n') : [''];
                        s.setSettings(prev => ({ ...prev, elevenlabsApiKey: [...current, ''].join('\n') }));
                      }}
                      style={{ background: 'rgba(46, 213, 115, 0.15)', border: '1px solid rgba(46, 213, 115, 0.3)', borderRadius: '6px', color: '#2ed573', fontSize: '0.75rem', padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}
                    >
                      + Thêm Key
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {((s.settings.elevenlabsApiKey || '').split('\n').length === 0 ? [''] : s.settings.elevenlabsApiKey.split('\n')).map((keyVal, idx, arr) => {
                    return (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type={s.elApiKeyVisible ? 'text' : 'password'}
                          className="form-control"
                          placeholder={`Nhập ElevenLabs API Key #${idx + 1}...`}
                          value={keyVal}
                          onChange={(e) => {
                            const updated = [...arr];
                            updated[idx] = e.target.value;
                            s.setSettings(prev => ({ ...prev, elevenlabsApiKey: updated.join('\n') }));
                          }}
                          onPaste={(e) => {
                            const pasted = e.clipboardData.getData('text');
                            if (pasted.includes('\n') || pasted.includes(',')) {
                              e.preventDefault();
                              const newKeys = pasted.split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
                              const updated = [...arr];
                              updated.splice(idx, 1, ...newKeys);
                              s.setSettings(prev => ({ ...prev, elevenlabsApiKey: updated.join('\n') }));
                            }
                          }}
                          style={{
                            flex: 1,
                            fontSize: '0.82rem',
                            padding: '9px 12px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontFamily: s.elApiKeyVisible ? 'monospace' : 'inherit'
                          }}
                        />
                        {arr.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = arr.filter((_, i) => i !== idx);
                              s.setSettings(prev => ({ ...prev, elevenlabsApiKey: updated.join('\n') }));
                            }}
                            style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.25)', color: '#ff4757', borderRadius: '8px', padding: '9px 12px', cursor: 'pointer', fontSize: '0.85rem' }}
                            title="Xóa Key này"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: MongoDB Connection */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '14px',
                padding: '18px'
              }}>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🗄️</span> MongoDB Connection URI
                  </span>
                </div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="mongodb://localhost:27017/tiktok_agent hoặc mongodb+srv://..."
                  value={s.settings.mongodbUri}
                  onChange={(e) => s.setSettings(prev => ({ ...prev, mongodbUri: e.target.value }))}
                  style={{
                    width: '100%',
                    fontSize: '0.82rem',
                    padding: '9px 12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </div>
            </div>

            {s.settingsMsg && (
              <div style={{
                fontSize: '0.82rem',
                marginTop: '18px',
                padding: '12px 14px',
                borderRadius: '8px',
                background: s.settingsMsg.startsWith('Lỗi') ? 'rgba(255, 71, 87, 0.15)' : 'rgba(46, 213, 115, 0.15)',
                border: s.settingsMsg.startsWith('Lỗi') ? '1px solid rgba(255, 71, 87, 0.3)' : '1px solid rgba(46, 213, 115, 0.3)',
                color: s.settingsMsg.startsWith('Lỗi') ? '#ff4757' : '#2ed573',
                fontWeight: 600
              }}>
                {s.settingsMsg}
              </div>
            )}

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                className="btn"
                onClick={s.handleSaveSettings}
                disabled={s.isSavingSettings}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                  color: '#fff',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(254, 44, 85, 0.35)',
                  cursor: 'pointer'
                }}
              >
                {s.isSavingSettings ? '⏳ Đang lưu...' : '💾 Lưu cấu hình'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => s.setShowSettings(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
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
