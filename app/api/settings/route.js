import { getConfiguredUploadsDir, settingsRepository } from '@/src/infrastructure/composition/settings.js';
import { parseApiKeys } from '@/src/domain/ai/apiKeys.js';
import { NextResponse } from 'next/server';
import { resetGeminiRotationState } from '@/src/infrastructure/ai/gemini/callGeminiApi.js';
import {
  ensureUploadsDirectory,
  openDirectory,
  saveMongoUri,
  selectDirectory,
} from '@/src/infrastructure/settings/platformSettings.js';
import path from 'path';

export async function GET() {
  const settings = await settingsRepository.read();
  return NextResponse.json({ 
    success: true, 
    settings: {
      ...settings,
      mongodbUri: process.env.MONGODB_URI || ''
    } 
  });
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'open') {
      const absolutePath = await openDirectory(await getConfiguredUploadsDir());
      return NextResponse.json({ success: true, path: absolutePath });
    }
    if (action === 'select-folder') {
      const selectedPath = await selectDirectory();
      if (!selectedPath) {
        return NextResponse.json({ success: false, error: 'Hủy chọn thư mục hoặc có lỗi xảy ra.' });
      }

      return NextResponse.json({ success: true, path: selectedPath });
    }

    // Lưu cấu hình
    const body = await request.json();

    // Nếu có thay đổi MongoDB URI, lưu vào .env.local
    if ('mongodbUri' in body) {
      const newUri = (body.mongodbUri || '').trim();
      if (newUri) {
        try {
          await saveMongoUri(newUri);
        } catch (err) {
          console.error('[API Settings] Lỗi ghi .env.local:', err);
          return NextResponse.json({ error: `Không thể ghi cấu hình vào .env.local: ${err.message}` }, { status: 500 });
        }
      }
    }

    const existingSettings = await settingsRepository.read();

    const updatedSettings = {
      ...body
    };

    // Xóa mongodbUri khỏi settings lưu ở DB để tránh trùng lặp
    delete updatedSettings.mongodbUri;

    if ('customUploadsDir' in body) {
      const cleanPath = body.customUploadsDir ? body.customUploadsDir.trim() : '';
      if (cleanPath) {
        if (!path.isAbsolute(cleanPath)) {
          return NextResponse.json({ error: 'Đường dẫn phải là đường dẫn tuyệt đối (ví dụ: /Users/username/Videos hoặc D:\\Videos)' }, { status: 400 });
        }
        try {
          await ensureUploadsDirectory(cleanPath);
        } catch (err) {
          return NextResponse.json({ error: `Không thể ghi hoặc tạo thư mục: ${err.message}` }, { status: 400 });
        }
      }
      updatedSettings.customUploadsDir = cleanPath;
    }

    if ('geminiApiKey' in body) updatedSettings.geminiApiKey = parseApiKeys(body.geminiApiKey).join('\n');
    const savedSettings = await settingsRepository.update(updatedSettings);

    // Nếu cấu hình có cập nhật geminiApiKey, làm mới ngay bộ nhớ xoay Key/Model
    if ('geminiApiKey' in body && updatedSettings.geminiApiKey !== existingSettings.geminiApiKey) {
      resetGeminiRotationState();
    }

    return NextResponse.json({ 
      success: true, 
      settings: {
        ...savedSettings,
        mongodbUri: process.env.MONGODB_URI || ''
      } 
    });
  } catch (error) {
    console.error('[API Settings Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi không xác định.' }, { status: 500 });
  }
}
