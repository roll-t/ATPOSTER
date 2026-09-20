import { NextResponse } from 'next/server';
import { settingsRepository } from '@/src/infrastructure/composition/settings.js';
import { callGeminiWithKeyRotation } from '@/src/infrastructure/ai/gemini/callGeminiApi';
import { parseApiKeys } from '@/src/domain/ai/apiKeys.js';

/**
 * Sinh từ khoá Pexels bám sát chủ thể, hành động và bối cảnh thật của nội dung kịch bản.
 *
 * Trước đây mỗi chủ đề (moralTheme) chỉ ứng với ĐÚNG MỘT chuỗi từ khoá gõ cứng ở client, nên mọi
 * kịch bản cùng chủ đề đều tìm ra đúng một bộ clip giống hệt nhau — video nào cũng na ná video nào,
 * và hình ảnh chẳng liên quan gì tới điều lời kể đang nói tới.
 *
 * Gemini đọc chính lời kể để giữ lại chủ đề cụ thể của cảnh; prompt tạo hình chỉ là ngữ cảnh phụ
 * và các chỉ dẫn phong cách như 2D, màu nền hoặc stick figure không được đưa vào từ khoá kho ảnh.
 */

// Số từ khoá đề xuất. Nhiều hơn nữa thì mỗi từ khoá lại lấy được quá ít clip trong 1 lần tìm,
// mà tổng số lần gọi Pexels cũng tăng theo.
const KEYWORD_COUNT = 5;

// Cắt bớt lời kể gửi lên: chỉ cần đủ để nắm mạch cảm xúc, gửi cả kịch bản 10 phút là phí token.
const MAX_NARRATION_CHARS = 2500;

// Lời kể mỗi đoạn gửi lên chỉ cần đủ để nắm ý, không cần nguyên văn.
const MAX_SEGMENT_CHARS = 320;

/**
 * Chế độ THEO TỪNG ĐOẠN: mỗi đoạn lời kể được một từ khoá riêng, để media khớp với đúng chủ đề
 * đang được nói thay vì chỉ hợp cảm xúc chung của video.
 */
async function buildPerSegmentKeywords({ title, theme, segments, apiKey }) {
  const list = segments
    .map(s => ({
      segmentNumber: s.segmentNumber,
      narration: String(s.narration || s.text || '').slice(0, MAX_SEGMENT_CHARS).trim(),
      visualPrompt: String(s.visualPrompt || '').slice(0, MAX_SEGMENT_CHARS).trim(),
    }))
    .filter(s => s.segmentNumber != null && (s.narration || s.visualPrompt));

  if (list.length === 0) return [];

  const promptText = `You create highly relevant English Pexels stock-media search queries for Vietnamese video scenes.

Each item contains the SPOKEN NARRATION and may contain a VISUAL PROMPT. For EACH item, identify the actual topic being discussed and return one query that directly depicts its main subject, action and useful context.

SCRIPT TITLE: "${title}"
THEME KEY: "${theme}"

SEGMENTS:
${list.map(s => `${s.segmentNumber}.
NARRATION: ${s.narration || '(empty)'}
VISUAL PROMPT: ${s.visualPrompt || '(empty)'}`).join('\n\n')}

RULES:
1. TOPIC FIDELITY IS MOST IMPORTANT. Preserve distinctive entities and concepts from the narration (for example social media, Facebook, friends, money, school, health, AI). Do not replace the topic with a generic mood shot such as forest, sunset, rain, dark room or lonely person unless that setting is explicitly the topic.
2. Express abstract claims through a concrete person + action + object/context. Example: "Facebook knows what friends like" -> "friends using social media phone", not "thoughtful person dark room".
3. Use the NARRATION as the source of truth. Use VISUAL PROMPT only to clarify a concrete action or setting. Ignore art-style instructions such as stick figure, 2D, colors, lighting, minimalist and background design.
4. Use common stock-footage vocabulary that Pexels can match. Do not include brand names when a broader visual term is more searchable, but keep the underlying subject.
5. 3 to 7 words each, lowercase, no punctuation. Avoid vague words such as cinematic, atmosphere, concept and background.
6. Consecutive scenes may vary their shot, but never sacrifice topic relevance merely to create visual variety.

Return ONLY a JSON array, one object per segment, in the same order:
[{"segmentNumber": 1, "keyword": "friends using social media phone"}]`;

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
      && x.keyword.split(/\s+/).length <= 8
    );
}

export async function POST(req) {
  try {
    const { title = '', narration = '', theme = '', segments = null } = await req.json();

    const settings = await settingsRepository.read();
    const apiKey = parseApiKeys(settings.geminiApiKey || process.env.GEMINI_API_KEY || '');

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

    const promptText = `You create relevant English Pexels stock-media search queries for a Vietnamese spoken-word video.

The footage must visibly support the actual TOPIC being discussed, not merely its mood.

SCRIPT TITLE: "${title}"
THEME KEY: "${theme}"
NARRATION (may be Vietnamese):
"""
${script}
"""

Return ${KEYWORD_COUNT} DIFFERENT English search queries for Pexels video search.

RULES:
1. Preserve the main subjects, objects and actions in the narration. Never replace a concrete topic with generic nature, sunset, rain or mood footage.
2. Convert abstract statements into filmable person + action + object/context queries.
3. Make the ${KEYWORD_COUNT} queries cover different concrete parts of the narration while remaining on-topic.
4. Use common Pexels vocabulary, 3 to 7 words each, lowercase, no punctuation or quotes.
5. Avoid style words such as cinematic, atmospheric, background and concept.

Return ONLY a JSON array of ${KEYWORD_COUNT} strings, nothing else.
Example: ["person using social media phone", "friends sharing phone together", "woman checking mobile notifications", "people browsing news feed", "phone data analytics screen"]`;

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
        if (k.length < 3 || k.split(/\s+/).length > 8) return false;
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
