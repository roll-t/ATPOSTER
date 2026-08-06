import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getMongoClientDb } from '@/lib/db.js';
import { resolveProjectDir } from '@/lib/remotionPaths';

const SAFE_FOLDER_NAME = /^[A-Za-z0-9_-]+$/;

/**
 * Lưu kịch bản người dùng TỰ SỬA TAY (lời kể / phụ đề / mô tả hoạt cảnh của từng slide).
 *
 * Song sinh với regenerate-narration/route.js nhưng KHÔNG gọi Gemini — nội dung mới đến thẳng từ
 * người dùng. Dùng chung y hệt 3 điểm ghi dữ liệu, vì mỗi nơi được đọc bởi một khâu khác nhau và
 * bỏ sót bất kỳ nơi nào cũng làm bản sửa "biến mất" ở khâu sau:
 *   1. promptHistory (Mongo)        -> load lại trang vẫn thấy bản đã sửa
 *   2. remotionConfig.scenes[].caption -> phụ đề đốt vào video lúc render
 *   3. manifest.json trên đĩa       -> khâu Tạo Giọng Đọc & render-project.mjs đọc độc lập với DB
 *
 * Chỉ nhận đúng 3 trường người dùng được phép sửa. Mọi trường khác của slide (files, status,
 * segmentNumber, aspectRatio, durationSeconds...) giữ nguyên từ bản ghi cũ dưới server — không tin
 * tưởng client gửi nguyên cục segment lên, tránh việc một bug ở phía UI xoá mất tiến độ ảnh đã tạo.
 */
const EDITABLE_FIELDS = ['dialogueOrNarration', 'subtitle', 'visualDescription'];
// elements[] được xử lý riêng vì là mảng, không phải chuỗi
const ELEMENTS_FIELD = 'elements';

/**
 * textPrompt (câu lệnh Midjourney/Flux đầy đủ) được ghép sẵn lúc tạo kịch bản và có NHÚNG NGUYÊN
 * VĂN visualDescription bên trong (xem buildSegmentedPrompts.js). Khi người dùng sửa mô tả hoạt
 * cảnh, thay đúng đoạn cũ bằng đoạn mới để prompt ảnh không bị lệch với những gì đang hiển thị.
 * Chỉ thay khi tìm thấy đúng chuỗi cũ — nếu không thấy (prompt được ghép theo kiểu khác) thì giữ
 * nguyên còn hơn ghép bừa ra một prompt hỏng.
 */
function syncTextPrompt(textPrompt, oldVisual, newVisual) {
  if (!textPrompt || !oldVisual || oldVisual === newVisual) return textPrompt;
  return textPrompt.includes(oldVisual) ? textPrompt.split(oldVisual).join(newVisual) : textPrompt;
}

function applyEdits(oldSeg, edit) {
  const updated = { ...oldSeg };
  for (const field of EDITABLE_FIELDS) {
    if (typeof edit?.[field] === 'string') updated[field] = edit[field];
  }

  // elements[] là mảng — ghi đè trực tiếp nếu client gửi kèm
  if (Array.isArray(edit?.[ELEMENTS_FIELD])) {
    updated[ELEMENTS_FIELD] = edit[ELEMENTS_FIELD];
  }

  updated.textPrompt = syncTextPrompt(oldSeg.textPrompt, oldSeg.visualDescription, updated.visualDescription);

  // jsonPrompt là bản JSON có cấu trúc của cùng nội dung đó — giữ đồng bộ để bản copy/xuất ra
  // không mâu thuẫn với những gì đang hiển thị trên màn hình.
  if (updated.jsonPrompt) {
    const jp = { ...updated.jsonPrompt };
    if (jp.scene?.setting !== undefined) jp.scene = { ...jp.scene, setting: updated.visualDescription };
    if (jp.audio?.narration !== undefined) jp.audio = { ...jp.audio, narration: updated.dialogueOrNarration };
    if (jp.on_screen_captions?.subtitle !== undefined) {
      jp.on_screen_captions = { ...jp.on_screen_captions, subtitle: updated.subtitle };
    }
    updated.jsonPrompt = jp;
  }

  return updated;
}

export async function POST(request) {
  try {
    const { id, folderPath, category, segments: edits } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã kịch bản (id) — không xác định được bản ghi cần lưu.' }, { status: 400 });
    }
    if (!Array.isArray(edits) || edits.length === 0) {
      return NextResponse.json({ error: 'Không có nội dung chỉnh sửa nào để lưu.' }, { status: 400 });
    }

    const db = await getMongoClientDb();
    const record = await db.collection('promptHistory').findOne({ id });
    if (!record) {
      return NextResponse.json({ error: 'Không tìm thấy kịch bản này trong lịch sử (có thể đã bị xoá).' }, { status: 404 });
    }

    const editByNumber = new Map(edits.map((e) => [e.segmentNumber, e]));
    let changedCount = 0;

    const updatedSegments = (record.segments || []).map((seg) => {
      const edit = editByNumber.get(seg.segmentNumber);
      if (!edit) return seg;
      const next = applyEdits(seg, edit);
      const textChanged = EDITABLE_FIELDS.some((f) => next[f] !== seg[f]);
      const elementsChanged = Array.isArray(edit?.[ELEMENTS_FIELD]);
      if (textChanged || elementsChanged) changedCount++;
      return next;
    });

    if (changedCount === 0) {
      return NextResponse.json({ success: true, segments: record.segments, changedCount: 0, manifestUpdated: false });
    }

    const update = { segments: updatedSegments, updatedAt: Date.now() };

    // Phụ đề đốt vào video nằm ở remotionConfig.scenes, khớp theo THỨ TỰ với segments (không phải
    // theo segmentNumber) — bám đúng cách regenerate-narration đang làm để 2 đường ghi không lệch nhau.
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

    // manifest.json trên đĩa — khâu Tạo Giọng Đọc và render-project.mjs đọc file này chứ không đọc
    // DB, nên bỏ qua bước này là bản sửa sẽ không vào được video cuối cùng.
    let manifestUpdated = false;
    const cleanFolder = (folderPath || record.input?.folderPath || '').trim();
    const cat = category || record.category;
    if (cleanFolder && SAFE_FOLDER_NAME.test(cleanFolder)) {
      const manifestPath = path.join(resolveProjectDir(cleanFolder, cat), 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const freshByNumber = new Map(updatedSegments.map((s) => [s.segmentNumber, s]));
        manifest.segments = (manifest.segments || []).map((seg) => {
          const fresh = freshByNumber.get(seg.segmentNumber);
          if (!fresh) return seg;
          const patched = {
            ...seg,
            dialogueOrNarration: fresh.dialogueOrNarration,
            subtitle: fresh.subtitle,
            visualDescription: fresh.visualDescription,
          };
          // Ghi đè elements[] vào manifest để render-project.mjs dùng bố cục mới
          if (Array.isArray(fresh.elements)) patched.elements = fresh.elements;
          return patched;
        });
        manifest.updatedAt = Date.now();
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        manifestUpdated = true;
      }
    }

    return NextResponse.json({
      success: true,
      segments: updatedSegments,
      remotionConfig: update.remotionConfig ?? record.remotionConfig,
      changedCount,
      manifestUpdated
    });
  } catch (error) {
    console.error('[API Update Segments Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi lưu kịch bản đã chỉnh sửa.' }, { status: 500 });
  }
}
