import { callGeminiWithKeyRotation } from './callGeminiApi.js';

/**
 * Gọi API Gemini để dịch các trường nhập từ tiếng Việt sang tiếng Anh và tối ưu hóa chi tiết prompt.
 */
export async function translateAndExpandInputs({ category, input, apiKey }) {
  const keys = (Array.isArray(apiKey) ? apiKey : [apiKey]).filter(Boolean);
  if (keys.length === 0) {
    // Nếu không có API Key, trả về nguyên bản
    return input;
  }

  // Lọc ra các trường có giá trị là chuỗi không rỗng (bỏ qua các trường cấu hình/lựa chọn)
  const SKIP_KEYS = ['imageStyle', 'shotType', 'aspectRatio', 'characterIds', 'durationRange', 'category', 'ageGroup', 'height', 'hairLength', 'hairColor', 'personality', 'level'];
  const fieldsToTranslate = {};
  for (const [key, val] of Object.entries(input)) {
    if (SKIP_KEYS.includes(key)) continue;
    if (typeof val === 'string' && val.trim() !== '') {
      fieldsToTranslate[key] = val;
    }
  }

  if (Object.keys(fieldsToTranslate).length === 0) {
    return input;
  }

  const promptText = `
You are an expert AI translator and prompt designer.
Your task is to take the following JSON object containing user inputs (which may be in Vietnamese or English), and translate them to create a bilingual output.

For each string field:
- You MUST output a bilingual string formatted exactly as: "English translation // Vietnamese translation"
- For example, if the input is "một chàng trai trẻ tóc đen", the output should be "A young man with black hair // Một chàng trai trẻ với mái tóc đen".
- If the field is descriptive (like "characterDescription", "scenario", "story", "explanation"):
  1. Generate a rich, detailed, and clear descriptive prompt in English.
  2. Provide a corresponding Vietnamese translation of that detailed description, separated by " // ".
- For simpler fields (like "question", "options", "pose", "expression", "ruleTitle", "hook", "example", "closingCTA"):
  1. Translate the user input into English.
  2. Provide the corresponding Vietnamese translation, separated by " // ".
- For structural fields like options with prefixes (e.g. "A. Cat\nB. Dog") or very simple values (e.g. "3:4", "shorts"), do NOT add the " // " separator; just output the English/standard value as is.

Do NOT modify the JSON keys. Output the result as a raw JSON object matching the input keys.

IMPORTANT JSON OUTPUT RULES:
- Return ONLY a single valid JSON object. No markdown, no comments, no trailing commas.
- Inside any string value, if you need to quote a word/phrase, use single quotes (') instead of double quotes ("). Never place an unescaped double-quote character inside a string value.
- Do not use literal newline characters inside string values; keep each string value on a single line.

Input JSON:
${JSON.stringify(fieldsToTranslate, null, 2)}
`;

  try {
    const translatedFields = await callGeminiWithKeyRotation(promptText, keys);

    // Ghi đè lại các trường đã dịch/tối ưu vào bản sao của input
    const resultInput = { ...input };
    for (const key of Object.keys(fieldsToTranslate)) {
      if (translatedFields[key]) {
        resultInput[key] = translatedFields[key];
      }
    }
    return resultInput;
  } catch (error) {
    console.error('[Gemini Translation Error]:', error);
    return input;
  }
}
