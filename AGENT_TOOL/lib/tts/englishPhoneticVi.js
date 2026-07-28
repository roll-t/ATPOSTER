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

export async function transliterateEnglishForVietnameseTts(text, geminiApiKeys) {
  const trimmed = (text || '').trim();
  if (!trimmed) return text;
  if (!hasLikelyForeignWord(trimmed)) return text;

  const keys = (Array.isArray(geminiApiKeys) ? geminiApiKeys : [geminiApiKeys]).filter(Boolean);
  if (keys.length === 0) return text;

  const prompt = `You are preparing input for a Vietnamese-ONLY text-to-speech voice engine. This voice engine can only read Vietnamese phonetics correctly — when it encounters a word spelled in its original English form, it mispronounces it badly (garbled, unintelligible), because it applies Vietnamese letter-reading rules to English spelling.

Given the Vietnamese sentence below, find any English words or phrases that this Vietnamese-only voice would mispronounce, and rewrite ONLY those words as a Vietnamese phonetic respelling that approximates their English pronunciation when read aloud using Vietnamese spelling/tone rules (e.g. "stress" -> "xì-trét", "marketing" -> "ma-kết-tinh", "email" -> "i-meo", "deadline" -> "đét-lai", "freelance" -> "phri-lan", "mindset" -> "main-sét"). Do NOT touch any actual Vietnamese word, punctuation, numbers, or sentence structure — keep everything else character-for-character identical. Do not translate meaning, only respell the pronunciation of genuinely foreign words. If there are no English words at all, return the sentence completely unchanged.

Sentence:
"""
${trimmed}
"""

Return JSON: { "text": "the same sentence with only foreign words respelled" }`;

  try {
    const result = await callGeminiWithKeyRotation(prompt, keys);
    const converted = typeof result?.text === 'string' ? result.text.trim() : '';
    return converted || text;
  } catch (err) {
    console.warn('[TTS Phonetic Transliteration] Bỏ qua bước phiên âm do lỗi Gemini:', err.message);
    return text;
  }
}
