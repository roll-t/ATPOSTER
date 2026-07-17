@echo off
if "%1"=="h" goto begin
echo CreateObject("Wscript.Shell").Run "cmd.exe /c """"%~dpnx0"""" h", 0, False > "%temp%\run_hidden.vbs"
wscript.exe "%temp%\run_hidden.vbs"
exit

:begin
title AutoPoster Server - Khong tat cua so nay
cd /d "%~dp0"
if exist "%temp%\run_hidden.vbs" del "%temp%\run_hidden.vbs"

echo ===================================================
echo      He Thong AutoPoster YouTube Shorts
echo ===================================================
echo.

:: Xac dinh trinh duyet se dung, uu tien Edge -> Chrome -> trinh duyet mac dinh.
:: QUAN TRONG: Chrome Extension "AutoPoster Google Flow Helper" (public/extension) phai duoc
:: Load unpacked trong CHINH trinh duyet duoc chon o day - neu tien ich chi duoc cai trong
:: trinh duyet con lai, nut "Day sang Google Flow" se khong co phan ung gi vi content
:: script cua tien ich khong ton tai trong cua so App nay. Khuyen nghi: nen Load unpacked
:: tien ich nay o CA HAI trinh duyet de khong bi phu thuoc vao thu tu uu tien nay.
set "BROWSER_EXE="

reg query "HKLM\Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" >nul 2>nul
if %ERRORLEVEL% equ 0 set "BROWSER_EXE=chrome"
reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" >nul 2>nul
if %ERRORLEVEL% equ 0 set "BROWSER_EXE=chrome"

reg query "HKLM\Software\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe" >nul 2>nul
if %ERRORLEVEL% equ 0 set "BROWSER_EXE=msedge"
reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe" >nul 2>nul
if %ERRORLEVEL% equ 0 set "BROWSER_EXE=msedge"

set "SPLASH_PATH=%~dp0data\splash.html"
if defined BROWSER_EXE (
    set "BROWSER_CMD=start %BROWSER_EXE% --app="file:///%SPLASH_PATH%""
) else (
    echo [Canh bao] Khong tim thay Chrome hoac Edge da cai dat. Dang dung trinh duyet mac dinh...
    set "BROWSER_CMD=start file:///%SPLASH_PATH%"
)

:: Kiem tra xem cong 3000 da co server chay chua
netstat -ano | find "LISTENING" | find ":3000" >nul
if %ERRORLEVEL% equ 0 (
    echo Server dang chay san. Dang mo giao dien...
    if defined BROWSER_EXE (
        start %BROWSER_EXE% --app="http://localhost:3000"
    ) else (
        start http://localhost:3000
    )
    exit
)

echo Dang khoi dong Server. Vui long doi vai giay...
echo.

:: Mở trình duyệt hiển thị Splash Screen lập tức
%BROWSER_CMD%

:: Chay server Next.js
npm run dev
