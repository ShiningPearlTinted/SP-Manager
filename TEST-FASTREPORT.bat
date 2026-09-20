@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo ==================================================
echo SP-Manager REAL FASTREPORT TEST
echo ==================================================
echo.
"%SystemRoot%\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0agent\test-fastreport.ps1"
echo.
pause
