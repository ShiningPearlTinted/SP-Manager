@echo off
setlocal EnableExtensions
cd /d "%~dp0agent"
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"

echo ================================================
echo SP-Manager REAL FASTREPORT - V11
echo ================================================
echo [1] Unblocking SP-Manager FastReport files...
"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -LiteralPath '%~dp0agent' -Recurse -File ^| Where-Object { $_.Extension -in '.dll','.ps1','.frx','.bat' } ^| Unblock-File -ErrorAction SilentlyContinue"

echo [2] Stopping old FastReport bridges...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":18767 .*LISTENING"') do taskkill /PID %%P /F >nul 2>nul
ping 127.0.0.1 -n 2 >nul

echo [3] Starting FastReport bridge...
start "SP-Manager FastReport Bridge V11" /min "%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0agent\fastreport-price-tags.ps1" > "%~dp0agent\fastreport-startup.log" 2>&1

set "READY="
for /l %%N in (1,1,12) do (
  ping 127.0.0.1 -n 2 >nul
  "%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "try{$r=Invoke-RestMethod 'http://127.0.0.1:18767/status' -TimeoutSec 2;Write-Host ('READY: '+$r.build+' | '+$r.template);exit 0}catch{exit 1}"
  if not errorlevel 1 set "READY=1"&goto :ready
)

echo.
echo FAILED: FastReport bridge did not start.
echo.
echo -------- fastreport-startup.log --------
if exist "%~dp0agent\fastreport-startup.log" type "%~dp0agent\fastreport-startup.log"
echo ------------------------------------------
echo.
echo Keep this window open and send me the error above if it still fails.
pause
exit /b 1

:ready
echo.
echo READY: FastReport .NET bridge is running on http://127.0.0.1:18767
 echo Leave this window open and open the SP-Manager web app.
pause
