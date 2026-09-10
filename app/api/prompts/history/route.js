import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getMongoClientDb } from '@/src/infrastructure/persistence/index.js';
import { resolveProjectDir, getAllSkillPublicDirs } from '@/src/infrastructure/rendering/remotion/paths.js';
import { getLocalPromptHistory, updateLocalPrompt } from '@/src/infrastructure/persistence/localPromptRepository.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const id = searchParams.get('id');
    const full = searchParams.get('full') === 'true';

    // 1. Đọc trực tiếp từ kho kịch bản local disk (< 20ms, hoàn toàn không phụ thuộc API / mạng)
    const localResult = getLocalPromptHistory({ category, id, full });

    if (id) {
      if (localResult.item) {
        return NextResponse.json(localResult);
      }
      // Fallback: nếu local chưa có ID này, thử đọc từ MongoDB
      try {
        const db = await getMongoClientDb();
        const item = await db.collection('promptHistory').findOne({ id });
        if (item) {
          const { _id, ...clean } = item;
          return NextResponse.json({ success: true, item: clean, items: [clean] });
        }
      } catch (dbErr) {
        console.warn('[API Prompt History GET] Fallback Mongo lỗi:', dbErr.message);
      }
      return NextResponse.json({ success: true, item: null, items: [] });
    }

    return NextResponse.json(localResult);
  } catch (error) {
    console.error('[API Prompt History GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tải lịch sử.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { id, remotionConfig, input, segments } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Thiếu id.' }, { status: 400 });
    }
    const updateFields = {};
    if (remotionConfig && typeof remotionConfig === 'object') {
      updateFields.remotionConfig = remotionConfig;
    }
    if (input && typeof input === 'object') {
      updateFields.input = input;
    }
    if (Array.isArray(segments)) {
      updateFields.segments = segments;
    }
    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'Không có dữ liệu cần cập nhật.' }, { status: 400 });
    }

    // 1. Cập nhật trực tiếp manifest.json trên local disk
    updateLocalPrompt(id, updateFields);

    // 2. Cập nhật nền vào database nếu có (không chặn response)
    getMongoClientDb().then(db => {
      db.collection('promptHistory').updateOne({ id }, { $set: updateFields }).catch(err => {
        console.warn('[API Prompt History PATCH] Mongo update warning:', err.message);
      });
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Prompt History PATCH Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi lưu cấu hình.' }, { status: 500 });
  }
}

const SAFE_FOLDER_NAME = /^[A-Za-z0-9_-]+$/;
const RESERVED_FOLDERS = new Set([
  '', '.', '..', 'assets', 'logo', 'brand', 'example', 'examples', 'public', 'scripts', 'src', 'components', 'styles', 'config', 'final'
]);

function isInsideSkillPublicDir(targetDir) {
  const resolved = path.resolve(targetDir);
  return getAllSkillPublicDirs().some(({ publicDir }) => {
    const base = path.resolve(publicDir);
    const rel = path.relative(base, resolved);
    return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
  });
}

function deleteProjectFolderOnDisk(folderPath, category) {
  if (!folderPath || typeof folderPath !== 'string') return;
  const cleanFolder = folderPath.trim();
  if (!SAFE_FOLDER_NAME.test(cleanFolder) || RESERVED_FOLDERS.has(cleanFolder.toLowerCase())) {
    return;
  }

  const allSkills = getAllSkillPublicDirs();
  const deletedDirs = new Set();

  const preferredDir = resolveProjectDir(cleanFolder, category);
  if (preferredDir && fs.existsSync(preferredDir) && isInsideSkillPublicDir(preferredDir)) {
    const baseName = path.basename(preferredDir).toLowerCase();
    if (!RESERVED_FOLDERS.has(baseName)) {
      try {
        fs.rmSync(preferredDir, { recursive: true, force: true });
        deletedDirs.add(path.resolve(preferredDir));
        console.log(`[API Prompt History DELETE] Đã xoá thư mục dự án local: ${preferredDir}`);

        const parentDir = path.dirname(preferredDir);
        if (isInsideSkillPublicDir(parentDir) && fs.existsSync(parentDir) && fs.readdirSync(parentDir).length === 0) {
          fs.rmdirSync(parentDir);
        }
      } catch (err) {
        console.error(`[API Prompt History DELETE] Lỗi xoá thư mục ${preferredDir}:`, err.message);
      }
    }
  }

  for (const { publicDir } of allSkills) {
    const candidates = [
      path.join(publicDir, cleanFolder),
      category ? path.join(publicDir, category, cleanFolder) : null
    ].filter(Boolean);

    for (const cand of candidates) {
      const resolved = path.resolve(cand);
      const baseName = path.basename(resolved).toLowerCase();
      if (!deletedDirs.has(resolved) && !RESERVED_FOLDERS.has(baseName) && fs.existsSync(resolved) && isInsideSkillPublicDir(resolved)) {
        try {
          fs.rmSync(resolved, { recursive: true, force: true });
          deletedDirs.add(resolved);
          console.log(`[API Prompt History DELETE] Đã dọn dẹp thư mục: ${resolved}`);

          const parentDir = path.dirname(resolved);
          if (isInsideSkillPublicDir(parentDir) && fs.existsSync(parentDir) && fs.readdirSync(parentDir).length === 0) {
            fs.rmdirSync(parentDir);
          }
        } catch (err) {
          console.error(`[API Prompt History DELETE] Lỗi xoá thư mục ${resolved}:`, err.message);
        }
      }
    }
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids');
    
    let targetIds = [];
    if (ids) {
      targetIds = ids.split(',').map(s => s.trim()).filter(Boolean);
    } else if (id) {
      targetIds = [id.trim()].filter(Boolean);
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'Thiếu id hoặc danh sách ids.' }, { status: 400 });
    }

    // 1. Tìm và xoá thư mục dự án trên local disk
    const allPrompts = getLocalPromptHistory({ full: true }).items || [];
    for (const targetId of targetIds) {
      const found = allPrompts.find(p => p.id === targetId || p.input?.folderPath === targetId);
      const folderPath = found?.input?.folderPath || targetId;
      const category = found?.category;
      deleteProjectFolderOnDisk(folderPath, category);
    }

    // 2. Xoá bản ghi database trong nền nếu có
    getMongoClientDb().then(db => {
      db.collection('promptHistory').deleteMany({ id: { $in: targetIds } }).catch(err => {
        console.warn('[API Prompt History DELETE] Mongo delete warning:', err.message);
      });
    }).catch(() => {});

    return NextResponse.json({ 
      success: true, 
      deletedCount: targetIds.length,
      message: 'Đã xóa kịch bản và toàn bộ thư mục tài nguyên liên quan trên máy.' 
    });
  } catch (error) {
    console.error('[API Prompt History DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xóa lịch sử.' }, { status: 500 });
  }
}
