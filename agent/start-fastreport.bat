@echo off
setlocal
cd /d "%~dp0"
start "" wscript.exe "%~dp0start-fastreport-hidden.vbs"
exit /b 0
