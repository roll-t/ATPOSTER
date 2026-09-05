import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db.js';
import { parseApiKeys } from '@/config/ai.config.js';
import { resetGeminiRotationState } from '@/lib/prompts/gemini/callGeminiApi.js';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let rawKeys = body.geminiApiKey;

    if (!rawKeys) {
      const db = await readDb();
      rawKeys = db.settings?.geminiApiKey || process.env.GEMINI_API_KEY || '';
    }

    const keys = parseApiKeys(rawKeys);
    if (keys.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Chưa có Gemini API Key nào được cấu hình.',
        results: [],
        summary: { total: 0, active: 0, exhausted: 0, invalid: 0 },
      });
    }

    // Làm mới trạng thái xoay vòng
    resetGeminiRotationState();

    const testModel = 'gemini-3.6-flash';
    const results = await Promise.all(
      keys.map(async (key, index) => {
        const masked = key.length > 12
          ? `${key.slice(0, 6)}...${key.slice(-4)}`
          : `${key.slice(0, 3)}...`;

        const start = Date.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);

        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Ping' }] }],
              }),
            }
          );
          clearTimeout(timer);
          const latencyMs = Date.now() - start;

          if (res.ok) {
            return {
              index,
              masked,
              status: 'active',
              latencyMs,
              message: `Hoạt động tốt (${latencyMs}ms)`,
            };
          }

          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${res.status}`;

          if (res.status === 429) {
            return {
              index,
              masked,
              status: 'exhausted',
              latencyMs,
              message: 'Hết hạn mức Quota (429 Rate Limit)',
            };
          }

          if (res.status === 400 || res.status === 401 || res.status === 403) {
            return {
              index,
              masked,
              status: 'invalid',
              latencyMs,
              message: `Key không hợp lệ: ${errMsg.slice(0, 60)}`,
            };
          }

          return {
            index,
            masked,
            status: 'error',
            latencyMs,
            message: `Lỗi: ${errMsg.slice(0, 60)}`,
          };
        } catch (err) {
          clearTimeout(timer);
          const latencyMs = Date.now() - start;
          const isTimeout = err.name === 'AbortError';
          return {
            index,
            masked,
            status: 'error',
            latencyMs,
            message: isTimeout ? 'Hết giờ chờ (Timeout >12s)' : `Lỗi mạng: ${err.message}`,
          };
        }
      })
    );

    const summary = {
      total: results.length,
      active: results.filter((r) => r.status === 'active').length,
      exhausted: results.filter((r) => r.status === 'exhausted').length,
      invalid: results.filter((r) => r.status === 'invalid').length,
    };

    return NextResponse.json({
      success: true,
      results,
      summary,
    });
  } catch (error) {
    console.error('[Gemini Test Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi kiểm tra Gemini Key' },
      { status: 500 }
    );
  }
}
