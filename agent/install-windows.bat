@echo off
setlocal
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-current-user.ps1"
set "RESULT=%ERRORLEVEL%"
pause
exit /b %RESULT%
