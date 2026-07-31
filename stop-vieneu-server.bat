@echo off
REM ===========================================================================
REM  Dung VieNeu-TTS Server (ke ca khi no dang chay AN, khong co cua so de dong)
REM
REM  Loc theo CommandLine chua "vieneu_server.py" thay vi giet moi python.exe —
REM  may co the dang chay python cho viec khac (Jupyter, script rieng...), giet
REM  bua het la dung nham tien trinh khong lien quan.
REM ===========================================================================
title ATPOSTER - DUNG VIENEU TTS SERVER

echo Dang tim tien trinh VieNeu-TTS Server...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p = Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | Where-Object { $_.CommandLine -like '*vieneu_server.py*' };" ^
  "if (-not $p) { Write-Host 'Khong co tien trinh nao dang chay.'; exit 0 };" ^
  "foreach ($x in $p) { Stop-Process -Id $x.ProcessId -Force; Write-Host ('Da dung PID ' + $x.ProcessId) }"

echo.
echo Xong.
REM Goi bang duong dan tuyet doi: neu may co cai Git for Windows, lenh "timeout"
REM tran co the tro nham sang timeout cua Unix (cu phap khac han, se bao loi).
"%SystemRoot%\System32\timeout.exe" /t 3 /nobreak >nul 2>&1
