import { DEFAULT_EDGE_MALE_VOICE, DEFAULT_EDGE_FEMALE_VOICE } from '@/lib/tts/edgeVoices.js';
import { wordsPerSecond, isJapaneseText } from '@/lib/speechRate.js';

// [tag cảm xúc] (vd "[pause]", "[softly]") không có tác dụng gì với giọng đọc thật — API tổng
// hợp giọng (voiceover/route.js) đã tự strip sạch trước khi gửi đi, tag chỉ còn sót lại ở các ô
// hiển thị/copy trong trang này (Toàn bộ lời thuyết minh, Sao chép toàn bộ, Lời thoại từng slide).
// Nếu người dùng dán nguyên văn (có tag) sang 1 công cụ TTS khác không hiểu convention này, công
// cụ đó sẽ ĐỌC TO cả cụm "[pause]" ra thành lời — gây giọng đọc méo/nghe lạ ở đúng chỗ có tag. Vì
// vậy MẶC ĐỊNH strip tag ở mọi nơi hiển thị/copy lời thoại cho người dùng xem hoặc dán ra ngoài.
//
// NGOẠI LỆ: ElevenLabs v3 thì ngược lại — nó diễn đúng theo tag. Nút "🏷️ Hiện/Ẩn [tag]" ở khối
// "Toàn bộ lời thuyết minh" cho phép giữ tag lại khi cần dán sang đó; xem cleanNarrationText().
export function stripEmotionTagsForDisplay(text) {
  return cleanNarrationText(text, { keepTags: false });
}

/**
 * Dọn lời thoại để hiển thị / copy, có thể GIỮ LẠI [tag] khi người dùng bật nút "Hiện tag".
 *
 * keepTags = true dành cho ElevenLabs v3: nó thực sự diễn theo [whispers], [sighs], [long pause]...
 * nên bản copy đem dán sang đó phải còn nguyên tag. Mọi công cụ khác (CapCut, giọng đọc trong app)
 * không hiểu convention này và sẽ ĐỌC TO cụm "[whispers]" thành lời, nên mặc định vẫn là bỏ tag.
 *
 * Dù giữ hay bỏ tag thì **markdown** luôn bị gỡ: dấu ** chỉ để tô đậm phụ đề trên video, đọc lên
 * thành "sao sao" thì hỏng câu.
 */
export function cleanNarrationText(text, { keepTags = false } = {}) {
  return String(text || '')
    .split('\n')
    .map((line) => {
      const withoutTags = keepTags ? line : line.replace(/\[[^\]]*\]/g, ' ');
      return withoutTags
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/[ \t]+/g, ' ')
        .trim();
    })
    .join('\n');
}

/** Kịch bản có [tag] cảm xúc hay không — dùng để chỉ hiện nút bật/tắt tag khi thật sự có tag. */
export function hasEmotionTags(segments) {
  return (segments || []).some((s) => /\[[^\]]*\]/.test(String(s?.dialogueOrNarration || '')));
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

// Kịch bản TIẾNG NHẬT cắt nhỏ hơn hẳn — 2000 ký tự mỗi phần.
//
// Đây là GIỚI HẠN KỸ THUẬT THẬT, không phải chọn cho tiện: ElevenLabs không nhận nổi 5000 ký tự
// tiếng Nhật trong một lượt như với chữ Latin — người dùng đo được trần thực tế quanh 2000. Lý do
// hợp lý là mỗi kana/kanji tốn nhiều token hơn hẳn một ký tự Latin, nên cùng một trần token thì số
// ký tự Nhật lọt qua ít hơn nhiều.
//
// Đánh đổi: nhiều phần hơn thì nhiều lượt render TTS hơn và nhiều file audio phải thả vào hơn. Đổi
// lại mỗi lần hỏng chỉ phải làm lại một phần nhỏ.
export const TTS_CHUNK_CHAR_LIMIT_JA = 2000;

/** Trần ký tự mỗi phần TTS, chọn theo ngôn ngữ của chính kịch bản. */
export function ttsChunkLimitFor(text) {
  return isJapaneseText(text) ? TTS_CHUNK_CHAR_LIMIT_JA : TTS_CHUNK_CHAR_LIMIT;
}

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
export function buildFullNarrationText(segments, { keepTags = false } = {}) {
  return (segments || [])
    .filter((s) => !s.isThumbnail && !s.dialogueOrNarration?.includes('Thumbnail'))
    .map((s) => cleanNarrationText((s.dialogueOrNarration || '').replace(/^[A-Za-z0-9\s]+:\s*/, '').trim(), { keepTags }))
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

  // HAI luật tách, vì hai hệ chữ viết ngắt câu khác nhau:
  //
  //  - Nhật: 。！？ tự nó kết câu và KHÔNG có khoảng trắng theo sau. Luật Latin bên dưới đòi
  //    `\s+` sau dấu chấm nên với tiếng Nhật nó không khớp một lần nào — cả kịch bản 4.131 ký tự
  //    bị coi là ĐÚNG MỘT CÂU, kéo theo một đoạn duy nhất và một khối copy duy nhất không cắt nổi.
  //    `(?![」』）])` để không cắt ngay giữa 「これでいい。」 làm dấu đóng ngoặc rơi sang câu sau.
  //  - Latin: giữ nguyên luật cũ — cần khoảng trắng sau dấu, và ký tự kế không phải chữ thường.
  const rough = flat.split(/(?<=[。！？])(?![」』）])|(?<=[.!?…])\s+(?=[^\p{Ll}\s])/gu);

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
// Một đoạn dài tới mức này thì đóng lại, dù không gặp mốc ngắt ý nào. Khoảng 3-4 câu — đủ để một
// ý trọn vẹn nằm chung một đoạn, mà không để đoạn phình thành cả trang.
const PARAGRAPH_SOFT_CHARS = 220;

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
    // Chốt chặn theo ĐỘ DÀI, không phụ thuộc ngôn ngữ.
    //
    // Ba mốc ngắt đoạn ở trên (isPointStart / CTA / câu kết) đều dò theo cụm từ TIẾNG VIỆT. Với
    // kịch bản tiếng Nhật chúng không khớp một lần nào, nên cả bài dồn vào MỘT đoạn duy nhất: bản
    // hiển thị thành một bức tường chữ, và công cụ TTS không có chỗ trống nào để nghỉ hơi.
    else if (current.join('').length >= PARAGRAPH_SOFT_CHARS) flush();
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
export function splitNarrationForTts(text, limit = ttsChunkLimitFor(text)) {
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
export function buildTtsScriptText(segments, { keepTags = false } = {}) {
  const parts = splitNarrationForTts(buildFullNarrationText(segments, { keepTags }));
  if (parts.length <= 1) return parts[0] || '';
  return parts.reduce((acc, part, i) => (i === 0 ? part : `${acc}\n${buildTtsPartDivider(i)}\n${part}`), '');
}

/**
 * Bản TTS chia theo ĐÚNG SLIDE: mỗi slide một đoạn, cách nhau một dòng trống.
 *
 * Khác hẳn buildTtsScriptText ngay trên. Bản kia gộp mọi slide bằng MỘT DẤU CÁCH (xem
 * buildFullNarrationText) rồi chia lại thành đoạn bằng heuristic câu — ranh giới slide biến mất
 * sạch, nên công cụ TTS nghỉ hơi ở những chỗ chẳng liên quan gì tới slide.
 *
 * Bản này giữ ranh giới slide lại, để:
 *   1. CẮT LẠI ĐƯỢC. Có dòng trống ở đúng mọi ranh giới slide thì ElevenLabs chèn quãng lặng thật
 *      tại đó, và bộ cắt (audioSlicer.js) dò ra đúng N-1 chỗ cắt khớp 1:1 với slide.
 *   2. Ảnh đổi ngay tại chỗ nghỉ, đúng nhịp một slideshow, thay vì đổi giữa chừng một câu.
 *
 * Trả về từng PHẦN kèm danh sách segmentNumber nằm trong phần đó: mỗi phần là một lượt render TTS
 * riêng (do trần ký tự), và bộ cắt cần biết file vừa thả vào ứng với những slide nào.
 */
export function buildTtsSlideParts(segments, { keepTags = false, limit } = {}) {
  const slides = (segments || [])
    .filter((s) => !s.isThumbnail && !s.dialogueOrNarration?.includes('Thumbnail'))
    .map((s) => ({
      segmentNumber: Number(s.segmentNumber),
      text: cleanNarrationText(
        (s.dialogueOrNarration || '').replace(/^[A-Za-z0-9\s]+:\s*/, '').trim(),
        { keepTags }
      ),
    }))
    .filter((s) => s.text && Number.isFinite(s.segmentNumber));

  // Trần ký tự suy ra từ CHÍNH nội dung, không nhận mặc định cứng: kịch bản Nhật cắt 2000, các
  // ngôn ngữ còn lại giữ 4900 như cũ. Bỏ trống `limit` là để hàm tự quyết.
  const chunkLimit = limit ?? ttsChunkLimitFor(slides.map((s) => s.text).join(''));

  const SEPARATOR = '\n\n';
  const parts = [];
  let current = null;

  for (const slide of slides) {
    if (current && current.text.length + SEPARATOR.length + slide.text.length > chunkLimit) {
      parts.push(current);
      current = null;
    }
    if (current) {
      current.text += SEPARATOR + slide.text;
      current.segmentNumbers.push(slide.segmentNumber);
    } else {
      // Một slide đơn lẻ dài hơn cả trần ký tự thì vẫn để nguyên thành một phần: chẻ nhỏ nó ra sẽ
      // phá mất tính chất "1 slide = 1 đoạn" mà toàn bộ bộ cắt dựa vào.
      current = { text: slide.text, segmentNumbers: [slide.segmentNumber] };
    }
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * @param {string} text
 * @param {boolean} [isVietnamese=true] Mặc định tiếng Việt — các skill dùng hàm này đều là kịch bản
 *   tiếng Việt là chính; chỉ luồng đọc tiếng Anh mới cần truyền false.
 */
export function estimateSpeechSeconds(text, isVietnamese = true, wps = wordsPerSecond(isVietnamese)) {
  return Math.round(countWords(stripEmotionTagsForDisplay(text)) / wps);
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
