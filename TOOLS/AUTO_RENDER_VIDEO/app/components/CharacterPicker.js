'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const CHAR_AVATAR_COLORS = {
  alex: 'linear-gradient(135deg, #FE2C55, #ff6b81)',
  mia: 'linear-gradient(135deg, #25F4EE, #1ed1cb)',
  leo: 'linear-gradient(135deg, #7A12FF, #a370f7)',
  zoe: 'linear-gradient(135deg, #ff9f43, #ffb167)',
  tom: 'linear-gradient(135deg, #2ed573, #7bed9f)'
};

// Hàm tạo màu gradient ngẫu nhiên cho nhân vật tự chọn
function getAvatarBg(id) {
  if (CHAR_AVATAR_COLORS[id]) return CHAR_AVATAR_COLORS[id];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    ['#ff6b6b', '#ff8787'],
    ['#4dabf7', '#3bc9db'],
    ['#ae3ec9', '#d0bfff'],
    ['#f76707', '#ffa94d'],
    ['#37b24d', '#74b816'],
    ['#f59f00', '#ffe066']
  ];
  const idx = Math.abs(hash) % colors.length;
  return `linear-gradient(135deg, ${colors[idx][0]}, ${colors[idx][1]})`;
}

export default function CharacterPicker({ 
  field, 
  selectedIds = [], 
  onToggle, 
  characters = [], 
  onDeleteCustomChar, 
  onUploadChar,
  onUpdateChar,
  isListModalOpen = false,
  setIsListModalOpen
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  
  // State quản lý Modal form (chế độ thêm hoặc chế độ sửa)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null: Thêm mới, character object: Chỉnh sửa

  // States cho form nhân vật
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [trait, setTrait] = useState('');
  const [role, setRole] = useState('');
  const [voiceHint, setVoiceHint] = useState('');
  
  const [imageFile1, setImageFile1] = useState(null);
  const [imageFile2, setImageFile2] = useState(null);
  const [previewUrl1, setPreviewUrl1] = useState('');
  const [previewUrl2, setPreviewUrl2] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (previewUrl1 && !previewUrl1.startsWith('/')) URL.revokeObjectURL(previewUrl1);
      if (previewUrl2 && !previewUrl2.startsWith('/')) URL.revokeObjectURL(previewUrl2);
    };
  }, [previewUrl1, previewUrl2]);

  // Mở modal thêm mới
  const handleOpenAdd = () => {
    setEditTarget(null);
    setName('');
    setPersonality('');
    setTrait('');
    setRole('Đóng vai người tham gia hội thoại');
    setVoiceHint('Giọng tự nhiên');
    setImageFile1(null);
    setImageFile2(null);
    setPreviewUrl1('');
    setPreviewUrl2('');
    setUploadError('');
    setIsModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEdit = (char) => {
    setEditTarget(char);
    setName(char.name);
    setPersonality(char.personality || '');
    setTrait(char.trait || '');
    setRole(char.role || '');
    setVoiceHint(char.voiceHint || '');
    setImageFile1(null);
    setImageFile2(null);
    setPreviewUrl1(char.images?.[0] || '');
    setPreviewUrl2(char.images?.[1] || '');
    setUploadError('');
    setIsModalOpen(true);
  };

  const handleImageChange = (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    if (index === 1) {
      setImageFile1(file);
      if (previewUrl1 && !previewUrl1.startsWith('/')) URL.revokeObjectURL(previewUrl1);
      setPreviewUrl1(url);
    } else {
      setImageFile2(file);
      if (previewUrl2 && !previewUrl2.startsWith('/')) URL.revokeObjectURL(previewUrl2);
      setPreviewUrl2(url);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!name || !personality || !trait) {
      setUploadError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }
    
    // Nếu thêm mới, bắt buộc phải có cả 2 ảnh
    if (!editTarget && (!imageFile1 || !imageFile2)) {
      setUploadError('Vui lòng tải lên đầy đủ cả 2 ảnh: chân dung chính diện và nhiều góc độ.');
      return;
    }
    
    // Nếu chỉnh sửa, bắt buộc cả 2 ô preview phải có ảnh (cũ hoặc mới)
    if (editTarget && (!previewUrl1 || !previewUrl2)) {
      setUploadError('Vui lòng đảm bảo tải lên đầy đủ cả 2 ảnh: chính diện và nhiều góc độ.');
      return;
    }

    setUploadError('');
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('personality', personality);
    formData.append('trait', trait);
    formData.append('role', role);
    formData.append('voiceHint', voiceHint);
    
    if (imageFile1) {
      formData.append('image1', imageFile1);
    }
    if (imageFile2) {
      formData.append('image2', imageFile2);
    }

    let res;
    if (editTarget) {
      formData.append('id', editTarget.id);
      const existingImages = editTarget.images || [];
      formData.append('existingImages', JSON.stringify(existingImages));
      res = await onUpdateChar(formData);
    } else {
      res = await onUploadChar(formData);
    }

    setIsSubmitting(false);

    if (res.success) {
      setIsModalOpen(false);
    } else {
      setUploadError(res.error);
    }
  };

  const renderLightbox = () => {
    if (!previewImage) return null;
    const lightbox = (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 4, 10, 0.92)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          cursor: 'zoom-out'
        }}
        onClick={() => setPreviewImage(null)}
      >
        <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={e => e.stopPropagation()}>
          <img 
            src={previewImage} 
            alt="Preview" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '85vh', 
              borderRadius: '12px', 
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              display: 'block'
            }} 
          />
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'absolute',
              top: '-16px',
              right: '-16px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#FE2C55',
              border: 'none',
              color: '#fff',
              fontSize: '1.4rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(254, 44, 85, 0.4)'
            }}
          >
            ×
          </button>
        </div>
      </div>
    );

    if (isMounted) {
      return createPortal(lightbox, document.body);
    }
    return null;
  };

  const renderUploadModal = () => {
    if (!isModalOpen) return null;
    const isEditMode = !!editTarget;

    const modal = (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(5, 4, 10, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div className="glass-card custom-scrollbar" style={{
          width: '100%',
          maxWidth: '650px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          overflowY: 'auto'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: '12px',
            flexShrink: 0
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <span>{isEditMode ? '✏️' : '➕'}</span>
              <span>{isEditMode ? `Chỉnh sửa nhân vật: ${editTarget.name}` : 'Thêm Nhân Vật Mới'}</span>
            </h3>
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                border: 'none', 
                color: '#fff', 
                fontSize: '1.3rem', 
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: '0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              ×
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label">Tên nhân vật *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Ví dụ: Leo, Zoe..." 
                  required 
                />
              </div>
              <div>
                <label className="form-label">Đặc điểm nổi bật / Phụ kiện *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={trait} 
                  onChange={e => setTrait(e.target.value)} 
                  placeholder="Ví dụ: Đeo balo xanh, đội mũ bảo hiểm..." 
                  required 
                />
              </div>
            </div>

            <div>
              <label className="form-label">Tính cách *</label>
              <textarea 
                className="form-control" 
                rows="2"
                value={personality} 
                onChange={e => setPersonality(e.target.value)} 
                placeholder="Ví dụ: Trầm tính, nghiêm túc, thích đọc sách tiếng Anh..." 
                required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label">Vai trò (Mặc định)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={role} 
                  onChange={e => setRole(e.target.value)} 
                  placeholder="Ví dụ: Bạn thân, giáo viên, đồng nghiệp..." 
                />
              </div>
              <div>
                <label className="form-label">Gợi ý giọng thoại (Mặc định)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={voiceHint} 
                  onChange={e => setVoiceHint(e.target.value)} 
                  placeholder="Ví dụ: Giọng nam trầm, giọng nữ lảnh lót..." 
                />
              </div>
            </div>

            {/* File Uploads Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '4px' }}>
              <div>
                <label className="form-label">Ảnh chân dung chính diện {isEditMode ? '(Tùy chọn tải mới)' : '*'}</label>
                <div style={{
                  border: '2px dashed rgba(255,255,255,0.15)',
                  borderRadius: '10px',
                  height: '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  background: previewUrl1 ? 'none' : 'rgba(255,255,255,0.02)',
                  transition: '0.15s'
                }}>
                  {previewUrl1 ? (
                    <>
                      <img src={previewUrl1} alt="Preview 1" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setImageFile1(null); setPreviewUrl1(''); }}
                        style={{ position: 'absolute', top: '5px', right: '5px', background: '#FE2C55', border: 'none', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '10px' }}>
                      <span style={{ fontSize: '1.5rem', marginBottom: '5px', display: 'block' }}>👤</span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Chọn ảnh chân dung người que *</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleImageChange(e, 1)} 
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, cursor: 'pointer' }} 
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="form-label">Ảnh chụp nhiều góc độ {isEditMode ? '(Tùy chọn tải mới)' : '*'}</label>
                <div style={{
                  border: '2px dashed rgba(255,255,255,0.15)',
                  borderRadius: '10px',
                  height: '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  background: previewUrl2 ? 'none' : 'rgba(255,255,255,0.02)',
                  transition: '0.15s'
                }}>
                  {previewUrl2 ? (
                    <>
                      <img src={previewUrl2} alt="Preview 2" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setImageFile2(null); setPreviewUrl2(''); }}
                        style={{ position: 'absolute', top: '5px', right: '5px', background: '#FE2C55', border: 'none', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '10px' }}>
                      <span style={{ fontSize: '1.5rem', marginBottom: '5px', display: 'block' }}>👥</span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Chọn ảnh sheet nhiều góc chụp *</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleImageChange(e, 2)} 
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, cursor: 'pointer' }} 
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {uploadError && (
              <div className="alert alert-danger" style={{ 
                fontSize: '0.8rem', 
                padding: '10px 14px', 
                borderRadius: '8px', 
                border: '1px solid rgba(239, 68, 68, 0.2)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                marginTop: '8px',
                lineHeight: 1.45
              }}>
                <strong>⚠️ Có lỗi xảy ra:</strong><br />
                {uploadError}
              </div>
            )}

            {isSubmitting && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                justifyContent: 'center', 
                padding: '10px', 
                color: 'var(--secondary)',
                fontSize: '0.82rem',
                border: '1px solid rgba(37, 244, 238, 0.12)',
                background: 'rgba(37, 244, 238, 0.04)',
                borderRadius: '8px'
              }}>
                <svg className="animate-spin" style={{ width: '16px', height: '16px', fill: 'none', stroke: 'var(--secondary)', strokeWidth: '3' }} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)"/>
                  <path fill="var(--secondary)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                <span>Đang lưu thông tin và tải ảnh nhân vật lên...</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '16px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '12px',
              flexShrink: 0
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isSubmitting}
                onClick={() => setIsModalOpen(false)}
                style={{ padding: '8px 20px', fontSize: '0.85rem', borderRadius: '8px', fontWeight: 700 }}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ padding: '8px 20px', fontSize: '0.85rem', borderRadius: '8px', fontWeight: 700 }}
              >
                Lưu Thay Đổi
              </button>
            </div>
          </form>
        </div>
      </div>
    );

    if (isMounted) {
      return createPortal(modal, document.body);
    }
    return null;
  };

  const renderCharacterCard = (char) => {
    const selected = (selectedIds || []).includes(char.id);
    const avatarBg = getAvatarBg(char.id);
    const initial = char.name.replace('Ông ', '').charAt(0);

    return (
      <div
        key={char.id}
        onClick={() => onToggle(field, char.id)}
        className={`picker-card character-card ${selected ? 'active' : ''}`}
        style={{ 
          padding: '16px 14px 14px 14px',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          border: selected ? '1.5px solid var(--primary)' : '1px solid rgba(255,255,255,0.06)',
          boxShadow: selected 
            ? '0 0 0 1px var(--primary), 0 10px 30px rgba(254, 44, 85, 0.25)' 
            : '0 4px 12px rgba(0, 0, 0, 0.1)',
          background: selected 
            ? 'linear-gradient(145deg, rgba(254, 44, 85, 0.08), rgba(255, 255, 255, 0.01))' 
            : 'rgba(255, 255, 255, 0.015)'
        }}
      >
        {/* Action Buttons Group — chỉ hiện khi hover vào card (xem .character-actions trong globals.css) */}
        <div className="character-actions" style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          gap: '6px',
          zIndex: 10
        }}>
          {/* Edit Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(char);
            }}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: selected ? 'rgba(254, 44, 85, 0.12)' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: selected ? 'var(--primary)' : '#fff',
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--secondary)';
              e.currentTarget.style.color = '#000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = selected ? 'rgba(254, 44, 85, 0.12)' : 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = selected ? 'var(--primary)' : '#fff';
            }}
            title="Sửa nhân vật"
          >
            ✏️
          </button>

          {/* Delete Button — cho phép xóa cả nhân vật mặc định lẫn nhân vật tự thêm */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteCustomChar(char.id, char.name);
            }}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ef4444';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.color = '#ef4444';
            }}
            title="Xóa nhân vật này"
          >
            ×
          </button>
        </div>

        {/* Avatar & Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', marginTop: '4px' }}>
          <div 
            className="character-avatar" 
            style={{ 
              background: avatarBg, 
              flexShrink: 0,
              boxShadow: selected ? '0 0 10px rgba(254, 44, 85, 0.3)' : 'none',
              transform: selected ? 'scale(1.05)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {initial}
          </div>
          <div style={{ flexGrow: 1, minWidth: 0, paddingRight: '48px' }}>
            <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {char.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: selected ? 'rgba(254, 44, 85, 0.85)' : 'var(--secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
              {char.trait ? char.trait.split(',')[0] : 'Nét vẽ người que'}
            </div>
          </div>
        </div>
        
        {/* Personality Text */}
        <div style={{ fontSize: '0.76rem', color: selected ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-muted)', lineHeight: 1.45, flexGrow: 1 }}>
          {char.personality}
        </div>

        {/* Reference Images Small Gallery */}
        {char.images && char.images.length > 0 && (
          <div style={{ 
            display: 'flex', 
            gap: '6px', 
            marginTop: '12px',
            borderTop: selected ? '1px solid rgba(254, 44, 85, 0.15)' : '1px solid rgba(255,255,255,0.04)',
            paddingTop: '8px'
          }}>
            {char.images.map((imgUrl, idx) => (
              <div 
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewImage(imgUrl);
                }}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '6px',
                  backgroundImage: `url(${imgUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: selected ? '1px solid rgba(254, 44, 85, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                  cursor: 'zoom-in',
                  position: 'relative'
                }}
                title="Xem ảnh tham chiếu"
                onMouseEnter={(e) => {
                  const overlay = e.currentTarget.querySelector('.zoom-overlay');
                  if (overlay) overlay.style.display = 'flex';
                }}
                onMouseLeave={(e) => {
                  const overlay = e.currentTarget.querySelector('.zoom-overlay');
                  if (overlay) overlay.style.display = 'none';
                }}
              >
                {/* Zoom glass icon on image hover */}
                <div className="zoom-overlay" style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'none',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '5px'
                }}>
                  <span style={{ fontSize: '0.65rem' }}>🔍</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Role Footer */}
        <div style={{ 
          fontSize: '0.7rem', 
          color: selected ? 'rgba(254, 44, 85, 0.6)' : 'rgba(255,255,255,0.4)', 
          marginTop: '10px', 
          borderTop: char.images && char.images.length > 0 ? 'none' : (selected ? '1px solid rgba(254, 44, 85, 0.12)' : '1px solid rgba(255,255,255,0.04)'), 
          paddingTop: char.images && char.images.length > 0 ? 0 : '6px' 
        }}>
          💡 {char.role ? char.role.split(' — ')[0] : 'Nhân vật phụ'}
        </div>
      </div>
    );
  };

  const renderAddCharacterCard = () => {
    return (
      <button
        type="button"
        onClick={handleOpenAdd}
        className="picker-card"
        style={{
          padding: '14px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed rgba(255, 255, 255, 0.1)',
          background: 'rgba(255,255,255,0.01)',
          minHeight: '140px',
          borderRadius: '12px',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--secondary)';
          e.currentTarget.style.background = 'rgba(37, 244, 238, 0.02)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
        }}
      >
        <span style={{ fontSize: '1.6rem', marginBottom: '8px' }}>👤➕</span>
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>Thêm nhân vật mới</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Tải ảnh và lưu trực tiếp</span>
      </button>
    );
  };
  // Sắp xếp các nhân vật được chọn luôn nổi lên đầu danh sách
  const sortedChars = [...characters]
    .sort((a, b) => {
      const aSelected = (selectedIds || []).includes(a.id) ? 0 : 1;
      const bSelected = (selectedIds || []).includes(b.id) ? 0 : 1;
      return aSelected - bSelected;
    });

  const renderListModal = () => {
    if (!isListModalOpen) return null;

    const modal = (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(5, 4, 10, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div className="glass-card" style={{
          width: '100%',
          maxWidth: '960px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: '12px',
            flexShrink: 0
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <span>👥</span>
              <span>Tất Cả Nhân Vật ({characters.length})</span>
            </h3>
            <button 
              type="button" 
              onClick={() => setIsListModalOpen(false)}
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                border: 'none', 
                color: '#fff', 
                fontSize: '1.3rem', 
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: '0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              ×
            </button>
          </div>

          {/* Scrollable list wrapper */}
          <div className="custom-scrollbar" style={{
            flexGrow: 1,
            overflowY: 'auto',
            paddingRight: '8px',
            paddingBottom: '20px'
          }}>
            {/* List wrapper grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '16px'
            }}>
              {sortedChars.map(char => renderCharacterCard(char))}
            </div>
          </div>
        </div>
      </div>
    );

    if (isMounted) {
      return createPortal(modal, document.body);
    }
    return null;
  };

  const quickChars = sortedChars.slice(0, 5);

  return (
    <div>
      {/* Quick selection grid - max 5 characters + Add button */}
      <div className="picker-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {quickChars.map(char => renderCharacterCard(char))}
        {renderAddCharacterCard()}
      </div>

      {renderLightbox()}
      {renderUploadModal()}
      {renderListModal()}
    </div>
  );
}
