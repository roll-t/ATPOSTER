'use client';

import { useState, useEffect } from 'react';
import { PROMPT_CATEGORIES, IMAGE_STYLES } from '@/lib/prompts/index.js';

const categoryKeys = Object.keys(PROMPT_CATEGORIES);
const promptTypes = ['video', 'image'];

function categoryKeysForType(type) {
  return categoryKeys.filter(k => (PROMPT_CATEGORIES[k].type || 'video') === type);
}

function emptyInputFor(categoryKey) {
  const fields = PROMPT_CATEGORIES[categoryKey].fields;
  const obj = {};
  fields.forEach(f => {
    if (f.type === 'character-select') {
      // Mặc định chọn sẵn cặp nhân vật chính quen thuộc nhất để bắt đầu nhanh hơn,
      // nhưng không vượt quá maxSelect của field (vd field chỉ cho chọn 1 nhân vật)
      obj[f.key] = ['alex', 'mia'].slice(0, Math.min(2, f.maxSelect || 3));
    } else if (f.type === 'style-select') {
      // Mặc định chọn sẵn phong cách đầu tiên trong danh mục (Người Que) để bắt đầu nhanh hơn
      obj[f.key] = Object.keys(IMAGE_STYLES)[0] || '';
    } else if (f.type === 'layout-select') {
      obj[f.key] = 'front_facing';
    } else if (f.type === 'select') {
      obj[f.key] = f.defaultValue || '';
    } else {
      obj[f.key] = f.defaultValue !== undefined ? f.defaultValue : '';
    }
  });
  return obj;
}

// Các từ nối/mạo từ tiếng Anh phổ biến, ít mang nghĩa -> bỏ bớt để tên thư mục ngắn gọn, dễ đọc
const FOLDER_NAME_STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or', 'but',
  'is', 'are', 'was', 'were', 'this', 'that', 'these', 'those', 'with', 'about',
  'into', 'your', 'you', 'it', 'its', 'be', 'being', 'been', 'as', 'by', 'from'
]);

function generateDefaultFolderName(scenario) {
  if (!scenario) return '';
  const normalized = scenario
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s_-]/g, '')
    .trim();

  const allWords = normalized.split(/\s+/).filter(Boolean);
  // Ưu tiên các từ có nghĩa (bỏ bớt liên từ/mạo từ ngắn) để dù nhập câu dài, tên thư mục
  // vẫn ngắn gọn và dễ nhận diện, thay vì bị cắt cụt giữa chừng 1 từ theo số ký tự thô
  const meaningfulWords = allWords.filter(w => w.length > 2 && !FOLDER_NAME_STOPWORDS.has(w));
  const words = meaningfulWords.length >= 3 ? meaningfulWords : allWords;

  const maxLen = 32;
  const maxWords = 4;
  let slug = '';
  for (const word of words.slice(0, maxWords)) {
    const candidate = slug ? `${slug}_${word}` : word;
    if (slug && candidate.length > maxLen) break;
    slug = candidate;
  }
  if (!slug && words.length > 0) {
    slug = words[0].slice(0, maxLen);
  }

  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const timeStr = `${year}${month}${date}_${hours}${minutes}${seconds}`;
  return slug ? `${slug}_${timeStr}` : `project_${timeStr}`;
}

/**
 * Toàn bộ state & handler của trang Prompt AI Studio, tách khỏi phần render để
 * page.js và các component con chỉ tập trung vào UI.
 */
export function usePromptStudio() {
  const [promptType, setPromptTypeState] = useState('video');
  const [activeCategory, setActiveCategory] = useState('english_quiz');
  const [formValues, setFormValues] = useState(() => {
    const initial = {};
    categoryKeys.forEach(k => { initial[k] = emptyInputFor(k); });
    return initial;
  });

  const [styles, setStyles] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);
  const [showJson, setShowJson] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');

  const [showStyleEditor, setShowStyleEditor] = useState(false);
  const [styleEditorText, setStyleEditorText] = useState('');
  const [styleSaveError, setStyleSaveError] = useState('');
  const [isSavingStyle, setIsSavingStyle] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [charactersLoading, setCharactersLoading] = useState(true);
  const [isFolderPathUserEdited, setIsFolderPathUserEdited] = useState(false);

  // States cho tính năng kịch bản phân đoạn, Gemini, ElevenLabs & DB Settings
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [useGemini, setUseGemini] = useState(false);
  const [durationRange, setDurationRange] = useState('under_1m');

  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({ 
    geminiApiKey: '', 
    elevenlabsApiKey: '', 
    mongodbUri: '',
    voiceMappings: {
      alex: '60qpDkuGX2KEChynwVZJ',
      mia: 'uREKoCeM2xnPeGaH8ZFM',
      leo: '60qpDkuGX2KEChynwVZJ',
      zoe: 'uREKoCeM2xnPeGaH8ZFM',
      tom: '60qpDkuGX2KEChynwVZJ',
      narrator: 'uREKoCeM2xnPeGaH8ZFM'
    }
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');
  const [elApiKeyVisible, setElApiKeyVisible] = useState(false);

  const currentCategory = PROMPT_CATEGORIES[activeCategory];
  const currentInput = formValues[activeCategory];

  const fetchStyles = async () => {
    try {
      const res = await fetch('/api/prompts/styles');
      const data = await res.json();
      if (data.success) setStyles(data.styles);
    } catch (err) {
      console.error('Lỗi tải style prompt:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setGeminiApiKey(data.settings.geminiApiKey || '');
        setSettings({
          geminiApiKey: data.settings.geminiApiKey || '',
          elevenlabsApiKey: data.settings.elevenlabsApiKey || '',
          mongodbUri: data.settings.mongodbUri || '',
          voiceMappings: {
            alex: data.settings.voiceMappings?.alex || '60qpDkuGX2KEChynwVZJ',
            mia: data.settings.voiceMappings?.mia || 'uREKoCeM2xnPeGaH8ZFM',
            leo: data.settings.voiceMappings?.leo || '60qpDkuGX2KEChynwVZJ',
            zoe: data.settings.voiceMappings?.zoe || 'uREKoCeM2xnPeGaH8ZFM',
            tom: data.settings.voiceMappings?.tom || '60qpDkuGX2KEChynwVZJ',
            narrator: data.settings.voiceMappings?.narrator || 'uREKoCeM2xnPeGaH8ZFM'
          }
        });
      }
    } catch (err) {
      console.error('Lỗi tải cấu hình settings:', err);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSettingsMsg('');
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
      const data = await res.json();
      if (res.ok && data.success) {
        setSettingsMsg('✓ Cấu hình đã được cập nhật thành công!');
        setGeminiApiKey(settings.geminiApiKey); // sync
        setTimeout(() => {
          setSettingsMsg('');
          setShowSettings(false);
        }, 2000);
      } else {
        setSettingsMsg('Lỗi: ' + (data.error || 'Không thể lưu cấu hình.'));
      }
    } catch (err) {
      setSettingsMsg('Lỗi kết nối máy chủ.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const fetchHistory = async (category) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/prompts/history?category=${encodeURIComponent(category)}`);
      const data = await res.json();
      if (data.success) setHistory(data.items || []);
    } catch (err) {
      console.error('Lỗi tải lịch sử prompt:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchCharacters = async () => {
    setCharactersLoading(true);
    try {
      const res = await fetch('/api/prompts/characters');
      const data = await res.json();
      if (data.success) setCharacters(data.items || []);
    } catch (err) {
      console.error('Lỗi tải nhân vật:', err);
    } finally {
      setCharactersLoading(false);
    }
  };

  useEffect(() => {
    fetchStyles();
    fetchSettings();
    fetchCharacters();
  }, []);

  useEffect(() => {
    fetchHistory(activeCategory);
    setResult(null);
    setErrorMsg('');
    setShowStyleEditor(false);
    setSelectedHistoryIds([]);
    setIsFolderPathUserEdited(false); // Reset khi đổi danh mục
  }, [activeCategory]);

  const setPromptType = (type) => {
    setPromptTypeState(type);
    const keys = categoryKeysForType(type);
    if (keys.length) setActiveCategory(keys[0]);
  };

  const handleFieldChange = (key, value) => {
    if (key === 'folderPath') {
      setIsFolderPathUserEdited(value.trim() !== '');
    }

    setFormValues(prev => {
      const nextInput = { ...prev[activeCategory], [key]: value };

      // Tự động sinh folderPath cho slideshow khi scenario thay đổi
      if (activeCategory === 'stick_figure_slideshow' && key === 'scenario') {
        if (!isFolderPathUserEdited) {
          nextInput.folderPath = generateDefaultFolderName(value);
        }
      }

      // Tự động điều chỉnh tỷ lệ khung hình dựa trên góc chụp/bố cục đã chọn
      if (activeCategory === 'character_ref' && key === 'shotType') {
        if (value === 'front_facing') {
          nextInput.aspectRatio = '9:16'; // Chân dung điện thoại dọc
        } else if (value === 'character_sheet') {
          nextInput.aspectRatio = '16:9'; // Trình bày xoay chiều ngang rộng rãi
        } else if (value === 'storyboard') {
          nextInput.aspectRatio = '16:9'; // Bảng phân cảnh ngang rộng
        }
      }

      return {
        ...prev,
        [activeCategory]: nextInput
      };
    });
  };

  const handleToggleCharacter = (field, charId) => {
    const current = currentInput[field.key] || [];
    const maxSelect = field.maxSelect || 3;
    let next;
    if (current.includes(charId)) {
      next = current.filter(id => id !== charId);
    } else if (maxSelect <= 1) {
      // Field chỉ cho chọn đúng 1 nhân vật -> chọn mới luôn thay thế nhân vật cũ
      next = [charId];
    } else if (current.length >= maxSelect) {
      // Đã đủ số lượng tối đa -> bỏ (các) nhân vật chọn sớm nhất, thêm nhân vật mới vào cuối
      next = [...current.slice(current.length - maxSelect + 1), charId];
    } else {
      next = [...current, charId];
    }
    handleFieldChange(field.key, next);
  };

  const handleGenerate = async () => {
    setErrorMsg('');
    setIsGenerating(true);
    try {
      const res = await fetch('/api/prompts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: activeCategory,
          input: currentInput,
          useGemini,
          durationRange,
          geminiApiKey
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data.result);
        fetchHistory(activeCategory);

        // Sau khi Gemini sinh kịch bản xong, thư mục tài nguyên được đặt lại
        // theo tiêu đề tiếng Anh AI vừa dịch (vd "The Struggle of Learning
        // English") thay vì bản chuyển tự từ tiếng Việt gõ tạm lúc nãy. Chỉ áp
        // dụng khi người dùng chưa tự tay sửa ô này (isFolderPathUserEdited),
        // và cập nhật thẳng qua setFormValues (không qua handleFieldChange) để
        // không bị đánh dấu thành "đã tự sửa" — lần tạo AI kế tiếp vẫn tiếp tục
        // tự gen theo tiêu đề mới.
        if (activeCategory === 'stick_figure_slideshow' && useGemini && data.result?.title && !isFolderPathUserEdited) {
          const aiFolderName = generateDefaultFolderName(data.result.title);
          setFormValues(prev => ({
            ...prev,
            stick_figure_slideshow: {
              ...prev.stick_figure_slideshow,
              folderPath: aiFolderName
            }
          }));
        }
      } else {
        setErrorMsg(data.error || 'Không thể tạo prompt.');
      }
    } catch (err) {
      setErrorMsg('Lỗi kết nối máy chủ.');
    } finally {
      setIsGenerating(false);
    }
  };

  function stripVietnamese(text) {
    if (typeof text !== 'string') return text;
    return text.split('\n').map(line => {
      const parts = line.split(' // ');
      if (parts.length > 1) {
        return parts[0].trim();
      }
      return line;
    }).join('\n');
  }

  function cleanJsonPrompt(obj) {
    if (!obj) return obj;
    if (typeof obj === 'string') {
      return stripVietnamese(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(cleanJsonPrompt);
    }
    if (typeof obj === 'object') {
      const newObj = {};
      for (const [key, val] of Object.entries(obj)) {
        newObj[key] = cleanJsonPrompt(val);
      }
      return newObj;
    }
    return obj;
  }

  const handleCopy = async (text, key) => {
    try {
      let cleanText = text;
      if (key === 'json') {
        try {
          const parsed = JSON.parse(text);
          const cleaned = cleanJsonPrompt(parsed);
          cleanText = JSON.stringify(cleaned, null, 2);
        } catch (e) {
          cleanText = stripVietnamese(text);
        }
      } else {
        cleanText = stripVietnamese(text);
      }

      await navigator.clipboard.writeText(cleanText);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2000);
    } catch (err) {
      alert('Không thể sao chép, vui lòng copy thủ công.');
    }
  };

  const handleOpenStyleEditor = () => {
    const currentStyle = styles[activeCategory] || currentCategory.defaultStyle;
    setStyleEditorText(JSON.stringify(currentStyle, null, 2));
    setStyleSaveError('');
    setShowStyleEditor(true);
  };

  const handleSaveStyle = async () => {
    setStyleSaveError('');
    let parsed;
    try {
      parsed = JSON.parse(styleEditorText);
    } catch (err) {
      setStyleSaveError('JSON không hợp lệ, vui lòng kiểm tra lại cú pháp.');
      return;
    }

    setIsSavingStyle(true);
    try {
      const res = await fetch('/api/prompts/styles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: activeCategory, style: parsed })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchStyles();
        setShowStyleEditor(false);
      } else {
        setStyleSaveError(data.error || 'Không thể lưu style.');
      }
    } catch (err) {
      setStyleSaveError('Lỗi kết nối máy chủ.');
    } finally {
      setIsSavingStyle(false);
    }
  };

  const handleDeleteHistory = async (id) => {
    if (!confirm('Xóa prompt này khỏi lịch sử?')) return;
    try {
      const res = await fetch(`/api/prompts/history?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory(prev => prev.filter(h => h.id !== id));
        setSelectedHistoryIds(prev => prev.filter(x => x !== id));
      }
    } catch (err) {
      alert('Lỗi kết nối khi xóa.');
    }
  };

  const handleUploadCharacter = async (formData) => {
    try {
      const res = await fetch('/api/prompts/characters', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCharacters(prev => [...prev, data.character]);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Lỗi kiểm tra hoặc thêm nhân vật.' };
      }
    } catch (err) {
      return { success: false, error: 'Lỗi kết nối máy chủ.' };
    }
  };

  const handleDeleteCustomCharacter = async (id, name) => {
    if (!confirm(`Xóa nhân vật "${name || id}" khỏi danh sách?`)) return;
    try {
      const res = await fetch(`/api/prompts/characters?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        setCharacters(prev => prev.filter(c => c.id !== id));
        // Bỏ chọn nhân vật trong form nếu nhân vật này đang được chọn
        setFormValues(prev => {
          const currentSelects = prev[activeCategory]?.characterIds || [];
          if (currentSelects.includes(id)) {
            return {
              ...prev,
              [activeCategory]: {
                ...prev[activeCategory],
                characterIds: currentSelects.filter(x => x !== id)
              }
            };
          }
          return prev;
        });
      } else {
        const d = await res.json();
        alert(d.error || 'Lỗi khi xóa nhân vật.');
      }
    } catch (err) {
      alert('Lỗi kết nối khi xóa nhân vật.');
    }
  };

  const handleToggleSelectHistory = (id) => {
    setSelectedHistoryIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllHistory = () => {
    if (selectedHistoryIds.length === history.length) {
      setSelectedHistoryIds([]);
    } else {
      setSelectedHistoryIds(history.map(h => h.id));
    }
  };

  const handleDeleteSelectedHistory = async () => {
    if (selectedHistoryIds.length === 0) return;
    if (!confirm(`Xóa ${selectedHistoryIds.length} prompt đã chọn khỏi lịch sử?`)) return;

    try {
      const idsParam = selectedHistoryIds.join(',');
      const res = await fetch(`/api/prompts/history?ids=${encodeURIComponent(idsParam)}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory(prev => prev.filter(h => !selectedHistoryIds.includes(h.id)));
        setSelectedHistoryIds([]);
      } else {
        alert('Lỗi khi xóa các mục đã chọn.');
      }
    } catch (err) {
      alert('Lỗi kết nối khi xóa.');
    }
  };

  const handleUpdateCharacter = async (formData) => {
    try {
      const res = await fetch('/api/prompts/characters', {
        method: 'PUT',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCharacters(prev => prev.map(c => c.id === data.character.id ? data.character : c));
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Lỗi kiểm tra hoặc cập nhật nhân vật.' };
      }
    } catch (err) {
      return { success: false, error: 'Lỗi kết nối máy chủ.' };
    }
  };

  return {
    categoryKeys,
    promptTypes, promptType, setPromptType,
    visibleCategoryKeys: categoryKeysForType(promptType),
    activeCategory, setActiveCategory,
    currentCategory, currentInput,
    styles,
    isGenerating, errorMsg, result, setResult, showJson, setShowJson, copiedKey,
    showStyleEditor, setShowStyleEditor, styleEditorText, setStyleEditorText, styleSaveError, isSavingStyle,
    history, historyLoading, selectedHistoryIds,
    characters, charactersLoading,
    geminiApiKey, setGeminiApiKey, apiKeyVisible, setApiKeyVisible,
    showSettings, setShowSettings, settings, setSettings, isSavingSettings, settingsMsg,
    elApiKeyVisible, setElApiKeyVisible, fetchSettings, handleSaveSettings,
    useGemini, setUseGemini, durationRange, setDurationRange,
    handleFieldChange, handleToggleCharacter, handleGenerate, handleCopy,
    handleOpenStyleEditor, handleSaveStyle, handleDeleteHistory,
    handleToggleSelectHistory, handleToggleSelectAllHistory, handleDeleteSelectedHistory,
    handleUploadCharacter, handleDeleteCustomCharacter, handleUpdateCharacter
  };
}
