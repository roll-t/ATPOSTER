@echo off
title ATPOSTER - VIENEU TTS SERVER

if not defined VIENEU_FFMPEG (
    if exist "%~dp0..\node_modules\@remotion\compositor-win32-x64-msvc\ffmpeg.exe" (
        set "VIENEU_FFMPEG=%~dp0..\node_modules\@remotion\compositor-win32-x64-msvc\ffmpeg.exe"
    ) else if exist "%~dp0..\..\tiktok_agent\data\ffmpeg.exe" (
        set "VIENEU_FFMPEG=%~dp0..\..\tiktok_agent\data\ffmpeg.exe"
    )
)

if exist "%~dp0..\packages\VieNue\lib" (
    cd /d "%~dp0..\packages\VieNue\lib"
) else (
    cd /d "%~dp0..\SERVER\VieNeu"
)
echo ===================================================
echo   Dang khoi dong VieNeu-TTS API Server (FastAPI)
echo ===================================================
echo.

if exist ".venv\Scripts\python.exe" (
    echo [VieNeu-TTS] Phat hien virtual environment. Dang khoi dong...
    ".venv\Scripts\python.exe" vieneu_server.py
) else if exist "%~dp0..\SERVER\VieNeu\.venv\Scripts\python.exe" (
    echo [VieNeu-TTS] Phat hien virtual environment tai SERVER/VieNeu. Dang khoi dong...
    "%~dp0..\SERVER\VieNeu\.venv\Scripts\python.exe" vieneu_server.py
) else (
    where uv >nul 2>&1
    if %errorlevel% equ 0 (
        echo [VieNeu-TTS] Phat hien cong cu 'uv'. Dang tao moi truong va khoi dong...
        uv venv --python 3.11 .venv
        uv pip install -p .venv\Scripts\python.exe vieneu "numba>=0.57.0" fastapi uvicorn soundfile imageio-ffmpeg
        ".venv\Scripts\python.exe" vieneu_server.py
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
