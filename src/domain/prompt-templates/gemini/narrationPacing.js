/**
 * Hướng dẫn nhịp điệu/ngắt nghỉ qua dấu câu — DÙNG CHUNG cho mọi nơi sinh/viết lại lời kể
 * (moralTalkSlideshow.js, imageSlideshow.js, regenerateNarration.js). Tách riêng thành 1 hàm
 * dùng chung để tránh lặp lại 3 bản y hệt nhau ở 3 file rồi lệch pha khi cần chỉnh (đã từng gặp
 * đúng lỗi này với style văn phong moral-talk, xem moralTalkVoiceStyle.js).
 *
 * Bối cảnh: TTS engine (Edge TTS miễn phí) không hỗ trợ <break> SSML, hoàn toàn ngắt nghỉ dựa
 * vào dấu câu thật trong text — nên đây là công cụ DUY NHẤT để tạo nhịp. Người dùng phản hồi
 * thực tế rằng câu sinh ra hay bị dài không có dấu, đọc dồn dập/hụt hơi — nên bản hướng dẫn này
 * ép rõ ngưỡng số từ tối đa giữa 2 dấu câu, thay vì chỉ nói chung chung "nên ngắt câu".
 */
export function buildPunctuationRhythmGuidance() {
  return `Pacing & natural flow via punctuation (CRITICAL — controls how the narration flows when spoken):
   - Text-to-speech engines (Edge TTS, VieNeu, CapCut) take a full audible breath and pause (~300ms) at EVERY single comma (,), and a longer stop at periods (.).
   - SPEAK SMOOTHLY AND CONTINUOUSLY (LIỀN MẠCH, TRÔI CHẢY):
     * In short-form videos, each segment is already concise (typically 6-14 words).
     * DO NOT chop up a short sentence with unnecessary commas — doing so forces the voice to stutter, drop pitch, and speak in awkward, jerky fragments (nói giật giật, ngắt ngắt khó chịu).
     * Write each short segment as ONE smooth, unbroken, continuous breath clause. Let the voice read the whole thought fluently without artificial pauses.
   - STRICT COMMA RULES — ONLY USE A COMMA WHEN GENUINELY LONG OR COMPOUND:
     * Only insert a comma when a clause is genuinely LONG (over ~15-18 words) and truly requires a breath pause, or between two clearly distinct grammatical clauses (e.g. before contrasting conjunctions: "nhưng", "tuy nhiên", "mặc dù", "thế nhưng").
     * STRICT PROHIBITION: NEVER place a comma between a subject and its predicate/verb! (e.g. CẤM: "mức nhiệt trung bình, giảm xuống âm 17 độ C" ❌ -> PHẢI VIẾT: "mức nhiệt trung bình giảm xuống âm 17 độ C" ✅; CẤM: "nguyên nhân chính, là..." ❌ -> PHẢI VIẾT: "nguyên nhân chính là..." ✅).
     * NEVER sprinkle commas every 3 to 4 words. A 10-word sentence should almost NEVER have 2 commas.
   - Use periods (.) to firmly close complete ideas so the voice pauses naturally only at the end of a sentence before moving to the next idea.
   - Read each sentence aloud in your mind: if it stumbles or feels jerky and disjointed, REMOVE the comma so it speaks in one clean, natural flow.`;
}

/**
 * Người dùng phản hồi thực tế: giọng CapCut đôi khi phát âm sai 1 số từ tiếng Việt cụ thể — vd
 * "dẫn" nghe ra thành "vẫn", "giao" nghe ra thành "vao" (lỗi mô hình nhận diện âm vị "d"/"gi",
 * không liên quan tới lỗi chính tả trong kịch bản). KHÔNG THỂ né hết mọi từ có "d"/"gi" vì 2 phụ
 * âm này quá phổ biến trong tiếng Việt (dạy, dẫn, giáo, gia đình, giao tiếp...) — né hết sẽ làm
 * văn phong gượng gạo hoặc bất khả thi khi chính chủ đề video là về "giao tiếp". Vì vậy đây chỉ
 * là gợi ý NHẸ, chỉ áp dụng khi có từ đồng nghĩa tự nhiên tương đương — không ép buộc, không né
 * các từ chủ đề cốt lõi.
 */
export function buildVietnamesePronunciationNote() {
  return `Known TTS pronunciation quirk (minor, apply only when it doesn't force awkward phrasing): the voice engine sometimes mispronounces a few specific Vietnamese words — e.g. "dẫn" can come out sounding like "vẫn", "giao" can come out sounding like "vao". Where a natural, equally clear synonym exists, you may prefer it over these specific words — but do NOT contort the sentence, and do NOT avoid a word that is core to the topic itself (e.g. keep using "giao tiếp" freely when the video's topic is genuinely about communication).`;
}
