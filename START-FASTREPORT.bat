@echo off
setlocal
cd /d "%~dp0"
start "" wscript.exe "%~dp0agent\start-fastreport-hidden.vbs"
exit /b 0
