'use client';

import React, { useEffect, useState } from 'react';

function safePathPart(value, fallback = 'video-che-tac') {
  const cleaned = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56);
  return cleaned || fallback;
}

function flowFolderOf(record) {
  const title = safePathPart(record?.title);
  const id = safePathPart(record?.id || record?.createdAt || 'legacy', 'job');
  return `AutoPoster_Flow/Craft_ASMR/${title}-${id}`;
}

export function useCraftAsmrFlow({ result, clipCount, durationSeconds, aspectRatio, onError }) {
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [queueState, setQueueState] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.source !== window || !event.data) return;
      if (event.data.type === 'FLOW_QUEUE_STATE') {
        setExtensionConnected(true);
        setQueueState({ queue: event.data.queue || null, autoRunActive: event.data.autoRunActive === true });
      } else if (event.data.type === 'FLOW_QUEUE_ACCEPTED') {
        setExtensionConnected(true);
        setNotice(event.data.autoRun
          ? 'Đã gửi sang Flow. Extension đang tự tạo và tải từng clip.'
          : 'Đã chuyển prompt sang Flow. Bấm “Run tất cả kịch bản” trong extension để bắt đầu.');
      }
    };
    window.addEventListener('message', handleMessage);
    window.postMessage({ type: 'REQUEST_FLOW_QUEUE_STATE' }, '*');
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const folderPath = result ? flowFolderOf(result) : '';
  const queue = queueState?.queue?.folderPath === folderPath ? queueState.queue : null;
  const completed = queue?.segments?.filter((segment) => segment.status === 'completed').length || 0;
  const total = queue?.segments?.length || clipCount;
  const running = Boolean(queue && (
    queueState?.autoRunActive || queue.segments?.some((segment) => segment.status === 'processing' || segment.status === 'downloading')
  ));
  const done = Boolean(queue && total > 0 && completed === total);
  const hasError = Boolean(queue?.segments?.some((segment) => segment.status === 'error'));

  const create = () => {
    if (!result) return;
    if (!extensionConnected) {
      onError('Chưa kết nối được Google Flow Helper. Hãy bật/cập nhật extension rồi F5 trang này.');
      window.postMessage({ type: 'REQUEST_FLOW_QUEUE_STATE' }, '*');
      return;
    }
    const clips = Array.isArray(result.clips) && result.clips.length > 0
      ? result.clips
      : [{ index: 1, label: `Clip 1 · ~${result.durationSeconds || 10}s`, promptText: result.promptText || '' }];
    const segments = clips.map((clip, index) => ({
      segmentNumber: Number(clip.index) || index + 1,
      textPrompt: clip.promptText || '',
      visualDescription: clip.label || `Clip ${index + 1}`,
      dialogueOrNarration: clip.label || `Clip ${index + 1}`,
      durationSeconds: result.durationSeconds || durationSeconds,
      outputFilename: `clip-${String(index + 1).padStart(2, '0')}`,
      status: 'pending',
    }));

    onError('');
    setNotice('Đang chuyển prompt sang Google Flow…');
    window.postMessage({
      type: 'START_FLOW_GENERATION',
      segments,
      title: result.title || 'Video chế tác ASMR',
      isImage: false,
      folderPath,
      category: 'craft_asmr',
      aspectRatio: result.aspectRatio || aspectRatio,
      orientation: (result.aspectRatio || aspectRatio) === '16:9' ? 'landscape' : 'portrait',
      // Chỉ nạp hàng đợi và mở Flow. Người dùng chủ động bấm Run trong side panel extension
      // rồi extension mới được phép dán prompt và bắt đầu tạo video.
      autoRun: false,
    }, '*');
  };

  return { create, resetNotice: () => setNotice(''), folderPath, notice, queue, completed, total, running, done, hasError };
}

export function CraftAsmrFlowButton({ flow }) {
  return (
    <button
      type="button"
      className="btn btn-primary"
      style={{ padding: '8px 14px', fontSize: '0.8rem' }}
      onClick={flow.create}
      disabled={flow.running}
      title="Chuyển prompt sang Google Flow; chỉ chạy khi bạn bấm Run trong extension"
    >
      {flow.running
        ? `⏳ Flow đang tạo ${flow.completed}/${flow.total}`
        : flow.done
          ? `✓ Đã tải ${flow.completed} clip · Tạo lại`
          : '🎬 Qua Flow tạo video'}
    </button>
  );
}

export function CraftAsmrFlowNotice({ flow }) {
  if (!flow.notice && !flow.queue) return null;
  return (
    <div style={{
      background: flow.hasError ? 'rgba(255, 71, 87, 0.08)' : 'rgba(37, 244, 238, 0.06)',
      border: `1px solid ${flow.hasError ? 'rgba(255, 71, 87, 0.25)' : 'rgba(37, 244, 238, 0.2)'}`,
      borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '0.74rem',
      color: 'rgba(255,255,255,0.8)', lineHeight: 1.6,
    }}>
      <b style={{ color: flow.hasError ? '#ff6b7a' : '#25f4ee' }}>
        {flow.hasError ? 'Flow có clip bị lỗi.' : flow.done ? 'Đã hoàn tất.' : flow.notice}
      </b>{' '}
      Video được lưu tại <code>Downloads/{flow.folderPath}/clip-XX.mp4</code>.
      {!flow.done && ' Hãy để Google Flow ở chế độ Video và đúng khung hình, sau đó bấm “Run tất cả kịch bản” trong extension.'}
    </div>
  );
}
