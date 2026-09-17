/**
 * Giữ đầu vào book pitch ở dạng brief nội dung thực dụng. Trước đây modal chỉ chuyển `topic.text`,
 * làm rơi mất `desc` (thường là công thức/bài học dùng được ngay) và để lượt dịch kế tiếp biến
 * góc sách thành một premise kể chuyện chung chung.
 */
export function buildBookPitchScenario(topic) {
  if (!topic || typeof topic === 'string') return String(topic || '').trim();

  const book = [topic.bookTitle, topic.author].filter(Boolean).join(' — ');
  const lines = [
    topic.angle ? `TRỌNG TÂM VIDEO: ${topic.angle}` : '',
    book ? `NGUỒN SÁCH: ${book}` : '',
    topic.painPoint ? `VẤN ĐỀ NGƯỜI XEM: ${topic.painPoint}` : '',
    topic.desc ? `CHẤT LIỆU CỐT LÕI: ${topic.desc}` : '',
    'ĐỊNH DẠNG BẮT BUỘC: Video danh sách thực dụng, không kể chuyện. Câu đầu phải nói rõ tổng số cách, dấu hiệu, bước hoặc nguyên tắc và lợi ích cụ thể. Sau đúng một câu giữ chân, bắt đầu ngay ý Một.',
  ].filter(Boolean);

  return lines.join('\n');
}

