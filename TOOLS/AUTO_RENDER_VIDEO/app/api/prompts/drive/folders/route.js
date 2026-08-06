import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db.js';
import { listDriveFolders, createDriveFolder } from '@/lib/googleDrive.js';

export async function GET() {
  try {
    const db = await readDb();
    const googleDrive = db.settings?.googleDrive;

    if (!googleDrive || !googleDrive.isLinked) {
      return NextResponse.json({ error: 'Chưa liên kết tài khoản Google Drive.' }, { status: 400 });
    }

    const folders = await listDriveFolders(googleDrive);
    return NextResponse.json({ success: true, folders });
  } catch (error) {
    console.error('[API Drive Folders GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi không xác định khi lấy danh sách thư mục.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const db = await readDb();
    const googleDrive = db.settings?.googleDrive;

    if (!googleDrive || !googleDrive.isLinked) {
      return NextResponse.json({ error: 'Chưa liên kết tài khoản Google Drive.' }, { status: 400 });
    }

    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tên thư mục không được để trống.' }, { status: 400 });
    }

    const folder = await createDriveFolder(googleDrive, name.trim());
    return NextResponse.json({ success: true, folder });
  } catch (error) {
    console.error('[API Drive Folders POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi không xác định khi tạo thư mục.' }, { status: 500 });
  }
}
