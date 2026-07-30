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
 * ĐÃ VÔ HIỆU HÓA: Hệ thống hiện tại đã tự đọc được tiếng Anh.
 */
export async function prewarmTransliterationCache(texts, geminiApiKeys) {
  return;
}

export async function transliterateEnglishForVietnameseTts(text, geminiApiKeys) {
  return text;
}
