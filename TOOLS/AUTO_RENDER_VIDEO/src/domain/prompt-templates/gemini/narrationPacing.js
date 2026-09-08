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
  return `Rhythm & pacing via punctuation (IMPORTANT — this is what actually controls how the narration sounds when spoken): the text-to-speech engine has no real pause markup, it paces itself PURELY from punctuation — a comma makes it take a brief breath, a period makes it come to a fuller stop before continuing. The most common mistake to avoid: a sentence that runs on too long with no comma/period reads as one rushed, breathless stream — split MORE aggressively than feels necessary on the page:
   - Never let more than about 10-14 words pass without a comma or period. If a clause is running longer than that, break it with a comma at the nearest natural breath point (before "nhưng"/"và"/"mà"/"vì"/"rồi", or right after a complete clause) — even if the unbroken version would still be grammatically correct.
   - End each complete idea with a period instead of chaining several ideas together indefinitely — a full stop lets one idea land and gives the voice a real pause before the next idea starts.
   - After writing a sentence, silently read it back in one breath and ask: does this sound rushed? If yes, add another comma or split it into two sentences — do not leave it as one long unbroken clause.
   - Don't overload a sentence with commas just to slow it down either; each comma must sit at a genuine pause point, or the voice starts sounding choppy instead of natural.
   - Vary sentence length across the segment (a short, punchy sentence next to a slightly longer one) — but even the longer ones must still be broken up internally with commas, never left as one long unbroken clause.`;
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
