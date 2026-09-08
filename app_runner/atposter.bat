@echo off
SETLOCAL EnableDelayedExpansion

set "ROOT_DIR=%~dp0..\"
set "CMD=%1"

if "%CMD%"=="" (
    goto show_help
)

if /i "%CMD%"=="desktop" (
    echo [ATPOSTER] Dang khoi dong Video Studio Desktop App...
    cd /d "%ROOT_DIR%"
    npm run desktop
    goto end
)

if /i "%CMD%"=="render" (
    echo [ATPOSTER] Dang khoi dong Video Builder Dashboard (Port 3001)...
    cd /d "%ROOT_DIR%"
    npm run dev
    goto end
)

if /i "%CMD%"=="dist" (
    echo [ATPOSTER] Dang dong goi Desktop Installer (.exe)...
    cd /d "%ROOT_DIR%"
    npm run desktop:build
    goto end
)

if /i "%CMD%"=="install" (
    echo [ATPOSTER] Dang cai dat dependencies...
    cd /d "%ROOT_DIR%"
    npm install
    goto end
)

:show_help
echo =========================================================
echo               ATPOSTER CLI ENGINE ^& DASHBOARD
echo =========================================================
echo Cach dung: atposter ^<command^>
echo.
echo Cac lenh ho tro:
echo   atposter desktop   : Khoi chay ATPOSTER duoi dang Desktop App
echo   atposter dist      : Dong goi bo cai dat Windows Installer (.exe)
echo   atposter render    : Khoi chay RENDER Web Dashboard (Port 3001)
echo   atposter install   : Cai dat node_modules cho toan bo workspace
echo =========================================================
goto end

:end
