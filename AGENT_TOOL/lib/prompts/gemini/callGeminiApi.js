import { parseGeminiJson } from './parseGeminiJson.js';

const GEMINI_MODEL = 'gemini-2.5-flash';

// Nhắc thêm về định dạng JSON an toàn, gắn vào MỌI prompt gửi Gemini để giảm khả năng
// model trả JSON hỏng (ví dụ chèn dấu " chưa escape bên trong 1 chuỗi mô tả).
const JSON_SAFETY_SUFFIX = `

IMPORTANT JSON OUTPUT RULES:
- Return ONLY a single valid JSON object. No markdown, no comments, no trailing commas.
- Inside any string value, if you need to quote a word/phrase, use single quotes (') instead of double quotes ("). Never place an unescaped double-quote character inside a string value.
- Do not use literal newline characters inside string values; keep each string value on a single line.`;

async function requestGeminiOnce(promptText, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${promptText}${JSON_SAFETY_SUFFIX}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    error.status = response.status;
    // Gemini thường gợi ý sẵn thời gian nên chờ trong lỗi 429 (vd "17.7s") — dùng luôn
    // thay vì đoán mò, để tránh vừa chờ vừa vẫn bị từ chối vì thử lại quá sớm.
    const retryInfo = errorData.error?.details?.find((d) => d['@type']?.includes('RetryInfo'));
    if (retryInfo?.retryDelay) {
      error.retryDelayMs = Math.round(parseFloat(retryInfo.retryDelay) * 1000);
    }
    throw error;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini API không trả về nội dung kịch bản.');
  }

  return parseGeminiJson(text);
}

const MAX_ROUNDS = 2;
// 429 = key hết quota, 403 = key bị từ chối, 503 = model đang quá tải ("high demand")
// — đều là lỗi có thể khắc phục bằng cách đổi key khác hoặc thử lại sau.
const RETRYABLE_STATUS = new Set([429, 403, 503]);

function isRetryableError(error) {
  return error instanceof SyntaxError || RETRYABLE_STATUS.has(error.status);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gọi Gemini với 1 prompt, chấp nhận 1 API key hoặc danh sách nhiều key.
 * Khi key hiện tại hết quota (429) hoặc bị từ chối (403), tự động chuyển sang key
 * kế tiếp trong danh sách ngay lập tức. Khi Gemini quá tải (503) hoặc JSON phản hồi
 * hỏng, chờ backoff rồi thử lại. Toàn bộ danh sách key được lặp lại tối đa MAX_ROUNDS
 * vòng trước khi bỏ cuộc.
 */
export async function callGeminiWithKeyRotation(promptText, apiKeyOrKeys) {
  const keys = (Array.isArray(apiKeyOrKeys) ? apiKeyOrKeys : [apiKeyOrKeys])
    .map((key) => (key || '').trim())
    .filter(Boolean);

  if (keys.length === 0) {
    throw new Error('Chưa cấu hình Gemini API Key.');
  }

  let lastError;
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    for (let i = 0; i < keys.length; i++) {
      const keyLabel = keys.length > 1 ? ` (key #${i + 1}/${keys.length})` : '';
      try {
        return await requestGeminiOnce(promptText, keys[i]);
      } catch (error) {
        lastError = error;
        if (!isRetryableError(error)) {
          console.error(`[Gemini Service Error]${keyLabel}:`, error);
          throw error;
        }

        const isLastAttempt = round === MAX_ROUNDS && i === keys.length - 1;
        if (isLastAttempt) {
          console.error(`[Gemini Service Error]${keyLabel}:`, error);
          throw error;
        }

        const hasNextKeyThisRound = i < keys.length - 1;
        if ((error.status === 429 || error.status === 403) && hasNextKeyThisRound) {
          console.warn(`[Gemini Service] Key #${i + 1} lỗi (${error.message}), chuyển sang key kế tiếp...`);
          continue;
        }

        // Đã thử hết key trong vòng này (hoặc lỗi 503/JSON) -> chờ rồi lặp lại vòng mới.
        // Ưu tiên thời gian Google gợi ý (retryDelayMs), giới hạn 1-30s để không treo quá lâu.
        const delayMs = error.retryDelayMs
          ? Math.min(Math.max(error.retryDelayMs, 1000), 30000)
          : 1500 * round;
        console.warn(`[Gemini Service] Lỗi tạm thời${keyLabel} (${error.message}), thử lại sau ${delayMs}ms`);
        await sleep(delayMs);
      }
    }
  }
  throw lastError;
}

/**
 * Gọi API Gemini với 1 prompt meta văn bản, trả về JSON { title, segments } đã parse.
 * Chấp nhận 1 API key hoặc mảng nhiều key (tự xoay vòng khi key hiện tại lỗi tạm thời).
 */
export async function callGeminiApi(promptText, apiKeyOrKeys) {
  try {
    const result = await callGeminiWithKeyRotation(promptText, apiKeyOrKeys);
    if (!result.segments || !Array.isArray(result.segments)) {
      throw new Error('Cấu trúc JSON phản hồi không có mảng segments.');
    }
    return result;
  } catch (error) {
    throw new Error(`Lỗi gọi Gemini AI: ${error.message}`);
  }
}
