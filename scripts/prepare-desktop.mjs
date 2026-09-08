import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const STANDALONE_DIR = path.join(ROOT_DIR, '.next', 'standalone');

console.log('[prepare-desktop] Chuẩn bị tệp tin cho bản Desktop Standalone...');

if (fs.existsSync(STANDALONE_DIR)) {
  // 1. Copy .next/static -> .next/standalone/.next/static
  const srcStatic = path.join(ROOT_DIR, '.next', 'static');
  const destStatic = path.join(STANDALONE_DIR, '.next', 'static');
  if (fs.existsSync(srcStatic)) {
    fs.cpSync(srcStatic, destStatic, { recursive: true, force: true });
    console.log('[prepare-desktop] ✓ Đã sao chép .next/static vào standalone');
  }

  // 2. Copy public -> .next/standalone/public
  const srcPublic = path.join(ROOT_DIR, 'public');
  const destPublic = path.join(STANDALONE_DIR, 'public');
  if (fs.existsSync(srcPublic)) {
    fs.cpSync(srcPublic, destPublic, { recursive: true, force: true });
    console.log('[prepare-desktop] ✓ Đã sao chép public vào standalone');
  }

  // 3. Xóa các symlink tạm của Turbopack trong .next/node_modules để tránh lỗi packaging
  const turbopackNodeModules = path.join(ROOT_DIR, '.next', 'node_modules');
  if (fs.existsSync(turbopackNodeModules)) {
    try {
      fs.rmSync(turbopackNodeModules, { recursive: true, force: true });
      console.log('[prepare-desktop] ✓ Đã dọn dẹp symlinks tạm của Turbopack');
    } catch (e) {
      console.warn('[prepare-desktop] Cảnh báo khi dọn symlinks:', e.message);
    }
  }

  console.log('[prepare-desktop] ✓ Sẵn sàng cho Desktop Build!');
} else {
  console.warn('[prepare-desktop] Không tìm thấy thư mục .next/standalone');
}
