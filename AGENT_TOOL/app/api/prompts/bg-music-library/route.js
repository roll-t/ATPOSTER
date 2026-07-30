import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getMongoClientDb } from '@/lib/db.js';

// Đuôi file nhạc nền được chấp nhận — cùng danh sách với select-default-music/route.js (nhánh
// tải file nhạc của người dùng), giữ 2 nơi khớp nhau vì mọi bản ghi thư viện đều đi qua đường
// tải lên đó trước khi được lưu vào đây.
const ALLOWED_UPLOAD_EXTS = ['mp3', 'm4a', 'wav', 'ogg', 'aac'];

// Nơi lưu BẢN SAO BỀN của mọi bản nhạc người dùng từng tải lên — khác với audio/bg-music.* của
// từng project (bị ghi đè mỗi khi đổi nhạc), thư mục này là kho DÙNG CHUNG cho mọi project, để
// người dùng chọn lại một bản đã tải trước đó mà không phải tìm lại file gốc trên máy.
const LIBRARY_DIR = path.join(process.cwd(), 'public', 'custom-bg-music');

/**
 * Thư viện "Nhạc đã từng tải lên" — mỗi lần người dùng tải 1 file nhạc nền lên qua modal Cài Đặt
 * Nhạc Nền, ngoài việc áp ngay cho project đang mở (select-default-music/route.js), bản gốc còn
 * được lưu thêm 1 bản vào đây (collection Mongo riêng `bgMusicLibrary`, theo đúng khuôn của
 * presets/route.js) để lần sau vào dự án khác vẫn chọn lại được, không cần tải lại từ đầu.
 */
export async function GET() {
  try {
    const db = await getMongoClientDb();
    const library = await db.collection('bgMusicLibrary').find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ success: true, library: library.map(({ _id, ...rest }) => rest) });
  } catch (error) {
    console.error('[API BgMusicLibrary GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi lấy thư viện nhạc nền.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, dataUrl, ext } = await request.json();

    if (!dataUrl) {
      return NextResponse.json({ error: 'Thiếu tệp nhạc.' }, { status: 400 });
    }

    const cleanExt = String(ext || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!ALLOWED_UPLOAD_EXTS.includes(cleanExt)) {
      return NextResponse.json({
        error: `Định dạng .${cleanExt} không được hỗ trợ. Hãy dùng: ${ALLOWED_UPLOAD_EXTS.join(', ')}.`
      }, { status: 400 });
    }

    const buffer = Buffer.from(dataUrl.replace(/^data:[^;]+;base64,/, ''), 'base64');
    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Tệp nhạc rỗng hoặc hỏng.' }, { status: 400 });
    }

    if (!fs.existsSync(LIBRARY_DIR)) {
      fs.mkdirSync(LIBRARY_DIR, { recursive: true });
    }

    const id = `lib_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const filename = `${id}.${cleanExt}`;
    fs.writeFileSync(path.join(LIBRARY_DIR, filename), buffer);

    const entry = {
      id,
      name: (name && String(name).trim()) || 'Nhạc đã tải lên',
      filename,
      ext: cleanExt,
      sizeBytes: buffer.length,
      createdAt: new Date().toISOString()
    };

    const db = await getMongoClientDb();
    await db.collection('bgMusicLibrary').insertOne(entry);

    console.log(`[API BgMusicLibrary] Đã lưu "${entry.name}" vào thư viện: ${filename} (${buffer.length} byte)`);
    return NextResponse.json({ success: true, item: entry });
  } catch (error) {
    console.error('[API BgMusicLibrary POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi lưu nhạc vào thư viện.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID bản nhạc.' }, { status: 400 });
    }

    const db = await getMongoClientDb();
    const collection = db.collection('bgMusicLibrary');
    const item = await collection.findOne({ id });

    if (item?.filename) {
      const filePath = path.join(LIBRARY_DIR, item.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.warn(`[API BgMusicLibrary] Không xoá được file ${item.filename}:`, err.message);
        }
      }
    }

    await collection.deleteMany({ id });

    return NextResponse.json({ success: true, message: 'Đã xoá khỏi thư viện.' });
  } catch (error) {
    console.error('[API BgMusicLibrary DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi xoá nhạc khỏi thư viện.' }, { status: 500 });
  }
}
