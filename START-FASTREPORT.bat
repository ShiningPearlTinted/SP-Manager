@echo off
setlocal
cd /d "%~dp0"
set "PS=%SystemRoot%\SysWOW64\WindowsPowerShell\v1.0\powershell.exe"
set "SCRIPT=%~dp0agent\fastreport-price-tags.ps1"
start "" "%PS%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "%SCRIPT%"
exit /b 0
