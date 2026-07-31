import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readDb, getMongoClientDb } from '@/lib/db.js';
import { resolveProjectDir } from '@/lib/remotionPaths.js';
import { uploadFileToDrive } from '@/lib/googleDrive.js';

const SAFE_FOLDER_NAME = /^[A-Za-z0-9_-]+$/;

export async function POST(req) {
  try {
    const db = await readDb();
    const googleDrive = db.settings?.googleDrive;

    if (!googleDrive || !googleDrive.isLinked) {
      return NextResponse.json({ error: 'Chưa liên kết tài khoản Google Drive. Vui lòng vào Cài đặt & DB Settings để liên kết.' }, { status: 400 });
    }

    const { folderPath, category } = await req.json();
    if (!folderPath) {
      return NextResponse.json({ error: 'Thiếu folderPath.' }, { status: 400 });
    }

    const cleanFolder = folderPath.trim();
    if (!SAFE_FOLDER_NAME.test(cleanFolder)) {
      return NextResponse.json({ error: 'Tên thư mục không hợp lệ.' }, { status: 400 });
    }

    // Định vị đường dẫn dự án cục bộ
    const projectDir = resolveProjectDir(cleanFolder, category);
    const videoFilePath = path.join(projectDir, 'final', 'video.mp4');

    if (!fs.existsSync(videoFilePath)) {
      return NextResponse.json({ error: 'Không tìm thấy file video.mp4 đã render. Vui lòng chạy xuất video trước.' }, { status: 404 });
    }

    // Đọc config/manifest để lấy tiêu đề video
    let title = cleanFolder;
    const configPath = path.join(projectDir, 'final', 'config.json');
    const manifestPath = path.join(projectDir, 'manifest.json');

    let configJson = {};
    if (fs.existsSync(configPath)) {
      try {
        configJson = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (configJson.title) title = configJson.title;
      } catch (e) {}
    }

    let manifestJson = {};
    if (fs.existsSync(manifestPath)) {
      try {
        manifestJson = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (manifestJson.title && !configJson.title) title = manifestJson.title;
      } catch (e) {}
    }

    const fileName = `${title}.mp4`;
    console.log(`[API Drive Upload] Đang tải lên: ${videoFilePath} -> Drive: ${fileName}`);

    // Thực hiện tải lên Google Drive
    const result = await uploadFileToDrive(googleDrive, videoFilePath, fileName, 'video/mp4');
    console.log(`[API Drive Upload] Thành công! File ID: ${result.id}, Link: ${result.webViewLink}`);

    // Ghi đè thông tin sao lưu vào config cục bộ
    if (fs.existsSync(configPath)) {
      try {
        configJson.driveFileId = result.id;
        configJson.driveUrl = result.webViewLink;
        fs.writeFileSync(configPath, JSON.stringify(configJson, null, 2), 'utf8');
      } catch (e) {
        console.error('[API Drive Upload] Lỗi ghi config.json:', e);
      }
    }

    if (fs.existsSync(manifestPath)) {
      try {
        manifestJson.driveFileId = result.id;
        manifestJson.driveUrl = result.webViewLink;
        fs.writeFileSync(manifestPath, JSON.stringify(manifestJson, null, 2), 'utf8');
      } catch (e) {
        console.error('[API Drive Upload] Lỗi ghi manifest.json:', e);
      }
    }

    // Cập nhật trạng thái vào MongoDB promptHistory (nếu có kết nối)
    try {
      const mongoDb = await getMongoClientDb();
      await mongoDb.collection('promptHistory').updateOne(
        { 'input.folderPath': cleanFolder },
        {
          $set: {
            driveFileId: result.id,
            driveUrl: result.webViewLink,
            driveUploadedAt: new Date()
          }
        }
      );
    } catch (dbErr) {
      console.warn('[API Drive Upload] Không thể cập nhật trạng thái vào MongoDB (đang chạy offline file db.json):', dbErr.message);
    }

    return NextResponse.json({
      success: true,
      fileId: result.id,
      driveUrl: result.webViewLink
    });
  } catch (error) {
    console.error('[API Drive Upload Exception]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi không xác định khi tải video lên Google Drive.' }, { status: 500 });
  }
}
