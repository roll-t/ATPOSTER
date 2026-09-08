import { NextResponse } from 'next/server';
import { getMongoClientDb } from '@/src/infrastructure/persistence/index.js';
import { parseApiKeys } from '@/src/infrastructure/ai/gemini/apiKeys.js';
import { callGeminiWithKeyRotation } from '@/src/infrastructure/ai/gemini/callGeminiApi.js';
import { buildImagePromptGeminiPrompt } from '@/src/domain/prompt-templates/gemini/imagePrompt.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const idea = String(body.idea || '').trim();
    const style = String(body.style || 'Cinematic Film Photography').trim();
    const aspectRatio = String(body.aspectRatio || '16:9').trim();
    const lighting = String(body.lighting || 'Cinematic Dramatic Lighting').trim();
    const camera = String(body.camera || 'Eye-level, 85mm portrait lens').trim();

    if (!idea) {
      return NextResponse.json({ error: 'Vui lòng nhập ý tưởng hoặc mô tả hình ảnh muốn tạo.' }, { status: 400 });
    }

    const db = await getMongoClientDb();
    const settingsRecord = await db.collection('settings').findOne({});
    const apiKeys = parseApiKeys(body.geminiApiKey || settingsRecord?.geminiApiKey || '');
    if (apiKeys.length === 0) {
      return NextResponse.json(
        { error: 'Chưa cấu hình Gemini API Key. Vui lòng thiết lập khóa API ở mục "Cài đặt AI & DB Settings".' },
        { status: 400 }
      );
    }

    const geminiPrompt = buildImagePromptGeminiPrompt({
      idea,
      style,
      aspectRatio,
      lighting,
      camera,
    });

    const raw = await callGeminiWithKeyRotation(geminiPrompt, apiKeys, {
      tier: 'quality',
      label: 'ImagePrompt',
    });

    let cleaned = String(raw || '').trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback nếu Gemini không trả JSON chuẩn
      parsed = {
        midjourneyPrompt: cleaned,
        fluxPrompt: cleaned.replace(/--ar \d+:\d+/g, '').replace(/--v \S+/g, '').replace(/--stylize \d+/g, '').trim(),
        vietnameseExplanation: 'Prompt tạo ảnh chuyên nghiệp được tạo từ mô tả của bạn.',
      };
    }

    return NextResponse.json({
      success: true,
      result: {
        idea,
        style,
        aspectRatio,
        midjourneyPrompt: parsed.midjourneyPrompt || cleaned,
        fluxPrompt: parsed.fluxPrompt || cleaned,
        vietnameseExplanation: parsed.vietnameseExplanation || '',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Lỗi sinh Prompt Ảnh:', err);
    return NextResponse.json({ error: err.message || 'Lỗi xử lý máy chủ' }, { status: 500 });
  }
}
