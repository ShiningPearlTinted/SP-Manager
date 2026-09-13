@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)
start "SP-Manager Local Agent" /min cmd /c "node server.js"
echo SP-Manager Local Agent started on http://127.0.0.1:18765
pause
