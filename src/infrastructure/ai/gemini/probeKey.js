import { AI_CONFIG } from '../../../../config/ai.config.js';
import { classifyError } from '../../../domain/ai/geminiErrors.js';

/** A diagnostic must not reset the generation pool or expose provider error text/keys. */
export async function probeGeminiKey(key, { fetchImpl = fetch, timeoutMs = 12000 } = {}) {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const model = AI_CONFIG.MODEL_TIERS.fast[0];
  try {
    const response = await fetchImpl(`${AI_CONFIG.BASE_URL}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: controller.signal,
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply OK' }] }], generationConfig: { maxOutputTokens: 32 } }),
    });
    const data = await response.json();
    const latencyMs = Date.now() - start;
    if (response.ok) return { status: 'active', latencyMs, message: `Hoạt động (${latencyMs}ms)` };
    const kind = classifyError({ status: response.status, message: data.error?.message });
    const status = kind === 'quota' ? 'exhausted' : kind === 'dead-key' ? 'invalid' : 'error';
    const message = status === 'exhausted' ? 'Đang bị giới hạn yêu cầu/quota (429); chưa kết luận hết quota ngày.'
      : status === 'invalid' ? 'Key bị từ chối xác thực hoặc quyền truy cập.'
      : `Không kiểm tra được với model ${model} (HTTP ${response.status}).`;
    return { status, latencyMs, message };
  } catch (error) {
    return { status: 'error', latencyMs: Date.now() - start, message: error.name === 'AbortError' ? 'Hết thời gian kiểm tra.' : 'Lỗi kết nối hoặc phản hồi không hợp lệ.' };
  } finally {
    clearTimeout(timer);
  }
}
