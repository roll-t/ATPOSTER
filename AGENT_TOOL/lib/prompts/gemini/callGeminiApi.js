import { parseGeminiJson } from './parseGeminiJson.js';

// Dùng alias "-latest" của Google thay vì tên model có version/ngày tháng cứng — Google liên tục
// deprecate model cũ (vd gemini-2.5-flash, gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-pro-exp-02-05
// đều đã trả 404 "no longer available to new users"/"is not found" tại thời điểm viết dòng này),
// khiến danh sách cứng cũ liên tục lỗi thời. Alias "-latest" tự trỏ sang model flash/pro mới nhất
// Google đang phục vụ, không cần cập nhật tay mỗi khi có model mới. gemini-flash-latest/
// gemini-flash-lite-latest đặt trước vì tier "pro" thường có quota free-tier = 0 (limit: 0, khác
// với "đã dùng hết quota trong ngày") trên nhiều key/project — không phải lỗi có thể tự phục hồi
// bằng cách đổi key hay đợi, mà là gói quota chưa được cấp cho tier đó.
const FALLBACK_MODELS = [
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-pro-latest',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite'
];

// Nhắc thêm về định dạng JSON an toàn, gắn vào MỌI prompt gửi Gemini để giảm khả năng
// model trả JSON hỏng (ví dụ chèn dấu " chưa escape bên trong 1 chuỗi mô tả).
const JSON_SAFETY_SUFFIX = `

IMPORTANT JSON OUTPUT RULES:
- Return ONLY a single valid JSON object. No markdown, no comments, no trailing commas.
- Inside any string value, if you need to quote a word/phrase, use single quotes (') instead of double quotes ("). Never place an unescaped double-quote character inside a string value.
- Do not use literal newline characters inside string values; keep each string value on a single line.`;

async function requestGeminiOnce(promptText, apiKey, modelName = 'gemini-2.5-flash') {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
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
// 400/401 = key sai/hết hạn, 429 = key hết quota, 403 = key bị từ chối, 503 = model đang quá tải ("high demand")
// — đều là lỗi có thể khắc phục bằng cách đổi key khác hoặc thử lại sau.
// 404 = tên model không tồn tại / đã bị Google ngừng hỗ trợ cho key/API version này (vd
// "This model models/gemini-2.5-flash is no longer available to new users") — KHÔNG phải lỗi
// của key, chỉ cần bỏ qua model này và thử model kế tiếp trong FALLBACK_MODELS (xem nhánh
// error.status === 404 bên dưới, xử lý giống hệt 503) chứ không nên coi là lỗi chí mạng.
const RETRYABLE_STATUS = new Set([400, 401, 403, 404, 429, 503]);

function isRetryableError(error) {
  return error instanceof SyntaxError || RETRYABLE_STATUS.has(error.status);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gọi Gemini với 1 prompt, chấp nhận 1 API key hoặc danh sách nhiều key.
 * Khi key hiện tại hết quota (429) hoặc bị từ chối (403/400/401), tự động chuyển sang key
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
    for (const modelName of FALLBACK_MODELS) {
      for (let i = 0; i < keys.length; i++) {
        const keyLabel = keys.length > 1 ? ` (key #${i + 1}/${keys.length})` : '';
        try {
          return await requestGeminiOnce(promptText, keys[i], modelName);
        } catch (error) {
          lastError = error;
          if (!isRetryableError(error)) {
            console.error(`[Gemini Service Error] Model ${modelName}${keyLabel}:`, error);
            throw error;
          }

          // Khi server Google báo 503 (High Demand) hoặc 404 (model đã ngừng hỗ trợ/tên sai), tự
          // động chuyển sang model dự phòng kế tiếp trong FALLBACK_MODELS — không đáng thử lại
          // model này với key khác (mọi key đều sẽ gặp cùng lỗi) hay chờ rồi thử lại.
          if (error.status === 503 || error.status === 404) {
            const reason = error.status === 404 ? 'không khả dụng (model đã ngừng hỗ trợ hoặc sai tên)' : 'đang quá tải (503 High Demand)';
            console.warn(`[Gemini Service] Model ${modelName} ${reason}, tự động chuyển sang model dự phòng kế tiếp...`);
            break;
          }

          const isLastAttempt = round === MAX_ROUNDS && i === keys.length - 1;
          if (isLastAttempt) {
            console.error(`[Gemini Service Error] Model ${modelName}${keyLabel}:`, error);
            throw error;
          }

          const hasNextKeyThisRound = i < keys.length - 1;
          if ((error.status === 400 || error.status === 401 || error.status === 403 || error.status === 429) && hasNextKeyThisRound) {
            console.warn(`[Gemini Service] Key #${i + 1} bị lỗi (${error.message}), chuyển sang key kế tiếp (#${i + 2})...`);
            continue;
          }

          const delayMs = error.retryDelayMs
            ? Math.min(Math.max(error.retryDelayMs, 1000), 30000)
            : 1500 * round;
          console.warn(`[Gemini Service] Lỗi tạm thời (${error.message}), thử lại sau ${delayMs}ms`);
          await sleep(delayMs);
        }
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
