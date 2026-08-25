import { getDurationInfo } from './durationInfo.js';
import { getSkill } from '../../skills/index.js';
import { buildEnglishQuizScriptPrompt } from './templates/englishQuiz.js';
import { callGeminiApi } from './callGeminiApi.js';
import { WORDS_PER_SECOND_VI, WORDS_PER_SECOND_EN } from '../../speechRate.js';

// Kịch bản đạt dưới mức này so với thời lượng mục tiêu thì mới đáng gọi thêm 1 lượt viết bù.
// Đặt 0.85 để chấp nhận sai lệch nhỏ tự nhiên của văn nói — chỉ can thiệp khi hụt thật sự.
const SHORT_SCRIPT_RATIO = 0.85;

// Các skill được tự động viết bù khi Gemini trả về kịch bản ngắn hơn hẳn thời lượng đã đặt.
//
// Các skill slideshow KHÔNG có trong danh sách này gắn MỖI segment với MỘT ảnh phải sinh riêng,
// nên tự ý thêm segment sẽ âm thầm làm lệch số ảnh cần tạo ở các bước sau.
//
// buddhist_wisdom cũng là slideshow-1-ảnh-mỗi-segment, nhưng vẫn nằm đây vì với nhịp 10 giây/ảnh
// thì số segment và số chữ khoá chặt vào nhau: hụt chữ tức là hụt luôn segment (đo được 40 slide
// /833 từ ở mốc 10-15 phút, trong khi cần khoảng 75 slide/1400 từ). Nó tự khai luật viết bù riêng
// qua skill.extendRules() bên dưới, thay vì dùng luật mặc định "cho phép chèn thêm đoạn ở giữa".
const AUTO_EXTEND_CATEGORIES = ['pexels_talk_video', 'buddhist_wisdom'];

function stripForWordCount(text) {
  return String(text || '')
    .replace(/\[[^\]]*\]/g, ' ')   // [tag cảm xúc] không được đọc thành lời
    .replace(/\*\*/g, ' ')
    .trim();
}

function countScriptWords(segments) {
  return (segments || []).reduce((sum, seg) => {
    const words = stripForWordCount(seg?.dialogueOrNarration).split(/\s+/).filter(Boolean).length;
    return sum + words;
  }, 0);
}

/**
 * Hạn giờ riêng cho khâu VIẾT KỊCH BẢN — rộng hơn hẳn mặc định của engine (45s/90s) vì đây là lượt
 * gọi nặng nhất: prompt dài, trần token lớn, và model còn tốn thời gian "suy nghĩ" trước khi viết.
 *
 * Vì sao phải nới: mốc 90s được đặt từ hồi trần token mới có 8192. Sau khi nâng trần lên
 * 16384-25920 để kịch bản không bị cắt ngang, thời gian sinh vượt hẳn 90s — nên MỌI lượt gọi đều
 * bị CHÍNH MÌNH bỏ ngang đúng lúc 90s, rồi xoay hết 15 tổ hợp model/key, tốn 4,5 phút và không ra
 * được gì. Trong khi chỉ cần chờ thêm là Gemini vẫn trả lời bình thường (đã đo: đúng prompt đó
 * chạy xong ở mức 180s).
 *
 * Đặt timeout mỗi lượt (210s) LỚN HƠN thời gian quan sát được để còn biên cho lúc mạng chậm, và
 * hạn chót tổng (480s) đủ cho 2 lượt thử thật sự thay vì 15 lượt bị cắt ngang vô ích.
 */
const SCRIPT_REQUEST_TIMEOUT_MS = 210_000;
const SCRIPT_DEADLINE_MS = 480_000;

/**
 * Trần token đầu ra theo thời lượng mục tiêu.
 *
 * Không đặt trần thì model dùng mặc định của nó; kịch bản 8-10 phút (thoại + phụ đề song ngữ +
 * khung JSON) chạm trần đó là bị cắt ngang, JSON hỏng, và người dùng chỉ nhận được lỗi chung
 * chung "Gemini không trả về nội dung".
 *
 * Con số 20 token/giây của bản cũ quá chật, vì bỏ sót HAI khoản ăn token lớn:
 *  1. Token SUY NGHĨ của model (Gemini 2.5 trở lên bật mặc định) cũng bị trừ vào chính trần này —
 *     một prompt bắt "đếm đủ số từ, dựng theo 4 act, tránh lặp ý" khiến model nghĩ vài nghìn token
 *     trước khi viết chữ đầu tiên.
 *  2. Tiếng Việt có dấu tốn khoảng 2 token mỗi 3 ký tự, chưa kể mỗi đoạn còn kèm phụ đề SONG NGỮ.
 * Hệ quả: mốc 4-6 phút bị kẹp ở trần sàn 8192 và gần như lần nào cũng bị cắt ngang giữa chừng
 * (lỗi "Unterminated string in JSON at position ..."). Nới rộng hẳn — trần token chỉ là mức CHẶN
 * TRÊN, đặt cao không hề làm tốn thêm token hay tiền nếu model viết ngắn hơn.
 */
function resolveMaxOutputTokens(targetSeconds) {
  return Math.min(65536, Math.max(16384, Math.round(targetSeconds * 48)));
}

/**
 * Yêu cầu Gemini viết bù khi kịch bản trả về ngắn hơn hẳn thời lượng đã đặt.
 *
 * Cố ý GIỮ NGUYÊN tiêu đề và phần mở/kết: chỉ đào sâu thêm nội dung từng đoạn. Viết lại từ đầu sẽ
 * đánh mất bản nháp vốn đã đúng giọng.
 *
 * extraRules: skill tự khai luật cấu trúc riêng cho lượt viết bù (vd skill mỗi segment gắn cứng
 * với một ảnh cần chỉ rõ số segment và số chữ mỗi segment). Không khai thì dùng luật mặc định.
 */
function buildExtendPrompt(script, currentWords, targetWords, durationInfo, wps, extraRules) {
  return `You previously wrote this narration script, but it is TOO SHORT for the requested video length.

REQUESTED VIDEO LENGTH: ${durationInfo.label} (about ${durationInfo.targetSeconds} seconds).
REQUIRED WORD BUDGET: at least ${targetWords} words across all "dialogueOrNarration" fields.
YOUR PREVIOUS DRAFT: only ${currentWords} words — it would produce a video roughly ${Math.round(currentWords / wps)} seconds long, far short of the target.

YOUR TASK: return the SAME script, expanded to meet the word budget.

RULES:
- KEEP the title, the opening hook segment, and the final closing segment intact in spirit.
- EXPAND existing paragraphs: add concrete everyday scenes (a specific place, time, action), a second angle, or a deeper consequence of the idea already there.
${extraRules?.length
    ? extraRules.join('\n')
    : '- You MAY add new development segments in the MIDDLE (never after the closing segment) to introduce genuinely NEW sub-ideas.'}
- DO NOT pad with repetition, filler, or rephrasing of what is already said. Every added sentence must carry new meaning.
- Keep every existing field name and the exact same JSON schema. Renumber segmentNumber sequentially from 1.
- Keep the voice, vocabulary rules and audio tags of the original draft exactly as they are. This is an expansion pass, not a rewrite.
- Every segment still needs its "subtitle" field (primary language line, then "\\n", then the translation) with 1-2 key phrases wrapped in **double asterisks** on the primary line only.
- COUNT the total words before returning. It MUST be at least ${targetWords}.

PREVIOUS DRAFT (JSON):
${JSON.stringify(script, null, 2)}

Return ONLY the corrected JSON object, same schema, no markdown fences.`;
}

export async function generateSegmentedScript({ category, durationRange, input, apiKey }) {
  const keys = (Array.isArray(apiKey) ? apiKey : [apiKey]).filter(Boolean);
  if (keys.length === 0) {
    throw new Error('Chưa cấu hình Gemini API Key. Vui lòng cấu hình ở bảng cài đặt phía trên.');
  }

  const durationInfo = getDurationInfo(durationRange);
  const skill = getSkill(category);
  const promptText = skill?.buildGeminiPrompt(input, durationInfo, durationRange)
    ?? buildEnglishQuizScriptPrompt(input, durationInfo);

  const maxOutputTokens = resolveMaxOutputTokens(durationInfo.targetSeconds);

  // Viết kịch bản là khâu sáng tạo quan trọng nhất -> tier "quality" (model thông minh nhất), và
  // nới hạn chót vì prompt dài, model hay cần nhiều thời gian suy nghĩ hơn các tác vụ khác.
  const script = await callGeminiApi(promptText, keys, {
    tier: 'quality', timeoutMs: SCRIPT_REQUEST_TIMEOUT_MS, deadlineMs: SCRIPT_DEADLINE_MS, label: 'Viết kịch bản', maxOutputTokens,
  });

  if (!AUTO_EXTEND_CATEGORIES.includes(category)) return script;

  const isVietnamese = (input.narrationLanguage || 'vi') !== 'en';
  const wps = isVietnamese ? WORDS_PER_SECOND_VI : WORDS_PER_SECOND_EN;
  // Skill tự khai mục tiêu chữ thì tin nó hơn công thức chung: công thức chung suy ra số từ từ
  // tốc độ đọc tiếng Việt, sai hẳn với skill đọc tiếng Anh chậm (đòi ~3200 từ cho video 10-15
  // phút, trong khi 40 slide × 20 giây chỉ cần khoảng 1600).
  const targetWords = skill?.targetWordCount?.(durationRange) ?? Math.round(durationInfo.targetSeconds * wps);
  // Suy ngược nhịp đọc từ chính mục tiêu chữ của skill, thay vì dùng lại `wps` chung. Nếu không,
  // dòng log và câu "bản nháp của bạn chỉ dài ~N giây" trong prompt viết bù sẽ quy đổi 833 từ
  // tiếng Anh bằng tốc độ tiếng Việt và báo 194 giây — nghe như chỉ hụt một chút, trong khi thật
  // ra hụt một nửa.
  const effectiveWps = targetWords / durationInfo.targetSeconds;
  const actualWords = countScriptWords(script.segments);

  if (actualWords >= targetWords * SHORT_SCRIPT_RATIO) return script;

  console.log(
    `[Viết kịch bản] Kịch bản chỉ có ${actualWords}/${targetWords} từ `
    + `(~${Math.round(actualWords / effectiveWps)}s so với mục tiêu ${durationInfo.targetSeconds}s) — gọi thêm 1 lượt viết bù.`
  );

  try {
    const extended = await callGeminiApi(
      buildExtendPrompt(script, actualWords, targetWords, durationInfo, effectiveWps, skill?.extendRules?.(durationRange)),
      keys,
      { tier: 'quality', timeoutMs: SCRIPT_REQUEST_TIMEOUT_MS, deadlineMs: SCRIPT_DEADLINE_MS, label: 'Viết bù kịch bản', maxOutputTokens },
    );
    const extendedWords = countScriptWords(extended.segments);
    // Chỉ nhận bản mới nếu nó THỰC SỰ dài hơn — có lần model trả về bản ngắn hơn cả bản gốc, lấy
    // bừa là làm hỏng luôn bản nháp vốn đã dùng được.
    if (extendedWords > actualWords) {
      console.log(`[Viết kịch bản] Đã viết bù: ${actualWords} -> ${extendedWords} từ (~${Math.round(extendedWords / effectiveWps)}s).`);
      return extended;
    }
    console.warn(`[Viết kịch bản] Bản viết bù (${extendedWords} từ) không dài hơn bản gốc — giữ bản gốc.`);
  } catch (err) {
    // Viết bù là bước làm-tốt-thêm: hỏng thì vẫn còn kịch bản gốc dùng được, không nên ném lỗi
    // ra ngoài làm hỏng cả lượt tạo kịch bản.
    console.warn('[Viết kịch bản] Không viết bù được, dùng bản gốc:', err.message);
  }

  return script;
}
