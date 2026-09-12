import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const runFile = promisify(execFile);

export async function ensureUploadsDirectory(directory) {
  const absolutePath = path.resolve(directory);
  await fs.mkdir(absolutePath, { recursive: true });
  return absolutePath;
}

export async function openDirectory(directory) {
  const absolutePath = await ensureUploadsDirectory(directory);
  const [executable, args] = process.platform === 'win32'
    ? ['explorer.exe', [absolutePath]]
    : process.platform === 'darwin'
      ? ['open', [absolutePath]]
      : ['xdg-open', [absolutePath]];
  await runFile(executable, args);
  return absolutePath;
}

export async function selectDirectory() {
  if (process.platform === 'darwin') {
    const { stdout } = await runFile('osascript', [
      '-e',
      'POSIX path of (choose folder with prompt "Chọn thư mục lưu trữ video")',
    ]);
    return stdout.trim() || null;
  }

  if (process.platform === 'win32') {
    const script = [
      'Add-Type -AssemblyName System.Windows.Forms',
      '$f = New-Object System.Windows.Forms.FolderBrowserDialog',
      '$f.Description = "Chọn thư mục lưu trữ video"',
      '$f.ShowNewFolderButton = $true',
      '$result = $f.ShowDialog()',
      'if ($result -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.SelectedPath }',
    ].join('; ');
    const { stdout } = await runFile('powershell', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script,
    ]);
    return stdout.trim() || null;
  }

  throw new Error('Hệ điều hành hiện tại chưa hỗ trợ chọn thư mục trực tiếp.');
}

export async function saveMongoUri(rawUri, envFile = path.resolve(process.cwd(), '.env.local')) {
  const value = String(rawUri || '').trim();
  if (!value) return '';
  if (!value.startsWith('mongodb://') && !value.startsWith('mongodb+srv://')) {
    throw new Error('MongoDB URI phải bắt đầu bằng mongodb:// hoặc mongodb+srv://.');
  }

  let content = '';
  try {
    content = await fs.readFile(envFile, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const line = `MONGODB_URI=${value}`;
  content = /^MONGODB_URI=.*$/m.test(content)
    ? content.replace(/^MONGODB_URI=.*$/m, line)
    : `${line}\n${content}`;
  await fs.writeFile(envFile, content, { encoding: 'utf8', mode: 0o600 });
  process.env.MONGODB_URI = value;
  return value;
}
