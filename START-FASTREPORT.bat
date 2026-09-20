@echo off
setlocal
REM SP-Manager FastReport launcher - no persistent console window.
start "" wscript.exe "%~dp0agent\start-fastreport-hidden.vbs"
exit /b 0
