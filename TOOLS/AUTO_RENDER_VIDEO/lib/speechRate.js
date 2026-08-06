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

export function wordsPerSecond(isVietnamese) {
  return isVietnamese ? WORDS_PER_SECOND_VI : WORDS_PER_SECOND_EN;
}
