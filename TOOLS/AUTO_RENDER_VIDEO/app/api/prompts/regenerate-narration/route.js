import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getMongoClientDb } from '@/lib/db.js';
import { resolveProjectDir } from '@/lib/remotionPaths';
import { parseApiKeys } from '@/lib/prompts/gemini/apiKeys.js';
import { regenerateNarrationScript } from '@/lib/prompts/gemini/index.js';

const SAFE_FOLDER_NAME = /^[A-Za-z0-9_-]+$/;
const SUPPORTED_CATEGORIES = new Set(['stick_figure_slideshow', 'moral_talk_slideshow']);

/**
 * Viết lại RIÊNG phần lời kể (dialogueOrNarration/subtitle) của một kịch bản slideshow ĐÃ CÓ
 * SẴN ẢNH, giữ nguyên visualDescription/files/status của từng slide — dùng khi người dùng ưng ý
 * bộ ảnh Google Flow đã tạo nhưng muốn thử một lời kể khác trước khi tạo lại giọng đọc (Bước 1).
 * Không đụng tới ảnh/audio đã có trên đĩa, chỉ audio cũ sẽ không còn khớp lời kể mới cho tới khi
 * người dùng bấm "Tạo Giọng Đọc" lại.
 */
export async function POST(request) {
  try {
    const { id, folderPath, category, input, segments, geminiApiKey } = await request.json();

    if (!SUPPORTED_CATEGORIES.has(category)) {
      return NextResponse.json({ error: 'Định dạng này chưa hỗ trợ viết lại riêng lời kể.' }, { status: 400 });
    }
    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy danh sách phân cảnh.' }, { status: 400 });
    }

    const contentSegments = segments.filter((seg) => !seg.isThumbnail);
    if (contentSegments.length === 0) {
      return NextResponse.json({ error: 'Không có phân cảnh nội dung nào để viết lại lời kể.' }, { status: 400 });
    }

    const db = await getMongoClientDb();
    const settingsRecord = await db.collection('settings').findOne({});
    const apiKeys = parseApiKeys(geminiApiKey || settingsRecord?.geminiApiKey || '');
    if (apiKeys.length === 0) {
      return NextResponse.json({ error: 'Chưa cấu hình Gemini API Key. Vui lòng thiết lập khóa API ở mục cài đặt phía trên.' }, { status: 400 });
    }

    const geminiResult = await regenerateNarrationScript({
      category,
      input: input || {},
      segments: contentSegments,
      apiKey: apiKeys
    });

    const newByNumber = new Map(
      (geminiResult.segments || []).map((s) => [s.segmentNumber, s])
    );

    const updatedSegments = segments.map((seg) => {
      if (seg.isThumbnail) return seg;
      const fresh = newByNumber.get(seg.segmentNumber);
      if (!fresh) return seg;
      const updated = {
        ...seg,
        dialogueOrNarration: fresh.dialogueOrNarration || seg.dialogueOrNarration,
        subtitle: fresh.subtitle || fresh.dialogueOrNarration || seg.subtitle
      };
      if (updated.jsonPrompt?.on_screen_captions) {
        updated.jsonPrompt = {
          ...updated.jsonPrompt,
          on_screen_captions: { ...updated.jsonPrompt.on_screen_captions, subtitle: updated.subtitle }
        };
      }
      return updated;
    });

    // Lưu lại vào lịch sử (promptHistory) để load lại trang vẫn thấy lời kể mới.
    if (id) {
      const record = await db.collection('promptHistory').findOne({ id });
      if (record) {
        const update = { segments: updatedSegments };
        if (record.remotionConfig?.scenes) {
          const captionByNumber = new Map(updatedSegments.map((s) => [s.segmentNumber, s.subtitle]));
          update.remotionConfig = {
            ...record.remotionConfig,
            scenes: record.remotionConfig.scenes.map((scene, idx) => {
              const seg = record.segments?.[idx];
              const newCaption = seg ? captionByNumber.get(seg.segmentNumber) : undefined;
              return newCaption !== undefined ? { ...scene, caption: newCaption } : scene;
            })
          };
        }
        await db.collection('promptHistory').updateOne({ id }, { $set: update });
      }
    }

    // Cập nhật cả manifest.json trên đĩa (nếu ảnh đã được sinh qua Google Flow từ trước) — để
    // lần Tạo Giọng Đọc (Bước 1) / Render (Bước 4) tiếp theo đọc đúng lời kể mới, vì cả
    // voiceover và render-project.mjs của skill đều lấy dữ liệu độc lập với bản ghi DB này.
    let manifestUpdated = false;
    const cleanFolder = (folderPath || '').trim();
    if (cleanFolder && SAFE_FOLDER_NAME.test(cleanFolder)) {
      const manifestPath = path.join(resolveProjectDir(cleanFolder, category), 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const freshByNumber = new Map(updatedSegments.map((s) => [s.segmentNumber, s]));
        manifest.segments = (manifest.segments || []).map((seg) => {
          const fresh = freshByNumber.get(seg.segmentNumber);
          return fresh
            ? { ...seg, dialogueOrNarration: fresh.dialogueOrNarration, subtitle: fresh.subtitle }
            : seg;
        });
        manifest.updatedAt = Date.now();
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        manifestUpdated = true;
      }
    }

    return NextResponse.json({ success: true, segments: updatedSegments, manifestUpdated });
  } catch (error) {
    console.error('[API Regenerate Narration Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi viết lại lời kể.' }, { status: 500 });
  }
}
