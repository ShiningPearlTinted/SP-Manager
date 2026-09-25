@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title SP-Manager Local Agent - Restart
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "AGENT_PS=%~dp0agent\agent.ps1"
set "LOG_DIR=%ProgramData%\SP-Manager"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>nul

echo ==================================================
echo SP-Manager Local Agent - RESTART
 echo ==================================================
echo.

if not exist "%AGENT_PS%" (
  echo [ERROR] agent\agent.ps1 not found.
  pause
  exit /b 1
)

echo [1/4] Stopping existing SP-Manager Agent processes...
"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -Command ^
 "$ps=Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and ($_.CommandLine -match 'agent\\agent\.ps1' -or $_.CommandLine -match 'SP-Manager Local Agent' -or $_.CommandLine -match 'agent[\/]server\.js') -and $_.ProcessId -ne $PID }; foreach($p in $ps){ try{Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop; Write-Host ('Stopped PID '+$p.ProcessId+' '+$p.Name)}catch{Write-Host ('Could not stop PID '+$p.ProcessId+': '+$_.Exception.Message)} }"

timeout /t 2 /nobreak >nul

echo [2/4] Checking port 18765...
"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -Command ^
 "$c=Get-NetTCPConnection -LocalPort 18765 -State Listen -ErrorAction SilentlyContinue; if($c){$c|Format-Table LocalAddress,LocalPort,State,OwningProcess -AutoSize; Write-Host '[WARNING] Port 18765 is still occupied.'}else{Write-Host '[OK] Port 18765 is free.'}"

echo [3/4] Starting Agent v1.1.6 from this folder...
start "SP-Manager Local Agent" /min "%PS_EXE%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "%AGENT_PS%" > "%LOG_DIR%\agent-console.log" 2>&1

echo [4/4] Waiting for Agent...
set /a TRY=0
:WAIT
set /a TRY+=1
"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -Command ^
 "try{$r=Invoke-RestMethod 'http://127.0.0.1:18765/status' -TimeoutSec 2;Write-Host ('[OK] Agent connected. Version: '+$r.version);exit 0}catch{exit 1}"
if not errorlevel 1 goto TEST
if %TRY% GEQ 15 goto FAIL
timeout /t 1 /nobreak >nul
goto WAIT

:TEST
echo.
echo Testing Customer Display routes...
"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -Command ^
 "try{$r=Invoke-WebRequest 'http://127.0.0.1:18765/customer-display' -UseBasicParsing -TimeoutSec 3;if($r.StatusCode -eq 200){Write-Host '[OK] /customer-display is available.'}else{Write-Host ('[WARNING] /customer-display returned '+$r.StatusCode)}}catch{Write-Host ('[ERROR] /customer-display failed: '+$_.Exception.Message)}"
echo.
echo ==================================================
echo Local Agent restart completed.
echo ==================================================
echo.
pause
exit /b 0

:FAIL
echo.
echo [ERROR] Agent did not start on port 18765.
echo Log: %LOG_DIR%\agent-console.log
echo.
pause
exit /b 1
