@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
echo SP-Manager FastReport Bridge V12
echo [1] Unblocking files...
"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -LiteralPath '%~dp0' -Recurse -File ^| Where-Object { $_.Extension -in '.dll','.ps1','.frx' } ^| Unblock-File -ErrorAction SilentlyContinue"
echo [2] Stopping old bridge...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":18767 .*LISTENING"') do taskkill /PID %%P /F >nul 2>nul
ping 127.0.0.1 -n 2 >nul
echo [3] Starting bridge...
start "SP-Manager FastReport Bridge V12" /min "%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0fastreport-price-tags.ps1" > "%~dp0fastreport-startup.log" 2>&1
for /l %%N in (1,1,12) do (
 ping 127.0.0.1 -n 2 >nul
 "%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "try{$r=Invoke-RestMethod 'http://127.0.0.1:18767/status' -TimeoutSec 2;Write-Host ('READY: '+$r.build);exit 0}catch{exit 1}"
 if not errorlevel 1 goto ready
)
echo FAILED. See fastreport-startup.log
type "%~dp0fastreport-startup.log"
pause
exit /b 1
:ready
echo READY: FastReport bridge on 18767
pause
