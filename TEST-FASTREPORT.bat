@echo off
setlocal
cd /d "%~dp0"
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
echo ==================================================
echo SP-Manager REAL FASTREPORT TEST
 echo ==================================================
echo.
"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0agent\test-fastreport.ps1"
echo.
pause
