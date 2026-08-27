import { parseGeminiJson, salvageTruncatedJson, salvageUnclosedJson } from './parseGeminiJson.js';
import { recordAttempt, recordDailyLimitObserved, isExhaustedToday } from './usageTracker.js';
import { AI_CONFIG } from '../../../config/ai.config.js';

const MODEL_TIERS = AI_CONFIG.MODEL_TIERS;
const DEFAULT_TIER = AI_CONFIG.DEFAULT_TIER;

// Nhắc thêm về định dạng JSON an toàn, gắn vào MỌI prompt gửi Gemini để giảm khả năng
// model trả JSON hỏng (ví dụ chèn dấu " chưa escape bên trong 1 chuỗi mô tả).
const JSON_SAFETY_SUFFIX = `

IMPORTANT JSON OUTPUT RULES:
- Return ONLY a single valid JSON object. No markdown, no comments, no trailing commas.
- Inside any string value, if you need to quote a word/phrase, use single quotes (') instead of double quotes ("). Never place an unescaped double-quote character inside a string value.
- When the text is Japanese, quote with the Japanese brackets 「」 — never with " inside a string value.
- Do not use literal newline characters inside string values; keep each string value on a single line.
- Never write a lone backslash inside a string value. The only backslash allowed is the one in \\n.
- Put a comma after EVERY property and EVERY array element except the last one. A missing comma is the most common way a long answer becomes unparseable — check the last property of each object before moving to the next.
- Emit EXACTLY the keys shown in the output shape, no more. Do not invent extra fields, and do not repeat a value under a second name. Every extra key lengthens the answer and raises the chance of running out of room before the JSON is closed.`;

/**
 * Trích đúng đoạn văn bản quanh vị trí mà JSON.parse báo lỗi.
 *
 * Phản hồi hỏng vẫn được đổ nguyên văn ra log, nhưng một kịch bản 130 slide dài hơn 44.000 ký tự —
 * đọc bằng mắt để tìm dấu phẩy thiếu là không khả thi. SyntaxError của V8 luôn kèm "position N",
 * nên cắt lấy vài dòng quanh N và đánh dấu đúng điểm gãy.
 */
function jsonErrorContext(error) {
  const raw = error?.rawText;
  const at = /position (\d+)/.exec(error?.message || '');
  if (!raw || !at) return '';
  const pos = Math.min(Number(at[1]), raw.length);
  const before = raw.slice(Math.max(0, pos - 160), pos);
  const after = raw.slice(pos, Math.min(raw.length, pos + 160));
  return `\n   ...${before}  <<<< GÃY Ở ĐÂY >>>>  ${after}...`;
}

// ---------------------------------------------------------------------------
// Bộ nhớ trạng thái xoay vòng — sống theo tiến trình server (mất khi restart dev server).
//
// Lý do phải nhớ: hạn mức free tier tính theo (project của key × model). Nếu không nhớ gì, MỖI
// lệnh gọi mới lại bắt đầu từ key #1 + model #1 — đúng cặp vừa mới dính 429 xong — nên lần nào
// cũng phải đốt 1 request chết (~300-800ms) chỉ để phát hiện lại điều đã biết. Với một mẻ lồng
// tiếng vài chục slide, riêng khoản này đã cộng thêm hàng chục giây trắng.
// ---------------------------------------------------------------------------

// `${model}::${key}` -> mốc thời gian (ms) được phép dùng lại cặp này.
const cooldownUntil = new Map();
// Key hỏng hẳn (sai / bị thu hồi / không có quyền) — loại khỏi mọi lượt thử trong phiên chạy này.
const deadKeys = new Set();
// Model không tồn tại / đã bị Google gỡ (404) — loại hẳn, vì mọi key đều sẽ gặp y hệt.
const deadModels = new Set();
// Model đang TREO (hết giờ chờ) -> mốc thời gian được phép dùng lại. Tách riêng khỏi `cooldownUntil`
// (vốn tính theo cặp model+key) vì hết giờ chờ là vấn đề của MODEL, không phải của key: đo thật cho
// thấy gemini-flash-latest treo giống hệt nhau trên cả 3 key. Bản cũ coi đây như lỗi của từng cặp
// nên thử lại đúng model treo đó với lần lượt từng key, đốt gấp ba thời gian mới chịu đổi model.
const modelSlowUntil = new Map();
// Cho model treo nghỉ hẳn vài phút. Sự cố kiểu này ở phía Google thường kéo dài, thử lại sau 30
// giây chỉ tổ mất thêm một timeout nữa.
const MODEL_TIMEOUT_COOLDOWN_MS = 5 * 60_000;
// Con trỏ round-robin: mỗi lệnh gọi bắt đầu từ một key khác nhau để TRẢI ĐỀU tải thay vì lần nào
// cũng dồn vào key #1 rồi mới rớt dần sang #2, #3 — cách cũ khiến key #1 luôn cạn quota trước
// trong khi key #2/#3 gần như không được dùng.
//
// LƯU Ý: vòng xoay này giờ CHỈ áp dụng cho các key từ #2 trở đi — xem resolveKeyIndex().
let roundRobinCursor = 0;

/**
 * Thứ tự thử key trong một lượt quét: KEY #1 LUÔN ĐI ĐẦU, các key còn lại mới xoay vòng.
 *
 * Vì sao phải phá vòng xoay đều: các key không còn ngang hàng nhau nữa. Một key trả phí có hạn mức
 * cao gấp nhiều lần key free, nên đáng được dùng trước; trải đều sang key free chỉ tổ làm chúng cạn
 * quota sớm trong khi key mạnh nhất vẫn còn nguyên. Quy ước: key đứng ĐẦU trong ô cài đặt là key
 * ưu tiên.
 *
 * Vẫn giữ round-robin cho phần đuôi vì lý do cũ vẫn đúng với nhóm key free ngang hàng: không xoay
 * thì key #2 luôn cạn trước trong khi #3 gần như không được đụng tới.
 *
 * Nếu key ưu tiên đang nghỉ (429) thì buildAttemptPlan tự xếp nó xuống nhóm `cooling`, các key khác
 * vẫn được dùng ngay — ưu tiên không có nghĩa là đứng chờ nó.
 */
function resolveKeyIndex(n, keyCount, offset) {
  if (n === 0 || keyCount < 2) return 0;
  return 1 + ((offset + n - 1) % (keyCount - 1));
}

// Trần thời gian NGỦ mỗi lần chờ. Tách bạch với `cooldownUntil`: cooldown có thể đặt xa cả tiếng
// (quota theo ngày) vì ta chỉ cần BỎ QUA cặp đó, còn ngủ thì không bao giờ được ngủ quá lâu kẻo
// treo cả stream lồng tiếng.
const MAX_SLEEP_MS = 15_000;
// Cooldown khi Google báo hết quota mà không kèm gợi ý thời gian chờ.
const DEFAULT_QUOTA_COOLDOWN_MS = 60_000;
// Cooldown khi model đó vốn KHÔNG được cấp quota free (limit: 0) — chờ vài giây là vô nghĩa.
const ZERO_QUOTA_COOLDOWN_MS = 30 * 60_000;
// Trần thời gian cho TOÀN BỘ 1 lệnh gọi (gồm cả các lần thử lại) — thà báo lỗi sớm còn hơn để
// người dùng nhìn thanh tiến độ đứng im vô thời hạn.
const DEFAULT_DEADLINE_MS = 90_000;
// Trần thời gian cho MỘT request HTTP đơn lẻ. Không có nó, một kết nối bị treo phía Google sẽ
// giữ `fetch` chờ vĩnh viễn (bản cũ không hề đặt timeout).
const DEFAULT_REQUEST_TIMEOUT_MS = 45_000;
// Quãng thời gian tối thiểu còn lại thì mới đáng khởi động thêm một lượt gọi. Ít hơn mức này thì
// lượt đó cầm chắc hết giờ giữa chừng — thà báo lỗi ngay còn hơn đốt thêm một request chết.
const MIN_ATTEMPT_BUDGET_MS = 8_000;
// JSON hỏng thường do bản thân prompt/nội dung, không phải do key — xoay hết 5 model × 3 key để
// gặp lại đúng lỗi đó là phí. Chặn ở vài lần.
const MAX_BAD_JSON_ATTEMPTS = 3;
// Trần token đầu ra tối đa mà các model Gemini hiện tại chấp nhận. Khi model bị cắt ngang vì chạm
// trần, engine tự NỚI trần rồi thử lại — nhưng không được vượt mốc này kẻo Google trả 400.
const MAX_OUTPUT_TOKENS_CEILING = 65_536;
// Số lần cho phép tự nới trần token. Nới 2 lần (×2 mỗi lần) là đủ gấp 4 lần trần ban đầu.
const MAX_TRUNCATION_RETRIES = 2;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Backoff có nhiễu ngẫu nhiên: nhiều lệnh gọi song song cùng thức dậy đúng một thời điểm sẽ lại
 *  ập vào Google cùng lúc và cùng dính 429 lần nữa (thundering herd). */
function withJitter(ms) {
  return Math.round(ms * (0.75 + Math.random() * 0.5));
}

/**
 * Rút hạn mức THEO NGÀY thật từ body lỗi 429 của Google, nếu có — dùng để tự học (xem
 * usageTracker.js), không phải để hiển thị.
 *
 * Trả về null bất cứ khi nào không CHẮC CHẮN đây là quota theo ngày (chứ không phải theo phút):
 * false negative (bỏ lỡ 1 lần học) chỉ tốn thêm vài request dò như trước giờ vẫn vậy; false
 * positive (nhận nhầm quota-phút thành quota-ngày) sẽ khoá oan 1 key/model cả ngày dù nó vẫn
 * dùng được sau vài chục giây — thiệt hại nặng hơn hẳn.
 *
 * Ưu tiên đọc cấu trúc có sẵn trong error.details (QuotaFailure.violations[], mỗi violation có
 * quotaId + quotaValue) — đây là dữ liệu CÓ CẤU TRÚC do Google trả về, đáng tin hơn hẳn regex trên
 * câu message tự do. Dự phòng bằng regex trên message CHỈ khi message có tín hiệu rõ ràng là theo
 * ngày (chứa "PerDay") — không suy luận từ mỗi cụm "limit: N" trơ trọi, vì cụm đó xuất hiện y hệt
 * cho cả quota theo phút.
 *
 * LƯU Ý: chưa có 1 lỗi 429 thật nào để đối chiếu tại thời điểm viết — cấu trúc QuotaFailure dựa
 * theo định dạng chuẩn của Google Cloud APIs (google.rpc.QuotaFailure), có thể cần chỉnh lại khi
 * gặp lỗi 429 thật đầu tiên. Vì luôn ưu tiên trả null khi không chắc, sai ở đây chỉ khiến hệ thống
 * BỎ LỠ cơ hội học — không bao giờ tự khoá oan một key còn dùng được.
 */
function parseDailyQuotaLimit(errorData) {
  const quotaFailure = errorData?.error?.details?.find((d) => d['@type']?.includes('QuotaFailure'));
  const dayViolation = quotaFailure?.violations?.find((v) => {
    const id = String(v?.quotaId || '');
    return /day/i.test(id) && !/minute|second/i.test(id);
  });
  if (dayViolation?.quotaValue !== undefined) {
    const n = Number(dayViolation.quotaValue);
    if (Number.isFinite(n) && n >= 0) return n;
  }

  const message = String(errorData?.error?.message || '');
  if (/PerDay/i.test(message)) {
    const m = message.match(/limit:\s*(\d+)/i);
    if (m) return Number(m[1]);
  }

  return null;
}

async function requestGeminiOnce(promptText, apiKey, modelName, timeoutMs, maxOutputTokens) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${promptText}${JSON_SAFETY_SUFFIX}` }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          // Kịch bản video dài (8-10 phút) có thể vượt trần token mặc định của model: model cắt
          // ngang giữa chừng, JSON hỏng và người dùng chỉ thấy lỗi "không trả về nội dung" mà
          // không hiểu vì sao. Nơi gọi khai báo trần riêng cho các tác vụ sinh nội dung dài.
          ...(maxOutputTokens ? { maxOutputTokens } : {}),
        },
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  // Round-trip mạng đã hoàn tất (dù Google trả OK hay lỗi) -> quota chắc chắn đã bị trừ, ghi nhận
  // NGAY tại đây bất kể nhánh xử lý bên dưới đi đâu. Cố ý KHÔNG ghi nhận nếu fetch() tự ném lỗi
  // (timeout của chính ta, đứt mạng) — những trường hợp đó có thể chưa từng chạm tới Google, ghi
  // nhận nhầm sẽ đếm dư và khoá oan một key vẫn còn quota thật.
  recordAttempt(apiKey, modelName);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    error.status = response.status;
    // Gemini thường gợi ý sẵn thời gian nên chờ trong lỗi 429 (vd "2.504467599s") — dùng luôn
    // thay vì đoán mò, để tránh vừa chờ vừa vẫn bị từ chối vì thử lại quá sớm.
    const retryInfo = errorData.error?.details?.find((d) => d['@type']?.includes('RetryInfo'));
    if (retryInfo?.retryDelay) {
      const parsed = parseFloat(retryInfo.retryDelay);
      if (Number.isFinite(parsed)) error.retryDelayMs = Math.round(parsed * 1000);
    }
    // Học hạn mức NGÀY thật nếu 429 này đúng là do quota theo ngày — xem parseDailyQuotaLimit().
    if (response.status === 429) {
      const dailyLimit = parseDailyQuotaLimit(errorData);
      if (dailyLimit !== null) error.dailyQuotaLimit = dailyLimit;
    }
    throw error;
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const finishReason = candidate?.finishReason;
  // Các model "biết suy nghĩ" (Gemini 2.5 trở lên) trả về NHIỀU part: phần suy nghĩ (thought)
  // và phần nội dung thật. Chỉ lấy part[0] như bản cũ là có lúc vớ đúng part rỗng/part suy nghĩ,
  // rồi báo "không trả về nội dung" dù model đã viết xong kịch bản.
  const text = (candidate?.content?.parts || [])
    .filter((part) => typeof part?.text === 'string' && !part.thought)
    .map((part) => part.text)
    .join('');

  // Bị cắt ngang vì chạm trần token. PHẢI nhận diện trước khi parse: JSON dở dang sẽ ném
  // SyntaxError "Unterminated string", bị xếp nhầm là "model trả JSON hỏng" rồi thử lại y hệt
  // với đúng trần token đó — lần nào cũng chết ở đúng chỗ đó, người dùng thấy "lỗi liên tục".
  //
  // Lưu ý quan trọng: token SUY NGHĨ của model cũng bị TRỪ VÀO maxOutputTokens. Một trần 8192
  // nghe thì rộng, nhưng nếu model tiêu 5000 token để suy nghĩ thì phần kịch bản chỉ còn ~3000.
  if (finishReason === 'MAX_TOKENS') {
    const usage = data.usageMetadata || {};
    const spent = [
      usage.candidatesTokenCount ? `${usage.candidatesTokenCount} token nội dung` : null,
      usage.thoughtsTokenCount ? `${usage.thoughtsTokenCount} token suy nghĩ` : null,
    ].filter(Boolean).join(' + ');
    const error = new Error(
      `Gemini viết dở thì chạm trần ${maxOutputTokens || 'mặc định'} token đầu ra`
      + `${spent ? ` (đã dùng ${spent})` : ''} nên kịch bản bị cắt ngang.`
    );
    error.kind = 'truncated';
    error.rawText = text;
    throw error;
  }

  if (!text) {
    // Thiếu nội dung thường là do bộ lọc an toàn chặn — nói rõ lý do Google trả về thay vì chỉ
    // báo chung chung "không có nội dung".
    const blockReason = data.promptFeedback?.blockReason;
    const detail = blockReason || finishReason;
    throw new Error(`Gemini API không trả về nội dung kịch bản${detail ? ` (lý do: ${detail})` : ''}.`);
  }

  try {
    return parseGeminiJson(text);
  } catch (err) {
    err.rawText = text;
    throw err;
  }
}

/**
 * Phân loại lỗi để quyết định hành động — bản cũ gộp tất cả 400/401/403/404/429/503 vào một rổ
 * "thử lại được", nên một prompt sai cú pháp (400) cũng bị đem đi thử lại trên đủ 7 model × 3 key
 * kèm các quãng ngủ, mất cả chục giây trước khi chịu báo lỗi — dù mọi lượt thử đều chắc chắn hỏng.
 *
 *  - 'dead-key'   : key sai/bị thu hồi/không có quyền -> bỏ hẳn key này, đổi key khác.
 *  - 'dead-model' : model không còn tồn tại -> bỏ hẳn model này, đổi model khác.
 *  - 'quota'      : hết hạn mức -> cho cặp (model, key) này nghỉ, ưu tiên cặp khác còn tươi.
 *  - 'overloaded' : Google quá tải/lỗi tạm -> chờ ngắn rồi thử tiếp.
 *  - 'bad-json'   : model trả JSON hỏng -> thử lại có giới hạn.
 *  - 'truncated'  : model bị cắt ngang vì chạm trần token -> nới trần rồi thử lại.
 *  - 'timeout'    : request treo quá lâu -> thử cặp khác ngay.
 *  - 'fatal'      : prompt/tham số sai -> dừng ngay, đổi key hay model đều vô ích.
 */
function classifyError(error) {
  if (error?.kind === 'truncated') return 'truncated';
  if (error?.name === 'AbortError') return 'timeout';
  if (error instanceof SyntaxError) return 'bad-json';

  const status = error?.status;
  const message = String(error?.message || '').toLowerCase();

  if (status === 404) return 'dead-model';
  if (status === 429) return 'quota';
  if (status === 500 || status === 502 || status === 503 || status === 504) return 'overloaded';

  // Lỗi tầng mạng (mất mạng chớp nhoáng, đứt kết nối, DNS lỗi) không mang mã HTTP nào cả — Node
  // ném TypeError "fetch failed". Đây là lỗi tạm thời điển hình, phải cho thử lại chứ không được
  // coi là hỏng hẳn rồi bỏ cuộc ngay.
  if (status === undefined) {
    const isNetworkError = error instanceof TypeError
      || Boolean(error?.cause)
      || ['fetch failed', 'network', 'econnreset', 'econnrefused', 'enotfound', 'etimedout', 'socket hang up']
        .some((needle) => message.includes(needle));
    if (isNetworkError) return 'overloaded';
  }

  if (status === 400 || status === 401 || status === 403) {
    // 400/403 mang hai ý nghĩa hoàn toàn khác nhau và phải xử lý ngược nhau: "key hỏng" thì đổi
    // key là xong, còn "prompt sai" thì đổi bao nhiêu key cũng vẫn hỏng y như vậy.
    const isKeyProblem = ['api key', 'api_key', 'permission', 'unregistered', 'unauthenticated', 'consumer', 'billing', 'suspended', 'expired']
      .some((needle) => message.includes(needle));
    return isKeyProblem ? 'dead-key' : 'fatal';
  }

  return 'fatal';
}

/**
 * Dựng sẵn thứ tự các cặp (model, key) sẽ thử, tách làm 2 nhóm:
 *  - `ready`  : dùng được NGAY, không phải chờ giây nào.
 *  - `cooling`: đang trong thời gian nghỉ, sắp xếp theo cặp nào hồi phục sớm nhất.
 *
 * Nhờ tách như vậy, engine luôn vắt kiệt mọi cặp còn tươi TRƯỚC khi chịu ngủ chờ — thay vì bản cũ
 * cứ gặp lỗi ở cuối danh sách key là ngủ 1.5s dù model kế tiếp vẫn còn nguyên quota.
 */
function buildAttemptPlan(models, keys) {
  const now = Date.now();
  const ready = [];
  const cooling = [];
  // Cặp (model,key) đã học được là CẠN QUOTA HÔM NAY (xem usageTracker.js) — xếp riêng, chỉ dùng
  // tới khi ready/cooling rỗng sạch.
  const exhaustedToday = [];
  // Xoay điểm bắt đầu theo từng lệnh gọi để trải đều tải giữa các key.
  const offset = roundRobinCursor++;

  for (const model of models) {
    if (deadModels.has(model)) continue;
    for (let n = 0; n < keys.length; n++) {
      const keyIndex = resolveKeyIndex(n, keys.length, offset);
      const key = keys[keyIndex];
      if (deadKeys.has(key)) continue;

      if (isExhaustedToday(key, model)) {
        exhaustedToday.push({ model, key, keyIndex, readyAt: 0 });
        continue;
      }

      const readyAt = cooldownUntil.get(`${model}::${key}`) || 0;
      if (readyAt > now) cooling.push({ model, key, keyIndex, readyAt });
      else ready.push({ model, key, keyIndex, readyAt: 0 });
    }
  }

  cooling.sort((a, b) => a.readyAt - b.readyAt);

  // LƯỚI AN TOÀN: nếu ready+cooling rỗng sạch (mọi cặp đều bị đánh dấu cạn), vẫn cho thử — con số
  // đã học có thể sai (Google âm thầm nâng hạn mức, hoặc lỗi phân loại lúc học), và một request
  // "thừa" còn hơn hẳn việc app đứng im báo lỗi trong khi vẫn còn key thật sự dùng được. Nói cách
  // khác: bộ nhớ đã học chỉ dùng để GIẢM ƯU TIÊN, không bao giờ dùng để KHOÁ CỨNG hoàn toàn.
  if (ready.length === 0 && cooling.length === 0 && exhaustedToday.length > 0) {
    return exhaustedToday;
  }
  return [...ready, ...cooling];
}

/**
 * Gọi Gemini với 1 prompt, chấp nhận 1 API key hoặc danh sách nhiều key.
 *
 * Cách chọn: dựng danh sách các cặp (model, key), ưu tiên cặp chưa dính giới hạn nào, xoay vòng
 * điểm bắt đầu để trải đều tải, ghi nhớ cặp nào vừa hết quota để lệnh gọi sau không đâm đầu vào
 * lại. Chỉ ngủ chờ khi thật sự không còn cặp nào tươi.
 *
 * @param {string} promptText
 * @param {string|string[]} apiKeyOrKeys
 * @param {{ tier?: 'quality'|'fast', timeoutMs?: number, deadlineMs?: number, label?: string, maxOutputTokens?: number }} [options]
 */
export async function callGeminiWithKeyRotation(promptText, apiKeyOrKeys, options = {}) {
  const keys = (Array.isArray(apiKeyOrKeys) ? apiKeyOrKeys : [apiKeyOrKeys])
    .map((key) => (key || '').trim())
    .filter(Boolean);

  if (keys.length === 0) {
    throw new Error('Chưa cấu hình Gemini API Key.');
  }

  const {
    tier = DEFAULT_TIER,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    deadlineMs = DEFAULT_DEADLINE_MS,
    label = '',
    maxOutputTokens,
  } = options;

  const models = MODEL_TIERS[tier] || MODEL_TIERS[DEFAULT_TIER];
  const tag = `[Gemini${label ? ` ${label}` : ''}]`;
  const startedAt = Date.now();
  const giveUpAt = startedAt + deadlineMs;

  const attempts = buildAttemptPlan(models, keys);
  if (attempts.length === 0) {
    // Chỉ xảy ra khi mọi key đều đã bị đánh dấu hỏng — nói thẳng thay vì để người dùng đoán.
    throw new Error('Tất cả Gemini API Key đã cấu hình đều không dùng được (sai key hoặc bị từ chối quyền). Vui lòng kiểm tra lại trong Cài đặt.');
  }

  let lastError;
  let badJsonCount = 0;
  // Số lượt ĐÃ THỰC SỰ gọi Gemini — dùng để bảo đảm lượt đầu luôn được chạy (xem chỗ kẹp timeout).
  let attemptsMade = 0;
  // Trần token có thể được NỚI DẦN trong lúc chạy khi model bị cắt ngang giữa chừng.
  let currentMaxTokens = maxOutputTokens;
  let truncationCount = 0;
  // Phần JSON dở dang của lượt bị cắt gần nhất — dùng để cứu vớt nếu nới trần vẫn không đủ.
  let lastTruncatedText = '';
  // Phản hồi DÀI NHẤT (không phải mới nhất — 2 lượt bad-json không có quan hệ tăng dần với nhau
  // như truncated, nên "dài hơn" mới là tín hiệu "gần hoàn chỉnh hơn") trong số các lượt bị coi là
  // JSON hỏng — dùng để cứu vớt nếu Gemini hỏng liên tiếp đủ số lần cho phép.
  let bestBadJsonText = '';

  for (const attempt of attempts) {
    const { model, key, keyIndex, readyAt } = attempt;

    // Bỏ qua cặp mà lệnh gọi khác vừa làm cho cạn quota trong lúc mình đang chạy dở kế hoạch.
    const freshReadyAt = cooldownUntil.get(`${model}::${key}`) || 0;
    if (freshReadyAt > Date.now() && freshReadyAt !== readyAt) continue;
    if (deadKeys.has(key) || deadModels.has(model)) continue;
    // Bỏ qua model vừa treo — kể cả khi đang xét một key khác (xem modelSlowUntil).
    if ((modelSlowUntil.get(model) || 0) > Date.now()) continue;

    // Cặp này đang nghỉ: chỉ chờ nếu quãng chờ đủ ngắn và còn nằm trong hạn chót của lệnh gọi.
    if (freshReadyAt > Date.now()) {
      const waitMs = freshReadyAt - Date.now();
      if (waitMs > MAX_SLEEP_MS || Date.now() + waitMs > giveUpAt) continue;
      console.warn(`${tag} Mọi key/model đều đang nghỉ, chờ ${waitMs}ms rồi thử lại ${model} (key #${keyIndex + 1})...`);
      await sleep(withJitter(waitMs));
    }

    if (Date.now() > giveUpAt) break;

    // Kẹp timeout của lượt này theo phần thời gian CÒN LẠI của hạn chót.
    //
    // Trước đây hạn chót chỉ được kiểm tra TRƯỚC mỗi lượt, còn lượt đã khởi động thì cứ chạy trọn
    // timeoutMs của nó. Một lượt bắt đầu ngay sát hạn chót vì thế vượt qua hạn thêm cả timeoutMs —
    // quan sát thật: hạn chót 180s nhưng lệnh gọi kéo dài 4,5 phút (180s + 90s của lượt cuối), gấp
    // rưỡi cái trần mà người gọi tưởng mình đã đặt ra.
    //
    // Bỏ qua luôn nếu quãng còn lại quá ngắn: một lượt gọi Gemini chỉ được vài giây thì chắc chắn
    // hết giờ giữa chừng, đốt thêm một request chết mà không đổi lấy được gì.
    // Ngưỡng tối thiểu chỉ áp dụng từ lượt THỨ HAI trở đi: lượt đầu luôn được chạy, dù hạn chót
    // ngắn tới đâu. Không chừa ngoại lệ này thì một deadlineMs nhỏ hơn 8s sẽ khiến hàm không gọi
    // Gemini lấy một lần nào rồi báo lỗi ngay — im lặng vô hiệu hoá cả lệnh gọi.
    const msLeft = giveUpAt - Date.now();
    if (attemptsMade > 0 && msLeft < MIN_ATTEMPT_BUDGET_MS) break;
    const attemptTimeoutMs = Math.max(1, Math.min(timeoutMs, msLeft));
    attemptsMade++;

    const keyLabel = keys.length > 1 ? ` (key #${keyIndex + 1}/${keys.length})` : '';
    try {
      const result = await requestGeminiOnce(promptText, key, model, attemptTimeoutMs, currentMaxTokens);
      // Thành công nghĩa là cặp này đã hồi phục — xoá dấu nghỉ để lệnh gọi sau dùng lại ngay.
      cooldownUntil.delete(`${model}::${key}`);
      return result;
    } catch (error) {
      lastError = error;
      const kind = classifyError(error);

      if (kind === 'fatal') {
        // Đổi key hay model đều vô ích — dừng ngay thay vì đốt thêm hàng chục lượt gọi chắc chắn hỏng.
        console.error(`${tag} Lỗi không thể khắc phục bằng cách đổi key/model (${model}${keyLabel}):`, error.message);
        throw error;
      }

      if (kind === 'dead-key') {
        deadKeys.add(key);
        console.warn(`${tag} Key #${keyIndex + 1} không dùng được (${error.message}) — loại khỏi vòng xoay.`);
        continue;
      }

      if (kind === 'dead-model') {
        deadModels.add(model);
        console.warn(`${tag} Model ${model} đã ngừng hỗ trợ hoặc sai tên — loại khỏi vòng xoay, chuyển model dự phòng.`);
        continue;
      }

      if (kind === 'quota') {
        // "limit: 0" = project chưa hề được cấp quota free cho model này, khác hẳn "đã xài hết
        // trong phút/ngày này" — chờ vài giây là vô nghĩa, phải cho nghỉ dài.
        const isZeroQuota = /limit:\s*0\b/.test(String(error.message || ''));
        const cooldown = isZeroQuota
          ? ZERO_QUOTA_COOLDOWN_MS
          : Math.max(error.retryDelayMs || DEFAULT_QUOTA_COOLDOWN_MS, 1000);
        cooldownUntil.set(`${model}::${key}`, Date.now() + cooldown);

        // Học được hạn mức THEO NGÀY thật -> ghi xuống đĩa (usageTracker.js). Từ lượt gọi KẾ TIẾP
        // (kể cả sau khi restart server), buildAttemptPlan tự bỏ qua cặp này cho tới hết ngày
        // Pacific thay vì phải đốt một request chết mới phát hiện lại điều đã biết.
        if (error.dailyQuotaLimit !== undefined) {
          recordDailyLimitObserved(key, model, error.dailyQuotaLimit);
          console.warn(`${tag} ${model}${keyLabel} đã học được hạn mức ${error.dailyQuotaLimit} lượt/ngày — sẽ tự bỏ qua cặp này cho tới hết ngày.`);
        }

        console.warn(`${tag} ${model}${keyLabel} hết hạn mức — cho nghỉ ${Math.round(cooldown / 1000)}s, chuyển sang key/model còn trống.`);
        continue;
      }

      if (kind === 'timeout') {
        // Cho cả MODEL nghỉ, không phải chỉ cặp model+key này: một model treo thì treo với mọi key.
        // Bản cũ chỉ `continue`, nên nó lại thử đúng model đó với key #2 rồi key #3, mỗi lần đốt
        // trọn timeout — hết sạch hạn chót trước khi kịp chạm tới model thật sự chạy được.
        modelSlowUntil.set(model, Date.now() + MODEL_TIMEOUT_COOLDOWN_MS);
        console.warn(
          `${tag} ${model}${keyLabel} quá ${attemptTimeoutMs}ms không phản hồi — cho model này nghỉ `
          + `${Math.round(MODEL_TIMEOUT_COOLDOWN_MS / 60000)} phút, chuyển sang MODEL khác.`
        );
        continue;
      }

      if (kind === 'truncated') {
        truncationCount++;
        if (error.rawText) lastTruncatedText = error.rawText;

        const bumped = Math.min(MAX_OUTPUT_TOKENS_CEILING, (currentMaxTokens || 8192) * 2);
        if (truncationCount > MAX_TRUNCATION_RETRIES || bumped <= (currentMaxTokens || 0)) {
          // Đã kịch trần token mà vẫn không đủ chỗ — thoát vòng lặp để đi tới bước cứu vớt
          // phần kịch bản đã nhận được, thay vì đốt tiếp mọi cặp key/model cũng sẽ cắt y hệt.
          console.error(`${tag} ${error.message} Đã nới trần token tối đa mà vẫn không đủ.`);
          break;
        }
        console.warn(`${tag} ${error.message} Nới trần ${currentMaxTokens} -> ${bumped} token rồi thử lại.`);
        currentMaxTokens = bumped;
        continue;
      }

      if (kind === 'bad-json') {
        badJsonCount++;
        if (error.rawText && error.rawText.length > bestBadJsonText.length) bestBadJsonText = error.rawText;

        // Ca hỏng phổ biến nhất KHÔNG đáng gọi lại Gemini: model viết xong xuôi hết rồi mà thiếu
        // đúng dấu ngoặc đóng cuối cùng (đo được với gemini-3.5-flash: đủ title + 13/13 đoạn, chỉ
        // thiếu 1 ký tự `}`, và Google không hề báo finishReason MAX_TOKENS nên không rơi vào nhánh
        // 'truncated'). Trước đây phải hỏng đủ 3 lượt mới chịu thử cứu vớt — mỗi lượt đốt 15-30
        // giây + 1 lượt quota để rồi vứt bỏ nguyên một kịch bản dùng được 100%.
        // salvageUnclosedJson chỉ nhận khi KHÔNG mất chữ nào (xem docblock của nó), nên dùng ngay
        // từ lượt đầu vẫn an toàn: JSON hỏng thật ở giữa sẽ trả null và rơi về đúng luồng thử lại cũ.
        const rescued = error.rawText ? salvageUnclosedJson(error.rawText) : null;
        if (rescued) {
          const segmentCount = Array.isArray(rescued.segments) ? rescued.segments.length : 0;
          console.warn(
            `${tag} ${model}${keyLabel} trả JSON thiếu ngoặc đóng cuối (${error.message}) — nội dung còn nguyên vẹn, `
            + `vá lại và dùng luôn ${segmentCount} đoạn thay vì gọi lại từ đầu.`
          );
          cooldownUntil.delete(`${model}::${key}`);
          return rescued;
        }

        if (error.rawText) {
          console.error(`${tag} Phản hồi thô lỗi JSON (lượt ${badJsonCount}):\n=== BẮT ĐẦU PHẢN HỒI THÔ ===\n${error.rawText}\n=== KẾT THÚC PHẢN HỒI THÔ ===`);
        }
        if (badJsonCount >= MAX_BAD_JSON_ATTEMPTS) {
          // KHÔNG throw ngay — thoát vòng lặp để đi tới bước cứu vớt bên dưới trước. Một JSON
          // "hỏng" theo SyntaxError không có nghĩa là VÔ DỤNG: quan sát thật — Gemini trả JSON gần
          // như hoàn chỉnh (đủ 8/8 đoạn + tiêu đề + thumbnail), lỗi cú pháp chỉ nằm ở đúng vài ký
          // tự cuối cùng — mà tự retry lại từ đầu (đổi key/model) thì vứt bỏ hết phần đã viết đúng
          // đó, dù salvageTruncatedJson (vốn chỉ dùng cho trường hợp cắt ngang vì hết token) hoàn
          // toàn cứu được: nó không quan tâm JSON dở dang VÌ SAO, chỉ cần tìm ranh giới an toàn gần
          // nhất rồi đóng lại.
          console.error(`${tag} Gemini trả JSON hỏng ${badJsonCount} lần liên tiếp — dừng lại để thử cứu vớt phần còn dùng được.`);
          break;
        }
        console.warn(`${tag} ${model}${keyLabel} trả JSON hỏng (${error.message}) — thử lại lượt kế tiếp.${jsonErrorContext(error)}`);
        continue;
      }

      // 'overloaded': Google đang quá tải. Cặp khác thường vẫn chạy được nên không cần ngủ ngay,
      // chỉ cho model này nghỉ ngắn rồi đi tiếp.
      cooldownUntil.set(`${model}::${key}`, Date.now() + withJitter(2000));
      const reason = error.status ? `Google báo lỗi ${error.status}` : `lỗi mạng: ${error.message}`;
      console.warn(`${tag} ${model}${keyLabel} tạm thời không dùng được (${reason}) — chuyển sang lượt thử kế tiếp.`);
    }
  }

  // Phương án cuối khi mọi lượt đều bị cắt ngang: cứu lấy các đoạn đã viết XONG trong phần JSON
  // dở dang. Kịch bản ngắn hơn mong muốn nhưng vẫn dựng được, hơn hẳn việc trả về lỗi trắng tay.
  if (lastTruncatedText) {
    const salvaged = salvageTruncatedJson(lastTruncatedText);
    if (salvaged) {
      const segmentCount = Array.isArray(salvaged.segments) ? salvaged.segments.length : 0;
      console.warn(`${tag} Không tránh được việc bị cắt ngang — dùng tạm ${segmentCount} đoạn đã viết xong. Hãy chọn thời lượng ngắn hơn nếu kịch bản bị hụt.`);
      return salvaged;
    }
  }

  // Tương tự cho JSON hỏng liên tiếp KHÔNG PHẢI do cắt ngang — cùng một máy quét, chỉ khác nguồn
  // dữ liệu đưa vào. Chỉ tới đây khi bad-json đã chạm MAX_BAD_JSON_ATTEMPTS (xem nhánh 'bad-json'
  // ở trên) mà chưa lượt nào khác thành công.
  if (bestBadJsonText) {
    const salvaged = salvageTruncatedJson(bestBadJsonText);
    if (salvaged) {
      const segmentCount = Array.isArray(salvaged.segments) ? salvaged.segments.length : 0;
      console.warn(`${tag} JSON hỏng liên tiếp — cứu được ${segmentCount} đoạn từ phản hồi gần đúng nhất thay vì bỏ trắng.`);
      return salvaged;
    }
  }

  // Báo số lượt THẬT SỰ đã gọi, không phải độ dài kế hoạch. Bản cũ luôn in ra "đã thử hết 15 tổ
  // hợp" kể cả khi hạn chót cắt ngang sau lượt thứ 2 — đọc log tưởng đã vét cạn mọi model/key nên
  // đi tìm nguyên nhân ở phía mạng/quota, trong khi sự thật là chưa hề chạm tới các model còn lại.
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  console.error(
    `${tag} Thất bại sau ${attemptsMade}/${attempts.length} lượt gọi trong ${elapsed}s.`
    + (attemptsMade < attempts.length ? ' (hết hạn chót trước khi thử hết model/key còn lại)' : '')
  );
  throw lastError || new Error('Không gọi được Gemini API sau khi đã thử mọi key và model dự phòng.');
}

/**
 * Gọi API Gemini với 1 prompt meta văn bản, trả về JSON { title, segments } đã parse.
 * Chấp nhận 1 API key hoặc mảng nhiều key (tự xoay vòng khi key hiện tại lỗi tạm thời).
 */
export async function callGeminiApi(promptText, apiKeyOrKeys, options = {}) {
  try {
    const result = await callGeminiWithKeyRotation(promptText, apiKeyOrKeys, options);
    if (!result.segments || !Array.isArray(result.segments)) {
      throw new Error('Cấu trúc JSON phản hồi không có mảng segments.');
    }
    return result;
  } catch (error) {
    throw new Error(`Lỗi gọi Gemini AI: ${error.message}`);
  }
}

/** Trạng thái vòng xoay hiện tại — để chẩn đoán nhanh khi cần biết key/model nào đang bị nghỉ. */
export function getGeminiRotationStatus() {
  const now = Date.now();
  const cooling = [];
  for (const [pair, readyAt] of cooldownUntil.entries()) {
    if (readyAt > now) {
      const [model] = pair.split('::');
      cooling.push({ model, secondsLeft: Math.round((readyAt - now) / 1000) });
    }
  }
  return { deadKeyCount: deadKeys.size, deadModels: [...deadModels], cooling };
}
