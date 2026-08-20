import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getMongoClientDb } from '@/lib/db.js';
import { resolveProjectDir, getAllSkillPublicDirs } from '@/lib/remotionPaths.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const db = await getMongoClientDb();
    const query = category && category !== 'all' ? { category } : {};
    const items = await db.collection('promptHistory').find(query).sort({ createdAt: -1 }).limit(100).toArray();
    const clean = items.map(({ _id, ...rest }) => rest);
    return NextResponse.json({ success: true, items: clean });
  } catch (error) {
    console.error('[API Prompt History GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tải lịch sử.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { id, remotionConfig } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Thiếu id.' }, { status: 400 });
    }
    if (!remotionConfig || typeof remotionConfig !== 'object') {
      return NextResponse.json({ error: 'Thiếu remotionConfig.' }, { status: 400 });
    }

    const db = await getMongoClientDb();
    const result = await db.collection('promptHistory').updateOne({ id }, { $set: { remotionConfig } });
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Không tìm thấy kịch bản trong lịch sử.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Prompt History PATCH Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi lưu cấu hình render.' }, { status: 500 });
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
    // rel rỗng = chính thư mục public (không được xoá), rel bắt đầu bằng '..' = nằm ngoài.
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

  // 1. Tìm đường dẫn dự án chính theo category
  const preferredDir = resolveProjectDir(cleanFolder, category);
  if (preferredDir && fs.existsSync(preferredDir) && isInsideSkillPublicDir(preferredDir)) {
    const baseName = path.basename(preferredDir).toLowerCase();
    if (!RESERVED_FOLDERS.has(baseName)) {
      try {
        fs.rmSync(preferredDir, { recursive: true, force: true });
        deletedDirs.add(path.resolve(preferredDir));
        console.log(`[API Prompt History DELETE] Đã xoá thư mục tài nguyên dự án (âm thanh, ảnh, v.v.): ${preferredDir}`);

        // Dọn dẹp thư mục cha nếu là category lồng và vừa trở nên rỗng
        const parentDir = path.dirname(preferredDir);
        if (isInsideSkillPublicDir(parentDir) && fs.existsSync(parentDir) && fs.readdirSync(parentDir).length === 0) {
          fs.rmdirSync(parentDir);
        }
      } catch (err) {
        console.error(`[API Prompt History DELETE] Lỗi xoá thư mục ${preferredDir}:`, err.message);
      }
    }
  }

  // 2. Quét qua tất cả thư mục public của các skill để dọn dẹp triệt để nếu có thư mục cùng tên
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
    const db = await getMongoClientDb();
    
    let targetIds = [];
    if (ids) {
      targetIds = ids.split(',').map(s => s.trim()).filter(Boolean);
    } else if (id) {
      targetIds = [id.trim()].filter(Boolean);
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'Thiếu id hoặc danh sách ids.' }, { status: 400 });
    }

    // Lấy thông tin các bản ghi kịch bản cần xoá để tìm folderPath tương ứng
    const allRecords = await db.collection('promptHistory').find({}).toArray();
    const itemsToDelete = allRecords.filter(item => targetIds.includes(item.id));

    // Xoá toàn bộ thư mục âm thanh / hình ảnh / tài nguyên đã tạo trong máy
    for (const item of itemsToDelete) {
      const folderPath = item.input?.folderPath || item.folderPath || item.input?.folder;
      if (folderPath) {
        deleteProjectFolderOnDisk(folderPath, item.category);
      }
    }

    // Xoá bản ghi trong Database
    await db.collection('promptHistory').deleteMany({ id: { $in: targetIds } });

    return NextResponse.json({ 
      success: true, 
      deletedCount: itemsToDelete.length,
      message: 'Đã xóa kịch bản và toàn bộ thư mục âm thanh, hình ảnh liên quan trong máy.' 
    });
  } catch (error) {
    console.error('[API Prompt History DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xóa lịch sử.' }, { status: 500 });
  }
}
