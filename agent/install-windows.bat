@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)
if not exist "%ProgramData%\SP-Manager" mkdir "%ProgramData%\SP-Manager" >nul 2>nul
echo SP-Manager Local Agent 1.0.5 > "%ProgramData%\SP-Manager\agent-installed.flag"
start "SP-Manager Local Agent" /min cmd /c "node server.js"
echo.
echo SP-Manager Local Agent is installed/launched.
echo Status endpoint: http://127.0.0.1:18765/status
echo Installed marker: %ProgramData%\SP-Manager\agent-installed.flag
echo.
pause
