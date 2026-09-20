@echo off
setlocal
cd /d "%~dp0agent"
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS_EXE%" (
 echo Windows PowerShell not found.
 pause
 exit /b 1
)
echo ================================================
echo SP-Manager REAL FASTREPORT - V7
 echo ================================================
echo [1] Stopping old FastReport bridges...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":18767 .*LISTENING"') do taskkill /PID %%P /F >nul 2>nul
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":18766 .*LISTENING"') do taskkill /PID %%P /F >nul 2>nul
ping 127.0.0.1 -n 2 >nul
echo [2] Starting V7 FastReport bridge...
start "SP-Manager FastReport Bridge V7" /min "%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0fastreport-price-tags.ps1"
ping 127.0.0.1 -n 3 >nul
echo [3] Checking V7 bridge...
"%PS_EXE%" -NoProfile -Command "try{$r=Invoke-RestMethod 'http://127.0.0.1:18767/status' -TimeoutSec 5;Write-Host ('READY: '+$r.build+' | '+$r.template);exit 0}catch{Write-Host ('FAILED: '+$_.Exception.Message);exit 1}"
echo.
echo If READY appears, leave this window open and open the web app.
pause
