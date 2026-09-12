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
    let batPath = path.join(cwd, 'app_runner', 'start-vieneu-server.bat');
    if (!fs.existsSync(batPath)) {
      batPath = path.join(cwd, '..', 'app_runner', 'start-vieneu-server.bat');
    }
    if (!fs.existsSync(batPath)) {
      batPath = path.join(cwd, 'start-vieneu-server.bat');
    }

    const candidatePaths = [
      path.join(cwd, 'packages', 'VieNue', 'lib', 'vieneu_server.py'),
      path.join(cwd, 'packages', 'VieNeu', 'lib', 'vieneu_server.py'),
      path.join(cwd, 'packages', 'VieNue', 'vieneu_server.py'),
      path.join(cwd, 'packages', 'VieNeu', 'vieneu_server.py'),
      path.join(cwd, '..', 'packages', 'VieNue', 'lib', 'vieneu_server.py'),
      path.join(cwd, '..', 'packages', 'VieNeu', 'lib', 'vieneu_server.py'),
      path.join(cwd, 'SERVER', 'VieNeu', 'vieneu_server.py'),
      path.join(cwd, '..', 'SERVER', 'VieNeu', 'vieneu_server.py'),
      path.join(cwd, 'scripts', 'vieneu_server.py'),
    ];
    const scriptPath = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];
    const scriptDir = path.dirname(scriptPath);

    const venvPython = process.platform === 'win32'
      ? path.join(scriptDir, '.venv', 'Scripts', 'python.exe')
      : path.join(scriptDir, '.venv', 'bin', 'python');
    const hasVenv = fs.existsSync(venvPython);

    if (process.platform === 'win32') {
      if (fs.existsSync(batPath)) {
        const batDir = path.dirname(batPath);
        exec(`start "" "${batPath}"`, { cwd: batDir }, (err) => {
          if (err) console.error('[Start VieNeu] Win exec error:', err);
        });
      } else {
        const winPython = hasVenv ? `"${venvPython}"` : 'python';
        exec(`start "" ${winPython} "${scriptPath}"`, { cwd: scriptDir }, (err) => {
          if (err) console.error('[Start VieNeu] Win python exec error:', err);
        });
      }
    } else if (process.platform === 'darwin') {
      const pythonCmd = hasVenv ? `"${venvPython}"` : `python3`;
      const bashCommand = hasVenv
        ? `cd "${scriptDir}" && ${pythonCmd} vieneu_server.py`
        : `cd "${scriptDir}" && if command -v uv >/dev/null 2>&1; then uv run --python 3.11 --with vieneu --with "numba>=0.57.0" --with fastapi --with uvicorn --with soundfile --with imageio-ffmpeg --with torch python vieneu_server.py; else (python3 -c "import uvicorn, vieneu, imageio_ffmpeg, torch" 2>/dev/null || python3 -m pip install vieneu fastapi uvicorn soundfile imageio-ffmpeg torch) && python3 vieneu_server.py; fi`;
      const appleScriptEscaped = bashCommand.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const macScript = `tell application "Terminal" to do script "${appleScriptEscaped}"`;
      const macCmd = `osascript -e '${macScript}'`;
      exec(macCmd, (err) => {
        if (err) {
          console.warn('[Start VieNeu] Terminal osascript error, fallback detached spawn:', err);
          const fallbackCmd = hasVenv ? venvPython : 'python3';
          const child = spawn(fallbackCmd, [scriptPath], { cwd: scriptDir, detached: true, stdio: 'ignore' });
          child.unref();
        }
      });
    } else {
      // Linux
      const linuxPython = hasVenv ? venvPython : 'python3';
      const child = spawn(linuxPython, [scriptPath], { cwd: scriptDir, detached: true, stdio: 'ignore' });
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
