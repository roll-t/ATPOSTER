'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Vòng tròn hiển thị % ký tự ElevenLabs ĐÃ DÙNG (phần tô màu đầy dần lên theo mức đã dùng,
// phần xám còn lại là số ký tự chưa dùng tới). Màu đổi xanh -> vàng -> đỏ khi sắp hết quota.
function QuotaRing({ percent, size = 15 }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color = clamped < 50 ? '#2ed573' : clamped < 80 ? '#f59e0b' : '#ff4757';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

// Thanh tiến độ dùng chung cho cả 3 bước của pipeline, có hiệu ứng vệt sáng lướt khi đang chạy
// (percent: 0-100, label: chữ hiển thị bên phải thanh, vd "3/12" hoặc "42%")
function StepProgressBar({ percent, label, color, showShimmer }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '40px' }}>
      <div style={{ flex: 1, maxWidth: '320px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          width: `${clamped}%`,
          height: '100%',
          background: color,
          transition: 'width 0.4s ease'
        }}>
          {showShimmer && (
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '-100%',
              width: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)',
              animation: 'progress-shimmer 1.3s linear infinite'
            }} />
          )}
        </div>
      </div>
      <span style={{ fontSize: '0.7rem', color, fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

// Thẻ chọn dạng lưới có ảnh xem trước (thay cho dropdown) — dùng chung cho cả 2 bộ chọn
// kiểu phụ đề và kiểu chuyển cảnh bên dưới, để việc chọn trực quan hơn là đọc chữ trong <select>.
function PickerCard({ selected, onClick, label, children, width = 108 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        width
      }}
    >
      <div style={{
        width: '100%',
        aspectRatio: '9 / 16',
        borderRadius: '10px',
        overflow: 'hidden',
        background: '#141419',
        border: selected ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.12)',
        boxShadow: selected ? '0 0 0 3px rgba(254,44,85,0.22)' : 'none',
        position: 'relative'
      }}>
        {children}
      </div>
      <span style={{ fontSize: '0.68rem', fontWeight: selected ? 700 : 500, color: selected ? '#fff' : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.25 }}>
        {label}
      </span>
    </button>
  );
}

// Ảnh xem trước kiểu phụ đề — mô phỏng đúng cách Caption.tsx của skill render, để chọn
// biết ngay style trông ra sao thay vì phải tưởng tượng qua tên gọi trong dropdown.
function CaptionStylePreview({ style }) {
  const strokeShadow = '-1.5px -1.5px 0 #000, 0 -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 0 0 #000, 1.5px 0 0 #000, -1.5px 1.5px 0 #000, 0 1.5px 0 #000, 1.5px 1.5px 0 #000';
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 8px 10px' }}>
      {style === 'tiktok' ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff', textShadow: strokeShadow }}>DON&apos;T</div>
          <div style={{ fontSize: '8px', fontWeight: 500, color: '#FFE14D', textShadow: strokeShadow, marginTop: '2px' }}>Đừng bỏ cuộc</div>
        </div>
      ) : style === 'karaoke' ? (
        <div style={{ background: 'rgba(10,10,14,0.75)', borderRadius: '6px', padding: '4px 7px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 700 }}>
            <span style={{ background: '#FE2C55', color: '#fff', borderRadius: '3px', padding: '0 3px' }}>Don&apos;t</span>{' '}
            <span style={{ color: '#fff' }}>give up</span>
          </div>
          <div style={{ fontSize: '8px', fontWeight: 500, color: 'rgba(255,255,255,0.75)', marginTop: '2px' }}>Đừng bỏ cuộc</div>
        </div>
      ) : (
        <div style={{ background: 'rgba(10,10,14,0.75)', borderRadius: '6px', padding: '4px 7px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>Don&apos;t give up</div>
          <div style={{ fontSize: '8px', fontWeight: 500, color: 'rgba(255,255,255,0.75)', marginTop: '2px' }}>Đừng bỏ cuộc</div>
        </div>
      )}
    </div>
  );
}

// Ảnh xem trước kiểu chuyển cảnh — 2 khối màu chạy animation CSS lặp vô hạn mô phỏng đúng
// chuyển động thật (hòa tan/trượt/phóng to), để thấy hiệu ứng chuyển động chứ không chỉ đọc tên.
function TransitionStylePreview({ style }) {
  const frameBase = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  return (
    <>
      <div style={{ ...frameBase, background: '#1f2937', animation: `prev-${style}-a 1.6s ease-in-out infinite alternate` }}>
        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(37,244,238,0.55)' }} />
      </div>
      <div style={{ ...frameBase, background: '#3a1f2e', animation: `prev-${style}-b 1.6s ease-in-out infinite alternate` }}>
        <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'rgba(254,44,85,0.6)' }} />
      </div>
    </>
  );
}

// Tóm tắt trạng thái chạy hàng đợi Google Flow (từ extension), đối chiếu với đúng kịch bản
// đang hiển thị (khớp theo title) — trả về null nếu không có gì để hiển thị.
function getFlowQueueStatus(extQueueState, resultTitle) {
  const queue = extQueueState?.queue;
  if (!queue || queue.title !== resultTitle) {
    return null;
  }
  const segments = queue.segments || [];
  const total = segments.length;
  const completed = segments.filter(s => s.status === 'completed').length;
  const processing = segments.filter(s => s.status === 'processing').length;
  const isRunning = processing > 0 || extQueueState.autoRunActive === true;

  let label, color, phase;
  if (total > 0 && completed === total) {
    label = `✅ Hoàn thành ${completed}/${total} ảnh`;
    color = '#2ed573';
    phase = 'completed';
  } else if (isRunning) {
    label = `⏳ Đang chạy ${completed}/${total} ảnh`;
    color = '#f59e0b';
    phase = 'running';
  } else if (completed > 0) {
    label = `⏸ Tạm dừng ${completed}/${total} ảnh`;
    color = '#f59e0b';
    phase = 'paused';
  } else {
    label = `○ Đã gửi, chưa bắt đầu tạo (${total} ảnh)`;
    color = 'rgba(255,255,255,0.5)';
    phase = 'not_started';
  }
  return { label, color, phase, completed, total };
}

export default function SegmentedResultView({ result, copiedKey, onCopy, activeTab = 'process', onResult, onHistoryRefresh }) {
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState('');
  const [isTranslatingSubtitles, setIsTranslatingSubtitles] = useState(false);
  const [subtitleMsg, setSubtitleMsg] = useState('');
  const [extQueueState, setExtQueueState] = useState(null);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [renderMsg, setRenderMsg] = useState('');
  const [renderCaptionStyle, setRenderCaptionStyle] = useState('box');
  const [renderTransitionStyle, setRenderTransitionStyle] = useState('crossfade');
  const [renderBilingual, setRenderBilingual] = useState(true);
  const [showRenderConfig, setShowRenderConfig] = useState(false);
  const [assetCounts, setAssetCounts] = useState({
    imageCount: 0,
    audioCount: 0,
    videoCreated: false
  });
  const [mounted, setMounted] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState(0);
  const [renderProgress, setRenderProgress] = useState(0);
  const [isOpeningFolder, setIsOpeningFolder] = useState(false);
  const [openFolderError, setOpenFolderError] = useState('');

  const [showVoiceConfig, setShowVoiceConfig] = useState(false);
  const [settings, setSettings] = useState({ voiceMappings: {} });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [quota, setQuota] = useState(null);
  const [loadingQuota, setLoadingQuota] = useState(false);
  const [quotaError, setQuotaError] = useState('');

  const flowStatus = getFlowQueueStatus(extQueueState, result.title);

  const checkAssets = async () => {
    try {
      const res = await fetch('/api/prompts/check-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: result.input?.folderPath || 'example'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAssetCounts({
          imageCount: data.imageCount,
          audioCount: data.audioCount,
          videoCreated: data.videoCreated
        });
      }
    } catch (err) {
      console.error('Error checking assets:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  const fetchQuota = async () => {
    setLoadingQuota(true);
    setQuotaError('');
    try {
      const res = await fetch('/api/prompts/voiceover');
      const data = await res.json();
      if (res.ok) {
        setQuota(data);
      } else {
        setQuota(null);
        setQuotaError(data.error || `Không thể tải quota (HTTP ${res.status}).`);
      }
    } catch (err) {
      console.error('Error fetching quota:', err);
      setQuota(null);
      setQuotaError('Lỗi kết nối khi tải quota.');
    } finally {
      setLoadingQuota(false);
    }
  };

  useEffect(() => {
    fetchQuota();
  }, []);

  useEffect(() => {
    if (showVoiceConfig) {
      fetchSettings();
      fetchQuota();
    }
  }, [showVoiceConfig]);

  const flowButtonLabel = (status) => {
    if (!status) return '🚀 Đẩy sang Google Flow';
    if (status.phase === 'completed') return `✅ Đã xong (${status.completed}/${status.total}) — Đẩy lại`;
    if (status.phase === 'running') return `⏳ Đang chạy (${status.completed}/${status.total}) — Đẩy lại`;
    if (status.phase === 'paused') return `⏸ Tạm dừng (${status.completed}/${status.total}) — Đẩy lại`;
    return '🚀 Đẩy sang Google Flow';
  };

  const pushToFlow = (status) => {
    if (status) {
      const confirmed = window.confirm(
        `Kịch bản này đang có tiến độ trên Google Flow (${status.completed}/${status.total} ảnh).\n\n` +
        `Bấm OK để tạo lại hàng đợi từ đầu (sẽ mất tiến độ đang có, các ảnh đã tải vẫn còn nguyên trong thư mục).\n` +
        `Bấm Cancel để không làm gì cả.`
      );
      if (!confirmed) return;
    }
    window.postMessage({
      type: 'START_FLOW_GENERATION',
      segments: result.segments,
      title: result.title,
      isImage: result.category === 'stick_figure_slideshow' || result.category === 'image_slideshow',
      folderPath: result.input?.folderPath || 'example',
      imageExt: result.input?.imageExt || 'jpg',
      orientation: result.remotionConfig?.orientation || (result.input?.aspectRatio === '16:9' ? 'landscape' : 'portrait')
    }, '*');
  };

  const handleGenerateVoice = async () => {
    setIsGeneratingVoice(true);
    setVoiceMsg('');
    try {
      const res = await fetch('/api/prompts/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: result.input?.folderPath || 'example',
          imageExt: result.input?.imageExt || 'jpg',
          audioExt: result.input?.audioExt || 'mp3',
          scenes: result.segments.map(seg => ({
            segmentNumber: seg.segmentNumber,
            dialogueOrNarration: seg.dialogueOrNarration
          }))
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVoiceMsg(`✓ Đã tạo thành công! Lưu tại: ${data.targetDirectory}`);
        fetchQuota();
        checkAssets();
      } else {
        setVoiceMsg(`Lỗi: ${data.error || 'Không thể tạo âm thanh.'}`);
      }
    } catch (err) {
      setVoiceMsg('Lỗi: Không thể kết nối tới server.');
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleOpenVideoFolder = async () => {
    setIsOpeningFolder(true);
    setOpenFolderError('');
    try {
      const res = await fetch('/api/prompts/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: result.input?.folderPath || 'example' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setOpenFolderError(data.error || 'Không thể mở thư mục.');
      }
    } catch (err) {
      setOpenFolderError('Lỗi kết nối khi mở thư mục.');
    } finally {
      setIsOpeningFolder(false);
    }
  };

  const handleRenderVideo = async () => {
    setIsRenderingVideo(true);
    setRenderMsg('');
    try {
      const res = await fetch('/api/prompts/render-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: result.input?.folderPath || 'example',
          captionStyle: renderCaptionStyle,
          transitionStyle: renderTransitionStyle,
          bilingual: renderBilingual
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRenderMsg(`✓ Đã tạo video thành công!`);
        checkAssets();
      } else {
        setRenderMsg(`Lỗi: ${data.error || 'Không thể render video.'}`);
        alert(`Lỗi render video:\n${data.details || data.error}`);
      }
    } catch (err) {
      setRenderMsg('Lỗi: Không thể kết nối tới server.');
    } finally {
      setIsRenderingVideo(false);
    }
  };

  const alreadyBilingual = result.segments.length > 0 && result.segments.every(seg => (seg.subtitle || '').includes('\n'));

  const handleTranslateSubtitles = async () => {
    setIsTranslatingSubtitles(true);
    setSubtitleMsg('');
    try {
      const res = await fetch('/api/prompts/translate-subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: result.id,
          folderPath: result.input?.folderPath || '',
          segments: result.segments
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updatedRemotionConfig = result.remotionConfig?.scenes
          ? {
            ...result.remotionConfig,
            scenes: result.remotionConfig.scenes.map((scene, idx) => ({
              ...scene,
              caption: data.segments[idx]?.subtitle ?? scene.caption
            }))
          }
          : result.remotionConfig;
        onResult?.({ ...result, segments: data.segments, remotionConfig: updatedRemotionConfig });
        if (result.id) onHistoryRefresh?.();
        setSubtitleMsg(
          data.manifestUpdated
            ? '✓ Đã cập nhật phụ đề song ngữ! Nhấn "Tạo Lại Video" ở Bước 3 để video mới hiển thị phụ đề song ngữ.'
            : '✓ Đã cập nhật phụ đề song ngữ!'
        );
      } else {
        setSubtitleMsg(`Lỗi: ${data.error || 'Không thể dịch phụ đề.'}`);
      }
    } catch (err) {
      setSubtitleMsg('Lỗi: Không thể kết nối tới server.');
    } finally {
      setIsTranslatingSubtitles(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);



  // Bước 2 (ElevenLabs) chạy 1 lệnh xử lý tuần tự từng slide phía server, không có tiến trình
  // real-time gửi về - nên mô phỏng đếm dần "n/tổng" theo ước tính ~1.3s/slide để đồng bộ hiệu
  // ứng với Bước 1, dừng lại ở tổng-1 chờ API trả về thật rồi mới coi là xong (assetCounts.audioCount).
  useEffect(() => {
    if (!isGeneratingVoice) {
      setVoiceProgress(0);
      return;
    }
    const total = result.segments.length;
    const timer = setInterval(() => {
      setVoiceProgress(prev => (prev < total - 1 ? prev + 1 : prev));
    }, 1300);
    return () => clearInterval(timer);
  }, [isGeneratingVoice, result.segments.length]);

  // Bước 3 (Remotion render) cũng chỉ là 1 lệnh chạy 1 lần, không có % thật - mô phỏng thanh %
  // tăng dần theo đường cong ease-out (nhanh lúc đầu, chậm dần) dựa trên thời lượng ước tính theo
  // số slide, dừng ở mức 92% chờ API render thật trả về xong mới nhảy lên 100%.
  useEffect(() => {
    if (!isRenderingVideo) {
      setRenderProgress(0);
      return;
    }
    const startTime = Date.now();
    const estimatedDurationMs = Math.max(8000, result.segments.length * 2500);
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const eased = 1 - Math.pow(1 - Math.min(elapsed / estimatedDurationMs, 1), 2);
      setRenderProgress(Math.min(92, Math.round(eased * 100)));
    }, 300);
    return () => clearInterval(timer);
  }, [isRenderingVideo, result.segments.length]);

  useEffect(() => {
    checkAssets();
  }, [result]);

  useEffect(() => {
    if (extQueueState && extQueueState.queue && extQueueState.queue.title === result.title) {
      checkAssets();
    }
  }, [extQueueState]);

  // Lắng nghe trạng thái hàng đợi được content-bridge.js của extension đẩy ngược lại (nếu có
  // cài extension), để hiển thị tiến độ chạy thật ngay trên trang thay vì phải mở side panel.
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.source !== window) return;
      if (event.data && event.data.type === 'FLOW_QUEUE_STATE') {
        setExtQueueState({ queue: event.data.queue, autoRunActive: event.data.autoRunActive });
      }
    };
    window.addEventListener('message', handleMessage);
    // Xin trạng thái hiện tại ngay khi mount, vì bridge có thể đã broadcast trước khi component này tồn tại
    window.postMessage({ type: 'REQUEST_FLOW_QUEUE_STATE' }, '*');
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '12px', flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🎬</span>
          <span>Kịch bản: {result.title}</span>
        </h3>
        {result.category !== 'stick_figure_slideshow' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                flexShrink: 0,
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                boxShadow: '0 4px 15px rgba(254, 44, 85, 0.3)',
                borderRadius: '8px',
                fontWeight: 700
              }}
              onClick={() => pushToFlow(flowStatus)}
            >
              {flowButtonLabel(flowStatus)}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', flexShrink: 0, borderRadius: '8px', fontWeight: 700 }}
              onClick={() => {
                const allPrompts = result.segments.map(s => `--- Slide ${s.segmentNumber} ---\nPrompt Ảnh:\n${s.textPrompt}\n\nThoại: ${s.dialogueOrNarration}\nPhụ đề: ${s.subtitle}`).join('\n\n');
                onCopy(allPrompts, 'all_segments');
              }}
            >
              {copiedKey === 'all_segments' ? '✓ Đã sao chép!' : '📋 Sao chép toàn bộ'}
            </button>
          </div>
        )}
      </div>



      {activeTab === 'process' && result.category === 'stick_figure_slideshow' && (
        <div style={{
          background: 'rgba(37, 244, 238, 0.03)',
          border: '1px solid rgba(37, 244, 238, 0.15)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 800, marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚙️</span> Quy trình sản xuất video (3 Bước)
          </h4>

          {/* Steps Pipeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>

            {/* Bước 1: Sinh & tải ảnh */}
            {(() => {
              const total = result.segments.length;
              const completedFlow = flowStatus ? flowStatus.completed : 0;
              const isFlowDone = flowStatus && flowStatus.phase === 'completed';
              const hasAllImages = assetCounts.imageCount >= total;
              const isStep1Done = isFlowDone || hasAllImages;
              const isStep1Running = !isStep1Done && flowStatus && flowStatus.phase === 'running';

              return (
                <div className={isStep1Running ? 'running-glow-card' : ''} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: isStep1Running ? '1.5px solid transparent' : isStep1Done ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isStep1Done ? '#10b981' : 'linear-gradient(135deg, #FE2C55, #ff5a79)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        flexShrink: 0,
                        animation: isStep1Running ? 'pulse-ring 1.6s ease-in-out infinite' : 'none'
                      }}>
                        {isStep1Done ? '✓' : '1'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                          Bước 1: Sinh & tải ảnh tự động (Google Flow)
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '7px 14px',
                        fontSize: '0.76rem',
                        borderRadius: '8px',
                        fontWeight: 700,
                        background: isStep1Done ? 'rgba(46, 213, 115, 0.15)' : 'linear-gradient(135deg, var(--primary), var(--accent))',
                        color: isStep1Done ? '#2ed573' : '#fff',
                        border: isStep1Done ? '1px solid rgba(46, 213, 115, 0.3)' : 'none',
                        boxShadow: isStep1Done ? 'none' : '0 4px 15px rgba(254, 44, 85, 0.25)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                      onClick={() => pushToFlow(flowStatus)}
                    >
                      {flowButtonLabel(flowStatus)}
                    </button>
                  </div>

                  {/* Dòng tiến độ dạng thanh - chỉ hiện TRONG lúc đang chạy, ẩn ngay khi xong */}
                  {isStep1Running && flowStatus && flowStatus.total > 0 && (
                    <StepProgressBar
                      percent={(flowStatus.completed / flowStatus.total) * 100}
                      label={`${flowStatus.completed}/${flowStatus.total}`}
                      color={flowStatus.color}
                      showShimmer={true}
                    />
                  )}
                </div>
              );
            })()}

            {/* Bước 2: Tạo giọng nói */}
            {(() => {
              const total = result.segments.length;
              const isStep1Done = (flowStatus && flowStatus.phase === 'completed') || (assetCounts.imageCount >= total);
              const isStep2Done = assetCounts.audioCount >= total;

              return (
                <div className={isGeneratingVoice ? 'running-glow-card' : ''} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: isGeneratingVoice ? '1.5px solid transparent' : isStep2Done ? '1px solid rgba(16, 185, 129, 0.25)' : isStep1Done ? '1px solid rgba(0, 242, 254, 0.2)' : '1px solid rgba(255, 255, 255, 0.03)',
                  borderRadius: '10px',
                  opacity: isStep1Done ? 1 : 0.5,
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isStep2Done ? '#10b981' : isStep1Done ? 'linear-gradient(135deg, #FE2C55, #ff5a79)' : 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        flexShrink: 0,
                        animation: isGeneratingVoice ? 'pulse-ring 1.6s ease-in-out infinite' : 'none'
                      }}>
                        {isStep2Done ? '✓' : '2'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                          Bước 2: Tạo giọng lồng tiếng (ElevenLabs)
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '7px 10px', fontSize: '0.76rem', borderRadius: '8px', fontWeight: 700, whiteSpace: 'nowrap' }}
                        onClick={() => setShowVoiceConfig(!showVoiceConfig)}
                        disabled={!isStep1Done || isGeneratingVoice || isRenderingVideo}
                      >
                        ⚙️ Giọng
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{
                          padding: '7px 14px',
                          fontSize: '0.76rem',
                          borderRadius: '8px',
                          fontWeight: 700,
                          background: isStep2Done ? 'rgba(46, 213, 115, 0.15)' : isStep1Done ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'rgba(255, 255, 255, 0.05)',
                          color: isStep2Done ? '#2ed573' : isStep1Done ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                          border: isStep2Done ? '1px solid rgba(46, 213, 115, 0.3)' : isStep1Done ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                          boxShadow: isStep2Done || !isStep1Done ? 'none' : '0 4px 15px rgba(254, 44, 85, 0.25)',
                          cursor: (!isStep1Done || isGeneratingVoice) ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                        onClick={handleGenerateVoice}
                        disabled={!isStep1Done || isGeneratingVoice || isRenderingVideo}
                      >
                        {isGeneratingVoice ? '⏳ Đang tạo...' : isStep2Done ? '🎙️ Lồng Tiếng Lại' : '🎙️ Tạo Lồng Tiếng'}
                      </button>
                    </div>
                  </div>

                  {/* Dòng tiến độ dạng thanh - chỉ hiện TRONG lúc đang tạo giọng đọc */}
                  {isGeneratingVoice && (
                    <StepProgressBar
                      percent={(voiceProgress / total) * 100}
                      label={`${voiceProgress}/${total}`}
                      color="#00f2fe"
                      showShimmer={true}
                    />
                  )}
                </div>
              );
            })()}

            {/* Bước 3: Render video */}
            {(() => {
              const total = result.segments.length;
              const isStep2Done = assetCounts.audioCount >= total;
              const isStep3Done = assetCounts.videoCreated;

              return (
                <div className={isRenderingVideo ? 'running-glow-card' : ''} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: isRenderingVideo ? '1.5px solid transparent' : isStep3Done ? '1px solid rgba(16, 185, 129, 0.25)' : isStep2Done ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255, 255, 255, 0.03)',
                  borderRadius: '10px',
                  opacity: isStep2Done ? 1 : 0.5,
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isStep3Done ? '#10b981' : isStep2Done ? 'linear-gradient(135deg, #FE2C55, #ff5a79)' : 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        flexShrink: 0,
                        animation: isRenderingVideo ? 'pulse-ring 1.6s ease-in-out infinite' : 'none'
                      }}>
                        {isStep3Done ? '✓' : '3'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                          Bước 3: Biên tập & Xuất Video (Remotion)
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        title="Cấu hình kiểu render (phụ đề, chuyển cảnh, song ngữ)"
                        style={{ padding: '7px 10px', fontSize: '0.76rem', borderRadius: '8px', fontWeight: 700, whiteSpace: 'nowrap' }}
                        onClick={() => setShowRenderConfig(!showRenderConfig)}
                        disabled={!isStep2Done || isRenderingVideo || isGeneratingVoice}
                      >
                        ⚙️
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{
                          padding: '7px 14px',
                          fontSize: '0.76rem',
                          borderRadius: '8px',
                          fontWeight: 700,
                          background: isStep3Done ? 'rgba(46, 213, 115, 0.15)' : isStep2Done ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'rgba(255, 255, 255, 0.05)',
                          color: isStep3Done ? '#2ed573' : isStep2Done ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                          border: isStep3Done ? '1px solid rgba(46, 213, 115, 0.3)' : isStep2Done ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                          boxShadow: isStep3Done || !isStep2Done ? 'none' : '0 4px 15px rgba(254, 44, 85, 0.25)',
                          cursor: (!isStep2Done || isRenderingVideo) ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                        onClick={handleRenderVideo}
                        disabled={!isStep2Done || isRenderingVideo || isGeneratingVoice}
                      >
                        {isRenderingVideo ? '⏳ Đang render...' : isStep3Done ? '🎥 Tạo Lại Video' : '🎥 Tạo Video (Render)'}
                      </button>
                    </div>
                  </div>

                  {/* Dòng tiến độ ước tính (Remotion không có % thật) - đồng bộ hiệu ứng với Bước 1/2 */}
                  {isRenderingVideo && (
                    <StepProgressBar
                      percent={renderProgress}
                      label={`${renderProgress}%`}
                      color="#10b981"
                      showShimmer={true}
                    />
                  )}
                </div>
              );
            })()}

          </div>

          {/* Cập nhật phụ đề song ngữ cho kịch bản ĐÃ TẠO SẴN (không cần tạo lại từ đầu) —
              dịch lại từng dòng subtitle tiếng Anh hiện có sang tiếng Việt, ghép thành
              "Anh\nViệt" mà Caption.tsx của skill hiểu, và ghi luôn vào manifest.json trên
              đĩa nếu ảnh đã sinh qua Google Flow, để Bước 3 render đúng bản mới. */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            padding: '12px 16px',
            marginBottom: '12px',
            background: 'rgba(255, 255, 255, 0.015)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '10px'
          }}>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
              🌐 Phụ đề song ngữ (Anh trên - Việt dưới)
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '7px 14px', fontSize: '0.76rem', borderRadius: '8px', fontWeight: 700, whiteSpace: 'nowrap' }}
              onClick={handleTranslateSubtitles}
              disabled={isTranslatingSubtitles || isRenderingVideo || isGeneratingVoice}
            >
              {isTranslatingSubtitles
                ? '⏳ Đang dịch...'
                : alreadyBilingual
                  ? '🌐 Dịch lại phụ đề song ngữ'
                  : '🌐 Cập nhật phụ đề song ngữ'}
            </button>
          </div>

          {subtitleMsg && (
            <div style={{
              fontSize: '0.78rem',
              color: subtitleMsg.startsWith('✓') ? '#2ed573' : 'var(--danger)',
              background: subtitleMsg.startsWith('✓') ? 'rgba(46, 213, 115, 0.08)' : 'rgba(255, 71, 87, 0.08)',
              border: subtitleMsg.startsWith('✓') ? '1px solid rgba(46, 213, 115, 0.15)' : '1px solid rgba(255, 71, 87, 0.15)',
              padding: '8px 12px',
              borderRadius: '6px',
              marginBottom: '16px',
              fontWeight: 500
            }}>
              {subtitleMsg}
            </div>
          )}

          {/* Video Player Preview */}
          {assetCounts.videoCreated && (
            <div style={{
              marginTop: '12px',
              marginBottom: '20px',
              padding: '16px',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <h5 style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎬</span> Review Video Thành Phẩm
                </h5>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 12px', fontSize: '0.74rem', borderRadius: '6px', fontWeight: 700 }}
                  onClick={handleOpenVideoFolder}
                  disabled={isOpeningFolder}
                >
                  {isOpeningFolder ? '⏳ Đang mở...' : '📂 Mở thư mục chứa video'}
                </button>
              </div>
              {openFolderError && (
                <p style={{ margin: '-6px 0 12px 0', fontSize: '0.74rem', color: 'var(--danger)' }}>
                  ⚠️ {openFolderError}
                </p>
              )}
              <video
                key={result.input?.folderPath || 'video'}
                src={`/api/prompts/video-stream?folderPath=${result.input?.folderPath || 'example'}`}
                controls
                style={{
                  width: '100%',
                  maxHeight: '480px',
                  borderRadius: '6px',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
                  outline: 'none',
                  background: '#000'
                }}
              />
            </div>
          )}



          {/* ADVANCED REMOTION CONFIG DETAILS (COLLAPSIBLE) */}
          <details style={{ marginTop: '16px', outline: 'none' }}>
            <summary style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', fontWeight: 700, userSelect: 'none' }}>
              🛠️ Xem cấu hình Remotion nâng cao (JSON & Copy)
            </summary>
            <div style={{ marginTop: '12px', background: 'rgba(0, 0, 0, 0.15)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 600 }}>Cấu hình Remotion JSON (configs/ của skill):</span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '6px', fontWeight: 700 }}
                  onClick={() => {
                    const configToCopy = result.remotionConfig || {
                      title: result.title || "slideshow-video",
                      captionPosition: "bottom",
                      imageFit: "cover",
                      kenBurns: true,
                      transitionSeconds: 0.5,
                      bgColor: "#0E0F13",
                      fontFamily: "'Be Vietnam Pro','Noto Sans',Arial,sans-serif",
                      captionMode: "chunked",
                      captionWordsPerChunk: 4,
                      audioPaddingSeconds: 0.4,
                      bgMusicVolume: 0.12,
                      scenes: result.segments.map(seg => {
                        const folder = result.input?.folderPath || 'example';
                        const imgExt = result.input?.imageExt || 'jpg';
                        const audExt = result.input?.audioExt || 'mp3';
                        const paddedNum = String(seg.segmentNumber).padStart(2, '0');
                        return {
                          image: `${folder}/images/scene-${paddedNum}.${imgExt}`,
                          audio: `${folder}/audio/scene-${paddedNum}.${audExt}`,
                          caption: seg.subtitle || seg.dialogueOrNarration || ""
                        };
                      })
                    };
                    onCopy(JSON.stringify(configToCopy, null, 2), 'remotion_config');
                  }}
                >
                  {copiedKey === 'remotion_config' ? '✓ Đã chép!' : '📋 Sao chép cấu hình'}
                </button>
              </div>
              <pre style={{
                margin: 0,
                fontSize: '0.78rem',
                lineHeight: 1.45,
                color: 'rgba(255, 255, 255, 0.85)',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '12px',
                borderRadius: '8px',
                maxHeight: '180px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {JSON.stringify(result.remotionConfig || {
                  title: result.title || "slideshow-video",
                  captionPosition: "bottom",
                  imageFit: "cover",
                  kenBurns: true,
                  transitionSeconds: 0.5,
                  bgColor: "#0E0F13",
                  fontFamily: "'Be Vietnam Pro','Noto Sans',Arial,sans-serif",
                  captionMode: "chunked",
                  captionWordsPerChunk: 4,
                  audioPaddingSeconds: 0.4,
                  bgMusicVolume: 0.12,
                  scenes: result.segments.map(seg => {
                    const folder = result.input?.folderPath || 'example';
                    const imgExt = result.input?.imageExt || 'jpg';
                    const audExt = result.input?.audioExt || 'mp3';
                    const paddedNum = String(seg.segmentNumber).padStart(2, '0');
                    return {
                      image: `${folder}/images/scene-${paddedNum}.${imgExt}`,
                      audio: `${folder}/audio/scene-${paddedNum}.${audExt}`,
                      caption: seg.subtitle || seg.dialogueOrNarration || ""
                    };
                  })
                }, null, 2)}
              </pre>
            </div>
          </details>

          {/* Status Message Alerts (Only show error messages, since success is already shown in the step pipeline status above) */}
          {voiceMsg && !voiceMsg.startsWith('✓') && (
            <div style={{
              fontSize: '0.78rem',
              color: 'var(--danger)',
              background: 'rgba(255, 71, 87, 0.08)',
              border: '1px solid rgba(255, 71, 87, 0.15)',
              padding: '8px 12px',
              borderRadius: '6px',
              marginTop: '12px',
              fontWeight: 500
            }}>
              {voiceMsg}
            </div>
          )}

          {renderMsg && !renderMsg.startsWith('✓') && (
            <div style={{
              fontSize: '0.78rem',
              color: 'var(--danger)',
              background: 'rgba(255, 71, 87, 0.08)',
              border: '1px solid rgba(255, 71, 87, 0.15)',
              padding: '8px 12px',
              borderRadius: '6px',
              marginTop: '12px',
              fontWeight: 500
            }}>
              {renderMsg}
            </div>
          )}
        </div>
      )}

      {/* Toàn bộ lời thuyết minh gộp lại - bản dự phòng để dán tay, bổ trợ cho nút tự động lồng tiếng bên dưới */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <strong style={{ color: 'var(--warning)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            <span>🎙️</span>
            <span>Toàn bộ lời thuyết minh</span>
          </strong>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '6px', fontWeight: 700, flexShrink: 0 }}
            onClick={() => {
              const fullSpeech = result.segments
                .map(s => {
                  // Loại bỏ tiền tố tên nhân vật (như Alex:, Mia:) nếu có để đọc liền mạch
                  return s.dialogueOrNarration.replace(/^[A-Za-z0-9\s]+:\s*/, '').trim();
                })
                .join(' ');
              onCopy(fullSpeech, 'full_speech_only');
            }}
          >
            {copiedKey === 'full_speech_only' ? '✓ Đã chép!' : '📋 Copy giọng đọc'}
          </button>
        </div>
        <p style={{ margin: '0 0 8px 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Bản dự phòng để dán tay vào công cụ TTS khác (CapCut...) — nếu muốn tự động, dùng nút &quot;🎙️ Tạo Lồng Tiếng&quot; bên dưới.
        </p>
        <p style={{
          margin: 0,
          fontSize: '0.85rem',
          lineHeight: 1.6,
          color: 'rgba(255, 255, 255, 0.85)',
          whiteSpace: 'pre-wrap',
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '12px',
          borderRadius: '8px',
          fontStyle: 'italic'
        }}>
          {result.segments.map(s => s.dialogueOrNarration.replace(/^[A-Za-z0-9\s]+:\s*/, '').trim()).join(' ')}
        </p>
      </div>

      {activeTab === 'script' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5, flex: 1 }}>
              Dưới đây là kịch bản thoại đã được chia nhỏ thành các slide. Hãy sao chép lần lượt từng prompt ảnh phía dưới để sinh ảnh (bằng Midjourney/Flux) hoặc nhấn <strong>🚀 Đẩy sang Google Flow</strong> để chạy tự động qua Chrome Extension.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.78rem', flexShrink: 0, borderRadius: '8px', fontWeight: 700 }}
              onClick={() => {
                const allPrompts = result.segments.map(s => `--- Slide ${s.segmentNumber} ---\nPrompt Ảnh:\n${s.textPrompt}\n\nThoại: ${s.dialogueOrNarration}\nPhụ đề: ${s.subtitle}`).join('\n\n');
                onCopy(allPrompts, 'all_segments');
              }}
            >
              {copiedKey === 'all_segments' ? '✓ Đã sao chép!' : '📋 Sao chép toàn bộ'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {result.segments.map((seg, idx) => (
              <div key={idx} className="timeline-card">
                <div className="timeline-meta">
                  <strong style={{ color: 'var(--primary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🎬</span>
                    <span>Slide {seg.segmentNumber}</span>
                  </strong>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '6px', fontWeight: 700 }}
                    onClick={() => onCopy(seg.textPrompt, `seg_${seg.segmentNumber}`)}
                  >
                    {copiedKey === `seg_${seg.segmentNumber}` ? '✓ Đã chép prompt!' : '📋 Copy Prompt Ảnh'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🖼️</span> <span>Mô tả hoạt cảnh (Visual Description)</span>
                    </span>
                    <p className="timeline-field timeline-field-visual" style={{ color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', margin: '4px 0 0 0' }}>
                      {seg.visualDescription}
                    </p>
                  </div>

                  {seg.dialogueOrNarration && (
                    <div>
                      <span style={{ color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🎙️</span> <span>Lời thoại / Lời kể (Audio)</span>
                      </span>
                      <p className="timeline-field timeline-field-audio" style={{ color: 'var(--warning)', fontWeight: 600, margin: '4px 0 0 0' }}>
                        {seg.dialogueOrNarration}
                      </p>
                    </div>
                  )}

                  {seg.subtitle && (
                    <div>
                      <span style={{ color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>📝</span> <span>Phụ đề hiển thị</span>
                      </span>
                      <p className="timeline-field timeline-field-subtitle" style={{ whiteSpace: 'pre-line', color: '#2ed573', fontWeight: 500, margin: '4px 0 0 0' }}>
                        {seg.subtitle}
                      </p>
                    </div>
                  )}

                  <div style={{ marginTop: '8px' }}>
                    <details style={{ width: '100%' }}>
                      <summary style={{ cursor: 'pointer', color: 'var(--secondary)', fontSize: '0.78rem', fontWeight: 700, userSelect: 'none' }}>
                        Xem câu lệnh tạo ảnh đầy đủ (Midjourney/Flux Prompt)
                      </summary>
                      <div style={{
                        background: '#0a0912',
                        padding: '12px',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        fontFamily: 'monospace',
                        marginTop: '8px',
                        whiteSpace: 'pre-wrap',
                        border: '1px solid rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.65)',
                        lineHeight: 1.45
                      }}>
                        {seg.textPrompt}
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Voiceover setting block (Modal Dialog via Portal) */}
      {showVoiceConfig && mounted && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes quota-spin { to { transform: rotate(360deg); } }
          `}</style>
          <div style={{
            width: '90%',
            maxWidth: '640px',
            background: '#1a1924',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎙️</span> Cấu hình Giọng đọc (ElevenLabs)
              </h4>
              {loadingQuota ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span className="quota-spinner" style={{
                    width: '13px', height: '13px', borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'var(--secondary)',
                    animation: 'quota-spin 0.7s linear infinite'
                  }} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Đang tải...</span>
                </span>
              ) : quota ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }} title={`Còn lại ${quota.remaining?.toLocaleString()} / ${quota.characterLimit?.toLocaleString()} ký tự miễn phí`}>
                  <QuotaRing percent={quota.characterLimit ? (quota.characterCount / quota.characterLimit) * 100 : 0} />
                  <span style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#00f2fe', fontWeight: 600 }}>{quota.remaining?.toLocaleString()}</span>
                    <span style={{ color: 'var(--text-muted)' }}>/{quota.characterLimit?.toLocaleString()} còn lại</span>
                  </span>
                </span>
              ) : quotaError ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }} title={quotaError}>⚠️ Lỗi quota</span>
                  <button
                    type="button"
                    onClick={fetchQuota}
                    style={{ background: 'none', border: 'none', color: 'var(--secondary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, padding: 0, whiteSpace: 'nowrap' }}
                  >
                    Thử lại
                  </button>
                </span>
              ) : null}
            </div>

            {quotaError && (
              <p style={{ margin: '-10px 0 16px 0', fontSize: '0.74rem', color: 'var(--danger)', lineHeight: 1.5 }}>
                ⚠️ {quotaError}
              </p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {[
                { key: 'alex', label: 'Giọng Alex', defaultId: 'wJSBXsvChUQrylZvDzav' },
                { key: 'mia', label: 'Giọng Mia', defaultId: '4IQqf6fVNeEFbqnSbVxb' },
                { key: 'leo', label: 'Giọng Leo', defaultId: 'wJSBXsvChUQrylZvDzav' },
                { key: 'zoe', label: 'Giọng Zoe', defaultId: '4IQqf6fVNeEFbqnSbVxb' },
                { key: 'tom', label: 'Giọng Tom', defaultId: 'wJSBXsvChUQrylZvDzav' },
                { key: 'narrator', label: 'Giọng Người kể (Narrator)', defaultId: '4IQqf6fVNeEFbqnSbVxb' }
              ].map(char => {
                const currentVal = settings.voiceMappings?.[char.key] || char.defaultId;
                const presetList = [
                  { name: 'Giọng của tôi (Nữ)', id: '4IQqf6fVNeEFbqnSbVxb' },
                  { name: 'Giọng của tôi (Nam)', id: 'wJSBXsvChUQrylZvDzav' }
                ];
                const isPreset = presetList.some(p => p.id === currentVal);

                return (
                  <div key={char.key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                      {char.label}
                    </label>
                    <select
                      className="form-control"
                      style={{ fontSize: '0.8rem', padding: '6px', height: '36px', background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
                      value={isPreset ? currentVal : 'custom'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettings(prev => ({
                          ...prev,
                          voiceMappings: {
                            ...prev.voiceMappings,
                            [char.key]: val === 'custom' ? '' : val
                          }
                        }));
                      }}
                    >
                      {presetList.map(p => (
                        <option key={p.id} value={p.id} style={{ background: '#1c1c24' }}>{p.name}</option>
                      ))}
                      <option value="custom" style={{ background: '#1c1c24' }}>Tùy chỉnh (Nhập Voice ID)...</option>
                    </select>
                    {!isPreset && (
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Voice ID..."
                        style={{ fontSize: '0.76rem', padding: '6px 10px', height: '32px', background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', marginTop: '6px' }}
                        value={currentVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings(prev => ({
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

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: 700 }}
                onClick={async () => {
                  setIsSavingSettings(true);
                  try {
                    const res = await fetch('/api/settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        geminiApiKey: settings.geminiApiKey,
                        elevenlabsApiKey: settings.elevenlabsApiKey,
                        mongodbUri: settings.mongodbUri,
                        voiceMappings: settings.voiceMappings
                      })
                    });
                    if (res.ok) {
                      alert('✓ Đã cập nhật cấu hình giọng đọc thành công!');
                      setShowVoiceConfig(false);
                    } else {
                      alert('Lỗi khi lưu cấu hình.');
                    }
                  } catch (err) {
                    alert('Lỗi kết nối khi lưu.');
                  } finally {
                    setIsSavingSettings(false);
                  }
                }}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? 'Đang lưu...' : 'Lưu cấu hình giọng'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: 700 }}
                onClick={() => setShowVoiceConfig(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Cấu hình kiểu render (Modal Dialog via Portal) - phụ đề, chuyển cảnh, song ngữ.
          Chỉ áp dụng cho lần bấm "Tạo (Lại) Video" tiếp theo, không cần tạo lại kịch bản. */}
      {showRenderConfig && mounted && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes prev-crossfade-a { 0% { opacity: 1; } 100% { opacity: 0; } }
            @keyframes prev-crossfade-b { 0% { opacity: 0; } 100% { opacity: 1; } }
            @keyframes prev-slide-left-a { 0% { transform: translateX(0%); } 100% { transform: translateX(-100%); } }
            @keyframes prev-slide-left-b { 0% { transform: translateX(100%); } 100% { transform: translateX(0%); } }
            @keyframes prev-slide-right-a { 0% { transform: translateX(0%); } 100% { transform: translateX(100%); } }
            @keyframes prev-slide-right-b { 0% { transform: translateX(-100%); } 100% { transform: translateX(0%); } }
            @keyframes prev-slide-up-a { 0% { transform: translateY(0%); } 100% { transform: translateY(-100%); } }
            @keyframes prev-slide-up-b { 0% { transform: translateY(100%); } 100% { transform: translateY(0%); } }
            @keyframes prev-zoom-a { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.3); opacity: 0; } }
            @keyframes prev-zoom-b { 0% { transform: scale(0.7); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          `}</style>
          <div style={{
            width: '90%',
            maxWidth: '560px',
            background: '#1a1924',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            textAlign: 'left'
          }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: '0 0 20px 0', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚙️</span> Cấu hình kiểu render (Remotion)
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, display: 'block', marginBottom: '10px' }}>Kiểu phụ đề</span>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {[
                    { value: 'box', label: 'Hộp bo tròn' },
                    { value: 'tiktok', label: 'Viền chữ TikTok' },
                    { value: 'karaoke', label: 'Karaoke tô màu từ' }
                  ].map(opt => (
                    <PickerCard
                      key={opt.value}
                      selected={renderCaptionStyle === opt.value}
                      onClick={() => setRenderCaptionStyle(opt.value)}
                      label={opt.label}
                    >
                      <CaptionStylePreview style={opt.value} />
                    </PickerCard>
                  ))}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, display: 'block', marginBottom: '10px' }}>Kiểu chuyển cảnh</span>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {[
                    { value: 'crossfade', label: 'Hòa tan' },
                    { value: 'slide-left', label: 'Trượt trái' },
                    { value: 'slide-right', label: 'Trượt phải' },
                    { value: 'slide-up', label: 'Trượt lên' },
                    { value: 'zoom', label: 'Phóng to' }
                  ].map(opt => (
                    <PickerCard
                      key={opt.value}
                      width={88}
                      selected={renderTransitionStyle === opt.value}
                      onClick={() => setRenderTransitionStyle(opt.value)}
                      label={opt.label}
                    >
                      <TransitionStylePreview style={opt.value} />
                    </PickerCard>
                  ))}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={renderBilingual}
                  onChange={(e) => setRenderBilingual(e.target.checked)}
                />
                Hiện phụ đề song ngữ
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: 700 }}
                onClick={() => setShowRenderConfig(false)}
              >
                Xong
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
