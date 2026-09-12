'use client';

import { useEffect, useRef, useState } from 'react';
import { parseApiKeys } from '@/src/domain/ai/apiKeys.js';
import { showToast } from '../Toast.js';

export default function GeminiKeySettings({ settings, setSettings, apiKeyVisible, setApiKeyVisible }) {
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestResults, setGeminiTestResults] = useState(null);
  const [draggedKeyIndex, setDraggedKeyIndex] = useState(null);
  const [dragOverKeyIndex, setDragOverKeyIndex] = useState(null);
  const [rowDraggableIndex, setRowDraggableIndex] = useState(null);

  const currentDraft = useRef(settings.geminiApiKey);
  currentDraft.current = settings.geminiApiKey;
  useEffect(() => { setGeminiTestResults(null); }, [settings.geminiApiKey]);

  const handleReorderGeminiKeys = (fromIdx, toIdx) => {
    if (fromIdx === null || toIdx === null || fromIdx === toIdx) return;
    const currentKeys = settings.geminiApiKey ? settings.geminiApiKey.split('\n') : [''];
    if (fromIdx < 0 || fromIdx >= currentKeys.length || toIdx < 0 || toIdx >= currentKeys.length) return;

    const updatedKeys = [...currentKeys];
    const [movedKey] = updatedKeys.splice(fromIdx, 1);
    updatedKeys.splice(toIdx, 0, movedKey);
    setSettings(prev => ({ ...prev, geminiApiKey: updatedKeys.join('\n') }));


  };

  const handleTestGeminiKeys = async () => {
    const submitted = settings.geminiApiKey;
    setTestingGemini(true);
    setGeminiTestResults(null);
    try {
      const res = await fetch('/api/prompts/gemini-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: settings.geminiApiKey || '' })
      });
      const data = await res.json();
      if (currentDraft.current !== submitted) return;
      if (data.success) {
        const keys = parseApiKeys(submitted);
        setGeminiTestResults((submitted || '').split('\n').map(key => data.results?.[keys.indexOf(key.trim())]));
        showToast.success('Đã kiểm tra xong. Xem trạng thái từng key.');
      } else {
        showToast.error(data.error || 'Lỗi kiểm tra Gemini Key');
      }
    } catch (err) {
      showToast.error('Lỗi kết nối khi kiểm tra Gemini Key: ' + err.message);
    } finally {
      setTestingGemini(false);
    }
  };

  return (
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
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Các key được sử dụng luân phiên; kéo thả để sắp xếp danh sách</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: '#00f2fe', background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.25)', padding: '3px 10px', borderRadius: '20px', fontWeight: 700 }}>
                  {(settings.geminiApiKey ? settings.geminiApiKey.split('\n').filter(Boolean).length : 0)} Key
                </span>
                <button
                  type="button"
                  onClick={handleTestGeminiKeys}
                  disabled={testingGemini}
                  style={{
                    background: 'rgba(0, 242, 254, 0.12)',
                    border: '1px solid rgba(0, 242, 254, 0.35)',
                    borderRadius: '6px',
                    color: '#00f2fe',
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    cursor: testingGemini ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Gửi request test thử từng Key để xem Key nào còn sống / hết quota"
                >
                  {testingGemini ? '⏳ Đang test...' : '⚡ Kiểm tra Key'}
                </button>
                <button
                  type="button"
                  onClick={() => setApiKeyVisible(!apiKeyVisible)}
                  style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.75rem', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
                >
                  {apiKeyVisible ? '🙈 Ẩn Key' : '👁️ Hiện Key'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const current = settings.geminiApiKey ? settings.geminiApiKey.split('\n') : [''];
                    setSettings(prev => ({ ...prev, geminiApiKey: [...current, ''].join('\n') }));
                    setGeminiTestResults(null);
                  }}
                  style={{ background: 'rgba(46, 213, 115, 0.15)', border: '1px solid rgba(46, 213, 115, 0.3)', borderRadius: '6px', color: '#2ed573', fontSize: '0.75rem', padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}
                >
                  + Thêm Key
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(settings.geminiApiKey || '').split('\n').map((keyVal, idx, arr) => {
                const isDragging = draggedKeyIndex === idx;
                const isDragOver = dragOverKeyIndex === idx && draggedKeyIndex !== idx;

                return (
                  <div
                    key={idx}
                    draggable={rowDraggableIndex === idx}
                    onDragStart={(e) => {
                      setDraggedKeyIndex(idx);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(idx));
                    }}
                    onDragEnd={() => {
                      setDraggedKeyIndex(null);
                      setDragOverKeyIndex(null);
                      setRowDraggableIndex(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverKeyIndex !== idx) setDragOverKeyIndex(idx);
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget)) return;
                      if (dragOverKeyIndex === idx) setDragOverKeyIndex(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromIdx = draggedKeyIndex ?? parseInt(e.dataTransfer.getData('text/plain'), 10);
                      if (!isNaN(fromIdx) && fromIdx !== idx) {
                        handleReorderGeminiKeys(fromIdx, idx);
                      }
                      setDraggedKeyIndex(null);
                      setDragOverKeyIndex(null);
                      setRowDraggableIndex(null);
                    }}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                      padding: '4px 6px',
                      borderRadius: '10px',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      background: isDragOver
                        ? 'rgba(0, 242, 254, 0.08)'
                        : isDragging
                        ? 'rgba(255, 255, 255, 0.02)'
                        : 'transparent',
                      border: isDragOver
                        ? '1px dashed #00f2fe'
                        : isDragging
                        ? '1px dashed rgba(255, 255, 255, 0.2)'
                        : '1px solid transparent',
                      opacity: isDragging ? 0.4 : 1,
                      transform: isDragOver ? 'scale(1.01)' : 'none'
                    }}
                  >
                    {/* Tay cầm kéo thả 6 chấm */}
                    <div
                      onMouseEnter={() => setRowDraggableIndex(idx)}
                      onMouseLeave={() => {
                        if (draggedKeyIndex === null) setRowDraggableIndex(null);
                      }}
                      onMouseDown={() => setRowDraggableIndex(idx)}
                      title="Kéo thả để sắp xếp danh sách"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: draggedKeyIndex === idx ? 'grabbing' : 'grab',
                        padding: '9px 10px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: draggedKeyIndex === idx ? '#00f2fe' : 'rgba(255, 255, 255, 0.4)',
                        userSelect: 'none',
                        flexShrink: 0
                      }}
                    >
                      <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
                        <circle cx="3" cy="3" r="1.5" />
                        <circle cx="9" cy="3" r="1.5" />
                        <circle cx="3" cy="8" r="1.5" />
                        <circle cx="9" cy="8" r="1.5" />
                        <circle cx="3" cy="13" r="1.5" />
                        <circle cx="9" cy="13" r="1.5" />
                      </svg>
                    </div>

                    <input
                      type={apiKeyVisible ? 'text' : 'password'}
                      className="form-control"
                      placeholder={`Nhập Gemini API Key #${idx + 1}...`}
                      value={keyVal}
                      onChange={(e) => {
                        const updated = [...arr];
                        updated[idx] = e.target.value;
                        setSettings(prev => ({ ...prev, geminiApiKey: updated.join('\n') }));
                      }}
                      onPaste={(e) => {
                        const pasted = e.clipboardData.getData('text');
                        if (/[\n,;]/.test(pasted)) {
                          e.preventDefault();
                          const newKeys = parseApiKeys(pasted);
                          const updated = [...arr];
                          updated.splice(idx, 1, ...newKeys);
                          setSettings(prev => ({ ...prev, geminiApiKey: updated.join('\n') }));
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
                        fontFamily: apiKeyVisible ? 'monospace' : 'inherit'
                      }}
                    />
                    {geminiTestResults && geminiTestResults[idx] && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '6px 10px',
                          borderRadius: '6px',
                          whiteSpace: 'nowrap',
                          background:
                            geminiTestResults[idx].status === 'active'
                              ? 'rgba(46, 213, 115, 0.15)'
                              : geminiTestResults[idx].status === 'exhausted'
                              ? 'rgba(255, 165, 2, 0.15)'
                              : 'rgba(255, 71, 87, 0.15)',
                          color:
                            geminiTestResults[idx].status === 'active'
                              ? '#2ed573'
                              : geminiTestResults[idx].status === 'exhausted'
                              ? '#ffa502'
                              : '#ff4757',
                          border: `1px solid ${
                            geminiTestResults[idx].status === 'active'
                              ? 'rgba(46, 213, 115, 0.35)'
                              : geminiTestResults[idx].status === 'exhausted'
                              ? 'rgba(255, 165, 2, 0.35)'
                              : 'rgba(255, 71, 87, 0.35)'
                          }`
                        }}
                        title={geminiTestResults[idx].message}
                      >
                        {geminiTestResults[idx].status === 'active' ? '✓ ' : '✕ '}
                        {geminiTestResults[idx].message}
                      </span>
                    )}
                    {arr.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = arr.filter((_, i) => i !== idx);
                          setSettings(prev => ({ ...prev, geminiApiKey: updated.join('\n') }));
                          if (geminiTestResults && Array.isArray(geminiTestResults)) {
                            setGeminiTestResults(prev => prev.filter((_, i) => i !== idx));
                          }
                        }}
                        style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.25)', color: '#ff4757', borderRadius: '8px', padding: '9px 12px', cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0 }}
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

  );
}
