@echo off
SETLOCAL EnableDelayedExpansion

set "ROOT_DIR=%~dp0"
set "CMD=%1"

if "%CMD%"=="" (
    goto show_help
)

if /i "%CMD%"=="agent" (
    echo [ATPOSTER] Dang khoi dong AGENT_TOOL...
    cd /d "%ROOT_DIR%AGENT_TOOL"
    npm run dev
    goto end
)

if /i "%CMD%"=="render" (
    echo [ATPOSTER] Dang khoi dong RENDER Studio...
    cd /d "%ROOT_DIR%RENDER"
    npm run studio
    goto end
)

if /i "%CMD%"=="install" (
    echo [ATPOSTER] Dang cai dat dependencies cho tat ca cac thu muc...
    cd /d "%ROOT_DIR%"
    npm run install:all
    goto end
)

if /i "%CMD%"=="build" (
    echo [ATPOSTER] Dang build AGENT_TOOL...
    cd /d "%ROOT_DIR%AGENT_TOOL"
    npm run build
    goto end
)

:show_help
echo =========================================================
echo               ATPOSTER CLI ENGINE ^& DASHBOARD
echo =========================================================
echo Cach dung: atposter ^<command^>
echo.
echo Cac lenh ho tro:
echo   atposter agent    : Khoi chay AGENT_TOOL (Next.js Dashboard)
echo   atposter render   : Khoi chay RENDER (Remotion Studio)
echo   atposter install  : Cai dat node_modules cho ca 2 thu muc
echo   atposter build    : Build AGENT_TOOL cho production
echo =========================================================
goto end

:end
