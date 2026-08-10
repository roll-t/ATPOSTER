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
 * Có được phép cắt tại ranh giới ứng với ngăn xếp ngoặc này không?
 *
 * Chỉ nhận đúng 2 chỗ:
 *  - đang ở GIỮA CÁC PHẦN TỬ của mảng NGOÀI CÙNG (thường là "segments");
 *  - hoặc chưa vào mảng nào, đang ở ranh giới thuộc tính của object gốc.
 *
 * Vì sao không chỉ cần "ngoặc trong cùng là mảng": mỗi segment còn chứa mảng con của riêng nó
 * (`elements` của video người que), nên dấu } của một phần tử trong `elements` cũng thoả điều kiện
 * đó. Cắt tại đấy vẫn ra JSON hợp lệ, nhưng đẻ ra một segment CHỈ CÓ `elements`, mất sạch
 * `dialogueOrNarration` lẫn `subtitle` — lọt hết mọi kiểm tra rồi vỡ tận khâu lồng tiếng/phụ đề,
 * rất khó lần ngược nguyên nhân. Thà bỏ trọn segment dở dang đó.
 */
function isSafeBoundary(stack) {
  const outermostArray = stack.indexOf(']');
  if (outermostArray === -1) return stack.length === 1;
  return stack.length === outermostArray + 1;
}

/**
 * Cứu vớt một JSON bị CẮT CỤT giữa chừng — model chạm trần token đầu ra nên dừng ngay giữa một
 * chuỗi, để lại phần đuôi dở dang (lỗi "Unterminated string in JSON at position ...").
 *
 * Cách làm: đi dọc văn bản, ghi nhớ vị trí ngay sau PHẦN TỬ CON HOÀN CHỈNH cuối cùng (dấu } hoặc
 * ] đóng lại một phần tử mà vẫn còn ngoặc cha đang mở), cắt tại đó rồi đóng nốt các ngoặc còn mở.
 * Kết quả là một kịch bản thiếu vài đoạn cuối nhưng dùng được, thay vì mất trắng cả lượt gọi.
 *
 * Trả về null nếu văn bản không hề bị cắt cụt (ngoặc đã cân bằng) hoặc không cứu nổi.
 */
export function salvageTruncatedJson(rawText) {
  const text = stripCodeFences(rawText);
  const start = text.search(/[{[]/);
  if (start === -1) return null;

  const stack = [];
  let inString = false;
  let escapeNext = false;
  let lastSafeEnd = -1;
  let lastSafeStack = null;

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
      stack.push(ch === '{' ? '}' : ']');
    } else if (ch === '}' || ch === ']') {
      stack.pop();
      if (stack.length === 0) {
        // Ngoặc ngoài cùng đã đóng: model kịp viết trọn JSON rồi mới chạm trần token. Vẫn phải
        // parse và trả về — trả null ở đây khiến cả lượt gọi thất bại trắng tay dù JSON hoàn toàn
        // dùng được, sau khi đã đốt thêm 2 lượt nới trần token vô ích.
        const whole = tryParseWithRepairs(text.slice(start, i + 1));
        return whole.ok && whole.value && typeof whole.value === 'object' ? whole.value : null;
      }
      if (isSafeBoundary(stack)) {
        lastSafeEnd = i + 1;
        lastSafeStack = [...stack];
      }
    }
  }

  if (lastSafeEnd === -1 || !lastSafeStack) return null;

  const closers = lastSafeStack.reverse().join('');
  const result = tryParseWithRepairs(text.slice(start, lastSafeEnd) + closers);
  return result.ok && result.value && typeof result.value === 'object' ? result.value : null;
}

/** Thử parse 1 chuỗi qua đủ các bước sửa lỗi phổ biến. Không ném lỗi — trả về kết quả có cờ ok. */
function tryParseWithRepairs(text) {
  const attempts = [
    text,
    escapeStrayControlChars(text),
    stripTrailingCommas(text),
    stripTrailingCommas(escapeStrayControlChars(text)),
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      return { ok: true, value: JSON.parse(attempt) };
    } catch (err) {
      lastError = err;
    }
  }
  return { ok: false, error: lastError };
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

  const plain = tryParseWithRepairs(text);
  if (plain.ok) return plain.value;

  const quotesFixed = tryParseWithRepairs(quotesFixedText);
  if (quotesFixed.ok) return quotesFixed.value;

  throw quotesFixed.error || plain.error;
}
