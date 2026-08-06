import { NextResponse } from 'next/server';
import { getUploadsDir, getMongoClientDb } from '@/lib/db.js';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
  try {
    const { filename } = await params;
    
    // Hợp nhất mảng các phân đoạn đường dẫn thành một chuỗi liên kết
    const relativePath = Array.isArray(filename) ? path.join(...filename) : filename;
    
    const db = await getMongoClientDb();
    
    // Tìm thông tin lưu trữ trong DB
    const downloadRecord = await db.collection('downloads').findOne({ videoFilename: relativePath });
    
    let folder = getUploadsDir();
    if (downloadRecord && downloadRecord.savePath) {
      folder = downloadRecord.savePath;
    }
    
    let filePath = path.join(folder, relativePath);

    // Nếu không tìm thấy đường dẫn đầy đủ, tìm tệp gốc ở thư mục mặc định (hỗ trợ tương thích ngược)
    if (!fs.existsSync(filePath)) {
      const fileBasename = path.basename(relativePath);
      const defaultFolder = path.resolve('data/uploads');
      const fallbackPath = path.join(defaultFolder, fileBasename);
      if (fs.existsSync(fallbackPath)) {
        filePath = fallbackPath;
      } else {
        return new NextResponse('Không tìm thấy tệp video.', { status: 404 });
      }
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': fileBuffer.length.toString(),
        'Accept-Ranges': 'bytes'
      }
    });
  } catch (error) {
    console.error('[API Videos GET Error] Lỗi truyền file:', error);
    return new NextResponse('Lỗi máy chủ nội bộ.', { status: 500 });
  }
}
