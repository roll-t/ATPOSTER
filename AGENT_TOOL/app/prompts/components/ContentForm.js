'use client';

import { useState } from 'react';
import CharacterPicker from './CharacterPicker.js';
import StylePicker from './StylePicker.js';
import LayoutPicker from './LayoutPicker.js';

const VISIBLE_SUGGESTIONS_COUNT = 5;

function suggestionText(sug) {
  return typeof sug === 'string' ? sug : sug.text;
}

function suggestionPeople(sug) {
  return typeof sug === 'string' ? null : sug.people;
}

function pickRandomSubset(pool, count) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function ContentForm({
  category, activeCategory, currentInput,
  useGemini, setUseGemini, durationRange, setDurationRange,
  onFieldChange, onToggleCharacter,
  errorMsg, isGenerating, onGenerate, onOpenStyleEditor,
  characters = [], onDeleteCustomChar, onUploadChar, onUpdateChar
}) {
  // Mỗi field có suggestions chỉ hiện 1 tập con ngẫu nhiên (thay vì cả danh sách dài) — bấm
  // nút "Gợi ý khác" sẽ đổi sang 1 tập con ngẫu nhiên khác từ cùng kho gợi ý của field đó.
  const [suggestionSubsets, setSuggestionSubsets] = useState({});

  const shuffleSuggestions = (field) => {
    setSuggestionSubsets(prev => ({
      ...prev,
      [field.key]: pickRandomSubset(field.suggestions, VISIBLE_SUGGESTIONS_COUNT)
    }));
  };

  const visibleSuggestions = (field) => {
    return suggestionSubsets[field.key] || field.suggestions.slice(0, VISIBLE_SUGGESTIONS_COUNT);
  };

  const isImageCategory = category.type === 'image';
  // Chủ đề ẢNH chỉ tạo 1 khung hình tĩnh, không có khái niệm kịch bản/phân đoạn Gemini,
  // nên bỏ qua trạng thái useGemini kể cả khi nó còn bật dở từ 1 chủ đề VIDEO trước đó.
  const effectiveUseGemini = !isImageCategory && useGemini;

  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [isCharModalOpen, setIsCharModalOpen] = useState(false);

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '12px', minWidth: 0 }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, whiteSpace: 'nowrap' }}>
          <span style={{ flexShrink: 0 }}>{category.icon}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{category.label}</span>
        </h3>
        {!isImageCategory && activeCategory !== 'stick_figure_slideshow' && (
          <button
            type="button"
            onClick={onOpenStyleEditor}
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '8px', flexShrink: 0, fontWeight: 700 }}
          >
            🎨 Custom Style
          </button>
        )}
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px', lineHeight: 1.45 }}>{category.description}</p>

      {/* AI Toggle & Cấu hình thời lượng — chỉ áp dụng cho chủ đề VIDEO */}
      {!isImageCategory && (
        <div style={{ marginBottom: '24px' }}>
          <div
            className="custom-switch-container"
            onClick={() => setUseGemini(!useGemini)}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                Tự động tạo phân đoạn bằng Gemini
              </span>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                Tự động viết kịch bản & phân chia cảnh slide ảnh tối ưu
              </span>
            </div>
            <label className="custom-switch" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={useGemini}
                onChange={(e) => setUseGemini(e.target.checked)}
              />
              <span className="switch-slider"></span>
            </label>
          </div>

          {useGemini && (
            <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
              <label className="form-label">
                THỜI LƯỢNG MỤC TIÊU CỦA VIDEO
              </label>
              <select
                className="form-control"
                value={durationRange}
                onChange={(e) => setDurationRange(e.target.value)}
              >
                <option value="under_1m">Dưới 1 phút ({activeCategory === 'stick_figure_slideshow' ? '8 - 12 slide ảnh' : '3 - 5 slide'})</option>
                <option value="1_2m">Từ 1 - 2 phút ({activeCategory === 'stick_figure_slideshow' ? '15 - 25 slide ảnh' : '6 - 11 slide'})</option>
                <option value="2_3m">Từ 2 - 3 phút ({activeCategory === 'stick_figure_slideshow' ? '28 - 45 slide ảnh' : '12 - 17 slide'})</option>
                <option value="3_4m">Từ 3 - 4 phút ({activeCategory === 'stick_figure_slideshow' ? '45 - 60 slide ảnh' : '18 - 23 slide'})</option>
              </select>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
        {category.fields.map(field => {
          // Ẩn các trường kịch bản chi tiết thủ công khi bật Gemini AI để làm gọn giao diện
          const isHiddenForGemini = effectiveUseGemini && (
            (activeCategory === 'english_quiz' && ['options', 'correctAnswer', 'explanation'].includes(field.key)) ||
            (['stick_figure', 'stick_figure_slideshow'].includes(activeCategory) && field.key === 'script') ||
            (activeCategory === 'moral_wisdom' && field.key === 'quote')
          );
          if (isHiddenForGemini) return null;

          const isHiddenHairColor = field.key === 'hairColor' && currentInput.imageStyle === 'stick_figure';
          if (isHiddenHairColor) return null;

          return (
            <div className="form-group" key={field.key} style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '12px', minWidth: 0 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                  {field.label}
                  {field.required && <span style={{ color: 'var(--primary)', marginLeft: '4px' }}>*</span>}
                </span>
                {field.type === 'style-select' && (
                  <button
                    type="button"
                    onClick={() => setIsStyleModalOpen(true)}
                    style={{
                      background: 'rgba(37, 244, 238, 0.08)',
                      border: '1px solid rgba(37, 244, 238, 0.2)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      color: 'var(--secondary)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: 700,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(37, 244, 238, 0.15)';
                      e.currentTarget.style.borderColor = 'rgba(37, 244, 238, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(37, 244, 238, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(37, 244, 238, 0.2)';
                    }}
                  >
                    🎨 Xem tất cả (10)
                  </button>
                )}
                {field.type === 'character-select' && (
                  <button
                    type="button"
                    onClick={() => setIsCharModalOpen(true)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      color: '#fff',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: 700,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                  >
                    👤 Xem tất cả ({characters.length})
                  </button>
                )}
              </label>
              
              {field.type === 'character-select' ? (
                <CharacterPicker
                  field={field}
                  selectedIds={currentInput[field.key]}
                  onToggle={onToggleCharacter}
                  characters={characters}
                  onDeleteCustomChar={onDeleteCustomChar}
                  onUploadChar={onUploadChar}
                  onUpdateChar={onUpdateChar}
                  isListModalOpen={isCharModalOpen}
                  setIsListModalOpen={setIsCharModalOpen}
                />
              ) : field.type === 'style-select' ? (
                <StylePicker
                  value={currentInput[field.key]}
                  onChange={(key) => onFieldChange(field.key, key)}
                  isModalOpen={isStyleModalOpen}
                  setIsModalOpen={setIsStyleModalOpen}
                />
              ) : field.type === 'layout-select' ? (
                <LayoutPicker
                  value={currentInput[field.key]}
                  onChange={(key) => onFieldChange(field.key, key)}
                />
              ) : field.type === 'select' ? (
                <select
                  className="form-control"
                  value={currentInput[field.key] || field.defaultValue || ''}
                  onChange={(e) => onFieldChange(field.key, e.target.value)}
                >
                  {field.options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder={field.placeholder}
                  value={currentInput[field.key] || ''}
                  onChange={(e) => onFieldChange(field.key, e.target.value)}
                  style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                />
              ) : (
                <input
                  type="text"
                  className="form-control"
                  placeholder={field.placeholder}
                  value={currentInput[field.key] || ''}
                  onChange={(e) => onFieldChange(field.key, e.target.value)}
                />
              )}
              
              {Array.isArray(field.suggestions) && field.suggestions.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
                  {visibleSuggestions(field).map(sug => {
                    const text = suggestionText(sug);
                    const people = suggestionPeople(sug);
                    const isSelected = currentInput[field.key] === text;
                    return (
                      <button
                        type="button"
                        key={text}
                        onClick={() => onFieldChange(field.key, text)}
                        className={`suggestion-pill ${isSelected ? 'active' : ''}`}
                      >
                        {text}{people ? ` · 👥 ${people}` : ''}
                      </button>
                    );
                  })}
                  {field.suggestions.length > VISIBLE_SUGGESTIONS_COUNT && (
                    <button
                      type="button"
                      onClick={() => shuffleSuggestions(field)}
                      title="Đổi sang gợi ý khác"
                      className="suggestion-pill"
                      style={{
                        background: 'rgba(37, 244, 238, 0.06)',
                        borderColor: 'rgba(37, 244, 238, 0.2)',
                        color: 'var(--secondary)',
                        fontWeight: 700
                      }}
                    >
                      🔄 Đổi gợi ý
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {errorMsg && (
        <div style={{ 
          color: 'var(--danger)', 
          fontSize: '0.85rem', 
          marginBottom: '20px', 
          padding: '12px 14px', 
          background: 'var(--danger-bg)', 
          borderRadius: '10px', 
          border: '1px solid rgba(255, 71, 87, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating}
        className="btn btn-primary"
        style={{ 
          width: '100%', 
          padding: '14px 20px', 
          fontSize: '1rem', 
          fontWeight: 700, 
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin" style={{ width: '18px', height: '18px', flexShrink: 0, color: '#fff' }} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>
              {effectiveUseGemini ? 'Gemini AI đang lập kịch bản...' : (isImageCategory ? 'Đang tạo prompt ảnh...' : 'Đang tạo prompt video...')}
            </span>
          </>
        ) : (
          <>
            {effectiveUseGemini ? '✨' : (isImageCategory ? '🖼️' : '🎬')}
            <span>
              {effectiveUseGemini ? 'Tạo kịch bản phân đoạn với Gemini' : (isImageCategory ? 'Tạo Prompt Ảnh Tham Chiếu' : 'Tạo Prompt Video')}
            </span>
          </>
        )}
      </button>
    </div>
  );
}
