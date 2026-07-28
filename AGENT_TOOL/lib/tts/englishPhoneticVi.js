import { callGeminiWithKeyRotation } from '@/lib/prompts/gemini/callGeminiApi.js';

/**
 * Các giọng đọc tiếng Việt "1 ngôn ngữ" (CapCut, VieNeu-TTS cục bộ) không tự chuyển bộ âm vị khi
 * gặp từ tiếng Anh chèn trong câu — chúng chỉ đọc y nguyên mặt chữ Latin theo quy tắc phát âm
 * tiếng Việt, ra âm thanh sai/khó nghe (vd "stress" bị đọc lắp bắp vô nghĩa). Hàm này nhờ Gemini
 * tìm và phiên âm LẠI riêng những từ tiếng Anh đó sang cách viết gần đúng âm khi đọc bằng tiếng
 * Việt (vd "stress" -> "xì-trét"), giữ nguyên toàn bộ phần tiếng Việt còn lại — chỉ áp dụng cho
 * văn bản gửi ĐỌC (audio), không đụng tới "subtitle" hiển thị trên màn hình.
 */

// Bộ lọc rẻ trước khi gọi Gemini: tách theo từng "từ" (Unicode letter runs, giữ nguyên dấu tiếng
// Việt), chỉ coi là "khả nghi từ nước ngoài" nếu có ít nhất 1 từ dài >= 2 ký tự mà TOÀN BỘ là chữ
// cái ASCII thuần (không dấu) — vì hầu hết từ tiếng Việt viết đúng chính tả đều mang dấu thanh/dấu
// nguyên âm, nên 1 chuỗi ASCII thuần dài 2+ ký tự nhiều khả năng là từ mượn/tiếng Anh (dù đôi khi
// trùng vài từ chức năng tiếng Việt không dấu như "trong", "khi" — chấp nhận gọi Gemini dư vài lần
// còn hơn bỏ sót từ tiếng Anh thật, và Gemini sẽ tự trả nguyên văn nếu không có gì cần đổi).
const ASCII_ONLY_WORD_RE = /^[A-Za-z]+$/;

function hasLikelyForeignWord(text) {
  const tokens = text.split(/[^\p{L}]+/u);
  return tokens.some((token) => token.length >= 2 && ASCII_ONLY_WORD_RE.test(token));
}

// Nhớ kết quả đã phiên âm theo đúng nội dung câu, sống theo tiến trình server. Cùng một câu rất
// hay lặp lại (lồng tiếng lại 1 project, đổi giọng rồi tạo lại, nghe thử...) — không có cache thì
// mỗi lần đều là 1 request Gemini mới hoàn toàn vô ích.
const transliterationCache = new Map();
const CACHE_LIMIT = 2000;

// Cầu dao ngắt: phiên âm chỉ là bước LÀM ĐẸP (hỏng thì đọc nguyên văn vẫn ra tiếng, chỉ hơi sai
// âm vài từ). Nếu Gemini đang sập/hết sạch quota, để mỗi slide tự thử lại rồi chờ là vô nghĩa —
// một mẻ 25 slide sẽ ngồi chờ vài phút chỉ để nhận về 25 lần thất bại y hệt. Sau lần hỏng đầu
// tiên, tạm nghỉ hẳn một lúc và trả nguyên văn ngay lập tức cho các slide còn lại.
const CIRCUIT_OPEN_MS = 60_000;
let suppressUntil = 0;

function isSuppressed() {
  return Date.now() < suppressUntil;
}

function tripCircuit(err) {
  suppressUntil = Date.now() + CIRCUIT_OPEN_MS;
  console.warn(`[TTS Phonetic] Tạm ngưng phiên âm ${CIRCUIT_OPEN_MS / 1000}s do Gemini đang lỗi (${err.message}) — các câu còn lại sẽ đọc nguyên văn.`);
}

function cacheSet(text, value) {
  // Map giữ nguyên thứ tự chèn -> xoá phần tử cũ nhất là đủ cho một LRU thô, tránh phình vô hạn
  // trong tiến trình server chạy dài ngày.
  if (transliterationCache.size >= CACHE_LIMIT) {
    const oldest = transliterationCache.keys().next().value;
    transliterationCache.delete(oldest);
  }
  transliterationCache.set(text, value);
}

const PHONETIC_INTRO = `You are preparing input for a Vietnamese-ONLY text-to-speech voice engine. This voice engine can only read Vietnamese phonetics correctly — when it encounters a word spelled in its original English form, it mispronounces it badly (garbled, unintelligible), because it applies Vietnamese letter-reading rules to English spelling.`;

const PHONETIC_RULES = `Rewrite ONLY those words as a Vietnamese phonetic respelling that approximates their English pronunciation when read aloud using Vietnamese spelling/tone rules (e.g. "stress" -> "xì-trét", "marketing" -> "ma-kết-tinh", "email" -> "i-meo", "deadline" -> "đét-lai", "freelance" -> "phri-lan", "mindset" -> "main-sét"). Do NOT touch any actual Vietnamese word, punctuation, numbers, or sentence structure — keep everything else character-for-character identical. Do not translate meaning, only respell the pronunciation of genuinely foreign words. If there are no English words at all, return the sentence completely unchanged.`;

/**
 * Phiên âm sẵn CẢ MỘT MẺ câu bằng 1 lệnh gọi Gemini duy nhất, rồi nạp vào cache.
 *
 * Lý do phải có: luồng lồng tiếng duyệt từng slide và gọi phiên âm bên trong vòng lặp, nên một
 * project 25 slide bắn ra 25 request Gemini liên tiếp trong vài giây — vượt thẳng hạn mức free
 * tier (20 request/phút) và làm cả mẻ lồng tiếng phải ngồi chờ retry. Gom hết vào 1 request thì
 * 25 slide chỉ còn tốn đúng 1 lượt gọi.
 *
 * Cố tình KHÔNG ném lỗi: đây chỉ là bước tối ưu. Nếu mẻ gộp hỏng, vòng lặp phía sau vẫn tự gọi
 * lẻ từng câu như trước — chậm hơn nhưng không làm hỏng việc lồng tiếng.
 */
export async function prewarmTransliterationCache(texts, geminiApiKeys) {
  const keys = (Array.isArray(geminiApiKeys) ? geminiApiKeys : [geminiApiKeys]).filter(Boolean);
  if (keys.length === 0) return;

  // Chỉ gửi những câu THẬT SỰ cần xử lý: bỏ câu rỗng, câu không có từ nước ngoài, câu đã có trong
  // cache, và các câu trùng nhau trong cùng một mẻ.
  const pending = [...new Set(
    (texts || [])
      .map((t) => (t || '').trim())
      .filter((t) => t && hasLikelyForeignWord(t) && !transliterationCache.has(t))
  )];

  if (pending.length === 0) return;

  // Chia mẻ để một project rất dài không tạo ra 1 prompt/response khổng lồ dễ bị cắt ngang.
  const CHUNK_SIZE = 40;
  for (let start = 0; start < pending.length; start += CHUNK_SIZE) {
    const chunk = pending.slice(start, start + CHUNK_SIZE);
    const prompt = `${PHONETIC_INTRO}

You are given a JSON array of Vietnamese sentences, index-ordered. For each sentence, find any English words or phrases that this Vietnamese-only voice would mispronounce. ${PHONETIC_RULES}

Process every sentence independently and return an array of the EXACT same length and in the EXACT same order.

Input sentences:
${JSON.stringify(chunk, null, 2)}

Return JSON: { "results": ["sentence 1 with only foreign words respelled", "sentence 2 ..."] }`;

    try {
      const result = await callGeminiWithKeyRotation(prompt, keys, { tier: 'fast', label: 'Phiên âm TTS' });
      const results = result?.results;
      if (!Array.isArray(results) || results.length !== chunk.length) {
        console.warn(`[TTS Phonetic Batch] Gemini trả về ${Array.isArray(results) ? `${results.length} dòng` : 'không phải mảng'} (cần ${chunk.length}) — bỏ qua mẻ này, sẽ phiên âm lẻ từng câu.`);
        continue;
      }
      chunk.forEach((original, i) => {
        const converted = typeof results[i] === 'string' ? results[i].trim() : '';
        cacheSet(original, converted || original);
      });
      console.log(`[TTS Phonetic Batch] Đã phiên âm sẵn ${chunk.length} câu bằng 1 lệnh gọi Gemini.`);
    } catch (err) {
      console.warn('[TTS Phonetic Batch] Bỏ qua bước gộp do lỗi Gemini:', err.message);
      tripCircuit(err);
      return;
    }
  }
}

export async function transliterateEnglishForVietnameseTts(text, geminiApiKeys) {
  const trimmed = (text || '').trim();
  if (!trimmed) return text;
  if (!hasLikelyForeignWord(trimmed)) return text;

  if (transliterationCache.has(trimmed)) return transliterationCache.get(trimmed);
  if (isSuppressed()) return text;

  const keys = (Array.isArray(geminiApiKeys) ? geminiApiKeys : [geminiApiKeys]).filter(Boolean);
  if (keys.length === 0) return text;

  const prompt = `${PHONETIC_INTRO}

Given the Vietnamese sentence below, find any English words or phrases that this Vietnamese-only voice would mispronounce. ${PHONETIC_RULES}

Sentence:
"""
${trimmed}
"""

Return JSON: { "text": "the same sentence with only foreign words respelled" }`;

  try {
    // Đây là việc "cơ khí" (chỉ đổi cách viết vài từ) — dùng tier 'fast' để khỏi ăn vào hạn mức
    // của model thông minh vốn dành riêng cho việc viết kịch bản.
    const result = await callGeminiWithKeyRotation(prompt, keys, { tier: 'fast', label: 'Phiên âm TTS' });
    const converted = typeof result?.text === 'string' ? result.text.trim() : '';
    const finalText = converted || text;
    cacheSet(trimmed, finalText);
    return finalText;
  } catch (err) {
    console.warn('[TTS Phonetic Transliteration] Bỏ qua bước phiên âm do lỗi Gemini:', err.message);
    tripCircuit(err);
    return text;
  }
}
