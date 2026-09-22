'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PROMPT_CATEGORIES } from '@/src/domain/content/index.js';

import { usePromptStudio } from './usePromptStudio.js';
import VideoCategoryGrid from './components/VideoCategoryGrid.js';
import ContentForm from './components/ContentForm.js';
import SegmentedResultView from './components/SegmentedResultView.js';
import CreatedVideosGrid from './components/CreatedVideosGrid.js';
import ScriptDetailModal from './components/ScriptDetailModal.js';
import PexelsSearchPanel from './components/PexelsSearchPanel.js';
import CraftAsmrPanel from './components/CraftAsmrPanel.js';
import ImagePromptPanel from './components/ImagePromptPanel.js';
import BgMusicPromptPanel from './components/BgMusicPromptPanel.js';
import VideoPromptCategoryGrid from './components/VideoPromptCategoryGrid.js';
import ImagePromptCategoryGrid from './components/ImagePromptCategoryGrid.js';
import MusicPromptCategoryGrid from './components/MusicPromptCategoryGrid.js';
import { getVideoPromptCategoryById } from '@/src/domain/content/videoPromptCategories.js';
import { getImagePromptCategoryById } from '@/src/domain/content/imagePromptCategories.js';
import { BG_MUSIC_PROMPTS, MUSIC_PROMPT_CATEGORIES } from '@/src/domain/content/bgMusicPrompts.js';
import SettingsModal from './components/SettingsModal.js';
import { showToast } from './components/Toast.js';

function PromptsStudioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const categoryParam = searchParams.get('category');
  const tabParam = searchParams.get('tab');
  const genreParam = searchParams.get('genre');
  const styleParam = searchParams.get('style');
  const themeParam = searchParams.get('theme');
  const isPexelsTab = tabParam === 'pexels';
  const isVideosTab = tabParam === 'videos';
  const isVideoPromptTab = tabParam === 'video_prompt' || tabParam === 'craft';
  const isImagePromptTab = tabParam === 'image_prompt' || tabParam === 'image';
  const isMusicTab = tabParam === 'music';
  const isGridMode =
    !isPexelsTab && !isVideosTab && !isVideoPromptTab && !isImagePromptTab && !isMusicTab && (!categoryParam || !PROMPT_CATEGORIES[categoryParam]);
  const isPromptWorkspace = Boolean(categoryParam && PROMPT_CATEGORIES[categoryParam]);
  const isSkillWorkspace = Boolean(
    (categoryParam && PROMPT_CATEGORIES[categoryParam]) ||
    (isVideoPromptTab && genreParam) ||
    (isImagePromptTab && styleParam) ||
    (isMusicTab && themeParam)
  );

  const initialCategory = categoryParam && PROMPT_CATEGORIES[categoryParam] ? categoryParam : undefined;
  const s = usePromptStudio(initialCategory);

  const [wasGenerating, setWasGenerating] = useState(false);
  const [scriptModalItem, setScriptModalItem] = useState(null);
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
      setWasGenerating(false);
      try {
        sessionStorage.setItem('active_script_' + s.result.id, JSON.stringify(s.result));
      } catch (e) {}
      router.push(`/create-video?id=${s.result.id}&category=${s.activeCategory}`);
    }
  }, [s.isGenerating, s.result, wasGenerating, s.activeCategory]);

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
      {/* Sidebar dành riêng cho Prompt AI Studio (ẩn khi đang ở trong không gian làm việc của skill) */}
      {!isSkillWorkspace && (
        <aside className="sidebar-nav">
          <div
            className="sidebar-header"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onClick={handleBackToGrid}
          >
            <img
              src="/icons/logo-mark.png"
              alt="Nexora Video Logo"
              style={{
                width: '68px',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 14px rgba(0, 209, 255, 0.45))'
              }}
            />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: '-0.3px',
                  lineHeight: 1.1
                }}
              >
                Nexora
              </span>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 900,
                  letterSpacing: '1.2px',
                  background: 'linear-gradient(135deg, #00D1FF 0%, #A855FF 52%, #FF4FD8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1.1
                }}
              >
                VIDEO
              </span>
            </div>
            <span
              style={{
                fontSize: '0.66rem',
                color: 'var(--text-muted)',
                fontWeight: 600,
                letterSpacing: '0.5px',
                marginTop: '3px'
              }}
            >
              v1.0.0 Alpha
            </span>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '32px' }}>

            {/* 1. Tạo Video (giữ nguyên) */}
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

            {/* 2. Prompt Video */}
            <button
              type="button"
              onClick={() => router.push('/?tab=video_prompt')}
              className={`nav-item ${isVideoPromptTab ? 'active' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4z"></path>
                <rect x="3" y="6" width="12" height="12" rx="2" ry="2"></rect>
              </svg>
              Prompt Video
            </button>

            {/* 3. Prompt Ảnh */}
            <button
              type="button"
              onClick={() => router.push('/?tab=image_prompt')}
              className={`nav-item ${isImagePromptTab ? 'active' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              Prompt Ảnh
            </button>

            {/* 4. Prompt Nhạc */}
            <button
              type="button"
              onClick={() => router.push('/?tab=music')}
              className={`nav-item ${isMusicTab ? 'active' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
              </svg>
              Prompt Nhạc
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
      )}

      {/* Nội dung chính bên phải */}
      <main
        className="main-content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          padding: isPromptWorkspace ? '0' : (isSkillWorkspace ? '20px 32px 32px 32px' : '40px')
        }}
      >
        <div style={{ width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

          {isPexelsTab ? (
            /* Màn hình Kho Stock Pexels độc lập */
            <div className="scrollable-col" style={{ minWidth: 0, paddingRight: '12px', paddingBottom: '36px', height: '100%' }}>
              <PexelsSearchPanel />
            </div>
          ) : isVideoPromptTab ? (
            /* Màn hình sinh prompt video AI (Veo / Sora / Kling) */
            <div className="scrollable-col" style={{ minWidth: 0, paddingRight: '12px', paddingBottom: '36px', height: '100%' }}>
              {genreParam ? (
                <CraftAsmrPanel
                  categoryInfo={getVideoPromptCategoryById(genreParam)}
                  onBackToGrid={() => router.push('/?tab=video_prompt')}
                />
              ) : (
                <VideoPromptCategoryGrid
                  onSelectCategory={(genreId) => router.push(`/?tab=video_prompt&genre=${genreId}`)}
                />
              )}
            </div>
          ) : isImagePromptTab ? (
            /* Màn hình sinh prompt ảnh AI (Midjourney / Flux / SD) */
            <div className="scrollable-col" style={{ minWidth: 0, paddingRight: '12px', paddingBottom: '36px', height: '100%' }}>
              {styleParam ? (
                <ImagePromptPanel
                  categoryInfo={getImagePromptCategoryById(styleParam)}
                  onBackToGrid={() => router.push('/?tab=image_prompt')}
                />
              ) : (
                <ImagePromptCategoryGrid
                  onSelectCategory={(styleId) => router.push(`/?tab=image_prompt&style=${styleId}`)}
                />
              )}
            </div>
          ) : isMusicTab ? (
            /* Kho prompt Suno để tự tạo nhạc nền cho video */
            <div className="scrollable-col" style={{ minWidth: 0, paddingRight: '12px', paddingBottom: '36px', height: '100%' }}>
              {themeParam ? (
                <BgMusicPromptPanel
                  selectedTheme={themeParam}
                  categoryInfo={MUSIC_PROMPT_CATEGORIES.find((c) => c.id === themeParam) || BG_MUSIC_PROMPTS.find((p) => p.id === themeParam || p.themeKey === themeParam)}
                  onBackToGrid={() => router.push('/?tab=music')}
                />
              ) : (
                <MusicPromptCategoryGrid
                  onSelectCategory={(themeId) => router.push(`/?tab=music&theme=${themeId}`)}
                />
              )}
            </div>
          ) : isVideosTab ? (
            /* Màn hình Video đã tạo độc lập */
            <div className="scrollable-col" style={{ minWidth: 0, paddingRight: '12px', paddingBottom: '36px', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="glass-card" style={{ flex: 1, minHeight: 0, padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🎬 Danh sách Video đã Render
                  </h2>
                  <button
                    type="button"
                    onClick={handleBackToGrid}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      color: '#fff',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    <span>Quay lại Danh mục chủ đề</span>
                  </button>
                </div>
                <CreatedVideosGrid
                  isDriveLinked={s.settings.googleDrive?.isLinked}
                  history={s.history}
                  onSelectScript={(video) => {
                    const item = s.history.find((h) => h.input?.folderPath === video.folderPath);
                    if (item) {
                      try {
                        sessionStorage.setItem('active_script_' + item.id, JSON.stringify(item));
                      } catch (e) {}
                      router.push(`/create-video?id=${item.id}&category=${video.category}`);
                    } else {
                      router.push(`/?category=${video.category}`);
                    }
                  }}
                />
              </div>
            </div>
          ) : isGridMode ? (
            /* Màn hình Grid chọn chủ đề video */
            <div className="scrollable-col" style={{ minWidth: 0, paddingRight: '12px', paddingBottom: '36px' }}>
              <VideoCategoryGrid
                onSelectCategory={handleSelectCategory}
                onOpenVideos={() => router.push('/?tab=videos')}
              />
            </div>
          ) : (
            /* Màn hình không gian làm việc chi tiết cho chủ đề đã chọn */
            <>
              {/* Header điều hướng workspace */}
              <div style={{
                marginBottom: '0px',
                padding: '10px 20px',
                borderBottom: '1px solid rgba(168, 85, 247, 0.15)',
                background: 'linear-gradient(90deg, rgba(22, 17, 40, 0.95) 0%, rgba(15, 12, 28, 0.95) 100%)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }} aria-label="Breadcrumb">
                    <button
                      type="button"
                      onClick={handleBackToGrid}
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
                      <span>Kho thể loại</span>
                    </button>

                    <div style={{
                      height: '34px',
                      boxSizing: 'border-box',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(168, 85, 247, 0.28))',
                      border: '1px solid rgba(168, 85, 247, 0.38)',
                      padding: '0 12px',
                      borderRadius: '8px',
                      whiteSpace: 'nowrap'
                    }}>
                      <span style={{ fontSize: '1rem', lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>{s.currentCategory?.icon}</span>
                      <h2 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1 }}>
                        {s.currentCategory?.label}
                      </h2>
                    </div>
                  </nav>
                </div>

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

              {/* Grid 2 cột workspace: Form nhập bên trái + Lịch sử & Video bên phải */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(420px, 4.2fr) minmax(0, 5.8fr)',
                gap: '0px',
                alignItems: 'stretch',
                minWidth: 0,
                flex: 1,
                minHeight: 0,
                background: 'radial-gradient(ellipse at 15% 15%, rgba(168, 85, 247, 0.07) 0%, transparent 55%), radial-gradient(ellipse at 85% 85%, rgba(99, 102, 241, 0.05) 0%, transparent 55%), #0c0a17'
              }}>
                {/* Cột trái: form nhập nội dung */}
                <div
                  className="scrollable-col"
                  style={{
                    minWidth: 0,
                    height: '100%',
                    overflowY: 'auto',
                    borderRight: '1px solid rgba(168, 85, 247, 0.12)',
                    borderRadius: '0px',
                    padding: '20px',
                    background: 'linear-gradient(180deg, rgba(20, 16, 38, 0.65) 0%, rgba(13, 10, 24, 0.85) 100%)',
                    boxSizing: 'border-box'
                  }}
                >
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
                    characters={s.characters}
                    onDeleteCustomChar={s.handleDeleteCustomCharacter}
                    onUploadChar={s.handleUploadCharacter}
                    onUpdateChar={s.handleUpdateCharacter}
                    history={s.history}
                    flatPanel={true}
                  />
                </div>

                {/* Cột phải: Danh sách Lịch sử & Video đã tạo (Không dùng tab bar) */}
                <div
                  className="scrollable-col"
                  style={{
                    minWidth: 0,
                    height: '100%',
                    overflowY: 'auto',
                    borderRadius: '0px',
                    padding: '20px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'linear-gradient(180deg, rgba(16, 13, 30, 0.45) 0%, rgba(11, 9, 20, 0.85) 100%)'
                  }}
                >
                  <CreatedVideosGrid
                    category={s.activeCategory}
                    categoryLabel={PROMPT_CATEGORIES[s.activeCategory]?.label}
                    isDriveLinked={s.settings.googleDrive?.isLinked}
                    history={s.history}
                    onDeleteHistory={s.handleDeleteHistory}
                    onSelectScript={(itemOrVideo, targetTab = 'process') => {
                      let scriptItem = itemOrVideo;
                      if (itemOrVideo && !itemOrVideo.scenes && !itemOrVideo.input && itemOrVideo.folderPath) {
                        scriptItem = s.history.find((h) => h.input?.folderPath === itemOrVideo.folderPath);
                      }
                      if (targetTab === 'script' || targetTab === 'dialog') {
                        if (scriptItem) {
                          if (scriptItem.id && (scriptItem.segmentCount || 0) > 1 && (scriptItem.segments?.length || 0) <= 1) {
                            fetch(`/api/prompts/history?id=${encodeURIComponent(scriptItem.id)}`)
                              .then(r => r.json())
                              .then(d => {
                                if (d.success && d.item) setScriptModalItem(d.item);
                                else setScriptModalItem(scriptItem);
                              })
                              .catch(() => setScriptModalItem(scriptItem));
                          } else {
                            setScriptModalItem(scriptItem);
                          }
                        } else {
                          showToast.warning('Không tìm thấy kịch bản gốc trong lịch sử (có thể đã bị xoá).');
                        }
                        return;
                      }
                      if (scriptItem) {
                        s.setResult(scriptItem);
                        try {
                          sessionStorage.setItem('active_script_' + scriptItem.id, JSON.stringify(scriptItem));
                        } catch (e) {}
                        router.push(`/create-video?id=${scriptItem.id}&category=${s.activeCategory}`);
                      } else {
                        showToast.warning('Không tìm thấy kịch bản gốc của video này trong lịch sử (có thể đã bị xoá khỏi Lịch sử prompt).');
                      }
                    }}
                  />
                </div>
              </div>
            </>
          )}

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

      {scriptModalItem && (
        <ScriptDetailModal
          item={scriptModalItem}
          onClose={() => setScriptModalItem(null)}
          onOpenProcess={(item) => {
            try {
              sessionStorage.setItem('active_script_' + item.id, JSON.stringify(item));
            } catch (e) {}
            setScriptModalItem(null);
            router.push(`/create-video?id=${item.id}&category=${s.activeCategory}`);
          }}
          copiedKey={s.copiedKey}
          onCopy={s.handleCopy}
          onResult={(updated) => {
            setScriptModalItem(updated);
            s.setResult(updated);
          }}
          onHistoryRefresh={() => s.fetchHistory(s.activeCategory)}
        />
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
