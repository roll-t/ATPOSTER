import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getMongoClientDb } from '@/lib/db.js';
import { resolveProjectDir } from '@/lib/remotionPaths';

const SAFE_FOLDER_NAME = /^[A-Za-z0-9_-]+$/;

// Lưu cấu hình render (remotionConfig) + thứ tự phân đoạn (segments reorder) cho 1 kịch bản.
export async function POST(request) {
  try {
    const { id, remotionConfig, segmentsOrder } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Thiếu id kịch bản.' }, { status: 400 });
    }

    const db = await getMongoClientDb();
    const record = await db.collection('promptHistory').findOne({ id });
    if (!record) {
      return NextResponse.json({ error: 'Không tìm thấy kịch bản.' }, { status: 404 });
    }

    const update = { updatedAt: Date.now() };

    // Merge remotionConfig fields (chỉ ghi đè những field được gửi lên, giữ lại phần còn lại)
    if (remotionConfig && typeof remotionConfig === 'object') {
      update.remotionConfig = { ...(record.remotionConfig || {}), ...remotionConfig };
    }

    // Reorder segments theo thứ tự mới
    let updatedSegments = record.segments || [];
    if (Array.isArray(segmentsOrder) && segmentsOrder.length > 0) {
      const byNumber = new Map(updatedSegments.map(s => [s.segmentNumber, s]));
      const reordered = segmentsOrder.map(n => byNumber.get(n)).filter(Boolean);
      const inOrder = new Set(segmentsOrder);
      const rest = updatedSegments.filter(s => !inOrder.has(s.segmentNumber));
      updatedSegments = [...reordered, ...rest];
      update.segments = updatedSegments;
    }

    await db.collection('promptHistory').updateOne({ id }, { $set: update });

    // Cập nhật manifest.json trên đĩa nếu tồn tại và có thay đổi thứ tự
    let manifestUpdated = false;
    const cleanFolder = (record.input?.folderPath || '').trim();
    const cat = record.category;
    if (cleanFolder && SAFE_FOLDER_NAME.test(cleanFolder) && update.segments) {
      const manifestPath = path.join(resolveProjectDir(cleanFolder, cat), 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const manifestByNumber = new Map((manifest.segments || []).map(s => [s.segmentNumber, s]));
        const reordered = segmentsOrder.map(n => manifestByNumber.get(n)).filter(Boolean);
        const inOrder = new Set(segmentsOrder);
        const rest = (manifest.segments || []).filter(s => !inOrder.has(s.segmentNumber));
        manifest.segments = [...reordered, ...rest];
        manifest.updatedAt = Date.now();
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        manifestUpdated = true;
      }
    }

    return NextResponse.json({
      success: true,
      remotionConfig: update.remotionConfig || record.remotionConfig,
      segments: updatedSegments,
      manifestUpdated,
    });
  } catch (error) {
    console.error('[API UpdateVideoConfig Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi lưu cấu hình.' }, { status: 500 });
  }
}
