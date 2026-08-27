import { NextResponse } from 'next/server';
import { getMongoClientDb } from '@/lib/db.js';
import { parseApiKeys } from '@/lib/prompts/gemini/apiKeys.js';
import { callGeminiWithKeyRotation } from '@/lib/prompts/gemini/callGeminiApi.js';
import {
  buildCraftAsmrGeminiPrompt,
  buildCraftAsmrClips,
  buildCraftAsmrPromptText,
  buildCraftAsmrSheetPrompt,
  buildCraftAsmrSocialCopy,
  normalizeCraftAsmrSpec,
  CRAFT_ASMR_DEFAULTS,
} from '@/lib/prompts/craftAsmr.js';

const COLLECTION = 'craftAsmrPrompts';

/**
 * Sinh prompt cho video ASMR "chế tác thủ công từ phế liệu" (tab riêng, xem CraftAsmrPanel.js).
 *
 * KHÔNG dùng chung /api/prompts/generate một cách có chủ đích: route đó bắt buộc đi qua
 * PROMPT_CATEGORIES + translateAndExpandInputs (dịch mọi trường sang dạng song ngữ
 * "English // Tiếng Việt" để phục vụ pipeline sinh ảnh), trong khi prompt của dòng này phải là
 * tiếng Việt thuần một khối. Nhét vào đó thì mỗi câu trong prompt sẽ dính kèm bản dịch tiếng Anh.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const subject = String(body.subject || '').trim();
    const material = String(body.material || '').trim();
    const notes = String(body.notes || '').trim();
    const durationSeconds = Number(body.durationSeconds) || CRAFT_ASMR_DEFAULTS.durationSeconds;
    const clipCount = Number(body.clipCount) || CRAFT_ASMR_DEFAULTS.clipCount;
    const fidelity = body.fidelity || CRAFT_ASMR_DEFAULTS.fidelity;
    const aspectRatio = body.aspectRatio || CRAFT_ASMR_DEFAULTS.aspectRatio;
    const fps = Number(body.fps) || CRAFT_ASMR_DEFAULTS.fps;

    if (!subject) {
      return NextResponse.json({ error: 'Vui lòng nhập "Nhân vật / mô hình muốn tạo".' }, { status: 400 });
    }
    if (!material) {
      return NextResponse.json({ error: 'Vui lòng nhập "Vật liệu chế tác".' }, { status: 400 });
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

    const geminiPrompt = buildCraftAsmrGeminiPrompt({
      subject,
      material,
      notes,
      durationSeconds,
      clipCount,
      fidelity,
    });
    const raw = await callGeminiWithKeyRotation(geminiPrompt, apiKeys, {
      tier: 'quality',
      label: 'CraftASMR',
    });

    const spec = normalizeCraftAsmrSpec(raw);
    if (!spec.topicLine || !spec.actA) {
      return NextResponse.json(
        { error: 'Gemini trả về thiếu nội dung (không có mô tả cảnh). Vui lòng bấm tạo lại.' },
        { status: 502 }
      );
    }
    // Với video nhiều clip, trạng thái bàn ở ranh giới clip là thứ DUY NHẤT giữ cho các lượt sinh
    // nối được vào nhau. Thiếu nó thì prompt vẫn "chạy" nhưng 3 clip ghép lại sẽ giật cục — hỏng
    // âm thầm đúng kiểu khó lần ra, nên chặn ngay tại đây.
    if (clipCount > 1 && (!spec.stateAfterB || !spec.stateAfterC)) {
      return NextResponse.json(
        { error: 'Gemini không mô tả được trạng thái nối giữa các clip. Vui lòng bấm tạo lại.' },
        { status: 502 }
      );
    }

    const buildOptions = { durationSeconds, clipCount, aspectRatio, fps, subject, fidelity };
    const clips = buildCraftAsmrClips(spec, buildOptions);
    const promptText = buildCraftAsmrPromptText(spec, buildOptions);
    const sheetPrompt = buildCraftAsmrSheetPrompt(spec, buildOptions);
    const social = buildCraftAsmrSocialCopy(spec);

    const record = {
      id: `craft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      subject,
      material,
      notes,
      durationSeconds,
      clipCount,
      fidelity,
      totalDuration: durationSeconds * clipCount,
      aspectRatio,
      fps,
      title: spec.title,
      spec,
      sheetPrompt,
      social,
      clips,
      promptText,
      createdAt: new Date().toISOString(),
    };

    await db.collection(COLLECTION).insertOne({ ...record });

    return NextResponse.json({ success: true, result: record });
  } catch (error) {
    console.error('[API CraftASMR Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tạo prompt.' }, { status: 500 });
  }
}

/** Lịch sử prompt đã sinh — để không mất công gõ lại khi đóng tab. */
export async function GET() {
  try {
    const db = await getMongoClientDb();
    const items = await db
      .collection(COLLECTION)
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray();
    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error('[API CraftASMR History Error]:', error);
    return NextResponse.json({ success: false, items: [], error: error.message }, { status: 500 });
  }
}

/** Xoá một prompt khỏi lịch sử. */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu id.' }, { status: 400 });

    const db = await getMongoClientDb();
    await db.collection(COLLECTION).deleteOne({ id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API CraftASMR Delete Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
