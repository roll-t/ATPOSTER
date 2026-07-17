import { NextResponse } from 'next/server';
import { getUploadsDir } from '@/lib/db.js';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
  try {
    const { filename } = await params;
    
    // Join path segments
    const relativePath = Array.isArray(filename) ? path.join(...filename) : filename;
    
    if (!relativePath || relativePath.includes('..')) {
      return NextResponse.json({ error: 'Tên file không hợp lệ.' }, { status: 400 });
    }

    let filePath = path.join(getUploadsDir(), relativePath);
    
    // Tương thích ngược: nếu không tìm thấy đường dẫn đầy đủ, tìm chỉ theo tên file gốc ở data/uploads
    if (!fs.existsSync(filePath)) {
      const fileBasename = path.basename(relativePath);
      const defaultFolder = path.resolve('data/uploads');
      const fallbackPath = path.join(defaultFolder, fileBasename);
      if (fs.existsSync(fallbackPath)) {
        filePath = fallbackPath;
      } else {
        return NextResponse.json({ error: 'Không tìm thấy file.' }, { status: 404 });
      }
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(relativePath).toLowerCase();
    
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    };
    
    const contentType = mimeTypes[ext] || 'image/jpeg';
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    console.error('[API Thumbnail GET Error]:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ.' }, { status: 500 });
  }
}
