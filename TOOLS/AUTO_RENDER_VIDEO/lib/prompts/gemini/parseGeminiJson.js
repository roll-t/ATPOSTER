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
  return salvage(rawText, { requireNothingDropped: false });
}

/**
 * Biến thể AN TOÀN TUYỆT ĐỐI của salvageTruncatedJson: chỉ nhận khi phần bị bỏ đi CHỈ LÀ khoảng
 * trắng — tức là model đã viết xong xuôi mọi thứ, chỉ thiếu đúng (các) dấu ngoặc đóng cuối cùng.
 *
 * Vì sao cần tách riêng: quan sát thật với gemini-3.5-flash — nó trả về JSON đủ title + đủ 13/13
 * đoạn, chỉ thiếu duy nhất dấu `}` cuối cùng, và Google KHÔNG báo finishReason MAX_TOKENS nên
 * engine xếp vào loại "JSON hỏng" rồi gọi lại Gemini từ đầu. Mỗi lượt gọi lại tốn 15-30 giây +
 * 1 lượt quota, và vứt bỏ nguyên một kịch bản vốn dùng được 100%.
 *
 * Không dùng thẳng salvageTruncatedJson cho ca này được: nó sẵn sàng CẮT BỎ phần đuôi dở dang để
 * cứu lấy phần đầu, nên nếu JSON hỏng thật ở giữa thì nó trả về kịch bản thiếu đoạn — chấp nhận
 * được khi đã hết đường (đó là lý do nó vẫn được gọi ở bước cuối), nhưng KHÔNG được phép nhận ngay
 * từ lượt hỏng đầu tiên trong khi gọi lại Gemini vẫn còn cơ hội ra bản đầy đủ.
 */
export function salvageUnclosedJson(rawText) {
  return salvage(rawText, { requireNothingDropped: true });
}

function salvage(rawText, { requireNothingDropped }) {
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
        if (whole.ok && whole.value && typeof whole.value === 'object') return whole.value;

        // Ngoặc CÂN BẰNG nhưng vẫn không parse được — không phải cắt ngang, mà có 1 token lạ chen
        // vào đâu đó (quan sát thật: Gemini trả JSON gần như hoàn chỉnh, đủ segments + title +
        // thumbnail, nhưng lỗi "Expected ',' or '}' after property value" ngay sát cuối). Trước
        // đây `return null` thẳng ở đây, bỏ qua luôn phần ranh giới an toàn đã ghi nhận được TRƯỚC
        // đó trong lúc quét (vd ngay sau khi mảng "segments" đóng xong) — mất trắng cả phần lớn nội
        // dung tốt chỉ vì lỗi nằm ở đúng đoạn cuối. Dừng quét tại đây, để rơi xuống nhánh cứu vớt
        // theo ranh giới an toàn gần nhất bên dưới, giống hệt cách xử lý khi bị cắt ngang thật.
        break;
      }
      if (isSafeBoundary(stack)) {
        lastSafeEnd = i + 1;
        lastSafeStack = [...stack];
      }
    }
  }

  if (lastSafeEnd === -1 || !lastSafeStack) return null;
  // Chỉ thiếu ngoặc đóng thì phần sau ranh giới an toàn không còn gì ngoài khoảng trắng. Còn chữ
  // nghĩa nào ở đó nghĩa là ta đang cắt bỏ nội dung thật — người gọi ở chế độ này không cho phép.
  if (requireNothingDropped && text.slice(lastSafeEnd).trim() !== '') return null;

  const closers = lastSafeStack.reverse().join('');
  const result = tryParseWithRepairs(text.slice(start, lastSafeEnd) + closers);
  return result.ok && result.value && typeof result.value === 'object' ? result.value : null;
}

// Một giá trị JSON hợp lệ chỉ có thể mở đầu bằng các ký tự này.
const VALID_VALUE_START = /["{[\dtfn-]/;

/**
 * Vá lại giá trị chuỗi bị THIẾU DẤU NHÁY MỞ ĐẦU.
 *
 * Gemini thỉnh thoảng viết ra:  "subtitle": Có những bài học...\nThere are..."
 * — có nháy đóng ở cuối nhưng mất nháy mở, nên JSON.parse chết ngay tại chữ cái đầu tiên của giá
 * trị ("Unexpected token 'C'"). Quan sát thật: đúng một lượt sinh kịch bản, slide 1 có nháy đủ còn
 * slide 2 đến 9 mất sạch nháy mở — hỏng cả lượt gọi dù nội dung viết ra hoàn toàn dùng được.
 *
 * Các bước sửa sẵn có không cứu được ca này: chúng xử lý nháy THỪA, dấu phẩy thừa và xuống dòng
 * thô, chứ không xử lý nháy THIẾU.
 *
 * Làm theo TỪNG DÒNG cho an toàn: chỉ đụng vào dòng có dạng `"khoá": <giá trị>` mà giá trị mở đầu
 * bằng ký tự KHÔNG THỂ bắt đầu một giá trị JSON, và kết thúc bằng dấu nháy (có thể kèm dấu phẩy).
 * Dòng JSON hợp lệ luôn mở đầu bằng một trong các ký tự ở VALID_VALUE_START nên không bao giờ lọt
 * vào đây — không có rủi ro làm hỏng một JSON vốn đã đúng.
 */
function fixMissingOpeningQuote(text) {
  return String(text || '')
    .split('\n')
    .map((line) => {
      const m = line.match(/^(\s*"[^"]+"\s*:\s*)(\S.*?)(\s*,?\s*)$/);
      if (!m) return line;
      const [, head, rawValue, tail] = m;
      if (VALID_VALUE_START.test(rawValue[0])) return line;
      if (!rawValue.endsWith('"')) return line;
      // Giá trị đã có nháy đóng ở cuối -> chỉ cần trả lại nháy mở.
      return `${head}"${rawValue}${tail}`;
    })
    .join('\n');
}

/** Thử parse 1 chuỗi qua đủ các bước sửa lỗi phổ biến. Không ném lỗi — trả về kết quả có cờ ok. */
function tryParseWithRepairs(text) {
  const quoteFixed = fixMissingOpeningQuote(text);
  const attempts = [
    text,
    escapeStrayControlChars(text),
    quoteFixed,
    escapeStrayControlChars(quoteFixed),
    stripTrailingCommas(quoteFixed),
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

  // Sửa nháy mở bị thiếu TRƯỚC KHI chạy extractFirstJsonValue — tránh trường hợp
  // extractFirstJsonValue đọc sai ranh giới chuỗi khi nháy mở vắng mặt, trả về
  // đoạn cắt sai làm fixMissingOpeningQuote bên trong tryParseWithRepairs không còn
  // đủ ngữ cảnh để sửa.
  const openQuoteFixed = fixMissingOpeningQuote(fenceStripped);
  const openQuoteText = extractFirstJsonValue(openQuoteFixed) || openQuoteFixed;

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

  const openFixed = tryParseWithRepairs(openQuoteText);
  if (openFixed.ok) return openFixed.value;

  const quotesFixed = tryParseWithRepairs(quotesFixedText);
  if (quotesFixed.ok) return quotesFixed.value;

  throw quotesFixed.error || openFixed.error || plain.error;
}
