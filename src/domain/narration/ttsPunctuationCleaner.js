/**
 * Xử lý và làm sạch dấu câu (đặc biệt là dấu phẩy thừa/vụn vặt) trước khi đưa vào
 * các công cụ Text-To-Speech (Edge TTS, VieNeu, CapCut).
 *
 * Bối cảnh:
 * - Các engine TTS neural (Edge TTS, VieNeu v3 Turbo, CapCut) đều tự động ngắt hơi
 *   và tạo khoảng dừng rõ rệt (~300ms) ở TẤT CẢ các dấu phẩy (,).
 * - Các phân cảnh ngắn (6-14 từ) nếu bị chèn dấu phẩy vụn vặt (nhất là ngắt đôi giữa
 *   chủ ngữ và vị ngữ: "mức nhiệt trung bình, giảm xuống...") sẽ khiến giọng đọc bị
 *   giật giật, ngắt quãng, thiếu tự nhiên.
 * - Module này thuộc tầng domain: thuần túy xử lý text, không phụ thuộc I/O hay SDK.
 * - Lưu ý tiếng Việt: KHÔNG dùng \b vì \b của JavaScript chỉ nhận diện ASCII, từ tiếng Việt
 *   có dấu như "là", "đạt", "trở thành" sẽ không khớp \b. Dùng (?!\p{L}) và (?<!\p{L}).
 */

// Danh sách động từ vị ngữ thường bị AI chèn dấu phẩy ngăn cách với chủ ngữ
const PREDICATE_VERBS_RE = /,\s*(giảm|tăng|rơi|sụt|hạ|vọt|leo|đạt|chạm|xuống|lên|biến đổi|thay đổi|chuyển thành|trở nên|trở thành|bắt đầu|kết thúc|xuất hiện|mất đi|tan biến)(?!\p{L})/giu;

// Các từ nối vị ngữ/hệ từ tuyệt đối không đứng sau dấu phẩy trong câu đơn
const LINKING_WORDS_RE = /,\s*(là|khiến|khiến cho|làm cho|dẫn đến|mang lại|tạo nên|tạo ra|gây ra)(?!\p{L})/giu;

// Cụm chủ ngữ chỉ đại lượng/chỉ số
const SUBJECT_METRIC_RE = /((?:^|[\s,])(?:mức|lượng|nhiệt độ|áp suất|tỷ lệ|tỉ lệ|số lượng|doanh số|giá trị|sức gió|độ sâu|tốc độ|thời gian|diện tích|khối lượng|trọng lượng|độ ẩm)\s+[\p{L}\d\s]+?),\s*(giảm|tăng|rơi|sụt|hạ|vọt|leo|đạt|chạm|xuống|lên|biến đổi|thay đổi|trở nên|trở thành)(?!\p{L})/giu;

/**
 * Làm sạch dấu phẩy và dấu câu bất thường trong câu để TTS đọc liền mạch.
 *
 * @param {string} text - Câu thoại/lời kể gốc
 * @returns {string} - Câu thoại đã làm mịn dấu câu
 */
export function cleanUnnaturalTtsCommas(text) {
  let s = String(text || '').trim();
  if (!s) return '';

  // 1. Chuẩn hoá khoảng trắng quanh dấu câu
  s = s.replace(/\s+([,.:;?!])/g, '$1'); // Xoá cách trống trước dấu câu
  s = s.replace(/,{2,}/g, ',');          // Bỏ dấu phẩy kép: ,, -> ,
  s = s.replace(/,\s*,/g, ',');          // , , -> ,
  s = s.replace(/,\s*\./g, '.');         // ,. -> .
  s = s.replace(/\.\s*,/g, '.');         // ., -> .

  // 2. Bỏ dấu phẩy trước từ nối vị ngữ / hệ từ (", là", ", khiến cho", ", dẫn đến"...)
  s = s.replace(LINKING_WORDS_RE, ' $1');

  // 3. Bỏ dấu phẩy cắt giữa chủ ngữ chỉ số lượng/trạng thái và động từ vị ngữ
  // Ví dụ: "mức nhiệt trung bình, giảm xuống" -> "mức nhiệt trung bình giảm xuống"
  // "nhiệt độ bề mặt, hạ xuống" -> "nhiệt độ bề mặt hạ xuống"
  // "áp suất không khí, tăng vọt" -> "áp suất không khí tăng vọt"
  s = s.replace(SUBJECT_METRIC_RE, '$1 $2');

  // 4. Nếu câu vẫn còn dấu phẩy trước động từ vị ngữ phổ biến khác
  // và trước đó đã có một dấu phẩy mở đầu (ví dụ: "Sau một tuần, ..., giảm xuống...")
  // thì dấu phẩy thứ hai chắc chắn là phẩy vụn cắt giữa S và V.
  const commaCount = (s.match(/,/g) || []).length;
  if (commaCount >= 2) {
    s = s.replace(PREDICATE_VERBS_RE, ' $1');
  }

  // 5. Làm sạch khoảng trắng thừa
  return s.replace(/\s+/g, ' ').trim();
}
