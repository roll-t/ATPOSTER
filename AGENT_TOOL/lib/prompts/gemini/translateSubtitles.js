import { callGeminiWithKeyRotation } from './callGeminiApi.js';

/**
 * Dịch một danh sách dòng phụ đề tiếng Anh sang tiếng Việt bằng 1 lệnh gọi Gemini duy nhất
 * (thay vì gọi riêng từng dòng), giữ nguyên thứ tự để ghép lại đúng theo index.
 * Dùng để bổ sung/refresh phụ đề song ngữ cho các kịch bản đã tạo trước đó.
 */
export async function translateSubtitleLines(englishLines, apiKeyOrKeys) {
  const keys = (Array.isArray(apiKeyOrKeys) ? apiKeyOrKeys : [apiKeyOrKeys])
    .map((key) => (key || '').trim())
    .filter(Boolean);

  if (keys.length === 0) {
    throw new Error('Chưa cấu hình Gemini API Key.');
  }

  const promptText = `
You are an expert English-to-Vietnamese translator for video subtitles.
Translate each line below into natural, concise, spoken Vietnamese suitable as an on-screen subtitle — keep the same meaning and tone as the English line, not an overly literal word-for-word translation.
The input is a JSON array of strings, index-ordered. You MUST return a translation for every single line, in the exact same order, with the exact same array length.

Input lines:
${JSON.stringify(englishLines, null, 2)}

Return the result as a JSON object matching exactly this schema:
{
  "translations": ["Vietnamese translation of line 1", "Vietnamese translation of line 2"]
}
`;

  const result = await callGeminiWithKeyRotation(promptText, keys);
  if (!result.translations || !Array.isArray(result.translations) || result.translations.length !== englishLines.length) {
    throw new Error('Gemini không trả về danh sách bản dịch hợp lệ (thiếu hoặc sai số dòng).');
  }
  return result.translations;
}
