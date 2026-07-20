import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';
import { callGeminiWithKeyRotation } from '@/lib/prompts/gemini/callGeminiApi';

export async function POST(req) {
  try {
    const { categoryKey, fieldKey, existingSuggestions = [], usedScenarios = [] } = await req.json();

    const db = await readDb();
    const apiKey = db.settings?.geminiApiKey || process.env.GEMINI_API_KEY;

    // Nếu chưa cấu hình Gemini API Key, trả về gợi ý ngẫu nhiên hoặc danh sách lọc
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        source: 'local',
        suggestions: []
      });
    }

    // Tổng hợp danh sách cần loại trừ (từ kịch bản đã tạo + các gợi ý đang hiển thị)
    const excludeSet = new Set(
      [...existingSuggestions, ...usedScenarios]
        .map(item => (typeof item === 'string' ? item : item?.text || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const promptText = `
You are a top viral content creator specializing in English short-form videos (YouTube Shorts, TikTok).
Generate 5 NEW, relatable, engaging scenario/topic ideas in English for category: "${categoryKey || 'general'}".

CRITICAL RULES:
1. Return ONLY a valid JSON array of 5 strings in English.
2. DO NOT use or repeat any of these topics (they have already been created or shown):
${Array.from(excludeSet).slice(0, 30).map(t => `- "${t}"`).join('\n')}
3. Each idea should be a concise 1-sentence topic description (8-15 words).
4. Ideas must be fresh, distinct from each other, and focused on modern everyday struggles, English learning, mindset, or productivity.

Example format:
[
  "Feeling overwhelmed by too many open tabs and unread messages",
  "The secret joy of completing a small goal before noon",
  "How fear of making grammar mistakes stops you from speaking English",
  "Replacing late night screen time with 15 minutes of reading",
  "The difference between being busy and actually being productive"
]
`;

    const rawResponse = await callGeminiWithKeyRotation(promptText, apiKey);
    
    let newSuggestions = [];
    if (Array.isArray(rawResponse)) {
      newSuggestions = rawResponse;
    } else if (rawResponse && Array.isArray(rawResponse.suggestions)) {
      newSuggestions = rawResponse.suggestions;
    }

    // Lọc bỏ các trùng lặp
    const cleanSuggestions = newSuggestions
      .map(s => (typeof s === 'string' ? s : String(s)).trim())
      .filter(text => text.length > 5 && !excludeSet.has(text.toLowerCase()));

    return NextResponse.json({
      success: true,
      source: 'gemini',
      suggestions: cleanSuggestions.slice(0, 5)
    });
  } catch (err) {
    console.error('[API GenerateSuggestions Exception]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
