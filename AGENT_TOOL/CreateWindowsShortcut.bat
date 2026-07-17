@echo off
title Tao Shortcut AutoPoster - Windows
cd /d "%~dp0"

echo ===================================================
echo   Dang tao bieu tuong khoi chay tren Windows Desktop...
echo ===================================================
echo.

:: Chạy PowerShell để tự động tạo file Shortcut (.lnk) ngoài Desktop
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'AutoPoster.lnk')); $Shortcut.TargetPath = '%~dp0StartApp.vbs'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.Save()"

echo ===================================================
echo [OK] Da tao thanh cong bieu tuong 'AutoPoster' tren Desktop!
echo.
echo Tu gio ban co the ra ngoai Desktop, click dup vao shortcut
echo 'AutoPoster' de mo ung dung. Cua so Terminal den se duoc an hoan toan.
echo ===================================================
echo.
pause
