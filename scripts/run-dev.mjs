import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const nextBin = path.join(rootDir, 'node_modules', 'next', 'dist', 'bin', 'next');

// Đảm bảo mức giới hạn RAM lớn và vô hiệu hoá cơ chế tự restart định kỳ của Next.js
const existingNodeOptions = process.env.NODE_OPTIONS || '';
if (!existingNodeOptions.includes('--max-old-space-size')) {
  process.env.NODE_OPTIONS = `${existingNodeOptions} --max-old-space-size=8192`.trim();
}

const args = [nextBin, 'dev', ...process.argv.slice(2)];

const child = spawn(process.execPath, args, {
  cwd: rootDir,
  env: {
    ...process.env,
    PORT: process.env.PORT || '3001',
  },
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});

// Chuyển tiếp các signal dừng tiến trình
['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, () => {
    if (child && !child.killed) {
      child.kill(sig);
    }
  });
});
