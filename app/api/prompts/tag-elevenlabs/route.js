import { NextResponse } from 'next/server';
import { getMongoClientDb } from '@/src/infrastructure/persistence/index.js';
import { resolveApiKeys } from '@/src/domain/ai/apiKeys.js';
import { tagElevenLabsScript } from '@/src/infrastructure/composition/video-studio.js';

export async function POST(request) {
  try {
    const { id, segments, geminiApiKey, saveToDb = false } = await request.json();

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy danh sách phân cảnh.' }, { status: 400 });
    }

    const db = await getMongoClientDb();
    const settingsRecord = await db.collection('settings').findOne({});
    const apiKeys = resolveApiKeys(geminiApiKey, settingsRecord?.geminiApiKey, process.env.GEMINI_API_KEY);
    if (apiKeys.length === 0) {
      return NextResponse.json({ error: 'Chưa cấu hình Gemini API Key. Vui lòng thiết lập khóa API ở mục cài đặt.' }, { status: 400 });
    }

    const contentSegments = segments.filter((seg) => !seg.isThumbnail && !seg.dialogueOrNarration?.includes('Thumbnail'));
    const narrationLines = contentSegments.map((seg) => String(seg.dialogueOrNarration || '').trim());

    const taggedLines = await tagElevenLabsScript(narrationLines, apiKeys);

    const updatedSegments = segments.map((seg) => {
      if (seg.isThumbnail || seg.dialogueOrNarration?.includes('Thumbnail')) return seg;
      const idx = contentSegments.findIndex((s) => s.segmentNumber === seg.segmentNumber);
      if (idx === -1 || !taggedLines[idx]) return seg;
      return {
        ...seg,
        dialogueOrNarration: taggedLines[idx]
      };
    });

    if (id && saveToDb) {
      await db.collection('promptHistory').updateOne(
        { id },
        { $set: { segments: updatedSegments } }
      );
    }

    return NextResponse.json({
      success: true,
      taggedLines,
      segments: updatedSegments
    });
  } catch (error) {
    console.error('Lỗi khi gắn tag ElevenLabs:', error);
    return NextResponse.json(
      { error: error?.message || 'Không thể gắn tag ElevenLabs bằng AI.' },
      { status: 500 }
    );
  }
}
