@echo off
setlocal
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS_EXE%" (
 echo Windows PowerShell was not found.
 pause
 exit /b 1
)
cd /d "%~dp0agent"
if not exist "%ProgramData%\SP-Manager" mkdir "%ProgramData%\SP-Manager" >nul 2>nul
echo ================================================
echo Restarting SP-Manager Local Agent + FastReport
echo ================================================
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":18765 .*LISTENING"') do taskkill /PID %%P /F >nul 2>nul
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":18766 .*LISTENING"') do taskkill /PID %%P /F >nul 2>nul
timeout /t 1 /nobreak >nul
start "SP-Manager Local Agent" /min "%PS_EXE%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0agent\agent.ps1" > "%ProgramData%\SP-Manager\agent-console.log" 2>&1
set /a TRY=0
:WAIT
set /a TRY+=1
"%PS_EXE%" -NoProfile -Command "try{$r=Invoke-RestMethod 'http://127.0.0.1:18765/status' -TimeoutSec 2;Write-Host ('Agent READY '+$r.version);if($r.fastReport){Write-Host 'FastReport READY';exit 0}else{Write-Host 'Waiting for FastReport...';exit 2}}catch{exit 1}"
if not errorlevel 2 goto CHECK
if %TRY% GEQ 20 goto CHECK
 timeout /t 1 /nobreak >nul
goto WAIT
:CHECK
"%PS_EXE%" -NoProfile -Command "try{$r=Invoke-RestMethod 'http://127.0.0.1:18765/fastreport/status' -TimeoutSec 3;Write-Host ('FastReport READY: '+$r.template);exit 0}catch{Write-Host ('FastReport ERROR: '+$_.Exception.Message);exit 1}"
if errorlevel 1 (
 echo.
 echo Check: %ProgramData%\SP-Manager\fastreport-console.log
 echo.
 pause
 exit /b 1
)
echo.
echo ALL READY. Close this window and reload SP-Manager Price Tags.
pause
