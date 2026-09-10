'use client';

import { useState, useEffect, useRef } from 'react';
import CharacterPicker from './CharacterPicker.js';
import SyllabusModal from './SyllabusModal.js';
import MoralSyllabusModal from './MoralSyllabusModal.js';
import BuddhistSyllabusModal from './BuddhistSyllabusModal.js';
import JapaneseHistorySyllabusModal from './JapaneseHistorySyllabusModal.js';
import { JAPANESE_HISTORY_SYLLABUS } from '@/src/domain/content/japaneseHistorySyllabus.js';
import StickFigureLongFormModal from './StickFigureLongFormModal.js';
import { STICK_FIGURE_LONGFORM_GROUPS } from '@/src/domain/content/stickFigureLongFormTopics.js';
import { MORAL_SYLLABUS } from '@/src/domain/content/moralSyllabus.js';
import { isBookMoralTheme } from '@/src/domain/content/moralThemes.js';
import { BUDDHIST_SYLLABUS } from '@/src/domain/content/buddhistSyllabus.js';
import { getBuddhistDurationOptions } from '@/src/domain/prompt-templates/gemini/buddhistWisdom.js';
import LevelPicker from './LevelPicker.js';
import MoralThemePicker from './MoralThemePicker.js';
import BuddhistThemePicker from './BuddhistThemePicker.js';
import JapaneseHistoryThemePicker from './JapaneseHistoryThemePicker.js';
import StickFigureThemePicker from './StickFigureThemePicker.js';

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

function findJapaneseHistoryThemeForTopic(text) {
  if (!text) return '';
  const lower = text.toLowerCase().trim();
  for (const [themeKey, topics] of Object.entries(JAPANESE_HISTORY_SYLLABUS)) {
    for (const t of topics) {
      if (!t.text) continue;
      const full = `${t.text} (${t.vi || ''})`.toLowerCase();
      if (lower === full || lower === t.text.toLowerCase() || (t.vi && lower === t.vi.toLowerCase()) || lower.includes(t.text.toLowerCase())) {
        return themeKey;
      }
    }
  }
  return '';
}

function findBuddhistThemeForTopic(text) {
  if (!text) return '';
  const lower = text.toLowerCase().trim();
  for (const [themeKey, topics] of Object.entries(BUDDHIST_SYLLABUS)) {
    for (const t of topics) {
      if (!t.text) continue;
      const full = `${t.text} (${t.vi || ''})`.toLowerCase();
      if (lower === full || lower === t.text.toLowerCase() || (t.vi && lower === t.vi.toLowerCase()) || lower.includes(t.text.toLowerCase())) {
        return themeKey;
      }
    }
  }
  return '';
}

function findMoralThemeForTopic(text) {
  if (!text) return '';
  const lower = text.toLowerCase().trim();
  for (const [themeKey, topics] of Object.entries(MORAL_SYLLABUS)) {
    for (const t of topics) {
      if (!t.text) continue;
      if (lower === t.text.toLowerCase() || lower.includes(t.text.toLowerCase())) {
        return themeKey;
      }
    }
  }
  return '';
}

function findStickFigureThemeForTopic(text) {
  if (!text) return '';
  const lower = text.toLowerCase().trim();
  for (const group of STICK_FIGURE_LONGFORM_GROUPS) {
    for (const t of group.topics || []) {
      if (!t.text && !t.desc) continue;
      const full = `${t.desc || ''} (${t.text || ''})`.toLowerCase();
      if (
        lower === full ||
        (t.text && (lower === t.text.toLowerCase() || lower.includes(t.text.toLowerCase()))) ||
        (t.desc && (lower === t.desc.toLowerCase() || lower.includes(t.desc.toLowerCase())))
      ) {
        return group.key;
      }
    }
  }
  return '';
}

export default function ContentForm({
  category, activeCategory, currentInput,
  useGemini, setUseGemini, durationRange, setDurationRange,
  onFieldChange, onToggleCharacter,
  errorMsg, isGenerating, onGenerate,
  characters = [], onDeleteCustomChar, onUploadChar, onUpdateChar,
  history = []
}) {
  const [suggestionSubsets, setSuggestionSubsets] = useState({});
  const [dynamicSuggestions, setDynamicSuggestions] = useState({});
  const [loadingSuggestions, setLoadingSuggestions] = useState({});

  // Danh sách các kịch bản đã từng tạo trong lịch sử để loại trừ không cho hiển thị lại
  const usedScenariosSet = new Set(
    (history || [])
      .map(item => (item.input?.scenario || item.title || '').trim().toLowerCase())
      .filter(Boolean)
  );

  // Các category có mốc "video dài" (4-6/6-8/8-10/10-15/15-20 phút) — đều là skill dựng bằng Remotion.
  const LONG_FORM_CATEGORIES = ['moral_talk_slideshow', 'stick_figure_slideshow', 'pexels_talk_video', 'buddhist_wisdom', 'japanese_history'];

  // Trong số đó, category CHỈ cho phép mốc dài ở Dạng ngang 16:9: khung dọc 9:16 vốn để lướt nhanh
  // trên điện thoại, video 8-10 phút ở khung đó là sai mục đích sử dụng. Cố ý chỉ áp cho
  // pexels_talk_video — các skill còn lại đã chạy mốc dài ở cả 2 khung từ trước.
  const LONG_FORM_LANDSCAPE_ONLY = ['pexels_talk_video'];

  const isLandscapeInput = (currentInput['aspectRatio'] || '9:16') === '16:9';
  const supportsLongForm =
    LONG_FORM_CATEGORIES.includes(activeCategory)
    && (!LONG_FORM_LANDSCAPE_ONLY.includes(activeCategory) || isLandscapeInput);

  // Reset durationRange về mặc định khi mốc "video dài" đang chọn không còn hợp lệ — đổi sang
  // category không hỗ trợ, HOẶC chuyển từ khung ngang về khung dọc ở skill chỉ cho khung ngang.
  useEffect(() => {
    const isLongTier = ['4_6m', '6_8m', '8_10m', '10_15m', '15_20m'].includes(durationRange);
    if (isLongTier && !supportsLongForm) {
      setDurationRange('under_1m');
    }
  }, [activeCategory, durationRange, supportsLongForm]);

  // Set default duration for buddhist_wisdom to 8_10m on category select
  useEffect(() => {
    if (['buddhist_wisdom', 'japanese_history'].includes(activeCategory) && !['4_6m', '6_8m', '8_10m', '10_15m', '15_20m'].includes(durationRange)) {
      setDurationRange('8_10m');
    }
  }, [activeCategory]);

  const handlePickRandomTopic = (fieldKey) => {
    let pool = [];
    if (activeCategory === 'stick_figure_slideshow') {
      for (const g of STICK_FIGURE_LONGFORM_GROUPS) {
        for (const t of (g.topics || [])) {
          if (t.desc) pool.push(`${t.desc} (${t.text || ''})`);
          else if (t.text) pool.push(t.text);
        }
      }
    }
    if (pool.length === 0) {
      pool = [
        'Thói quen trì hoãn ở học sinh, sinh viên và cách chữa bằng quy tắc 2 phút',
        'Hội chứng FOMO và lý do chúng ta không thể ngừng lướt mạng xã hội',
        'Hiệu ứng Dunning-Kruger: Vì sao người biết ít lại tự tin nhất?',
        'Quy luật 80/20 (Pareto) để làm ít hơn nhưng đạt kết quả gấp đôi',
        'Dopamine Detox: Cách lấy lại sự tập trung trong thế giới đầy cám dỗ',
        'Nghịch lý của sự lựa chọn: Càng nhiều lựa chọn, con người càng ít hạnh phúc',
        'Tâm lý bầy đàn và cách mạng xã hội điều khiển suy nghĩ của đám đông',
        'Quy tắc 5 giây của Mel Robbins để chiến thắng sự lười biếng tức thì'
      ];
    }
    const filteredPool = pool.filter(p => !usedScenariosSet.has(p.trim().toLowerCase()));
    const finalPool = filteredPool.length > 0 ? filteredPool : pool;
    const randomItem = finalPool[Math.floor(Math.random() * finalPool.length)];
    onFieldChange(fieldKey, randomItem);
  };

  // Reset suggestions for moral_talk_slideshow / pexels_talk_video when theme changes
  useEffect(() => {
    if (['moral_talk_slideshow', 'pexels_talk_video'].includes(activeCategory)) {
      setDynamicSuggestions(prev => ({ ...prev, scenario: [] }));
      setSuggestionSubsets(prev => {
        const themeKey = currentInput.moralTheme || 'self_help';
        const pool = MORAL_SYLLABUS[themeKey] || [];
        return {
          ...prev,
          scenario: pickRandomSubset(pool, VISIBLE_SUGGESTIONS_COUNT)
        };
      });
    }
  }, [currentInput.moralTheme, activeCategory]);

  // Reset suggestions for buddhist_wisdom when theme changes
  useEffect(() => {
    if (activeCategory === 'buddhist_wisdom') {
      setDynamicSuggestions(prev => ({ ...prev, scenario: [] }));
      setSuggestionSubsets(prev => {
        const themeKey = currentInput.buddhistTheme || 'zen_stories';
        const pool = (BUDDHIST_SYLLABUS[themeKey] || []).map(t => `${t.text} (${t.vi})`);
        return {
          ...prev,
          scenario: pickRandomSubset(pool, VISIBLE_SUGGESTIONS_COUNT)
        };
      });
    }
  }, [currentInput.buddhistTheme, activeCategory]);

  // Reset suggestions for stick_figure_slideshow when theme group changes
  useEffect(() => {
    if (activeCategory === 'stick_figure_slideshow') {
      setDynamicSuggestions(prev => ({ ...prev, scenario: [] }));
      setSuggestionSubsets(prev => {
        const themeKey = currentInput.stickFigureTheme || STICK_FIGURE_LONGFORM_GROUPS[0].key;
        const group = STICK_FIGURE_LONGFORM_GROUPS.find(g => g.key === themeKey);
        const pool = group ? group.topics.map(t => `${t.desc} (${t.text})`) : [];
        return {
          ...prev,
          scenario: pickRandomSubset(pool, VISIBLE_SUGGESTIONS_COUNT)
        };
      });
    }
  }, [currentInput.stickFigureTheme, activeCategory]);

  const shuffleSuggestions = (field) => {
    let pool = field.suggestions || [];
    if (['moral_talk_slideshow', 'pexels_talk_video'].includes(activeCategory) && field.key === 'scenario') {
      const themeKey = currentInput.moralTheme || 'self_help';
      pool = MORAL_SYLLABUS[themeKey] || [];
    } else if (activeCategory === 'buddhist_wisdom' && field.key === 'scenario') {
      const themeKey = currentInput.buddhistTheme || 'zen_stories';
      pool = (BUDDHIST_SYLLABUS[themeKey] || []).map(t => `${t.text} (${t.vi})`);
    } else if (activeCategory === 'stick_figure_slideshow' && field.key === 'scenario') {
      const themeKey = currentInput.stickFigureTheme || STICK_FIGURE_LONGFORM_GROUPS[0].key;
      const group = STICK_FIGURE_LONGFORM_GROUPS.find(g => g.key === themeKey);
      pool = group ? group.topics.map(t => `${t.desc} (${t.text})`) : [];
    }
    setSuggestionSubsets(prev => ({
      ...prev,
      [field.key]: pickRandomSubset(pool, VISIBLE_SUGGESTIONS_COUNT)
    }));
  };

  const fetchMoreSuggestions = async (field) => {
    setLoadingSuggestions(prev => ({ ...prev, [field.key]: true }));
    try {
      let currentList = dynamicSuggestions[field.key] || [];
      if (currentList.length === 0) {
        if (['moral_talk_slideshow', 'pexels_talk_video'].includes(activeCategory) && field.key === 'scenario') {
          const themeKey = currentInput.moralTheme || 'self_help';
          currentList = MORAL_SYLLABUS[themeKey] || [];
        } else {
          currentList = field.suggestions || [];
        }
      }
      const res = await fetch('/api/prompts/generate-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryKey: activeCategory,
          fieldKey: field.key,
          existingSuggestions: currentList.map(suggestionText),
          usedScenarios: Array.from(usedScenariosSet)
        })
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setDynamicSuggestions(prev => ({
          ...prev,
          [field.key]: data.suggestions
        }));
      } else {
        shuffleSuggestions(field);
      }
    } catch (err) {
      console.error('Lỗi sinh gợi ý với Gemini:', err);
      shuffleSuggestions(field);
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [field.key]: false }));
    }
  };

  const visibleSuggestions = (field) => {
    let rawList = dynamicSuggestions[field.key] || suggestionSubsets[field.key];
    if (!rawList || rawList.length === 0) {
      if (['moral_talk_slideshow', 'pexels_talk_video'].includes(activeCategory) && field.key === 'scenario') {
        const themeKey = currentInput.moralTheme || 'self_help';
        rawList = MORAL_SYLLABUS[themeKey] || [];
      } else if (activeCategory === 'buddhist_wisdom' && field.key === 'scenario') {
        const themeKey = currentInput.buddhistTheme || 'zen_stories';
        rawList = (BUDDHIST_SYLLABUS[themeKey] || []).map(t => `${t.text} (${t.vi})`);
      } else if (activeCategory === 'stick_figure_slideshow' && field.key === 'scenario') {
        const themeKey = currentInput.stickFigureTheme || STICK_FIGURE_LONGFORM_GROUPS[0].key;
        const group = STICK_FIGURE_LONGFORM_GROUPS.find(g => g.key === themeKey);
        rawList = group ? group.topics.map(t => `${t.desc} (${t.text})`) : [];
      } else {
        rawList = field.suggestions || [];
      }
    }

    // Lọc loại bỏ hoàn toàn các kịch bản đã từng được tạo trong lịch sử
    const filtered = rawList.filter(sug => {
      const text = suggestionText(sug).trim().toLowerCase();
      return !usedScenariosSet.has(text);
    });

    return filtered.slice(0, VISIBLE_SUGGESTIONS_COUNT);
  };

  const isImageCategory = category.type === 'image';
  // Chủ đề ẢNH chỉ tạo 1 khung hình tĩnh, không có khái niệm kịch bản/phân đoạn Gemini,
  // nên bỏ qua trạng thái useGemini kể cả khi nó còn bật dở từ 1 chủ đề VIDEO trước đó.
  const effectiveUseGemini = !isImageCategory && useGemini;

  const [isCharModalOpen, setIsCharModalOpen] = useState(false);
  const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false);
  const [isBuddhistModalOpen, setIsBuddhistModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isLongFormTopicsOpen, setIsLongFormTopicsOpen] = useState(false);

  const [historyModalTheme, setHistoryModalTheme] = useState(
    currentInput.historyTheme || 'japan_history'
  );
  const [buddhistModalTheme, setBuddhistModalTheme] = useState(
    currentInput.buddhistTheme || 'zen_stories'
  );
  const [moralModalTheme, setMoralModalTheme] = useState(
    currentInput.moralTheme || 'self_help'
  );
  const [stickFigureModalGroup, setStickFigureModalGroup] = useState(
    currentInput.stickFigureTheme || STICK_FIGURE_LONGFORM_GROUPS[0].key
  );

  const activeHistoryTheme = currentInput.scenario?.trim()
    ? (currentInput.historyTheme || findJapaneseHistoryThemeForTopic(currentInput.syllabusTopic || currentInput.scenario) || '')
    : '';

  const activeBuddhistTheme = currentInput.scenario?.trim()
    ? (currentInput.buddhistTheme || findBuddhistThemeForTopic(currentInput.syllabusTopic || currentInput.scenario) || '')
    : '';

  const activeMoralTheme = currentInput.scenario?.trim()
    ? (currentInput.moralTheme || findMoralThemeForTopic(currentInput.syllabusTopic || currentInput.scenario) || '')
    : '';

  const activeStickFigureTheme = currentInput.scenario?.trim()
    ? (currentInput.stickFigureTheme || findStickFigureThemeForTopic(currentInput.syllabusTopic || currentInput.scenario) || '')
    : '';

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      {/* 1. Chọn Dạng Video (Tỉ lệ 9:16 / 16:9) dạng 2 Option Card ở trên cùng */}
      {category.fields.some(f => f.key === 'aspectRatio') && (
        <div style={{ marginBottom: '24px' }}>
          <label className="form-label" style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 700, marginBottom: '10px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Dạng Video
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {(() => {
              const is916 = (currentInput['aspectRatio'] || '9:16') === '9:16';
              return (
                <button
                  type="button"
                  onClick={() => onFieldChange('aspectRatio', '9:16')}
                  style={{
                    position: 'relative',
                    padding: '14px 12px',
                    borderRadius: '12px',
                    border: is916 ? '1.5px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: is916
                      ? 'linear-gradient(135deg, rgba(254, 44, 85, 0.18) 0%, rgba(20, 15, 26, 0.9) 100%)'
                      : 'rgba(255, 255, 255, 0.03)',
                    boxShadow: is916 ? '0 4px 18px rgba(254, 44, 85, 0.28)' : 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    if (!is916) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    if (!is916) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  {is916 && (
                    <span style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'var(--primary)',
                      color: '#fff',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      fontSize: '0.68rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800
                    }}>
                      ✓
                    </span>
                  )}
                  {/* Visual 9:16 frame preview */}
                  <div style={{
                    width: '18px',
                    height: '30px',
                    border: `2px solid ${is916 ? 'var(--primary)' : 'rgba(255,255,255,0.4)'}`,
                    borderRadius: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '2px',
                    boxShadow: is916 ? '0 0 8px rgba(254, 44, 85, 0.4)' : 'none'
                  }}>
                    <div style={{ width: '6px', height: '1.5px', background: is916 ? 'var(--primary)' : 'rgba(255,255,255,0.4)', borderRadius: '1px' }}></div>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: is916 ? 'var(--primary)' : 'rgba(255,255,255,0.4)' }}></div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', letterSpacing: '-0.2px' }}>Dạng TikTok thẳng</div>
                    <div style={{ fontSize: '0.72rem', color: is916 ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)' }}>Màn dọc 9:16</div>
                  </div>
                </button>
              );
            })()}

            {(() => {
              const is169 = currentInput['aspectRatio'] === '16:9';
              return (
                <button
                  type="button"
                  onClick={() => onFieldChange('aspectRatio', '16:9')}
                  style={{
                    position: 'relative',
                    padding: '14px 12px',
                    borderRadius: '12px',
                    border: is169 ? '1.5px solid var(--secondary)' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: is169
                      ? 'linear-gradient(135deg, rgba(37, 244, 238, 0.18) 0%, rgba(15, 20, 30, 0.9) 100%)'
                      : 'rgba(255, 255, 255, 0.03)',
                    boxShadow: is169 ? '0 4px 18px rgba(37, 244, 238, 0.28)' : 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    if (!is169) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    if (!is169) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  {is169 && (
                    <span style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'var(--secondary)',
                      color: '#000',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      fontSize: '0.68rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800
                    }}>
                      ✓
                    </span>
                  )}
                  {/* Visual 16:9 frame preview */}
                  <div style={{
                    width: '32px',
                    height: '20px',
                    border: `2px solid ${is169 ? 'var(--secondary)' : 'rgba(255,255,255,0.4)'}`,
                    borderRadius: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxShadow: is169 ? '0 0 8px rgba(37, 244, 238, 0.4)' : 'none'
                  }}>
                    <div style={{ width: '10px', height: '1.5px', background: is169 ? 'var(--secondary)' : 'rgba(255,255,255,0.4)', borderRadius: '1px' }}></div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', letterSpacing: '-0.2px' }}>Dạng ngang video</div>
                    <div style={{ fontSize: '0.72rem', color: is169 ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)' }}>Màn ngang 16:9</div>
                  </div>
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* Cấu hình thời lượng — chỉ áp dụng cho chủ đề VIDEO */}
      {!isImageCategory && (
        <div style={{ marginBottom: '24px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 700, marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Thời lượng mục tiêu của video
            </label>
            <select
              className="form-control"
              value={durationRange}
              onChange={(e) => setDurationRange(e.target.value)}
            >
              {['buddhist_wisdom', 'japanese_history'].includes(activeCategory) ? (
                <>
                  {/* Nhãn SINH RA từ DURATION_TARGETS trong templates/buddhistWisdom.js, không gõ
                      tay: bản trước gõ tay và đã lệch hẳn khỏi thực tế sau hai lần đổi thông số. */}
                  {getBuddhistDurationOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </>
              ) : activeCategory === 'stick_figure_slideshow' ? (
                <>
                  <option value="under_1m">Dưới 1 phút (20 - 25 ảnh, 2-3s/ảnh)</option>
                  <option value="1_2m">Từ 1 - 2 phút (35 - 48 ảnh)</option>
                  <option value="2_3m">Từ 2 - 3 phút (50 - 70 ảnh)</option>
                  <option value="3_4m">Từ 3 - 4 phút (70 - 95 ảnh)</option>
                  <option value="4_6m">Từ 4 - 6 phút (100 - 140 ảnh)</option>
                  <option value="6_8m">Từ 6 - 8 phút (140 - 190 ảnh)</option>
                  <option value="8_10m">Từ 8 - 10 phút (190 - 250 ảnh)</option>
                </>
              ) : (
                <>
                  <option value="under_1m">Dưới 1 phút ({activeCategory === 'moral_talk_slideshow' ? '16 - 22 slide pictogram, 3-4s/ảnh' : activeCategory === 'reading_practice' ? '1 trang, đoạn văn ngắn' : '3 - 5 slide'})</option>
                  <option value="1_2m">Từ 1 - 2 phút ({activeCategory === 'moral_talk_slideshow' ? '26 - 36 slide pictogram, 3-4s/ảnh' : activeCategory === 'reading_practice' ? '1 trang, đoạn văn vừa' : '6 - 11 slide'})</option>
                  <option value="2_3m">Từ 2 - 3 phút ({activeCategory === 'moral_talk_slideshow' ? '42 - 56 slide pictogram, 3-4s/ảnh' : activeCategory === 'reading_practice' ? '1 trang, đoạn văn dài' : '12 - 17 slide'})</option>
                  <option value="3_4m">Từ 3 - 4 phút ({activeCategory === 'moral_talk_slideshow' ? '60 - 80 slide pictogram, 3-4s/ảnh' : activeCategory === 'reading_practice' ? '1 trang, đoạn văn rất dài' : '18 - 23 slide'})</option>
                  {supportsLongForm && (
                    <optgroup label="🎬 Video dài">
                      <option value="4_6m">Từ 4 - 6 phút ({activeCategory === 'moral_talk_slideshow' ? '80 - 105 slide pictogram' : activeCategory === 'pexels_talk_video' ? '14 - 17 đoạn kể' : '35 - 48 slide'})</option>
                      <option value="6_8m">Từ 6 - 8 phút ({activeCategory === 'moral_talk_slideshow' ? '115 - 145 slide pictogram' : activeCategory === 'pexels_talk_video' ? '20 - 24 đoạn kể' : '48 - 65 slide'})</option>
                      <option value="8_10m">Từ 8 - 10 phút ({activeCategory === 'moral_talk_slideshow' ? '150 - 180 slide pictogram' : activeCategory === 'pexels_talk_video' ? '26 - 31 đoạn kể' : '60 - 82 slide'})</option>
                      {/* 10-15 phút và 15-20 phút CỐ Ý chỉ có ở nhánh buddhist_wisdom bên trên.
                          Template của các skill còn lại (moralTalkSlideshow, imageSlideshow,
                          pexelsTalkVideo) chưa khai số slide cho 2 mốc này, chọn vào là rơi
                          xuống nhánh mặc định — moral_talk_slideshow sẽ xin Gemini đúng 10-14
                          slide cho một video 15 phút, mà không báo lỗi gì cả. */}
                    </optgroup>
                  )}
                </>
              )}
            </select>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
        {category.fields.map(field => {
          // aspectRatio đã hiển thị dạng option card ở trên cùng
          if (field.key === 'aspectRatio') return null;
          // Ẩn các trường kịch bản chi tiết thủ công khi bật Gemini AI để làm gọn giao diện
          const isHiddenForGemini = effectiveUseGemini && (
            (activeCategory === 'english_quiz' && ['options', 'correctAnswer', 'explanation'].includes(field.key)) ||
            (['stick_figure', 'stick_figure_slideshow', 'moral_talk_slideshow', 'reading_practice', 'buddhist_wisdom', 'japanese_history'].includes(activeCategory) && field.key === 'script') ||
            (activeCategory === 'moral_wisdom' && field.key === 'quote')
          );
          if (isHiddenForGemini) return null;

          const isHiddenHairColor = field.key === 'hairColor' && currentInput.imageStyle === 'stick_figure';
          if (isHiddenHairColor) return null;

          const isBookTheme = activeCategory === 'moral_talk_slideshow' && isBookMoralTheme(currentInput.moralTheme);
          const displayFieldLabel = (isBookTheme && field.key === 'scenario')
            ? '📖 Tên Sách & Vấn Đề Muốn Giải Quyết (Để Bán Sách)'
            : field.label;
          const displayFieldPlaceholder = (isBookTheme && field.key === 'scenario')
            ? 'VD: Cuốn sách Atomic Habits — Nói về người luôn trì hoãn, thất bại khi tạo thói quen, sách dạy quy tắc 2 phút và gom thói quen để kỷ luật mỗi ngày...'
            : field.placeholder;

          return (
            <div className="form-group" key={field.key} style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '12px', minWidth: 0 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                  {displayFieldLabel}
                  {field.required && <span style={{ color: 'var(--primary)', marginLeft: '4px' }}>*</span>}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {(field.key === 'scenario' || field.type === 'textarea') && (
                    <button
                      type="button"
                      onClick={() => handlePickRandomTopic(field.key)}
                      title="Bốc ngẫu nhiên một chủ đề gợi ý hấp dẫn từ kho ý tưởng"
                      style={{
                        background: 'linear-gradient(135deg, rgba(254, 44, 85, 0.12), rgba(168, 85, 247, 0.15))',
                        border: '1px solid rgba(254, 44, 85, 0.28)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        color: '#ff758c',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(254, 44, 85, 0.22), rgba(168, 85, 247, 0.25))';
                        e.currentTarget.style.borderColor = 'rgba(254, 44, 85, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(254, 44, 85, 0.12), rgba(168, 85, 247, 0.15))';
                        e.currentTarget.style.borderColor = 'rgba(254, 44, 85, 0.28)';
                      }}
                    >
                      <span>🎲</span>
                      <span>Gợi ý ngẫu nhiên</span>
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
                </div>
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
              ) : field.key === 'level' ? (
                <LevelPicker
                  field={field}
                  value={currentInput[field.key]}
                  onChange={(val) => onFieldChange(field.key, val)}
                  onSelect={(val) => {
                    onFieldChange(field.key, val);
                    setIsSyllabusModalOpen(true);
                  }}
                />
              ) : field.type === 'moral-theme-select' ? (
                <MoralThemePicker
                  value={activeMoralTheme}
                  onChange={(val) => {
                    setMoralModalTheme(val);
                  }}
                  onSelect={(val) => {
                    setMoralModalTheme(val);
                    setIsSyllabusModalOpen(true);
                  }}
                  themeKeys={field.themeKeys}
                />
              ) : field.type === 'buddhist-theme-select' ? (
                <BuddhistThemePicker
                  value={activeBuddhistTheme}
                  onChange={(val) => {
                    setBuddhistModalTheme(val);
                    setIsBuddhistModalOpen(true);
                  }}
                  onSelect={(val) => {
                    setBuddhistModalTheme(val);
                    setIsBuddhistModalOpen(true);
                  }}
                />
              ) : field.type === 'japanese-history-theme-select' ? (
                <JapaneseHistoryThemePicker
                  value={activeHistoryTheme}
                  onChange={(val) => {
                    setHistoryModalTheme(val);
                    setIsHistoryModalOpen(true);
                  }}
                  onSelect={(val) => {
                    setHistoryModalTheme(val);
                    setIsHistoryModalOpen(true);
                  }}
                />
              ) : field.type === 'stick-figure-theme-select' ? (
                <StickFigureThemePicker
                  value={activeStickFigureTheme}
                  onChange={(val) => {
                    setStickFigureModalGroup(val);
                    setIsLongFormTopicsOpen(true);
                  }}
                  onSelect={(val) => {
                    setStickFigureModalGroup(val);
                    setIsLongFormTopicsOpen(true);
                  }}
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
                  placeholder={displayFieldPlaceholder}
                  value={currentInput[field.key] || ''}
                  onChange={(e) => onFieldChange(field.key, e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      if (!isGenerating) onGenerate();
                    }
                  }}
                  style={{
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: 1.55,
                    background: 'rgba(15, 14, 25, 0.8)',
                    borderColor: 'rgba(255, 255, 255, 0.12)'
                  }}
                />
              ) : (
                <input
                  type="text"
                  className="form-control"
                  placeholder={displayFieldPlaceholder}
                  value={currentInput[field.key] || ''}
                  onChange={(e) => onFieldChange(field.key, e.target.value)}
                />
              )}

              {((
                (Array.isArray(field.suggestions) && field.suggestions.length > 0 && activeCategory !== 'moral_talk_slideshow' && activeCategory !== 'stick_figure_slideshow' && activeCategory !== 'reading_practice' && activeCategory !== 'buddhist_wisdom')
              ) && (
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
                    {activeCategory !== 'stick_figure_slideshow' && (
                      <button
                        type="button"
                        onClick={() => fetchMoreSuggestions(field)}
                        disabled={loadingSuggestions[field.key]}
                        title="Tạo gợi ý chủ đề mới bằng Gemini AI (tự động lọc bỏ các kịch bản đã từng tạo)"
                        className="suggestion-pill"
                        style={{
                          background: 'rgba(37, 244, 238, 0.08)',
                          borderColor: 'rgba(37, 244, 238, 0.25)',
                          color: 'var(--secondary)',
                          fontWeight: 700,
                          cursor: loadingSuggestions[field.key] ? 'wait' : 'pointer'
                        }}
                      >
                        {loadingSuggestions[field.key] ? '⏳ Gemini đang gợi ý...' : '🔄 Đổi gợi ý (Gemini AI)'}
                      </button>
                    )}
                  </div>
                ))}
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

      <div style={{
        position: 'sticky',
        bottom: '0px',
        padding: '12px 0 0 0',
        background: 'linear-gradient(to top, rgba(19, 17, 32, 0.98) 75%, rgba(19, 17, 32, 0) 100%)',
        zIndex: 5
      }}>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '14px 20px',
            fontSize: '0.96rem',
            fontWeight: 800,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #fe2c55 0%, #a855f7 100%)',
            boxShadow: '0 4px 18px rgba(254, 44, 85, 0.35)',
            border: 'none',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            letterSpacing: '-0.2px'
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
              <span>{effectiveUseGemini ? '✨' : (isImageCategory ? '🖼️' : '🎬')}</span>
              <span>
                {effectiveUseGemini ? 'Tạo kịch bản phân đoạn với Gemini' : (isImageCategory ? 'Tạo Prompt Ảnh Tham Chiếu' : 'Tạo Prompt Video')}
              </span>
              <kbd style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '5px',
                padding: '2px 6px',
                fontSize: '0.68rem',
                color: 'rgba(255,255,255,0.9)',
                fontWeight: 600,
                marginLeft: '4px'
              }}>
                Ctrl + ↵
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Modal Lộ trình học 50 bài cho mỗi Level (chỉ áp dụng cho skill Luyện Đọc Tiếng Anh) */}
      {activeCategory === 'reading_practice' && (
        <SyllabusModal
          isOpen={isSyllabusModalOpen}
          onClose={() => setIsSyllabusModalOpen(false)}
          currentLevel={currentInput.level || 'a2'}
          onSelectTopic={(topicText) => onFieldChange('scenario', topicText)}
          history={history}
        />
      )}

      {/* Modal Lộ trình 50 chủ đề cho mỗi nhóm (áp dụng cho Nói Chuyện Đạo Lý + Video Tâm Sự) */}
      {['moral_talk_slideshow', 'pexels_talk_video'].includes(activeCategory) && (
        <MoralSyllabusModal
          isOpen={isSyllabusModalOpen}
          onClose={() => setIsSyllabusModalOpen(false)}
          currentTheme={moralModalTheme || activeMoralTheme || 'self_help'}
          onSelectTopic={(topicText) => {
            onFieldChange('scenario', topicText);
            onFieldChange('syllabusTopic', topicText);
            onFieldChange('moralTheme', moralModalTheme || 'self_help');
          }}
          history={history}
        />
      )}

      {/* Modal Kho Chủ Đề & Chuyện Thiền Phật Giáo */}
      {activeCategory === 'buddhist_wisdom' && (
        <BuddhistSyllabusModal
          isOpen={isBuddhistModalOpen}
          onClose={() => setIsBuddhistModalOpen(false)}
          currentTheme={buddhistModalTheme || activeBuddhistTheme || 'zen_stories'}
          onSelectTopic={(topicText) => {
            onFieldChange('scenario', topicText);
            onFieldChange('syllabusTopic', topicText);
            onFieldChange('buddhistTheme', buddhistModalTheme || 'zen_stories');
          }}
          history={history}
        />
      )}

      {/* Kho chủ đề Lịch Sử Nhật Bản — mỗi bài kèm niên đại và mức độ tin cậy sử liệu */}
      {activeCategory === 'japanese_history' && (
        <JapaneseHistorySyllabusModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          currentTheme={historyModalTheme || activeHistoryTheme || 'japan_history'}
          onSelectTopic={(topicText) => {
            onFieldChange('scenario', topicText);
            onFieldChange('syllabusTopic', topicText);
            onFieldChange('historyTheme', historyModalTheme || 'japan_history');
          }}
          history={history}
        />
      )}

      {/* Kho chủ đề Video Dài (áp dụng cho skill Người Que) */}
      {activeCategory === 'stick_figure_slideshow' && (
        <StickFigureLongFormModal
          isOpen={isLongFormTopicsOpen}
          onClose={() => setIsLongFormTopicsOpen(false)}
          currentGroup={stickFigureModalGroup || activeStickFigureTheme || STICK_FIGURE_LONGFORM_GROUPS[0].key}
          onSelectTopic={(topicText) => {
            onFieldChange('scenario', topicText);
            onFieldChange('syllabusTopic', topicText);
            onFieldChange('stickFigureTheme', stickFigureModalGroup || STICK_FIGURE_LONGFORM_GROUPS[0].key);
          }}
          history={history}
        />
      )}
    </div>
  );
}
