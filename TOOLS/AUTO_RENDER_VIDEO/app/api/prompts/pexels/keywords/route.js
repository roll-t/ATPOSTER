import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';
import { callGeminiWithKeyRotation } from '@/lib/prompts/gemini/callGeminiApi';
import { parseApiKeys } from '@/lib/prompts/gemini/apiKeys.js';

/**
 * Sinh danh sách từ khoá tìm video nền Pexels BÁM THEO NỘI DUNG KỊCH BẢN.
 *
 * Trước đây mỗi chủ đề (moralTheme) chỉ ứng với ĐÚNG MỘT chuỗi từ khoá gõ cứng ở client, nên mọi
 * kịch bản cùng chủ đề đều tìm ra đúng một bộ clip giống hệt nhau — video nào cũng na ná video nào,
 * và hình ảnh chẳng liên quan gì tới điều lời kể đang nói tới.
 *
 * Ở đây Gemini đọc chính lời kể rồi đề xuất nhiều cảnh quay KHÁC NHAU, mỗi từ khoá nhắm một khung
 * cảnh/thời điểm riêng, để lưới kết quả đa dạng và bám sát mạch cảm xúc của kịch bản.
 */

// Số từ khoá đề xuất. Nhiều hơn nữa thì mỗi từ khoá lại lấy được quá ít clip trong 1 lần tìm,
// mà tổng số lần gọi Pexels cũng tăng theo.
const KEYWORD_COUNT = 5;

// Cắt bớt lời kể gửi lên: chỉ cần đủ để nắm mạch cảm xúc, gửi cả kịch bản 10 phút là phí token.
const MAX_NARRATION_CHARS = 2500;

// Lời kể mỗi đoạn gửi lên chỉ cần đủ để nắm ý, không cần nguyên văn.
const MAX_SEGMENT_CHARS = 320;

/**
 * Chế độ THEO TỪNG ĐOẠN: mỗi đoạn lời kể được một từ khoá riêng, để clip nền khớp với đúng câu
 * đang được đọc thay vì chỉ hợp mood chung của cả video.
 */
async function buildPerSegmentKeywords({ title, theme, segments, apiKey }) {
  const list = segments
    .map(s => ({
      segmentNumber: s.segmentNumber,
      text: String(s.text || '').slice(0, MAX_SEGMENT_CHARS).trim(),
    }))
    .filter(s => s.segmentNumber != null && s.text);

  if (list.length === 0) return [];

  const promptText = `You pick stock-footage search queries for the BACKGROUND of a Vietnamese "life philosophy" spoken-word video.

Each numbered line below is ONE narration segment. For EACH segment, give ONE English Pexels video search query whose footage fits THAT specific line — the shot changes as the narration moves.

SCRIPT TITLE: "${title}"
THEME KEY: "${theme}"

SEGMENTS:
${list.map(s => `${s.segmentNumber}. ${s.text}`).join('\n')}

RULES:
1. Each query describes a FILMABLE SCENE — a place, a natural element, a light condition, a human action seen from afar. Never abstract nouns ("loneliness", "failure", "courage"): Pexels returns nothing usable for those. Translate the FEELING of the line into a scene.
2. CONSECUTIVE segments must not repeat the same shot. Vary setting, time of day and weather as the narration develops.
3. Follow the emotional arc: heavy lines get dim/overcast/enclosed scenes, hopeful lines get open/warm/bright ones.
4. 2 to 5 words each, lowercase, no punctuation.
5. Prefer calm, slow, wide, atmospheric footage that still reads well after being darkened behind text.

Return ONLY a JSON array, one object per segment, in the same order:
[{"segmentNumber": 1, "keyword": "dark empty room rainy night"}]`;

  const raw = await callGeminiWithKeyRotation(promptText, apiKey, {
    tier: 'fast', label: 'Từ khoá nền theo đoạn',
  });

  let arr = [];
  if (Array.isArray(raw)) arr = raw;
  else if (raw && Array.isArray(raw.segments)) arr = raw.segments;
  else if (raw && Array.isArray(raw.keywords)) arr = raw.keywords;

  const validNumbers = new Set(list.map(s => s.segmentNumber));
  return arr
    .map(item => ({
      segmentNumber: Number(item?.segmentNumber),
      keyword: String(item?.keyword || '').trim().toLowerCase().replace(/["'.,]/g, ''),
    }))
    .filter(x =>
      validNumbers.has(x.segmentNumber)
      && x.keyword.length >= 3
      && x.keyword.split(/\s+/).length <= 6
    );
}

export async function POST(req) {
  try {
    const { title = '', narration = '', theme = '', segments = null } = await req.json();

    const db = await readDb();
    const apiKey = parseApiKeys(db.settings?.geminiApiKey || process.env.GEMINI_API_KEY || '');

    // Chưa cấu hình key thì trả rỗng — client tự lùi về từ khoá tĩnh theo chủ đề, không báo lỗi
    // vì đây chỉ là bước làm-tốt-thêm cho việc chọn nền.
    if (apiKey.length === 0) {
      return NextResponse.json({ success: true, source: 'none', keywords: [], segmentKeywords: [] });
    }

    // Có `segments` -> chế độ mỗi đoạn một từ khoá (nền bám theo từng câu nói).
    if (Array.isArray(segments) && segments.length > 0) {
      const segmentKeywords = await buildPerSegmentKeywords({ title, theme, segments, apiKey });
      console.log(`[API PexelsKeywords] ${segmentKeywords.length}/${segments.length} từ khoá theo đoạn cho "${title}"`);
      return NextResponse.json({
        success: true,
        source: segmentKeywords.length > 0 ? 'gemini' : 'none',
        segmentKeywords,
        keywords: [],
      });
    }

    const script = String(narration).slice(0, MAX_NARRATION_CHARS);

    const promptText = `You pick stock-footage search queries for the BACKGROUND of a Vietnamese "life philosophy" spoken-word video.

The video is a calm voice-over over a single cinematic background video, dimmed behind text. The footage must carry the MOOD of what is being said — it is never literal illustration.

SCRIPT TITLE: "${title}"
THEME KEY: "${theme}"
NARRATION (may be Vietnamese):
"""
${script}
"""

Return ${KEYWORD_COUNT} DIFFERENT English search queries for Pexels video search.

RULES:
1. Each query describes a FILMABLE SCENE — a place, a natural element, a light condition. Never abstract nouns ("loneliness", "growth", "success") — those return nothing usable on Pexels.
2. The ${KEYWORD_COUNT} queries must be VISUALLY DISTINCT from each other: vary the setting (forest / water / sky / road / window / city), the time of day, and the weather. Do not return ${KEYWORD_COUNT} variations of the same shot.
3. Match the emotional arc of the narration — if it moves from heavy to hopeful, let the queries move from dim/overcast to warm/bright.
4. 2 to 5 words each, lowercase, no punctuation, no quotes.
5. Prefer calm, slow, wide, atmospheric footage that reads well when darkened behind text.

Return ONLY a JSON array of ${KEYWORD_COUNT} strings, nothing else.
Example: ["misty forest morning", "rain on window glass", "calm lake at dusk", "empty road golden hour", "sunlight through leaves"]`;

    const raw = await callGeminiWithKeyRotation(promptText, apiKey, {
      tier: 'fast', label: 'Từ khoá video nền',
    });

    let list = [];
    if (Array.isArray(raw)) list = raw;
    else if (raw && Array.isArray(raw.keywords)) list = raw.keywords;
    else if (raw && Array.isArray(raw.queries)) list = raw.queries;

    const seen = new Set();
    const keywords = list
      .map(k => String(k || '').trim().toLowerCase().replace(/["'.,]/g, ''))
      .filter(k => {
        if (k.length < 3 || k.split(/\s+/).length > 6) return false;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, KEYWORD_COUNT);

    if (keywords.length === 0) {
      return NextResponse.json({ success: true, source: 'none', keywords: [] });
    }

    console.log(`[API PexelsKeywords] ${keywords.length} từ khoá cho "${title}": ${keywords.join(' | ')}`);
    return NextResponse.json({ success: true, source: 'gemini', keywords });
  } catch (err) {
    // Không chặn luồng chọn nền chỉ vì gợi ý từ khoá hỏng — client còn từ khoá tĩnh để dùng.
    console.warn('[API PexelsKeywords] Không sinh được từ khoá:', err.message);
    return NextResponse.json({ success: true, source: 'error', keywords: [], error: err.message });
  }
}
