import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getMongoClientDb } from '@/lib/db.js';
import { resolveProjectDir } from '@/lib/remotionPaths';
import { parseApiKeys } from '@/lib/prompts/gemini/apiKeys.js';
import { translateSubtitleLines } from '@/lib/prompts/gemini/translateSubtitles.js';

const SAFE_FOLDER_NAME = /^[A-Za-z0-9_-]+$/;

/**
 * Bổ sung/refresh phụ đề song ngữ (Anh - Việt) cho một kịch bản ĐÃ ĐƯỢC TẠO TRƯỚC ĐÓ,
 * không cần tạo lại toàn bộ kịch bản (giữ nguyên visualDescription/dialogueOrNarration
 * và mọi ảnh/audio đã sinh). Mỗi subtitle được cập nhật thành "Câu tiếng Anh\nBản dịch
 * tiếng Việt" — đúng convention Caption.tsx của skill narrated-slideshow-video đọc.
 */
export async function POST(request) {
  try {
    const { id, folderPath, segments, geminiApiKey } = await request.json();

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy danh sách phân cảnh.' }, { status: 400 });
    }

    const db = await getMongoClientDb();
    const settingsRecord = await db.collection('settings').findOne({});
    const apiKeys = parseApiKeys(geminiApiKey || settingsRecord?.geminiApiKey || '');
    if (apiKeys.length === 0) {
      return NextResponse.json({ error: 'Chưa cấu hình Gemini API Key. Vui lòng thiết lập khóa API ở mục cài đặt phía trên.' }, { status: 400 });
    }

    // Chỉ lấy phần tiếng Anh (dòng đầu) của subtitle hiện tại làm nguồn dịch — nếu subtitle
    // đã là song ngữ từ trước (có "\n"), bỏ qua bản dịch Việt cũ, luôn dịch lại từ câu gốc.
    const englishLines = segments.map((seg) => String(seg.subtitle || seg.dialogueOrNarration || '').split('\n')[0].trim());

    const translations = await translateSubtitleLines(englishLines, apiKeys);

    const updatedSegments = segments.map((seg, idx) => {
      const en = englishLines[idx];
      const vi = (translations[idx] || '').trim();
      const bilingualSubtitle = vi ? `${en}\n${vi}` : en;
      const updated = { ...seg, subtitle: bilingualSubtitle };
      if (updated.jsonPrompt?.on_screen_captions) {
        updated.jsonPrompt = {
          ...updated.jsonPrompt,
          on_screen_captions: { ...updated.jsonPrompt.on_screen_captions, subtitle: bilingualSubtitle }
        };
      }
      return updated;
    });

    // Lưu lại vào lịch sử (promptHistory) để load lại trang vẫn giữ bản song ngữ.
    if (id) {
      const record = await db.collection('promptHistory').findOne({ id });
      if (record) {
        const update = { segments: updatedSegments };
        if (record.remotionConfig?.scenes) {
          const subtitleByNumber = new Map(updatedSegments.map((s) => [s.segmentNumber, s.subtitle]));
          update.remotionConfig = {
            ...record.remotionConfig,
            scenes: record.remotionConfig.scenes.map((scene, idx) => {
              const seg = record.segments?.[idx];
              const newCaption = seg ? subtitleByNumber.get(seg.segmentNumber) : undefined;
              return newCaption !== undefined ? { ...scene, caption: newCaption } : scene;
            })
          };
        }
        await db.collection('promptHistory').updateOne({ id }, { $set: update });
      }
    }

    // Cập nhật cả manifest.json trên đĩa (nếu ảnh đã được sinh qua Google Flow từ trước) —
    // để lần Render (Bước 3) tiếp theo đọc đúng phụ đề song ngữ mới, vì render-project.mjs
    // của skill luôn lấy caption từ manifest.json, không phải từ bản ghi trong DB.
    let manifestUpdated = false;
    const cleanFolder = (folderPath || '').trim();
    if (cleanFolder && SAFE_FOLDER_NAME.test(cleanFolder)) {
      const manifestPath = path.join(resolveProjectDir(cleanFolder), 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const subtitleByNumber = new Map(updatedSegments.map((s) => [s.segmentNumber, s.subtitle]));
        manifest.segments = (manifest.segments || []).map((seg) => (
          subtitleByNumber.has(seg.segmentNumber)
            ? { ...seg, subtitle: subtitleByNumber.get(seg.segmentNumber) }
            : seg
        ));
        manifest.updatedAt = Date.now();
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        manifestUpdated = true;
      }
    }

    return NextResponse.json({ success: true, segments: updatedSegments, manifestUpdated });
  } catch (error) {
    console.error('[API Translate Subtitles Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi dịch phụ đề song ngữ.' }, { status: 500 });
  }
}
