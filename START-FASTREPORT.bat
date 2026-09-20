@echo off
setlocal
REM SP-Manager FastReport launcher - background only.
REM LOCK: no frontend, Price Tags, barcode, or other functions are changed here.
start "" wscript.exe "%~dp0agent\start-fastreport-hidden.vbs"
exit /b 0
