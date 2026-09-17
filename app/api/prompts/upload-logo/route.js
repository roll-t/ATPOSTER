import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function syncLogoToSkills(buffer) {
  const cwd = process.cwd();
  const skillsDir = path.join(cwd, 'skills');
  const syncedPaths = [];

  if (fs.existsSync(skillsDir)) {
    const skillFolders = fs.readdirSync(skillsDir);
    for (const skill of skillFolders) {
      const skillLogoDir = path.join(skillsDir, skill, 'remotion', 'public', 'logo');
      if (fs.existsSync(skillLogoDir)) {
        const destPath = path.join(skillLogoDir, 'nexora-video-logo.png');
        try {
          fs.writeFileSync(destPath, buffer);
          syncedPaths.push(destPath);
        } catch (err) {
          console.warn(`[Upload Logo] Không thể ghi logo vào ${destPath}:`, err.message);
        }
      }
    }
  }
  return syncedPaths;
}

export async function POST(req) {
  try {
    const cwd = process.cwd();
    const watermarkDir = path.join(cwd, 'public', 'images', 'watermark');
    const mainLogoPath = path.join(watermarkDir, 'nexora-video-logo.png');
    const defaultBackupPath = path.join(watermarkDir, 'nexora-video-logo.default.png');

    // Tạo thư mục nếu chưa có
    if (!fs.existsSync(watermarkDir)) {
      fs.mkdirSync(watermarkDir, { recursive: true });
    }

    // Tự động sao lưu bản logo gốc mặc định ban đầu nếu chưa có file backup
    if (fs.existsSync(mainLogoPath) && !fs.existsSync(defaultBackupPath)) {
      try {
        fs.copyFileSync(mainLogoPath, defaultBackupPath);
      } catch (backupErr) {
        console.warn('[Upload Logo] Không thể tạo bản sao lưu logo gốc:', backupErr.message);
      }
    }

    const contentType = req.headers.get('content-type') || '';

    // Xử lý yêu cầu khôi phục logo mặc định
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      if (body.action === 'restore') {
        if (!fs.existsSync(defaultBackupPath)) {
          return NextResponse.json({ success: false, error: 'Không tìm thấy bản sao lưu logo gốc để khôi phục.' }, { status: 404 });
        }
        const defaultBuffer = fs.readFileSync(defaultBackupPath);
        fs.writeFileSync(mainLogoPath, defaultBuffer);
        syncLogoToSkills(defaultBuffer);
        return NextResponse.json({
          success: true,
          message: '✓ Đã khôi phục logo thương hiệu mặc định thành công!',
          version: Date.now()
        });
      }
    }

    // Xử lý upload file logo mới
    const formData = await req.formData();
    const file = formData.get('file');
    const action = formData.get('action');

    if (action === 'restore') {
      if (!fs.existsSync(defaultBackupPath)) {
        return NextResponse.json({ success: false, error: 'Không tìm thấy bản sao lưu logo gốc để khôi phục.' }, { status: 404 });
      }
      const defaultBuffer = fs.readFileSync(defaultBackupPath);
      fs.writeFileSync(mainLogoPath, defaultBuffer);
      syncLogoToSkills(defaultBuffer);
      return NextResponse.json({
        success: true,
        message: '✓ Đã khôi phục logo thương hiệu mặc định thành công!',
        version: Date.now()
      });
    }

    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'Vui lòng chọn file ảnh logo để tải lên.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'Dung lượng ảnh vượt quá giới hạn cho phép (tối đa 10MB).' }, { status: 400 });
    }

    const fileExt = path.extname(file.name || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json({ success: false, error: 'Định dạng file không hỗ trợ. Vui lòng chọn ảnh PNG, JPG, WEBP hoặc SVG.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ghi đè logo chính của ứng dụng
    fs.writeFileSync(mainLogoPath, buffer);

    // Đồng bộ sang toàn bộ các Remotion skills để khi render video dùng ngay logo mới
    const synced = syncLogoToSkills(buffer);

    return NextResponse.json({
      success: true,
      message: '✓ Đã cập nhật ảnh logo thương hiệu thành công!',
      version: Date.now(),
      syncedSkillsCount: synced.length
    });
  } catch (err) {
    console.error('[Upload Logo Error]:', err);
    return NextResponse.json({ success: false, error: `Lỗi xử lý file logo: ${err.message}` }, { status: 500 });
  }
}
