import { DEFAULT_EDGE_MALE_VOICE, DEFAULT_EDGE_FEMALE_VOICE } from '@/lib/tts/edgeVoices.js';
import { wordsPerSecond } from '@/lib/speechRate.js';

// [tag cảm xúc] (vd "[pause]", "[softly]") không có tác dụng gì với giọng đọc thật — API tổng
// hợp giọng (voiceover/route.js) đã tự strip sạch trước khi gửi đi, tag chỉ còn sót lại ở các ô
// hiển thị/copy trong trang này (Toàn bộ lời thuyết minh, Sao chép toàn bộ, Lời thoại từng slide).
// Nếu người dùng dán nguyên văn (có tag) sang 1 công cụ TTS khác không hiểu convention này, công
// cụ đó sẽ ĐỌC TO cả cụm "[pause]" ra thành lời — gây giọng đọc méo/nghe lạ ở đúng chỗ có tag. Vì
// vậy strip tag ở MỌI nơi hiển thị/copy lời thoại cho người dùng xem hoặc dán ra ngoài.
export function stripEmotionTagsForDisplay(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/[ \t]+/g, ' ')
      .trim()
    )
    .join('\n');
}

// Ước lượng thời lượng đọc để người dùng biết NGAY lúc gõ là slide này đang dài/ngắn bao nhiêu,
// thay vì phải tạo giọng đọc xong mới phát hiện lệch so với thời lượng mục tiêu.
//
// Tốc độ lấy từ lib/speechRate.js — nguồn duy nhất, đo trên chính file mp3 mà pipeline TTS sinh ra.
// Trước đây chỗ này gõ cứng 2.5 từ/giây, thấp hơn thực tế 1.75 lần, nên dòng "đọc khoảng ... phút"
// báo dài gần gấp đôi sự thật (940 chữ hiện "6 phút 16 giây" trong khi audio thật chỉ 3 phút 34).
export { WORDS_PER_SECOND_VI, WORDS_PER_SECOND_EN } from '@/lib/speechRate.js';

export function countWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

/**
 * @param {string} text
 * @param {boolean} [isVietnamese=true] Mặc định tiếng Việt — các skill dùng hàm này đều là kịch bản
 *   tiếng Việt là chính; chỉ luồng đọc tiếng Anh mới cần truyền false.
 */
export function estimateSpeechSeconds(text, isVietnamese = true) {
  return Math.round(countWords(stripEmotionTagsForDisplay(text)) / wordsPerSecond(isVietnamese));
}

export function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
}

export function optionLabel(options, value) {
  return options.find((o) => o.value === value)?.label || value;
}

// Hàm phát hiện các nhân vật / giọng đọc THỰC SỰ có trong kịch bản hiện tại
export function detectActiveCharacters(result) {
  const characters = [];
  const seenKeys = new Set();
  const scenes = result?.scenes || [];

  const isVietnameseCategory = ['reading_practice', 'moral_talk_slideshow'].includes(result?.category);
  const defaultNarratorVoice = isVietnameseCategory ? 'multi_male_felipe_uranus_bigtts' : DEFAULT_EDGE_FEMALE_VOICE;
  const defaultMaleVoice = isVietnameseCategory ? 'multi_male_felipe_uranus_bigtts' : DEFAULT_EDGE_MALE_VOICE;

  if (result?.category === 'reading_practice' || (isVietnameseCategory && scenes.length === 0)) {
    return [{
      key: 'narrator',
      name: 'Người kể (Narrator)',
      gender: 'Dẫn chuyện',
      icon: '🎙️',
      defaultVoice: 'multi_male_felipe_uranus_bigtts'
    }];
  }

  for (const scene of scenes) {
    const text = (scene.dialogueOrNarration || scene.text || scene.content || '').trim();
    const match = text.match(/^([A-Za-z0-9\s]+):/i);
    if (match) {
      const rawName = match[1].trim();
      const lower = rawName.toLowerCase();
      let key = lower;
      let name = rawName;
      let gender = 'Dẫn chuyện';
      let icon = '🎙️';
      let defaultVoice = defaultNarratorVoice;

      if (['alex', 'man', 'male', 'boy', 'guy', 'nam'].includes(lower)) {
        key = 'alex';
        name = 'Alex';
        gender = 'Nam';
        icon = '👨';
        defaultVoice = defaultMaleVoice;
      } else if (['mia', 'woman', 'female', 'girl', 'lady', 'nữ'].includes(lower)) {
        key = 'mia';
        name = 'Mia';
        gender = 'Nữ';
        icon = '👩';
        defaultVoice = isVietnameseCategory ? 'vi_female_huong' : DEFAULT_EDGE_FEMALE_VOICE;
      } else if (['leo'].includes(lower)) {
        key = 'leo';
        name = 'Leo';
        gender = 'Nam trẻ';
        icon = '👦';
        defaultVoice = defaultMaleVoice;
      } else if (['narrator', 'người kể', 'reader'].includes(lower)) {
        key = 'narrator';
        name = 'Người kể (Narrator)';
        gender = 'Dẫn chuyện';
        icon = '🎙️';
        defaultVoice = defaultNarratorVoice;
      } else {
        if (/woman|female|mother|mom|girl|lady|bà|cụ nữ/i.test(lower)) {
          gender = 'Nữ';
          icon = '👩';
          defaultVoice = isVietnameseCategory ? 'vi-VN-HoaiMyNeural' : DEFAULT_EDGE_FEMALE_VOICE;
        } else if (/man|male|father|dad|boy|guy|ông|cụ nam/i.test(lower)) {
          gender = 'Nam';
          icon = '👨';
          defaultVoice = defaultMaleVoice;
        }
      }

      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        characters.push({ key, name, gender, icon, defaultVoice });
      }
    }
  }

  if (characters.length === 0) {
    characters.push({
      key: 'narrator',
      name: 'Người kể (Narrator)',
      gender: 'Dẫn chuyện',
      icon: '🎙️',
      defaultVoice: defaultNarratorVoice
    });
  }

  return characters;
}

// Tóm tắt trạng thái chạy hàng đợi Google Flow (từ extension), đối chiếu với đúng kịch bản
// đang hiển thị (khớp theo title) — trả về null nếu không có gì để hiển thị.
export function getFlowQueueStatus(extQueueState, resultTitle) {
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
