import { NextResponse } from 'next/server';
import { getMongoClientDb } from '@/lib/db.js';
import { PROMPT_CATEGORIES, buildPrompt, buildSegmentedPrompts, buildBuddhistCoverPrompts } from '@/lib/prompts/index.js';
import { generateSegmentedScript, translateAndExpandInputs } from '@/lib/prompts/gemini/index.js';
import { parseApiKeys } from '@/lib/prompts/gemini/apiKeys.js';
import { getSkill } from '@/lib/skills/index.js';

export async function POST(request) {
  try {
    const { category, input, useGemini: requestedUseGemini, durationRange, geminiApiKey } = await request.json();
    if (!category || !PROMPT_CATEGORIES[category]) {
      return NextResponse.json({ error: 'Chủ đề không hợp lệ.' }, { status: 400 });
    }

    const catDef = PROMPT_CATEGORIES[category];
    const cleanInput = input || {};
    const useGemini = requestedUseGemini;
    const skill = getSkill(category);

    // --- Xác thực đầu vào ---
    const skillError = skill?.validate(cleanInput, useGemini);
    if (skillError) return NextResponse.json({ error: skillError }, { status: 400 });

    // Với các category dạng video cổ điển (không có buildManualSegments), validate
    // generic theo field definition khi ở chế độ thủ công.
    if (!useGemini && !skill?.buildManualSegments && !skill?.onlyGemini) {
      for (const field of catDef.fields) {
        if (!field.required) continue;
        const value = cleanInput[field.key];
        const isEmpty =
          field.type === 'character-select'
            ? !(Array.isArray(value) && value.length > 0)
            : !(value && String(value).trim());
        if (isEmpty) {
          return NextResponse.json({ error: `Vui lòng chọn/nhập "${field.label}".` }, { status: 400 });
        }
      }
    }

    const db = await getMongoClientDb();
    const savedStyle = await db.collection('promptStyles').findOne({ category });
    const style = savedStyle ? savedStyle.style : catDef.defaultStyle;

    const settingsRecord = await db.collection('settings').findOne({});
    const apiKeys = parseApiKeys(geminiApiKey || settingsRecord?.geminiApiKey || '');

    let processedInput = { ...cleanInput };
    if (apiKeys.length > 0) {
      processedInput = await translateAndExpandInputs({ category, input: cleanInput, apiKey: apiKeys });
    } else {
      const hasVietnamese = Object.values(cleanInput).some(
        (val) =>
          typeof val === 'string' &&
          /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệđìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i.test(val)
      );
      if (hasVietnamese) {
        return NextResponse.json({
          error: 'Phát hiện nội dung tiếng Việt. Vui lòng cấu hình Gemini API Key ở mục cài đặt phía trên để tự động dịch và mô tả chi tiết bằng tiếng Anh.',
        }, { status: 400 });
      }
    }

    let record;

    if (useGemini) {
      if (apiKeys.length === 0) {
        return NextResponse.json({ error: 'Chưa cấu hình Gemini API Key. Vui lòng thiết lập khóa API để sử dụng tính năng này.' }, { status: 400 });
      }

      const geminiResult = await generateSegmentedScript({
        category,
        durationRange: durationRange || 'under_1m',
        input: processedInput,
        apiKey: apiKeys,
      });

      const segmentedPrompts = buildSegmentedPrompts(category, style, geminiResult.title, geminiResult.segments, {
        ...processedInput,
        thumbnail: geminiResult.thumbnail,
      });

      record = {
        id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        category,
        input: { ...processedInput, durationRange: durationRange || 'under_1m', useGemini: true },
        title: geminiResult.title,
        // Khối ĐĂNG VIDEO + ẢNH BÌA do Gemini viết kèm (xem mục 7-8 trong buddhistWisdom.js).
        // Phải liệt kê tường minh: record chỉ giữ những trường được kể tên ở đây, mọi trường
        // khác trong geminiResult đều rơi mất — kể cả khi prompt đã yêu cầu model trả về.
        ...(geminiResult.youtubeTitle ? { youtubeTitle: geminiResult.youtubeTitle } : {}),
        ...(Array.isArray(geminiResult.hashtags) && geminiResult.hashtags.length > 0
          ? { hashtags: geminiResult.hashtags }
          : {}),
        ...(geminiResult.youtubeDescription ? { youtubeDescription: geminiResult.youtubeDescription } : {}),
        ...(geminiResult.coverPrompts ? { coverPrompts: buildBuddhistCoverPrompts(geminiResult.coverPrompts) } : {}),
        segments: segmentedPrompts,
        isSegmented: true,
        createdAt: new Date().toISOString(),
      };
    } else if (skill?.buildManualSegments) {
      // Slideshow skills có manual mode: chia script theo dòng / trang.
      const segments = skill.buildManualSegments(processedInput);
      const title = processedInput.scenario || catDef.label;
      const segmentedPrompts = buildSegmentedPrompts(category, style, title, segments, processedInput);

      record = {
        id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        category,
        input: { ...processedInput, useGemini: false },
        title,
        segments: segmentedPrompts,
        isSegmented: true,
        createdAt: new Date().toISOString(),
      };
    } else {
      // Video cổ điển (english_quiz, stick_figure, moral_wisdom...).
      const { jsonPrompt, textPrompt } = buildPrompt(category, style, processedInput);
      record = {
        id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        category,
        input: processedInput,
        jsonPrompt,
        textPrompt,
        isSegmented: false,
        createdAt: new Date().toISOString(),
      };
    }

    // Skill tự xây remotionConfig nếu có (slideshows & reading-page).
    if (record.isSegmented && skill?.buildRemotionConfig) {
      record.remotionConfig = skill.buildRemotionConfig(record, processedInput);
    }

    await db.collection('promptHistory').insertOne({ ...record });

    return NextResponse.json({ success: true, result: record });
  } catch (error) {
    console.error('[API Prompt Generate Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tạo prompt.' }, { status: 500 });
  }
}
