import { callGeminiApi } from './callGeminiApi.js';

/**
 * Sinh KHỐI ĐĂNG VIDEO (tiêu đề + hashtag + mô tả) cho MỌI skill, từ chính kịch bản vừa viết xong.
 *
 * Vì sao là một LƯỢT GỌI RIÊNG thay vì nhét thêm vào prompt viết kịch bản của từng skill:
 *  1. Mười skill có mười template khác nhau, mười ngôn ngữ / giọng khác nhau. Nhét khối đăng video
 *     vào từng cái là mười lần sửa, mười lần có thể sai — và mười cơ hội làm hỏng JSON kịch bản.
 *  2. Kịch bản đã là lượt gọi NẶNG NHẤT (trần token tới 65k, hay bị cắt ngang giữa chừng). Mỗi
 *     khoá thừa nhét vào output shape đều làm tăng khả năng JSON đứt trước khi đóng ngoặc — đúng
 *     lỗi đã phải chữa nhiều lần (xem JSON_SAFETY_SUFFIX trong callGeminiApi.js).
 *  3. Viết caption CẦN đọc xong kịch bản mới biết đâu là chi tiết đắt nhất để giật tiêu đề. Bắt
 *     model viết tiêu đề CÙNG LÚC với kịch bản là bắt nó hứa trước khi biết mình sẽ kể gì.
 *
 * HAI SKILL NHẬT KHÔNG đi qua đây: chúng tự viết khối này trong kịch bản với luật riêng rất chặt
 * (cấm giật tít, cấm 【衝撃】, cấm hashtag ngủ/thư giãn — xem PUBLISHING trong japaneseHistory.js).
 * Ghi đè bằng luật chung "viết cho thu hút" sẽ phá đúng thứ đã cố tình dựng lên.
 */

// Lượt gọi nhẹ: prompt ngắn, đầu ra vài trăm token. Không cần tier "quality" như viết kịch bản,
// nhưng vẫn phải có hạn giờ riêng — chờ 210 giây cho một cái tiêu đề là vô lý.
const META_REQUEST_TIMEOUT_MS = 45_000;
const META_DEADLINE_MS = 90_000;
const META_MAX_TOKENS = 1536;

// Kịch bản 10 phút dài vài chục nghìn ký tự; nhét hết vào chỉ tốn token mà không giúp gì. Lấy
// ĐẦU + GIỮA + CUỐI: mở bài cho biết video hứa gì, giữa bài là chỗ có chi tiết đắt nhất, kết bài
// cho biết nó chốt ở đâu. Cắt phẳng 3000 ký tự đầu thì tiêu đề luôn chỉ nói được về phần mở.
const SAMPLE_BUDGET = 3000;

function narrationOf(segment) {
  const raw = segment?.dialogueOrNarration || segment?.narration || segment?.text || '';
  // [tag cảm xúc] và **in đậm** là ký hiệu cho TTS/phụ đề, không phải nội dung — để lại chỉ làm
  // model tưởng đó là một phần văn phong và bắt chước vào tiêu đề.
  return String(raw).replace(/\[[^\]]*\]/g, ' ').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
}

function buildScriptSample(segments = []) {
  const lines = segments.map(narrationOf).filter(Boolean);
  if (lines.length === 0) return '';

  const full = lines.join(' ');
  if (full.length <= SAMPLE_BUDGET) return full;

  const third = Math.floor(SAMPLE_BUDGET / 3);
  const mid = Math.floor(lines.length / 2);
  const head = lines.join(' ').slice(0, third);
  const middle = lines.slice(mid).join(' ').slice(0, third);
  const tail = lines.slice(-Math.max(2, Math.ceil(lines.length * 0.15))).join(' ').slice(-third);
  return `${head}\n[...]\n${middle}\n[...]\n${tail}`;
}

function buildPrompt({ title, sample, platform }) {
  const surface = platform === 'portrait'
    ? 'a vertical short (TikTok / YouTube Shorts / Reels), watched on a phone where the caption is read in under a second'
    : 'a normal landscape YouTube video, where the title is read in a grid of thumbnails';

  return `You are writing the publishing block for a finished video: the title, the hashtags and the description that get pasted into the upload form.

THIS VIDEO IS: ${surface}.
${title ? `WORKING TITLE OF THE SCRIPT: ${title}` : ''}

THE NARRATION, as actually written (opening, middle and ending; [...] marks a cut):
"""
${sample}
"""

LANGUAGE — the single most important rule: write the title, the description and the hashtags in THE SAME LANGUAGE the narration above is written in. If the narration is Vietnamese, everything you write is Vietnamese. If it is English, English. If it is Japanese, Japanese. Never translate, never mix two languages in one line.

"youtubeTitle" — ONE line, no line break.
- Build it on the single most CONCRETE and most SURPRISING thing that actually happens in the narration above: a number, a name, a moment, a reversal, a sentence someone says. A title that could sit on any other video on this topic is a failed title.
- Put the strongest words FIRST. Only the first half survives on a phone; a title whose point arrives at the end arrives nowhere.
- Length: long enough to be specific, short enough to survive truncation — aim for roughly 45 to 70 characters for a Latin-script language, 20 to 40 characters for Japanese.
- It must be curiosity, never a trick: everything the title promises has to be genuinely in the narration above. A viewer who clicks and finds the promise unpaid is worse than a viewer who never clicks.
- Plain sentence case. No ALL CAPS words, no emoji, no strings of !!! or ???, no "bạn sẽ không tin nổi", no "sự thật mà không ai dám nói".
- A short bracketed marker at the front is allowed when it genuinely names the format or the series, and only then.

"hashtags" — an array of 5 to 8 strings, each starting with "#", no spaces inside a tag, no duplicates.
- Mix three widths: the broad field, the specific sub-topic of THIS video, and the audience or format. Broad-only tags leave the video competing with everything; specific-only tags leave it invisible.
- Write them the way viewers of that language actually type them, not translated word by word from English.

"youtubeDescription"
- 2 to 4 sentences opening the video in the SAME voice the narration uses — calm script, calm description; lively script, lively description. Say what the viewer is about to get, concretely.
- Then a blank line, then all the hashtags on one single line, separated by spaces.

Return ONLY this JSON object:
{
  "youtubeTitle": "...",
  "hashtags": ["#...", "#..."],
  "youtubeDescription": "...\\n\\n#... #..."
}`;
}

/** Dọn đầu ra của model về đúng hình dạng record đang dùng (xem app/api/prompts/generate/route.js). */
function normalise(raw) {
  const title = String(raw?.youtubeTitle || '').replace(/\s+/g, ' ').trim();

  const hashtags = Array.from(new Set(
    (Array.isArray(raw?.hashtags) ? raw.hashtags : [])
      .map((tag) => String(tag || '').trim().split(/\s+/)[0])
      .filter(Boolean)
      // Model thỉnh thoảng trả về "lichsu" không có dấu #, hoặc "##lichsu".
      .map((tag) => `#${tag.replace(/^#+/, '')}`)
      .filter((tag) => tag.length > 1),
  )).slice(0, 8);

  const description = String(raw?.youtubeDescription || '').trim();

  if (!title && hashtags.length === 0 && !description) return null;
  return {
    ...(title ? { youtubeTitle: title } : {}),
    ...(hashtags.length > 0 ? { hashtags } : {}),
    ...(description ? { youtubeDescription: description } : {}),
  };
}

/**
 * @param {{ title?: string, segments?: Array, isLandscape?: boolean, apiKey: string|string[] }} args
 * @returns {Promise<{youtubeTitle?: string, hashtags?: string[], youtubeDescription?: string}|null>}
 *   null khi không đủ dữ liệu hoặc khi Gemini hỏng — bên gọi cứ bỏ qua, kịch bản vẫn dùng được.
 */
export async function generatePublishMeta({ title, segments, isLandscape = true, apiKey }) {
  const keys = (Array.isArray(apiKey) ? apiKey : [apiKey]).filter(Boolean);
  if (keys.length === 0) return null;

  const sample = buildScriptSample(segments);
  // Dưới ngưỡng này thì chưa có gì để giật tiêu đề — trả null còn hơn để model tự bịa ra nội dung
  // không có trong video.
  if (sample.length < 80) return null;

  const prompt = buildPrompt({ title, sample, platform: isLandscape ? 'landscape' : 'portrait' });
  const raw = await callGeminiApi(prompt, keys, {
    tier: 'fast',
    timeoutMs: META_REQUEST_TIMEOUT_MS,
    deadlineMs: META_DEADLINE_MS,
    label: 'Viết tiêu đề & hashtag',
    maxOutputTokens: META_MAX_TOKENS,
  });

  return normalise(raw);
}
