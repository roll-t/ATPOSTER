import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Bộ đếm hạn mức Gemini free tier, LƯU XUỐNG ĐĨA và TỰ HỌC từ chính lỗi 429 thật.
 *
 * Vì sao không hardcode con số "N lượt/ngày": Google không còn công bố hạn mức cố định trong tài
 * liệu chính thức nữa (trang rate-limits giờ chỉ trỏ sang bảng điều khiển AI Studio, vì hạn mức
 * cấp THEO TỪNG PROJECT và có thể khác nhau giữa các key/project). Các nguồn không chính thức cũng
 * mâu thuẫn nhau (250 vs 1500 request/ngày cho cùng 1 model). Đặt cứng 1 con số sai sẽ khiến hệ
 * thống hoặc bỏ phí quota thật (đoán thấp), hoặc vẫn gọi phí thời gian vào key đã cạn (đoán cao).
 *
 * Cách làm: KHÔNG đoán trước gì cả. Ngày đầu dùng một (key, model) thì cứ gọi bình thường như hiện
 * tại (chỉ dựa vào cooldown phản ứng có sẵn trong callGeminiApi.js). Khi Google trả về 429 kèm hạn
 * mức THEO NGÀY thật (không phải theo phút), ghi lại con số đó và đánh dấu (key, model) này đã cạn
 * cho tới hết ngày Pacific. Từ lượt gọi kế tiếp, callGeminiApi.js tự bỏ qua cặp đã cạn TRƯỚC KHI
 * gọi mạng — tiết kiệm đúng khoảng thời gian mà trước đây phải đốt một request chết mới biết.
 */

const USAGE_FILE = path.join(process.cwd(), 'data', 'gemini-usage.json');

// Hàng đợi ghi tuần tự trong TIẾN TRÌNH này — nhiều lệnh gọi Gemini xảy ra gần nhau (vd dịch phụ
// đề nhiều slide liên tiếp) không được phép ghi đè lên nhau. Không khoá được giữa 2 tiến trình
// Node khác nhau, nhưng app này không có tình huống 2 tiến trình cùng ghi file này.
let writeQueue = Promise.resolve();

/** Ngày hiện tại theo giờ Pacific, dạng YYYY-MM-DD — đúng mốc Google dùng để reset RPD. */
function pacificDateString(date = new Date()) {
  // Locale en-CA định dạng sẵn theo YYYY-MM-DD, khỏi phải tự ghép chuỗi từ các phần rời rạc.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(date);
}

/**
 * Dấu vân tay của key — KHÔNG lưu key thật xuống file. 8 ký tự hex đầu của SHA-256 là đủ để phân
 * biệt các key trong cùng 1 bộ cấu hình mà không cần đảo ngược lại được (không có nhu cầu đảo
 * ngược: chỉ dùng để so khớp, chưa từng cần hiển thị lại giá trị gốc).
 */
function keyFingerprint(apiKey) {
  return crypto.createHash('sha256').update(String(apiKey || '')).digest('hex').slice(0, 8);
}

function emptyState() {
  return { pacificDate: pacificDateString(), keys: {} };
}

function readStateSync() {
  let state;
  try {
    state = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
  } catch (_) {
    // Chưa từng có file (lần đầu chạy), hoặc file hỏng — bắt đầu lại từ trạng thái rỗng. Không
    // phải lỗi nghiêm trọng: dữ liệu này chỉ là bộ nhớ đệm học được, mất đi thì hệ thống lùi về
    // đúng hành vi phản ứng (cooldown khi gặp 429) như trước khi có cơ chế này.
    return emptyState();
  }

  // Sang ngày Pacific mới -> xoá sạch count/exhaustedToday, GIỮ NGUYÊN dailyLimit đã học được.
  // dailyLimit là thuộc tính ổn định của (key, model) trên project đó, không phải thứ đổi theo
  // ngày — biết rồi thì dùng lại được mãi, không phải học lại từ đầu mỗi sáng.
  const today = pacificDateString();
  if (state.pacificDate !== today) {
    const carriedKeys = {};
    for (const [fp, models] of Object.entries(state.keys || {})) {
      carriedKeys[fp] = {};
      for (const [model, info] of Object.entries(models || {})) {
        if (info?.dailyLimit) {
          carriedKeys[fp][model] = { count: 0, dailyLimit: info.dailyLimit, limitSource: info.limitSource, exhaustedToday: false };
        }
      }
    }
    return { pacificDate: today, keys: carriedKeys };
  }

  return state;
}

function writeStateSync(state) {
  const dir = path.dirname(USAGE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // Ghi ra file tạm rồi rename: dev server của app này từng bị tắt đột ngột giữa chừng (quan sát
  // thật trong quá trình phát triển) — ghi trực tiếp đúng lúc đó sẽ để lại 1 file JSON dở dang,
  // hỏng cho mọi lần đọc sau. rename là thao tác nguyên tử trên cùng 1 ổ đĩa.
  const tmpFile = `${USAGE_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpFile, USAGE_FILE);
}

/** Đưa một thay đổi vào hàng đợi ghi tuần tự, trả về Promise khi ghi xong. */
function enqueueUpdate(mutateFn) {
  writeQueue = writeQueue.then(() => {
    const state = readStateSync();
    mutateFn(state);
    writeStateSync(state);
  }).catch((err) => {
    // Lỗi ghi file KHÔNG được phép làm gãy lượt gọi Gemini đang chạy — đây chỉ là bộ nhớ đệm học
    // được, không phải nguồn sự thật. Log lại rồi để hàng đợi tiếp tục cho lượt ghi sau.
    console.warn('[Gemini Usage] Lỗi ghi data/gemini-usage.json:', err.message);
  });
  return writeQueue;
}

function getModelEntry(state, fingerprint, model) {
  return state.keys?.[fingerprint]?.[model] || null;
}

/**
 * (key, model) này có được xem là ĐÃ CẠN quota hôm nay không — dựa trên con số ĐÃ HỌC được từ một
 * lỗi 429 THEO NGÀY thật trước đó. Không có gì học được thì luôn trả về false (không đoán mò).
 */
export function isExhaustedToday(apiKey, model) {
  const state = readStateSync();
  const entry = getModelEntry(state, keyFingerprint(apiKey), model);
  return entry?.exhaustedToday === true;
}

/** Số lượt đã gọi hôm nay cho (key, model) — chỉ để hiển thị/chẩn đoán, không dùng để chặn. */
export function getUsageSnapshot() {
  return readStateSync();
}

/**
 * Ghi nhận một lượt gọi THẬT SỰ đã chạm tới mạng (dù thành công hay lỗi) — Google trừ quota ngay
 * khi nhận được request, bất kể app có dùng được kết quả hay không. KHÔNG gọi hàm này cho các lượt
 * bị chặn sớm ở buildAttemptPlan (chưa hề gửi đi thì chưa tốn quota nào).
 */
export function recordAttempt(apiKey, model) {
  const fp = keyFingerprint(apiKey);
  enqueueUpdate((state) => {
    state.keys[fp] = state.keys[fp] || {};
    const entry = state.keys[fp][model] || { count: 0, dailyLimit: null, limitSource: null, exhaustedToday: false };
    entry.count += 1;
    state.keys[fp][model] = entry;
  });
}

/**
 * Ghi nhận hạn mức THEO NGÀY thật vừa học được từ một lỗi 429, và đánh dấu (key, model) đã cạn cho
 * tới khi sang ngày Pacific mới. Chỉ gọi hàm này khi ĐÃ XÁC ĐỊNH được đây là quota theo ngày (không
 * phải theo phút) — xem parseQuotaLimitFromError() ở callGeminiApi.js.
 */
export function recordDailyLimitObserved(apiKey, model, dailyLimit) {
  if (!Number.isFinite(dailyLimit) || dailyLimit < 0) return;
  const fp = keyFingerprint(apiKey);
  enqueueUpdate((state) => {
    state.keys[fp] = state.keys[fp] || {};
    state.keys[fp][model] = {
      count: dailyLimit, // đã dính 429 nghĩa là đã chạm đúng ngưỡng này
      dailyLimit,
      limitSource: 'observed-429',
      exhaustedToday: true,
    };
  });
}
