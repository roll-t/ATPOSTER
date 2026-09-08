@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%..\"
set "TARGET_BAT=%SCRIPT_DIR%ATPOSTER-Desktop.bat"
set "ICON_FILE=%ROOT_DIR%public\icons\shortcut_logo.ico"
set "DESKTOP_DIR=%USERPROFILE%\Desktop"
set "SHORTCUT_PATH=%DESKTOP_DIR%\ATPOSTER Video Studio.lnk"

echo [ATPOSTER] Dang tao shortcut ngoai man hinh Desktop...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$s = $ws.CreateShortcut('%SHORTCUT_PATH%'); " ^
  "$s.TargetPath = '%TARGET_BAT%'; " ^
  "$s.WorkingDirectory = '%ROOT_DIR%'; " ^
  "$s.IconLocation = '%ICON_FILE%'; " ^
  "$s.Description = 'Khoi chay ATPOSTER Video Studio Desktop App'; " ^
  "$s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [ATPOSTER] Da tao thanh cong shortcut tai Desktop: "%SHORTCUT_PATH%"
) else (
    echo [ATPOSTER] Khong the tao shortcut, vui long chay truc tiep ATPOSTER-Desktop.bat
)
