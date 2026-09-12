/**
 * Phân tích và gắn tag cảm xúc ElevenLabs v3 cho kịch bản video bằng Gemini AI.
 * Dành cho người dùng muốn AI chuyên sâu đạo diễn ngữ điệu (whispers, sighs, pause, solemn, dramatic...).
 */
export async function tagElevenLabsScript(narrationLines, apiKeyOrKeys, generateText) {
  if (typeof generateText !== 'function') {
    throw new TypeError('tagElevenLabsScript requires a text-generation gateway.');
  }
  const keys = (Array.isArray(apiKeyOrKeys) ? apiKeyOrKeys : [apiKeyOrKeys])
    .map((key) => (key || '').trim())
    .filter(Boolean);

  if (keys.length === 0) {
    throw new Error('Chưa cấu hình Gemini API Key.');
  }

  const promptText = `
You are a master voice director specializing in ElevenLabs v3 audio generation.
Your task is to take an ordered list of narration lines and insert natural ElevenLabs v3 emotion/delivery tags to make the voice acting expressive, nuanced, and cinematic.

Allowed ElevenLabs v3 tags:
- [whispers] - for quiet, secretive, cold, space darkness, or eerie moments
- [sighs] - for exhaustion, sorrow, or melancholic conclusions
- [pause] - for brief breath/pause between suspenseful ideas or dramatic contrast
- [long pause] - for significant dramatic beats or silence
- [curious] - for questions, intriguing facts, or mysteries
- [thoughtful] - for contemplative explanations, philosophical lines, or gentle reflection
- [dramatic] - for shocking turns, sudden catastrophes, or intense peaks
- [solemn] - for serious, heavy, grave consequences
- [excited] - for energetic discoveries or breakthroughs
- [gasps] - for sudden shock or breathtaking realization

STRICT RULES:
1. DO NOT change, remove, translate, or rewrite any original spoken words. Keep the exact text intact in its original language.
2. Insert tags naturally at the beginning of clauses or before key phrases (e.g. "[curious] Nếu Mặt Trời đột ngột biến mất, [pause] chúng ta sẽ ra sao?").
3. Keep it tasteful: 1 to 3 tags per slide maximum. Do not clutter every single word with tags.
4. Input is a JSON array of strings. You MUST return a JSON array with the exact same length and order.

Input lines:
${JSON.stringify(narrationLines, null, 2)}

Return the result as a JSON object matching exactly this schema:
{
  "taggedLines": ["tagged line 1", "tagged line 2"]
}
`;

  const result = await generateText(promptText, keys, { tier: 'fast', label: 'Gắn tag ElevenLabs' });
  if (!result.taggedLines || !Array.isArray(result.taggedLines) || result.taggedLines.length !== narrationLines.length) {
    throw new Error('Gemini không trả về danh sách kịch bản gắn tag hợp lệ.');
  }
  return result.taggedLines;
}
