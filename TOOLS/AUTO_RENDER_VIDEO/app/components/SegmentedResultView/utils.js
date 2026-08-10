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

// Công cụ TTS đếm theo KÝ TỰ chứ không theo chữ, và thường chặn ở 5000 ký tự mỗi lần gọi. Lấy 4900
// để chừa biên cho khoảng trắng/xuống dòng phát sinh lúc copy-dán.
export const TTS_CHUNK_CHAR_LIMIT = 4900;

export function countCharacters(text) {
  return String(text || '').length;
}

/**
 * Gộp lời thuyết minh của mọi slide thành một chuỗi liền.
 *
 * Trước đây đúng đoạn nối này được chép tay ở 3 chỗ trong SegmentedResultView (dòng đếm chữ, khối
 * hiển thị toàn văn, nút Copy giọng đọc) — sửa một chỗ là hai chỗ kia lệch ngay, mà lệch kiểu này
 * không báo lỗi: người dùng chỉ thấy số chữ không khớp với đoạn họ vừa chép.
 */
export function buildFullNarrationText(segments) {
  return (segments || [])
    .filter((s) => !s.isThumbnail && !s.dialogueOrNarration?.includes('Thumbnail'))
    .map((s) => stripEmotionTagsForDisplay((s.dialogueOrNarration || '').replace(/^[A-Za-z0-9\s]+:\s*/, '').trim()))
    .filter(Boolean)
    .join(' ');
}

/**
 * Cắt văn bản thành từng câu.
 *
 * Chỉ cắt sau dấu kết câu khi ký tự có nghĩa kế tiếp KHÔNG phải chữ thường — chữ thường ngay sau
 * dấu chấm gần như luôn là dấu chấm giữa câu (viết tắt, số thứ tự) chứ không phải hết câu. Thà bỏ
 * sót một chỗ ngắt còn hơn cắt vụn một câu ra làm đôi.
 */
export function splitIntoSentences(text) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  if (!flat) return [];

  const rough = flat.split(/(?<=[.!?…])\s+(?=[^\p{Ll}\s])/gu);

  // Gộp lại chỗ cắt nhầm ở số thập phân ("3.5 triệu"): dấu chấm giữa hai chữ số không kết thúc câu.
  const merged = [];
  for (const piece of rough) {
    const prev = merged[merged.length - 1];
    if (prev && /\d\.$/.test(prev) && /^\d/.test(piece)) merged[merged.length - 1] = `${prev}${piece}`;
    else merged.push(piece);
  }

  // Số thứ tự đứng một mình ("Một.", "Thứ nhất.") được dán vào câu ngay sau nó. Văn phong liệt kê
  // cố ý chấm câu sau số để giọng đọc có nhịp nghỉ, nhưng để nguyên nó thành MỘT DÒNG riêng thì
  // công cụ TTS coi đó là một câu độc lập và đọc cụt lủn đúng một từ. Nằm cùng dòng với câu sau
  // thì vẫn còn dấu chấm để nghỉ hơi, mà không thành một lượt đọc riêng.
  const withCounters = [];
  for (const piece of merged) {
    if (withCounters.length && COUNTER_ONLY_SENTENCE.test(withCounters[withCounters.length - 1])) {
      withCounters[withCounters.length - 1] += ` ${piece}`;
    } else {
      withCounters.push(piece);
    }
  }
  return withCounters.filter(Boolean);
}

// "Một." "Hai." ... "Thứ nhất." "Điều thứ ba." "First." — câu chỉ gồm số thứ tự, không có nội dung.
const COUNTER_ONLY_SENTENCE =
  /^(?:(?:điều|cách|lý do|quy tắc)\s+)?(?:thứ\s+)?(?:một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|nhất|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d{1,2})\s*[.!:]$/i;

/**
 * Nhận biết một câu MỞ ĐẦU MỘT Ý MỚI trong kịch bản liệt kê.
 *
 * Cố ý KHÔNG bắt chữ "một" trần: "Một danh bạ hàng trăm người bạn xã giao..." là mạo từ, không phải
 * số thứ tự — bắt nhầm là cắt đoạn ngay giữa một ý. Chỉ nhận số đếm CÓ DẤU CHẤM ("Một."), dạng
 * "thứ N", hoặc "điều/cách/lý do + thứ N" (cho phép vài chữ dẫn nhập kiểu "Rồi, tới điều thứ hai nè").
 */
// CẢNH BÁO: không dùng \b với tiếng Việt có dấu. \b của JavaScript chỉ tính theo ký tự ASCII, nên
// "\bđiều" KHÔNG BAO GIỜ khớp ("đ" không phải \w) — mốc "Điều đầu tiên" từng trượt sạch vì lỗi này,
// mà không hề báo lỗi, chỉ là đoạn văn không được tách ra. Dùng ranh giới theo \p{L} với cờ 'u'.
const NOT_LETTER_BEFORE = '(?:^|[^\\p{L}])';
const NOT_LETTER_AFTER = '(?![\\p{L}])';
const ORDINAL = 'nhất|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười';

function isPointStart(sentence) {
  const s = sentence.trim().toLowerCase();
  return (
    // "Một." / "Hai:" — số đếm trần CÓ dấu chấm (văn phong list).
    new RegExp(`^(?:một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)\\s*[.!:]`, 'u').test(s)
    // "Thứ nhất, ..." (văn phong reflective).
    || new RegExp(`^thứ\\s+(?:${ORDINAL})${NOT_LETTER_AFTER}`, 'u').test(s)
    // "Điều đầu tiên," / "Rồi, tới điều thứ hai nè," / "Và điều cuối cùng," — cho vài chữ dẫn nhập.
    || new RegExp(
      `^.{0,20}?${NOT_LETTER_BEFORE}(?:điều|cách|lý do|quy tắc|bí quyết)\\s+`
      + `(?:đầu tiên|cuối cùng|thứ\\s+(?:${ORDINAL}))${NOT_LETTER_AFTER}`, 'u'
    ).test(s)
  );
}

// Lời kêu gọi tương tác giữa bài và đoạn kết — trong kịch bản mẫu chúng đứng thành đoạn riêng, nên
// tách ra thay vì để dính vào ý ngay trước đó.
// Cũng tránh \b vì lý do ở trên: "vậy là" kết thúc bằng "à", \b sau nó không bao giờ khớp.
const CTA_SENTENCE = /(nhấn like|bấm like|lưu lại video|comment bên dưới|để lại bình luận|đăng ký kênh)/iu;
const CLOSING_SENTENCE = /^(vậy là|tóm lại|nói tóm lại)(?![\p{L}])|hẹn gặp lại các bạn/iu;

/**
 * Gom lời thuyết minh thành TỪNG ĐOẠN VĂN, mỗi ý một đoạn, cách nhau bằng dòng trống.
 *
 * Đây là định dạng của skill vn-spoken-script-style: trong một đoạn thì các câu chảy liền mạch như
 * lời nói thật, còn dòng trống giữa hai đoạn cho giọng đọc quãng nghỉ dài hơn để sang ý mới. Tách
 * mỗi câu một dòng nghe sẽ vụn và đều đều như đọc danh sách.
 */
export function formatNarrationAsParagraphs(text) {
  const sentences = splitIntoSentences(text);
  if (!sentences.length) return '';

  const paragraphs = [];
  let current = [];
  // Đoạn kết chỉ được MỞ MỘT LẦN: nó thường chứa cả câu tóm tắt ("Vậy là tôi vừa chia sẻ xong...")
  // lẫn câu chào tạm biệt ("Hẹn gặp lại các bạn...") — cả hai đều khớp CLOSING_SENTENCE, để tự do
  // thì đoạn kết bị xé làm đôi ngay giữa lời chào.
  let closingOpened = false;
  const flush = () => { if (current.length) { paragraphs.push(current.join(' ')); current = []; } };

  for (const sentence of sentences) {
    const isCta = CTA_SENTENCE.test(sentence);
    const opensClosing = !closingOpened && CLOSING_SENTENCE.test(sentence);

    if (current.length && (isPointStart(sentence) || isCta || opensClosing)) flush();
    if (opensClosing) closingOpened = true;

    current.push(sentence);
    // CTA thường chỉ một câu — đóng đoạn ngay để nó không nuốt luôn ý kế tiếp.
    if (isCta) flush();
  }
  flush();

  return paragraphs.join('\n\n');
}

/**
 * Chia kịch bản thành các phần ≤ giới hạn ký tự, ưu tiên cắt ở ranh giới ĐOẠN.
 *
 * Cắt theo đoạn (chứ không theo câu) để một ý trọn vẹn không bị xé làm đôi giữa hai lần render —
 * hai lần render là hai lượt gọi TTS khác nhau, ghép lại thường lệch nhịp và lộ chỗ nối ngay giữa
 * lúc đang giảng dở một ý.
 *
 * Chỉ khi một đoạn ĐƠN LẺ đã dài hơn cả giới hạn mới hạ xuống cắt theo câu bên trong đoạn đó.
 */
export function splitNarrationForTts(text, limit = TTS_CHUNK_CHAR_LIMIT) {
  const paragraphs = formatNarrationAsParagraphs(text).split('\n\n').filter(Boolean);
  const chunks = [];
  let current = '';

  const pushPiece = (piece, separator) => {
    const candidate = current ? `${current}${separator}${piece}` : piece;
    if (current && candidate.length > limit) {
      chunks.push(current);
      current = piece;
    } else {
      current = candidate;
    }
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > limit) {
      // Đoạn này một mình đã quá dài — buộc phải cắt nhỏ theo câu.
      for (const sentence of splitIntoSentences(paragraph)) pushPiece(sentence, ' ');
      continue;
    }
    pushPiece(paragraph, '\n\n');
  }

  if (current) chunks.push(current);
  return chunks;
}

/**
 * Dòng phân cách giữa 2 phần, giữ đúng nguyên văn quy ước của skill vn-spoken-script-style để
 * người dùng nhìn là biết ngay copy đoạn nào đem render lần nào.
 */
export function buildTtsPartDivider(partNumber) {
  return [
    '',
    `===== ✂️ HẾT PHẦN ${partNumber} — COPY ĐOẠN TRÊN ĐEM RENDER TTS LẦN ${partNumber} ✂️ =====`,
    '',
    `===== ▶️ PHẦN ${partNumber + 1} — COPY ĐOẠN DƯỚI ĐEM RENDER TTS LẦN ${partNumber + 1} ▶️ =====`,
    '',
  ].join('\n');
}

/** Toàn bộ kịch bản đã format: mỗi câu một dòng, kèm dòng phân cách nếu phải chia nhiều lần render. */
export function buildTtsScriptText(segments) {
  const parts = splitNarrationForTts(buildFullNarrationText(segments));
  if (parts.length <= 1) return parts[0] || '';
  return parts.reduce((acc, part, i) => (i === 0 ? part : `${acc}\n${buildTtsPartDivider(i)}\n${part}`), '');
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
