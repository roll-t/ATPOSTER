import { NextResponse } from 'next/server';
import { exec, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(req) {
  try {
    const { serverUrl = 'http://127.0.0.1:8001' } = await req.json().catch(() => ({}));

    // Kiểm tra xem server VieNeu-TTS đã đang bật sẵn chưa
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${serverUrl}/voices`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        return NextResponse.json({
          success: true,
          alreadyRunning: true,
          message: `VieNeu-TTS Server đã đang hoạt động tại ${serverUrl}`
        });
      }
    } catch (_) {
      // Server chưa bật -> tiến hành khởi chạy
    }

    const cwd = process.cwd();
    let batPath = path.join(cwd, 'start-vieneu-server.bat');
    if (!fs.existsSync(batPath)) {
      batPath = path.join(cwd, '..', 'start-vieneu-server.bat');
    }

    let scriptPath = path.join(cwd, 'scripts', 'vieneu_server.py');
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.join(cwd, 'AGENT_TOOL', 'scripts', 'vieneu_server.py');
    }
    const agentToolDir = path.dirname(path.dirname(scriptPath));

    if (process.platform === 'win32') {
      if (fs.existsSync(batPath)) {
        const batDir = path.dirname(batPath);
        exec(`start "" "${batPath}"`, { cwd: batDir }, (err) => {
          if (err) console.error('[Start VieNeu] Win exec error:', err);
        });
      } else {
        exec(`start "" python "${scriptPath}"`, { cwd: agentToolDir }, (err) => {
          if (err) console.error('[Start VieNeu] Win python exec error:', err);
        });
      }
    } else if (process.platform === 'darwin') {
      // macOS: ưu tiên chạy bằng 'uv' (nếu có) — tự tải Python riêng biệt và cài gói vào môi
      // trường tạm, né lỗi python3 hệ thống quá cũ hoặc lỗi lệch libexpat của Homebrew.
      //
      // Dùng Python 3.11 + numba>=0.57 vì:
      //   • vieneu → librosa → numba → llvmlite; llvmlite==0.36.0 (numba 0.53) chỉ hỗ trợ <3.10
      //   • numba>=0.57 dùng llvmlite>=0.40 — hỗ trợ Python 3.11 đầy đủ
      //
      // Lệnh bash chứa dấu " nên phải escape TOÀN BỘ thành \" trước khi nhét vào AppleScript.
      const bashCommand = `cd "${agentToolDir}" && if command -v uv >/dev/null 2>&1; then uv run --python 3.11 --with vieneu --with "numba>=0.57.0" --with fastapi --with uvicorn --with soundfile python scripts/vieneu_server.py; else (python3 -c "import uvicorn, vieneu" 2>/dev/null || python3 -m pip install vieneu fastapi uvicorn soundfile) && python3 scripts/vieneu_server.py; fi`;
      const appleScriptEscaped = bashCommand.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const macScript = `tell application "Terminal" to do script "${appleScriptEscaped}"`;
      const macCmd = `osascript -e '${macScript}'`;
      exec(macCmd, (err) => {
        if (err) {
          console.warn('[Start VieNeu] Terminal osascript error, fallback detached spawn:', err);
          // Ưu tiên 'uv' ở fallback này luôn (không có cửa sổ Terminal để thấy log cài đặt, nhưng
          // ít nhất tránh spawn thẳng python3 hệ thống nếu nó là bản quá cũ không có vieneu).
          const child = spawn('uv', ['run', '--python', '3.11', '--with', 'vieneu', '--with', 'numba>=0.57.0', '--with', 'fastapi', '--with', 'uvicorn', '--with', 'soundfile', 'python', scriptPath], { cwd: agentToolDir, detached: true, stdio: 'ignore' });
          child.on('error', () => {
            const fallbackChild = spawn('python3', [scriptPath], { cwd: agentToolDir, detached: true, stdio: 'ignore' });
            fallbackChild.unref();
          });
          child.unref();
        }
      });
    } else {
      // Linux
      const child = spawn('python3', [scriptPath], { cwd: agentToolDir, detached: true, stdio: 'ignore' });
      child.unref();
    }

    return NextResponse.json({
      success: true,
      alreadyRunning: false,
      message: '🚀 Đã gửi lệnh khởi chạy VieNeu-TTS Server! Vui lòng đợi 3 - 5 giây rồi bấm "Thử kết nối".'
    });
  } catch (error) {
    console.error('[Start VieNeu Server API Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khởi chạy VieNeu-TTS server.' }, { status: 500 });
  }
}
