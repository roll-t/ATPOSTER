/**
 * Bóc tách + parse JSON trả về từ Gemini, có cơ chế tự sửa các lỗi JSON phổ biến mà
 * model hay mắc phải (dù đã bật responseMimeType: 'application/json'), ví dụ: bọc trong
 * ```json fences, còn dấu phẩy thừa trước '}'/']', chèn ký tự xuống dòng thô bên trong
 * 1 chuỗi thay vì escape thành \n, hoặc kèm theo nội dung thừa sau khi JSON đã kết thúc
 * (lời giải thích, fence đóng còn sót lại, JSON lặp lại...).
 */

// Escape các ký tự điều khiển (xuống dòng, tab...) bị chèn thô BÊN TRONG một chuỗi JSON,
// vì đây là nguyên nhân phổ biến khiến JSON.parse thất bại dù nội dung nhìn hợp lý.
function escapeStrayControlChars(text) {
  let result = '';
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escapeNext) {
      result += ch;
      escapeNext = false;
      continue;
    }
    if (ch === '\\') {
      result += ch;
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString && (ch === '\n' || ch === '\r' || ch === '\t')) {
      result += ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : '\\t';
      continue;
    }
    result += ch;
  }
  return result;
}

function stripTrailingCommas(text) {
  return text.replace(/,\s*([}\]])/g, '$1');
}

/**
 * Escape các dấu " nằm lẫn (chưa escape) BÊN TRONG 1 chuỗi JSON — ví dụ Gemini viết
 * "visualDescription": "He said "hello" to her" thay vì dùng \" hoặc dấu nháy đơn, dù
 * prompt đã yêu cầu dùng dấu nháy đơn cho trích dẫn bên trong chuỗi (JSON_SAFETY_SUFFIX
 * trong callGeminiApi.js). Đây là nguyên nhân phổ biến của lỗi "Expected ',' or '}'
 * after property value in JSON" — dấu " lạc bị JSON.parse hiểu nhầm là kết thúc chuỗi
 * sớm, khiến phần còn lại của chuỗi bị coi là cú pháp thừa.
 *
 * Với mỗi dấu " gặp trong lúc đang ở giữa 1 chuỗi: nhìn tiếp ký tự có nghĩa kế tiếp
 * (bỏ qua khoảng trắng) - nếu là , } ] : hoặc hết chuỗi thì coi là dấu đóng chuỗi hợp
 * lệ; ngược lại coi là dấu " lạc nằm trong nội dung, escape nó và coi như vẫn đang ở
 * trong chuỗi. Đây là suy đoán (không thể biết chắc 100% ý định của model), nên chỉ
 * dùng làm phương án dự phòng khi cách parse thông thường đã thất bại (xem bên dưới).
 */
function escapeUnescapedQuotes(text) {
  let result = '';
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escapeNext) {
      result += ch;
      escapeNext = false;
      continue;
    }
    if (ch === '\\') {
      result += ch;
      escapeNext = true;
      continue;
    }
    if (ch !== '"') {
      result += ch;
      continue;
    }

    if (!inString) {
      inString = true;
      result += ch;
      continue;
    }

    let j = i + 1;
    while (j < text.length && /\s/.test(text[j])) j++;
    const next = text[j];
    const looksLikeTerminator =
      next === undefined || next === ',' || next === '}' || next === ']' || next === ':';

    if (looksLikeTerminator) {
      inString = false;
      result += ch;
    } else {
      result += '\\"';
    }
  }
  return result;
}

function stripCodeFences(rawText) {
  const text = (rawText || '').trim();
  if (!text.startsWith('```')) {
    return text;
  }
  // Bắt nội dung giữa fence mở đầu và fence đóng GẦN NHẤT — trước đây fence đóng
  // bị bắt buộc phải nằm ở cuối chuỗi (/```$/), nên nếu Gemini chèn thêm văn bản
  // sau fence đóng (lời giải thích, ghi chú...), phần thừa đó không bị cắt bỏ và
  // khiến JSON.parse báo lỗi "Unexpected non-whitespace character after JSON".
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)```/i);
  return fenceMatch ? fenceMatch[1].trim() : text;
}

/**
 * Tìm và cắt ra giá trị JSON (object/array) đầy đủ ĐẦU TIÊN trong chuỗi, bỏ qua mọi
 * nội dung thừa phía sau nó — nguyên nhân phổ biến nhất của lỗi "Unexpected
 * non-whitespace character after JSON at position X" (Gemini vẫn kèm lời giải
 * thích/ghi chú/JSON lặp lại sau khối JSON chính dù đã bật responseMimeType).
 * Trả về null nếu không tìm được điểm đóng cân bằng (JSON có thể bị cắt cụt giữa
 * chừng do hết token) — khi đó để nguyên văn bản gốc cho các bước parse sau xử lý.
 */
function extractFirstJsonValue(text) {
  const start = text.search(/[{[]/);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === '\\') {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === '{' || ch === '[') {
      depth++;
    } else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

/**
 * Cố gắng parse JSON từ phản hồi thô của Gemini, thử lần lượt các bước sửa lỗi phổ biến
 * trước khi từ bỏ. Ném lại lỗi gốc (đã parse thất bại) nếu không cách nào sửa được.
 */
export function parseGeminiJson(rawText) {
  const fenceStripped = stripCodeFences(rawText);
  const text = extractFirstJsonValue(fenceStripped) || fenceStripped;

  // Phương án dự phòng: escape trước các dấu " lạc nằm trong chuỗi (vd Gemini quên
  // dùng dấu nháy đơn khi trích dẫn trong 1 câu mô tả), RỒI mới dò khối JSON đầu tiên
  // — nếu dấu " lạc còn nguyên, việc dò ranh giới chuỗi/độ sâu ngoặc ở
  // extractFirstJsonValue sẽ bị lệch ngay từ dấu " đó. Chỉ thử các phiên bản này khi
  // nhóm attempts phía trên (không sửa quote) đã thất bại hết, để không có rủi ro làm
  // hỏng 1 JSON vốn dĩ đã hợp lệ.
  const quotesFixedRaw = escapeUnescapedQuotes(fenceStripped);
  const quotesFixedText = extractFirstJsonValue(quotesFixedRaw) || quotesFixedRaw;

  const attempts = [
    text,
    escapeStrayControlChars(text),
    stripTrailingCommas(text),
    stripTrailingCommas(escapeStrayControlChars(text)),
    quotesFixedText,
    escapeStrayControlChars(quotesFixedText),
    stripTrailingCommas(quotesFixedText),
    stripTrailingCommas(escapeStrayControlChars(quotesFixedText))
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
