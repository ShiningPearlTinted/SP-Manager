@echo off
setlocal
cd /d "%~dp0"
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
start "SP-Manager FastReport Bridge" /min "%PS_EXE%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0fastreport-price-tags.ps1" > "%ProgramData%\SP-Manager\fastreport-console.log" 2>&1
