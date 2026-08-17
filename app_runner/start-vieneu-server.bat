@echo off
title ATPOSTER - VIENEU TTS SERVER

if not defined VIENEU_FFMPEG (
    if exist "%~dp0..\TOOLS\AUTO_RENDER_VIDEO\node_modules\@remotion\compositor-win32-x64-msvc\ffmpeg.exe" (
        set "VIENEU_FFMPEG=%~dp0..\TOOLS\AUTO_RENDER_VIDEO\node_modules\@remotion\compositor-win32-x64-msvc\ffmpeg.exe"
    ) else if exist "%~dp0..\..\tiktok_agent\data\ffmpeg.exe" (
        set "VIENEU_FFMPEG=%~dp0..\..\tiktok_agent\data\ffmpeg.exe"
    )
)

cd /d "%~dp0..\SERVER\VieNeu"
echo ===================================================
echo   Dang khoi dong VieNeu-TTS API Server (FastAPI)
echo ===================================================
echo.

where uv >nul 2>&1
if %errorlevel% equ 0 (
    echo [VieNeu-TTS] Phat hien cong cu 'uv'. Dang khoi dong bang uv...
    uv run python vieneu_server.py
) else (
    if exist "%~dp0..\SERVER\VieNeu\.venv\Scripts\python.exe" (
        echo [VieNeu-TTS] Phat hien virtual environment tai SERVER/VieNeu. Dang khoi dong...
        "%~dp0..\SERVER\VieNeu\.venv\Scripts\python.exe" vieneu_server.py
    ) else (
        echo [VieNeu-TTS] Khong thay 'uv' hay virtual environment. Dung python he thong...
        python -c "import vieneu" >nul 2>&1
        if %errorlevel% neq 0 (
            echo [VieNeu-TTS] Dang cai dat vieneu, fastapi, uvicorn, soundfile...
            pip install vieneu fastapi uvicorn soundfile
        )
        python vieneu_server.py
    )
)
pause
