@echo off
title ATPOSTER - VIENEU TTS SERVER
cd /d "%~dp0AGENT_TOOL"
echo ===================================================
echo   Dang khoi dong VieNeu-TTS API Server (FastAPI)
echo ===================================================
echo.

where uv >nul 2>&1
if %errorlevel% equ 0 (
    echo [VieNeu-TTS] Phat hien cong cu 'uv'. Dang khoi dong bang uv...
    uv run python scripts/vieneu_server.py
) else (
    echo [VieNeu-TTS] Khong thay 'uv'. Dung python/pip thuong...
    python -c "import vieneu" >nul 2>&1
    if %errorlevel% neq 0 (
        echo [VieNeu-TTS] Dang cai dat vieneu, fastapi, uvicorn, soundfile...
        pip install vieneu fastapi uvicorn soundfile
    )
    python scripts/vieneu_server.py
)
pause
