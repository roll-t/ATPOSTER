import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const targets = [
  path.join(rootDir, 'node_modules', 'next', 'dist', 'server', 'lib', 'start-server.js'),
  path.join(rootDir, 'node_modules', 'next', 'dist', 'esm', 'server', 'lib', 'start-server.js')
];

let patchedCount = 0;

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');

  // CommonJS version
  const cjsPattern = /if\s*\(_v8\.default\.getHeapStatistics\(\)\.used_heap_size\s*>\s*0\.8\s*\*\s*_v8\.default\.getHeapStatistics\(\)\.heap_size_limit\)/g;
  // ESM version
  const esmPattern = /if\s*\(v8\.getHeapStatistics\(\)\.used_heap_size\s*>\s*0\.8\s*\*\s*v8\.getHeapStatistics\(\)\.heap_size_limit\)/g;

  let modified = false;

  if (cjsPattern.test(content)) {
    content = content.replace(cjsPattern, 'if (process.env.NEXT_ENABLE_MEMORY_RESTART === "1" && _v8.default.getHeapStatistics().used_heap_size > 0.8 * _v8.default.getHeapStatistics().heap_size_limit)');
    modified = true;
  }

  if (esmPattern.test(content)) {
    content = content.replace(esmPattern, 'if (process.env.NEXT_ENABLE_MEMORY_RESTART === "1" && v8.getHeapStatistics().used_heap_size > 0.8 * v8.getHeapStatistics().heap_size_limit)');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    patchedCount++;
    console.log(`[Patch-Next] Đã vô hiệu hoá memory restart threshold trong: ${path.relative(rootDir, filePath)}`);
  } else {
    console.log(`[Patch-Next] File đã được patch hoặc không tìm thấy mẫu: ${path.relative(rootDir, filePath)}`);
  }
}

console.log(`[Patch-Next] Hoàn tất vá lỗi Next.js (${patchedCount} file đã cập nhật).`);
