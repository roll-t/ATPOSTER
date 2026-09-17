import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getMongoClientDb } from '@/src/infrastructure/persistence/index.js';
import { resolveProjectDir } from '@/src/infrastructure/rendering/remotion/paths.js';
import { resolveApiKeys } from '@/src/domain/ai/apiKeys.js';
import { generatePublishMeta } from '@/src/infrastructure/composition/video-studio.js';
import { updateLocalPrompt, getLocalPromptHistory } from '@/src/infrastructure/persistence/localPromptRepository.js';

const SAFE_FOLDER_NAME = /^[A-Za-z0-9_-]+$/;

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      id,
      folderPath,
      category,
      title,
      segments,
      orientation,
      isLandscape,
      action = 'generate',
      customMeta,
      geminiApiKey
    } = body;

    const cleanFolder = String(folderPath || '').trim();
    let targetProjectDir = null;
    let manifestData = null;

    if (cleanFolder && SAFE_FOLDER_NAME.test(cleanFolder)) {
      targetProjectDir = resolveProjectDir(cleanFolder, category);
      const manifestPath = path.join(targetProjectDir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        } catch (e) {
          console.warn('[publish-meta] Không đọc được manifest.json:', e.message);
        }
      }
    }

    // Nhánh 1: Lưu thủ công nội dung người dùng chỉnh sửa
    if (action === 'save' && customMeta) {
      const cleanTitle = String(customMeta.youtubeTitle || '').trim();
      const cleanTags = Array.isArray(customMeta.hashtags)
        ? customMeta.hashtags.map((t) => String(t || '').trim()).filter(Boolean)
        : [];
      const cleanDesc = String(customMeta.youtubeDescription || '').trim();

      const savedMeta = {
        youtubeTitle: cleanTitle,
        hashtags: cleanTags,
        youtubeDescription: cleanDesc
      };

      if (targetProjectDir) {
        const manifestPath = path.join(targetProjectDir, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          try {
            const current = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            Object.assign(current, savedMeta, { updatedAt: Date.now() });
            fs.writeFileSync(manifestPath, JSON.stringify(current, null, 2), 'utf8');
          } catch (mErr) {
            console.warn('[publish-meta] Lỗi ghi manifest.json khi save:', mErr.message);
          }
        }
      }

      if (id || cleanFolder) {
        updateLocalPrompt(id || cleanFolder, savedMeta);
        getMongoClientDb().then((db) => {
          db.collection('promptHistory').updateOne(
            { $or: [{ id }, { 'input.folderPath': cleanFolder }] },
            { $set: { ...savedMeta, updatedAt: Date.now() } }
          ).catch(() => {});
        }).catch(() => {});
      }

      return NextResponse.json({ success: true, meta: savedMeta });
    }

    // Nhánh 2: Tự động sinh nội dung bài đăng bằng AI (generate)
    const effectiveSegments = Array.isArray(segments) && segments.length > 0
      ? segments
      : (Array.isArray(manifestData?.segments) ? manifestData.segments : []);

    if (!effectiveSegments || effectiveSegments.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy phân cảnh hoặc lời thoại nào để tạo bài đăng.' },
        { status: 400 }
      );
    }

    const effectiveTitle = String(
      title || manifestData?.title || cleanFolder.replace(/[-_]/g, ' ')
    ).trim();

    const isLand = isLandscape !== undefined
      ? Boolean(isLandscape)
      : (orientation === 'landscape' || manifestData?.orientation === 'landscape' || manifestData?.input?.aspectRatio === '16:9');

    const db = await getMongoClientDb();
    const settingsRecord = await db.collection('settings').findOne({});
    const apiKeys = resolveApiKeys(geminiApiKey, settingsRecord?.geminiApiKey, process.env.GEMINI_API_KEY);

    if (apiKeys.length === 0) {
      return NextResponse.json(
        { error: 'Chưa cấu hình Gemini API Key. Vui lòng thêm API key trong Cài đặt AI.' },
        { status: 400 }
      );
    }

    const meta = await generatePublishMeta({
      title: effectiveTitle,
      segments: effectiveSegments,
      isLandscape: isLand,
      apiKey: apiKeys
    });

    if (!meta) {
      return NextResponse.json(
        { error: 'Không thể sinh nội dung bài đăng từ lời thoại kịch bản này (nội dung quá ngắn hoặc lỗi phản hồi AI).' },
        { status: 500 }
      );
    }

    // Lưu vào manifest.json
    if (targetProjectDir) {
      const manifestPath = path.join(targetProjectDir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const current = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          Object.assign(current, meta, { updatedAt: Date.now() });
          fs.writeFileSync(manifestPath, JSON.stringify(current, null, 2), 'utf8');
        } catch (mErr) {
          console.warn('[publish-meta] Lỗi ghi manifest.json:', mErr.message);
        }
      }
    }

    // Cập nhật local prompt & Mongo
    if (id || cleanFolder) {
      updateLocalPrompt(id || cleanFolder, meta);
      db.collection('promptHistory').updateOne(
        { $or: [{ id }, { 'input.folderPath': cleanFolder }] },
        { $set: { ...meta, updatedAt: Date.now() } }
      ).catch(() => {});
    }

    return NextResponse.json({ success: true, meta });
  } catch (error) {
    console.error('[publish-meta error]:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi xử lý nội dung bài đăng.' },
      { status: 500 }
    );
  }
}
