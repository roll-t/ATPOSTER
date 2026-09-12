import { NextResponse } from 'next/server';
import { settingsRepository } from '@/src/infrastructure/composition/settings.js';
import { testApiKeys } from '@/src/application/settings/testApiKeys.js';
import { probeGeminiKey } from '@/src/infrastructure/ai/gemini/probeKey.js';

export async function POST(req) {
  try {
    const body = await req.json();
    // An explicitly empty draft must not silently test stored credentials.
    const rawKeys = body.geminiApiKey ?? ((await settingsRepository.read()).geminiApiKey || process.env.GEMINI_API_KEY);
    const result = await testApiKeys(rawKeys, { probe: probeGeminiKey });
    return NextResponse.json({ success: result.summary.total > 0, ...result,
      ...(result.summary.total ? {} : { error: 'Chưa có Gemini API Key nào được cấu hình.' }) });
  } catch {
    return NextResponse.json({ success: false, error: 'Không thể kiểm tra cấu hình Gemini Key.' }, { status: 500 });
  }
}
