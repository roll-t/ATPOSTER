'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PROMPT_CATEGORIES } from '@/lib/prompts/index.js';

import { usePromptStudio } from './usePromptStudio.js';
import CategoryTabs from './components/CategoryTabs.js';
import ContentForm from './components/ContentForm.js';
import StyleEditor from './components/StyleEditor.js';
import SegmentedResultView from './components/SegmentedResultView.js';
import ManualResultView from './components/ManualResultView.js';
import HistoryList from './components/HistoryList.js';

export default function PromptsPage() {
  const s = usePromptStudio();
  const [activeRightTab, setActiveRightTab] = useState('process');

  const [wasGenerating, setWasGenerating] = useState(false);

  useEffect(() => {
    if (s.isGenerating) {
      setWasGenerating(true);
    } else if (wasGenerating && s.result) {
      setActiveRightTab('script');
      setWasGenerating(false);
    }
  }, [s.isGenerating, s.result, wasGenerating]);

  useEffect(() => {
    if (!s.result) {
      setActiveRightTab('history');
    }
  }, [s.result]);

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
            onClick={() => s.setPromptType('video')}
            className={`nav-item ${s.promptType === 'video' ? 'active' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
              <line x1="7" y1="2" x2="7" y2="22"></line>
              <line x1="17" y1="2" x2="17" y2="22"></line>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <line x1="2" y1="7" x2="7" y2="7"></line>
              <line x1="2" y1="17" x2="7" y2="17"></line>
              <line x1="17" y1="17" x2="22" y2="17"></line>
              <line x1="17" y1="7" x2="22" y2="7"></line>
            </svg>
            Prompt Video
          </button>

          <button
            type="button"
            onClick={() => s.setPromptType('image')}
            className={`nav-item ${s.promptType === 'image' ? 'active' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            Prompt Ảnh
          </button>

          <button
            type="button"
            onClick={() => s.setPromptType('slideshow')}
            className={`nav-item ${s.promptType === 'slideshow' ? 'active' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
              <line x1="12" y1="18" x2="12" y2="18.01"></line>
              <path d="M8 6h8M8 10h8M8 14h8"></path>
            </svg>
            Slide Người Que
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
          <div style={{ marginBottom: '24px', flexShrink: 0 }}>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, marginBottom: '8px' }}>
              Prompt <span className="gradient-text">AI Studio</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Tạo kịch bản hoặc prompt tạo ảnh thông minh cho video học tiếng Anh — chỉ cần nhập nội dung, hệ thống tự động sinh và ghép với style của kênh để đảm bảo đồng nhất thương hiệu.
            </p>
          </div>

          {s.promptType !== 'slideshow' && (
            <div style={{ flexShrink: 0, marginBottom: '20px' }}>
              <CategoryTabs
                categoryKeys={s.visibleCategoryKeys}
                categories={PROMPT_CATEGORIES}
                activeCategory={s.activeCategory}
                onChange={s.setActiveCategory}
              />
            </div>
          )}

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
                          padding: '8px 12px',
                          fontSize: '0.82rem',
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

                  {/* Tab contents - chiếm hết phần chiều cao còn lại của cửa sổ */}
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: activeRightTab === 'history' ? 'hidden' : 'auto' }}>
                    {activeRightTab === 'process' && s.result && (
                      <div className="glass-card" style={{ marginBottom: '20px' }}>
                        <SegmentedResultView result={s.result} copiedKey={s.copiedKey} onCopy={s.handleCopy} activeTab="process" />
                      </div>
                    )}

                    {activeRightTab === 'script' && s.result && (
                      <div className="glass-card" style={{ marginBottom: '20px' }}>
                        <SegmentedResultView result={s.result} copiedKey={s.copiedKey} onCopy={s.handleCopy} activeTab="script" />
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

                    {!s.result && activeRightTab !== 'history' && (
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
                        {s.currentCategory.icon}
                      </div>
                      <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>
                        Sẵn sàng tạo câu lệnh
                      </h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '320px', margin: '0 auto', lineHeight: 1.5, textAlign: 'center' }}>
                        Điền nội dung bên trái rồi chọn "Tạo bằng Gemini AI" hoặc bấm "Tạo Prompt" để nhận kết quả.
                      </p>
                    </div>
                  )}

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
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Cài đặt hệ thống */}
      {s.showSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '500px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                ⚙️ Cấu hình Hệ thống AI & DB
              </h3>
              <button 
                type="button" 
                onClick={() => s.setShowSettings(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', padding: '0' }}
              >
                ×
              </button>
            </div>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.4 }}>
              Chỉnh sửa khóa API và đường dẫn kết nối cơ sở dữ liệu. Nhấn "Lưu cấu hình" để áp dụng thay đổi.
            </p>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>🔑 Gemini API Key</label>
              <div style={{ position: 'relative' }}>
                <textarea
                  className="form-control"
                  placeholder={'Nhập 1 hoặc nhiều Gemini API Key, mỗi key 1 dòng...'}
                  value={s.settings.geminiApiKey}
                  onChange={(e) => s.setSettings(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                  rows={3}
                  style={{
                    paddingRight: '40px',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    resize: 'vertical',
                    WebkitTextSecurity: s.apiKeyVisible ? 'none' : 'disc'
                  }}
                />
                <button
                  type="button"
                  onClick={() => s.setApiKeyVisible(!s.apiKeyVisible)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    color: 'var(--text-muted)'
                  }}
                >
                  {s.apiKeyVisible ? '👁️' : '🙈'}
                </button>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', marginBottom: 0, lineHeight: 1.4 }}>
                Có thể nhập nhiều key (mỗi dòng 1 key). Hệ thống sẽ tự động chuyển sang key kế tiếp khi key hiện tại hết quota hoặc bị lỗi tạm thời.
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>🎙️ ElevenLabs API Key</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={s.elApiKeyVisible ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Nhập ElevenLabs API Key..."
                  value={s.settings.elevenlabsApiKey}
                  onChange={(e) => s.setSettings(prev => ({ ...prev, elevenlabsApiKey: e.target.value }))}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => s.setElApiKeyVisible(!s.elApiKeyVisible)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    color: 'var(--text-muted)'
                  }}
                >
                  {s.elApiKeyVisible ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '12px' }}>
                🎙️ Cấu hình Giọng đọc cho từng Nhân vật (ElevenLabs)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px', paddingBottom: '4px' }}>
                {[
                  { key: 'alex', label: 'Giọng Alex', defaultId: '60qpDkuGX2KEChynwVZJ' },
                  { key: 'mia', label: 'Giọng Mia', defaultId: 'uREKoCeM2xnPeGaH8ZFM' },
                  { key: 'leo', label: 'Giọng Leo', defaultId: '60qpDkuGX2KEChynwVZJ' },
                  { key: 'zoe', label: 'Giọng Zoe', defaultId: 'uREKoCeM2xnPeGaH8ZFM' },
                  { key: 'tom', label: 'Giọng Tom', defaultId: '60qpDkuGX2KEChynwVZJ' },
                  { key: 'narrator', label: 'Giọng Người kể (Narrator)', defaultId: 'uREKoCeM2xnPeGaH8ZFM' }
                ].map(char => {
                  const currentVal = s.settings.voiceMappings?.[char.key] || char.defaultId;
                  const presetList = [
                    { name: 'Giọng của tôi (Nữ)', id: 'uREKoCeM2xnPeGaH8ZFM' },
                    { name: 'Giọng của tôi (Nam)', id: '60qpDkuGX2KEChynwVZJ' }
                  ];
                  const isPreset = presetList.some(p => p.id === currentVal);
                  
                  return (
                    <div key={char.key} className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.74rem', color: '#fff', marginBottom: '4px', display: 'block' }}>
                        {char.label}
                      </label>
                      <select
                        className="form-control"
                        style={{ fontSize: '0.78rem', padding: '6px', height: '32px', background: 'rgba(0,0,0,0.2)' }}
                        value={isPreset ? currentVal : 'custom'}
                        onChange={(e) => {
                          const val = e.target.value;
                          s.setSettings(prev => ({
                            ...prev,
                            voiceMappings: {
                              ...prev.voiceMappings,
                              [char.key]: val === 'custom' ? '' : val
                            }
                          }));
                        }}
                      >
                        {presetList.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                        <option value="custom">Tùy chỉnh (Nhập Voice ID)...</option>
                      </select>
                      {!isPreset && (
                        <input
                          type="text"
                          className="form-control"
                          placeholder="ElevenLabs Voice ID..."
                          style={{ fontSize: '0.74rem', padding: '4px 8px', marginTop: '4px', height: '28px' }}
                          value={currentVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            s.setSettings(prev => ({
                              ...prev,
                              voiceMappings: {
                                ...prev.voiceMappings,
                                [char.key]: val
                              }
                            }));
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>🗄️ MongoDB Connection URI</label>
              <input
                type="text"
                className="form-control"
                placeholder="mongodb://localhost:27017/tiktok_agent hoặc mongodb+srv://..."
                value={s.settings.mongodbUri}
                onChange={(e) => s.setSettings(prev => ({ ...prev, mongodbUri: e.target.value }))}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                * Lưu ý: Khi đổi URI, tệp cấu hình `.env.local` sẽ được ghi đè và server Next.js sẽ tự khởi động lại.
              </span>
            </div>

            {s.settingsMsg && (
              <div style={{ 
                fontSize: '0.82rem', 
                marginBottom: '16px', 
                padding: '10px', 
                borderRadius: '6px',
                background: s.settingsMsg.startsWith('Lỗi') ? 'var(--danger-bg)' : 'rgba(46, 213, 115, 0.1)',
                border: s.settingsMsg.startsWith('Lỗi') ? '1px solid rgba(255, 71, 87, 0.2)' : '1px solid rgba(46, 213, 115, 0.2)',
                color: s.settingsMsg.startsWith('Lỗi') ? 'var(--danger)' : '#2ed573' 
              }}>
                {s.settingsMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={s.handleSaveSettings}
                disabled={s.isSavingSettings}
                style={{ flex: 1, padding: '12px' }}
              >
                {s.isSavingSettings ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => s.setShowSettings(false)}
                style={{ padding: '12px 20px' }}
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
