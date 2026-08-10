import { parseGeminiJson, salvageTruncatedJson } from './parseGeminiJson.js';

// Dùng alias "-latest" của Google thay vì tên model có version/ngày tháng cứng — Google liên tục
// deprecate model cũ (vd gemini-2.0-flash, gemini-2.0-flash-lite đều đã bị đánh dấu ngừng phục vụ
// tại thời điểm viết dòng này), khiến danh sách cứng cũ liên tục lỗi thời. Alias "-latest" tự trỏ
// sang model mới nhất Google đang phục vụ, không cần cập nhật tay mỗi khi có model mới.
//
// QUAN TRỌNG — hạn mức free tier tính theo MODEL ĐÃ RESOLVE, không phải theo tên alias: gọi
// `gemini-flash-latest` bị trừ vào quota của `gemini-3.6-flash` (thấy rõ trong thông báo lỗi 429:
// "limit: 20, model: gemini-3-6-flash"). Nên danh sách dự phòng bên dưới chỉ liệt kê các model
// KHÁC NHAU THẬT SỰ — thêm cả alias lẫn model đích của nó vào cùng 1 danh sách là thừa, chỉ tổ
// đốt thêm 1 lượt gọi chắc chắn cũng dính 429 y hệt.
const MODEL_TIERS = {
  // Việc SÁNG TẠO (viết kịch bản, sinh ý tưởng): cần model thông minh nhất, chấp nhận chậm hơn.
  // gemini-pro-latest xếp gần cuối vì tier "pro" thường có quota free-tier = 0 (limit: 0, khác với
  // "đã dùng hết quota trong ngày") trên nhiều key/project — không phải lỗi tự phục hồi được bằng
  // cách đổi key hay đợi, mà là gói quota chưa hề được cấp cho tier đó.
  quality: [
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-flash-lite-latest',
    'gemini-pro-latest',
  ],
  // Việc CƠ KHÍ (dịch, phiên âm, chuẩn hoá chuỗi): flash-lite thừa sức làm đúng, rẻ và nhanh hơn
  // hẳn. Quan trọng nhất: nó KHÔNG ăn vào hạn mức của model "quality" — nhờ vậy một mẻ lồng tiếng
  // 25 slide không còn ngốn sạch 20 request/phút của model dùng để viết kịch bản.
  fast: [
    'gemini-flash-lite-latest',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
    'gemini-3.5-flash',
  ],
};

const DEFAULT_TIER = 'quality';

// Nhắc thêm về định dạng JSON an toàn, gắn vào MỌI prompt gửi Gemini để giảm khả năng
// model trả JSON hỏng (ví dụ chèn dấu " chưa escape bên trong 1 chuỗi mô tả).
const JSON_SAFETY_SUFFIX = `

IMPORTANT JSON OUTPUT RULES:
- Return ONLY a single valid JSON object. No markdown, no comments, no trailing commas.
- Inside any string value, if you need to quote a word/phrase, use single quotes (') instead of double quotes ("). Never place an unescaped double-quote character inside a string value.
- Do not use literal newline characters inside string values; keep each string value on a single line.`;

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
// Con trỏ round-robin: mỗi lệnh gọi bắt đầu từ một key khác nhau để TRẢI ĐỀU tải thay vì lần nào
// cũng dồn vào key #1 rồi mới rớt dần sang #2, #3 — cách cũ khiến key #1 luôn cạn quota trước
// trong khi key #2/#3 gần như không được dùng.
let roundRobinCursor = 0;

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
  // Xoay điểm bắt đầu theo từng lệnh gọi để trải đều tải giữa các key.
  const offset = roundRobinCursor++;

  for (const model of models) {
    if (deadModels.has(model)) continue;
    for (let n = 0; n < keys.length; n++) {
      const keyIndex = (offset + n) % keys.length;
      const key = keys[keyIndex];
      if (deadKeys.has(key)) continue;

      const readyAt = cooldownUntil.get(`${model}::${key}`) || 0;
      if (readyAt > now) cooling.push({ model, key, keyIndex, readyAt });
      else ready.push({ model, key, keyIndex, readyAt: 0 });
    }
  }

  cooling.sort((a, b) => a.readyAt - b.readyAt);
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
  // Trần token có thể được NỚI DẦN trong lúc chạy khi model bị cắt ngang giữa chừng.
  let currentMaxTokens = maxOutputTokens;
  let truncationCount = 0;
  // Phần JSON dở dang của lượt bị cắt gần nhất — dùng để cứu vớt nếu nới trần vẫn không đủ.
  let lastTruncatedText = '';

  for (const attempt of attempts) {
    const { model, key, keyIndex, readyAt } = attempt;

    // Bỏ qua cặp mà lệnh gọi khác vừa làm cho cạn quota trong lúc mình đang chạy dở kế hoạch.
    const freshReadyAt = cooldownUntil.get(`${model}::${key}`) || 0;
    if (freshReadyAt > Date.now() && freshReadyAt !== readyAt) continue;
    if (deadKeys.has(key) || deadModels.has(model)) continue;

    // Cặp này đang nghỉ: chỉ chờ nếu quãng chờ đủ ngắn và còn nằm trong hạn chót của lệnh gọi.
    if (freshReadyAt > Date.now()) {
      const waitMs = freshReadyAt - Date.now();
      if (waitMs > MAX_SLEEP_MS || Date.now() + waitMs > giveUpAt) continue;
      console.warn(`${tag} Mọi key/model đều đang nghỉ, chờ ${waitMs}ms rồi thử lại ${model} (key #${keyIndex + 1})...`);
      await sleep(withJitter(waitMs));
    }

    if (Date.now() > giveUpAt) break;

    const keyLabel = keys.length > 1 ? ` (key #${keyIndex + 1}/${keys.length})` : '';
    try {
      const result = await requestGeminiOnce(promptText, key, model, timeoutMs, currentMaxTokens);
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
        console.warn(`${tag} ${model}${keyLabel} hết hạn mức — cho nghỉ ${Math.round(cooldown / 1000)}s, chuyển sang key/model còn trống.`);
        continue;
      }

      if (kind === 'timeout') {
        console.warn(`${tag} ${model}${keyLabel} quá ${timeoutMs}ms không phản hồi — chuyển sang lượt thử kế tiếp.`);
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
        if (error.rawText) {
          console.error(`${tag} Phản hồi thô lỗi JSON (lượt ${badJsonCount}):\n=== BẮT ĐẦU PHẢN HỒI THÔ ===\n${error.rawText}\n=== KẾT THÚC PHẢN HỒI THÔ ===`);
        }
        if (badJsonCount >= MAX_BAD_JSON_ATTEMPTS) {
          console.error(`${tag} Gemini trả JSON hỏng ${badJsonCount} lần liên tiếp — dừng lại.`);
          throw error;
        }
        console.warn(`${tag} ${model}${keyLabel} trả JSON hỏng (${error.message}) — thử lại lượt kế tiếp.`);
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

  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  console.error(`${tag} Đã thử hết ${attempts.length} tổ hợp model/key trong ${elapsed}s mà không thành công.`);
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
