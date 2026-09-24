@echo off
setlocal
cd /d "%~dp0"
set "AGENT_DIR=%~dp0"
set "LOG_DIR=%ProgramData%\SP-Manager"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>nul
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
echo ==================================================
echo SP-Manager Local Agent Installer v1.1.7
echo ==================================================
echo.
if not exist "%PS_EXE%" (
 echo [ERROR] Windows PowerShell was not found.
 pause
 exit /b 1
)
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":18765 .*LISTENING"') do set "PID_IN_USE=%%P"
if defined PID_IN_USE (
 echo [INFO] Port 18765 is currently in use by PID %PID_IN_USE%.
 "%PS_EXE%" -NoProfile -Command "$p=Get-CimInstance Win32_Process -Filter 'ProcessId=%PID_IN_USE%'; if($p){Write-Host ('[INFO] Process: '+$p.Name); Write-Host ('[INFO] Command: '+$p.CommandLine)}"
 "%PS_EXE%" -NoProfile -Command "try{$r=Invoke-RestMethod 'http://127.0.0.1:18765/status' -TimeoutSec 3;Write-Host ('[OK] Agent already running. Version: '+$r.version);exit 0}catch{exit 1}"
 if not errorlevel 1 goto READY
 "%PS_EXE%" -NoProfile -Command "$p=Get-CimInstance Win32_Process -Filter 'ProcessId=%PID_IN_USE%'; if($p -and (($p.CommandLine -match 'agent\\.ps1') -or ($p.CommandLine -match 'SP-Manager.*Agent'))){Write-Host '[INFO] Stale SP-Manager Agent process detected. Stopping it...'; Stop-Process -Id %PID_IN_USE% -Force; exit 0}else{Write-Host '[ERROR] Port 18765 is in use by another program.'; exit 2}"
 if errorlevel 2 goto END
 timeout /t 1 /nobreak >nul
 set "PID_IN_USE="
)
echo [INFO] Starting SP-Manager Local Agent without Node.js...
start "SP-Manager Local Agent" /min "%PS_EXE%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "%AGENT_DIR%agent.ps1" > "%LOG_DIR%\agent-console.log" 2>&1
set /a TRY=0
:WAIT
set /a TRY+=1
"%PS_EXE%" -NoProfile -Command "try{$r=Invoke-RestMethod 'http://127.0.0.1:18765/status' -TimeoutSec 2;Write-Host ('[OK] Agent connected. Version: '+$r.version);exit 0}catch{exit 1}"
if not errorlevel 1 goto READY
if %TRY% GEQ 15 (
 echo [ERROR] Agent did not start on port 18765.
 echo Log: %LOG_DIR%\agent-console.log
 goto END
)
timeout /t 1 /nobreak >nul
goto WAIT
:READY
 timeout /t 2 /nobreak >nul
)
echo SP-Manager Local Agent 1.1.7 > "%LOG_DIR%\agent-installed.flag"
echo.
echo ==================================================
echo SP-Manager Local Agent is READY.
echo ==================================================
echo URL: http://127.0.0.1:18765/status
echo.
echo Node.js is NOT required for this Local Agent.
echo.
:END
pause
