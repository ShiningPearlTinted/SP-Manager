@echo off
setlocal
start "" wscript.exe "%~dp0agent\start-fastreport-hidden.vbs"
exit /b 0
