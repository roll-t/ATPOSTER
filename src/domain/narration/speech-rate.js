/**
 * Tốc độ đọc của giọng TTS, dùng để quy đổi giữa "số từ" và "số giây".
 *
 * Đây là NGUỒN DUY NHẤT cho con số này. Trước đây mỗi nơi tự khai một hằng số riêng (prompt viết
 * kịch bản, prompt viết bù, ước tính hiển thị trên giao diện) nên chúng lệch nhau và không nơi nào
 * khớp với thực tế.
 *
 * SỐ LIỆU ĐO THẬT (ffprobe trên file mp3 do chính pipeline TTS sinh ra, đối chiếu với số từ trong
 * manifest.json của cùng dự án):
 *   khong_bai_thuc_chi_260806_155246 : 940 từ / 214.1s = 4.39 từ/giây
 *   ban_duoc_phep_ngung_260806_150917: 204 từ /  47.9s = 4.26 từ/giây
 *   -> trung bình 4.37 từ/giây
 *
 * Hằng số cũ là 2.5 — thấp hơn thực tế 1.75 lần, nên MỌI video dựng ra đều ngắn hơn thời lượng
 * người dùng đặt khoảng 43%: đặt 4 phút chỉ nhận được hơn 2 phút.
 *
 * Lý do 2.5 sai: countWords tách theo khoảng trắng, mà tiếng Việt viết rời từng âm tiết — "một từ"
 * ở đây thực chất là một âm tiết, đọc nhanh hơn nhiều so với một từ tiếng Anh.
 *
 * Cố ý lấy 4.3 (thấp hơn 4.37 đo được một chút): ước tính tốc độ đọc thấp hơn thực tế sẽ khiến
 * kịch bản được viết dài hơn mục tiêu một nhịp — an toàn hơn hụt, vì khâu dựng cắt được phần thừa
 * nhưng không tự sinh thêm nội dung khi thiếu.
 */
export const WORDS_PER_SECOND_VI = 4.3;

/**
 * Tiếng Anh giữ 2.8 từ/giây: ở đây "từ" là từ thật (nhiều âm tiết) chứ không phải âm tiết rời như
 * tiếng Việt, nên con số này vốn đã sát thực tế. Chưa đo lại vì luồng đọc tiếng Anh dùng rất ít.
 */
export const WORDS_PER_SECOND_EN = 2.8;

/**
 * Nhịp đọc TIẾNG ANH THIỀN, chậm hẳn so với giọng kể thường: dùng cho skill buddhist_wisdom
 * (podcast Phật pháp), nơi prompt cố tình yêu cầu đọc chậm, ngắt nhiều, có khoảng lặng.
 *
 * Đây phải là NGUỒN DUY NHẤT cho cả hai phía, nếu không hai phía tự đoán lấy và lệch nhau:
 *  - buildBuddhistWisdomScriptPrompt() lấy số này để ra số từ mục tiêu cho từng mốc thời lượng.
 *  - Giao diện lấy số này để hiện dòng "đọc khoảng ... phút".
 * Trước đây giao diện dùng nhầm WORDS_PER_SECOND_VI (4.3) cho kịch bản 100% tiếng Anh, nên một
 * kịch bản 833 từ hiện ra "3 phút 14 giây" trong khi đọc thật mất khoảng 6 phút 30.
 */
export const WORDS_PER_SECOND_EN_SLOW = 2.1;

/**
 * Nhịp đọc TIẾNG NHẬT trầm/thiền, tính bằng KÝ TỰ mỗi giây.
 *
 * Phải đổi đơn vị sang ký tự chứ không dùng "từ" như các ngôn ngữ trên: tiếng Nhật viết liền,
 * không có khoảng trắng giữa từ. Đếm theo khoảng trắng thì cả một câu 34 ký tự ra đúng 1 "từ",
 * và mọi mục tiêu độ dài lệch khoảng 30 lần.
 *
 * SỐ LIỆU ĐO THẬT (file ElevenLabs của chính skill này, kịch bản 二人の僧と川の手放し):
 *   3485 ký tự / 492 giây (8:12) = 7.08 ký tự/giây
 *
 * Lấy 7.0 (thấp hơn số đo một chút) theo đúng nguyên tắc của cả file này: ước tính THẤP hơn thực
 * tế thì kịch bản viết ra dài hơn mục tiêu một nhịp — an toàn hơn hụt, vì khâu dựng cắt được phần
 * thừa nhưng không tự sinh thêm nội dung khi thiếu.
 *
 * Hằng số cũ là 5.0, đặt bằng ƯỚC LƯỢNG (~300 ký tự/phút, suy từ tốc độ đọc tin tức Nhật rồi trừ
 * hao cho nhịp đọc thiền). Thực tế ElevenLabs đọc NHANH HƠN 42%. Hậu quả đo được: kịch bản 135
 * slide đáng lẽ dài 11,3 phút thì audio thật chỉ 8,2 phút, và mỗi ảnh chỉ đứng 3,6 giây thay vì 5.
 *
 * Con số này phụ thuộc giọng đọc được chọn bên ElevenLabs. Đổi sang giọng khác hẳn về nhịp thì
 * nên đo lại: lấy tổng ký tự của kịch bản chia cho độ dài file audio, cả hai đều hiện sẵn ở bảng
 * "Ghép giọng ElevenLabs" trong Bước 1.
 */
export const CHARS_PER_SECOND_JA_SLOW = 7.0;

// Có ký tự Hiragana / Katakana / Kanji hay không. Dùng để chọn ĐƠN VỊ đếm, nên chỉ cần biết văn
// bản có phải tiếng Nhật hay không, không cần phân biệt Nhật với Trung ở mức tinh vi hơn.
const JAPANESE_CHAR = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/;

export function isJapaneseText(text) {
  return JAPANESE_CHAR.test(String(text || ''));
}

/**
 * Đơn vị độ dài của lời thoại: KÝ TỰ với tiếng Nhật, TỪ với các ngôn ngữ tách bằng khoảng trắng.
 *
 * Mọi chỗ so sánh "kịch bản đã đủ dài chưa" phải đi qua đây, nếu không phần tiếng Nhật sẽ luôn bị
 * coi là hụt gần hết và kích hoạt lượt viết bù vô nghĩa.
 */
export function countNarrationUnits(text) {
  const clean = String(text || '').trim();
  if (!clean) return 0;
  if (isJapaneseText(clean)) {
    // Bỏ khoảng trắng và xuống dòng: chúng không được đọc thành tiếng nên không tính thời lượng.
    return clean.replace(/\s+/g, '').length;
  }
  return clean.split(/\s+/).filter(Boolean).length;
}

export function wordsPerSecond(isVietnamese) {
  return isVietnamese ? WORDS_PER_SECOND_VI : WORDS_PER_SECOND_EN;
}
