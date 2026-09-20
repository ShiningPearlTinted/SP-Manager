@echo off
cd /d "%~dp0"
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":18767 .*LISTENING"') do taskkill /PID %%P /F >nul 2>nul
start "SP-Manager FastReport Bridge V9" /min "%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0fastreport-price-tags.ps1"
ping 127.0.0.1 -n 3 >nul
"%PS_EXE%" -NoProfile -Command "try{$r=Invoke-RestMethod 'http://127.0.0.1:18767/status' -TimeoutSec 5;Write-Host ('READY: '+$r.build);exit 0}catch{Write-Host ('FAILED: '+$_.Exception.Message);exit 1}"
pause
