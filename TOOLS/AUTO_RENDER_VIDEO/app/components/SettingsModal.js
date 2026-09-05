'use client';

import { useState, useEffect } from 'react';

export default function SettingsModal({
  show,
  onClose,
  settings,
  setSettings,
  settingsMsg,
  setSettingsMsg,
  apiKeyVisible,
  setApiKeyVisible,
  isSavingSettings,
  onSave
}) {
  const [driveFolders, setDriveFolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [isLinkingDrive, setIsLinkingDrive] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestResults, setGeminiTestResults] = useState(null);

  const handleTestGeminiKeys = async () => {
    setTestingGemini(true);
    setGeminiTestResults(null);
    try {
      const res = await fetch('/api/prompts/gemini-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: settings.geminiApiKey || '' })
      });
      const data = await res.json();
      if (data.success) {
        setGeminiTestResults(data.results || []);
      } else {
        alert(data.error || 'Lỗi kiểm tra Gemini Key');
      }
    } catch (err) {
      alert('Lỗi kết nối khi kiểm tra Gemini Key: ' + err.message);
    } finally {
      setTestingGemini(false);
    }
  };

  // Quét danh sách thư mục Drive khi mở settings và tài khoản đã được liên kết
  useEffect(() => {
    if (show && settings.googleDrive?.isLinked) {
      fetchDriveFolders();
    }
  }, [show, settings.googleDrive?.isLinked]);

  const fetchDriveFolders = async () => {
    setLoadingFolders(true);
    try {
      const res = await fetch('/api/prompts/drive/folders');
      const data = await res.json();
      if (data.success) {
        setDriveFolders(data.folders || []);
      } else {
        console.error('Lỗi lấy danh mục Drive:', data.error);
      }
    } catch (err) {
      console.error('Lỗi lấy danh mục Drive:', err);
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleLinkDrive = async () => {
    if (!settings.googleDrive?.clientId || !settings.googleDrive?.clientSecret) {
      setSettingsMsg('Lỗi: Vui lòng điền đầy đủ Client ID và Client Secret.');
      return;
    }
    setIsLinkingDrive(true);
    setSettingsMsg('');
    try {
      const res = await fetch('/api/prompts/drive/auth-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: settings.googleDrive.clientId,
          clientSecret: settings.googleDrive.clientSecret
        })
      });
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setSettingsMsg('Lỗi: ' + (data.error || 'Không thể tạo liên kết đăng nhập.'));
        setIsLinkingDrive(false);
      }
    } catch (err) {
      setSettingsMsg('Lỗi kết nối máy chủ.');
      setIsLinkingDrive(false);
    }
  };

  const handleDisconnectDrive = () => {
    setSettings(prev => ({
      ...prev,
      googleDrive: {
        ...prev.googleDrive,
        isLinked: false,
        refreshToken: '',
        email: '',
        folderId: '',
        folderName: ''
      }
    }));
    setSettingsMsg('Đã hủy liên kết Drive. Hãy ấn "Lưu cấu hình" để lưu lại.');
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      const res = await fetch('/api/prompts/drive/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName })
      });
      const data = await res.json();
      if (data.success && data.folder) {
        setDriveFolders(prev => [data.folder, ...prev]);
        setSettings(prev => ({
          ...prev,
          googleDrive: {
            ...prev.googleDrive,
            folderId: data.folder.id,
            folderName: data.folder.name
          }
        }));
        setNewFolderName('');
        setShowNewFolderInput(false);
        setSettingsMsg(`✓ Đã tạo và chọn thư mục "${data.folder.name}" trên Drive!`);
      } else {
        setSettingsMsg('Lỗi: ' + (data.error || 'Không thể tạo thư mục.'));
      }
    } catch (err) {
      setSettingsMsg('Lỗi kết nối máy chủ khi tạo thư mục.');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  if (!show) return null;

  return (
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
      onClick={onClose}
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
            onClick={onClose}
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
              {((settings.geminiApiKey || '').split('\n').length === 0 ? [''] : settings.geminiApiKey.split('\n')).map((keyVal, idx, arr) => {
                return (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                        if (pasted.includes('\n') || pasted.includes(',')) {
                          e.preventDefault();
                          const newKeys = pasted.split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
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

          {/* Section 2: MongoDB Connection */}
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
              value={settings.mongodbUri}
              onChange={(e) => setSettings(prev => ({ ...prev, mongodbUri: e.target.value }))}
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

          {/* Section 3: Google Drive Backup Settings */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '14px',
            padding: '18px'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>☁️</span> Google Drive Backup
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Google OAuth Credentials */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Client ID</label>
                  <input
                    type="text"
                    placeholder="Nhập Google Client ID..."
                    value={settings.googleDrive?.clientId || ''}
                    disabled={settings.googleDrive?.isLinked}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      googleDrive: { ...(prev.googleDrive || {}), clientId: e.target.value }
                    }))}
                    style={{
                      width: '100%',
                      fontSize: '0.78rem',
                      padding: '8px 10px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: '#fff'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Client Secret</label>
                  <input
                    type="password"
                    placeholder="Nhập Google Client Secret..."
                    value={settings.googleDrive?.clientSecret || ''}
                    disabled={settings.googleDrive?.isLinked}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      googleDrive: { ...(prev.googleDrive || {}), clientSecret: e.target.value }
                    }))}
                    style={{
                      width: '100%',
                      fontSize: '0.78rem',
                      padding: '8px 10px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: '#fff'
                    }}
                  />
                </div>
              </div>

              {/* Auth Status & Link Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                {settings.googleDrive?.isLinked ? (
                  <>
                    <span style={{ fontSize: '0.78rem', color: '#2ed573', fontWeight: 600 }}>
                      🟢 Đã liên kết: {settings.googleDrive?.email}
                    </span>
                    <button
                      type="button"
                      onClick={handleDisconnectDrive}
                      style={{
                        background: 'rgba(255, 71, 87, 0.12)',
                        border: '1px solid rgba(255, 71, 87, 0.3)',
                        borderRadius: '6px',
                        color: '#ff4757',
                        fontSize: '0.74rem',
                        padding: '4px 10px',
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                    >
                      🔓 Hủy liên kết
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      ⚠️ Chưa liên kết tài khoản Drive
                    </span>
                    <button
                      type="button"
                      onClick={handleLinkDrive}
                      disabled={isLinkingDrive || !settings.googleDrive?.clientId || !settings.googleDrive?.clientSecret}
                      style={{
                        background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.74rem',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        boxShadow: '0 3px 10px rgba(0, 242, 254, 0.2)'
                      }}
                    >
                      {isLinkingDrive ? '⏳ Đang kết nối...' : '🔗 Liên kết tài khoản Google Drive'}
                    </button>
                  </>
                )}
              </div>

              {/* Help Guide (Only show if not linked) */}
              {!settings.googleDrive?.isLinked && (
                <div style={{
                  fontSize: '0.7rem',
                  color: 'rgba(255, 255, 255, 0.45)',
                  lineHeight: 1.4,
                  background: 'rgba(0,0,0,0.15)',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.02)'
                }}>
                  <strong>💡 Hướng dẫn lấy Client Credentials:</strong>
                  <ol style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
                    <li>Tạo dự án trên Google Cloud Console và bật <strong>Google Drive API</strong>.</li>
                    <li>Thiết lập OAuth Consent Screen và cấu hình Credentials làm <strong>OAuth Client ID (Web Application)</strong>.</li>
                    <li>Thêm Authorized redirect URI: <code style={{ color: '#00f2fe', background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: '3px' }}>http://localhost:3000/api/prompts/drive-callback</code> (hoặc cổng tương ứng của bạn).</li>
                    <li>Dán Client ID &amp; Secret vào ô trên rồi nhấn nút Liên kết.</li>
                  </ol>
                </div>
              )}

              {/* Destination Folder Selection (Only show if linked) */}
              {settings.googleDrive?.isLinked && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', color: '#fff', fontWeight: 600 }}>Thư mục lưu trữ trên Drive:</span>
                    <button
                      type="button"
                      onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#00f2fe',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {showNewFolderInput ? '✕ Đóng' : '➕ Tạo thư mục mới'}
                    </button>
                  </div>

                  {showNewFolderInput ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Nhập tên thư mục mới..."
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        style={{
                          flex: 1,
                          fontSize: '0.76rem',
                          padding: '6px 10px',
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#fff'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleCreateFolder}
                        disabled={isCreatingFolder || !newFolderName.trim()}
                        style={{
                          background: '#2ed573',
                          border: 'none',
                          color: '#fff',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '6px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        {isCreatingFolder ? '⏳' : 'Tạo'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        value={settings.googleDrive?.folderId || ''}
                        onChange={(e) => {
                          const selectedOpt = e.target.options[e.target.selectedIndex];
                          setSettings(prev => ({
                            ...prev,
                            googleDrive: {
                              ...prev.googleDrive,
                              folderId: e.target.value,
                              folderName: selectedOpt.text
                            }
                          }));
                        }}
                        disabled={loadingFolders}
                        style={{
                          flex: 1,
                          fontSize: '0.78rem',
                          padding: '8px 10px',
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">Thư mục gốc (Root)</option>
                        {driveFolders.map(folder => (
                          <option key={folder.id} value={folder.id}>
                            {folder.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={fetchDriveFolders}
                        disabled={loadingFolders}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Làm mới thư mục"
                      >
                        {loadingFolders ? '⏳' : '🔄'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Pexels API Settings */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '14px',
            padding: '18px'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📷</span> Pexels Stock Media API
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Pexels API Key</label>
                <input
                  type="text"
                  placeholder="Nhập Pexels API Key..."
                  value={settings.pexelsApiKey || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    pexelsApiKey: e.target.value
                  }))}
                  style={{
                    width: '100%',
                    fontSize: '0.78rem',
                    padding: '8px 10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#fff'
                  }}
                />
              </div>
              <div style={{
                fontSize: '0.7rem',
                color: 'rgba(255, 255, 255, 0.45)',
                lineHeight: 1.4,
                background: 'rgba(0,0,0,0.15)',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.02)'
              }}>
                <strong>💡 Hướng dẫn lấy Pexels API Key:</strong>
                <ol style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
                  <li>Truy cập <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" style={{ color: '#00f2fe', textDecoration: 'none' }}>pexels.com/api</a> và đăng ký tài khoản.</li>
                  <li>Vào mục <strong>Your API Key</strong> để copy mã khoá API của bạn.</li>
                  <li>Dán mã khoá vào ô nhập ở trên rồi nhấn <strong>💾 Lưu cấu hình</strong> bên dưới để hoàn tất thiết lập.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {settingsMsg && (
          <div style={{
            fontSize: '0.82rem',
            marginTop: '18px',
            padding: '12px 14px',
            borderRadius: '8px',
            background: settingsMsg.startsWith('Lỗi') ? 'rgba(255, 71, 87, 0.15)' : 'rgba(46, 213, 115, 0.15)',
            border: settingsMsg.startsWith('Lỗi') ? '1px solid rgba(255, 71, 87, 0.3)' : '1px solid rgba(46, 213, 115, 0.3)',
            color: settingsMsg.startsWith('Lỗi') ? '#ff4757' : '#2ed573',
            fontWeight: 600
          }}>
            {settingsMsg}
          </div>
        )}

        {/* Bottom Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button
            type="button"
            className="btn"
            onClick={onSave}
            disabled={isSavingSettings}
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
            {isSavingSettings ? '⏳ Đang lưu...' : '💾 Lưu cấu hình'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={onClose}
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
  );
}
