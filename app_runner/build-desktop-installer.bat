@echo off
title ATPOSTER - Dong goi bo cai dat Windows Installer (.exe)
cd /d "%~dp0..\"
echo ================================================================
echo        ATPOSTER - DONG GOI UNG DUNG DESKTOP (.EXE)
echo ================================================================
echo Dang build ma nguon Next.js va dong goi bo cai dat Windows...
echo Tien trinh co the mat vai phut tuy theo cau hinh may.
echo.
npm run desktop:build
echo.
if exist "dist-desktop\" (
    echo ================================================================
    echo [THANH CONG] File cai dat da duoc tao trong thu muc:
    echo "%CD%\dist-desktop\"
    echo ================================================================
    explorer "%CD%\dist-desktop"
) else (
    echo [LOI] Khong the tao bo cai dat. Vui long kiem tra loi phia tren.
)
pause
