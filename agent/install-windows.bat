@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
set "AGENT_DIR=%~dp0"
set "LOG_DIR=%ProgramData%\SP-Manager"
set "LOG=%LOG_DIR%\agent.log"
set "ERRLOG=%LOG_DIR%\agent-error.log"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>nul

echo ==================================================
echo SP-Manager Local Agent Installer
 echo Version 1.0.6
 echo ==================================================
echo.

REM --------------------------------------------------
REM 1) Find Node.js even when it is installed but not
REM    present in the current CMD PATH.
REM --------------------------------------------------
set "NODE_EXE="
where node >nul 2>nul
if not errorlevel 1 (
  for /f "delims=" %%N in ('where node') do if not defined NODE_EXE set "NODE_EXE=%%N"
)
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"

REM --------------------------------------------------
REM 2) If Node.js is missing, try installing Node.js LTS
REM    automatically with Windows Package Manager.
REM --------------------------------------------------
if not defined NODE_EXE (
  echo [INFO] Node.js LTS was not detected.
  where winget >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] Windows Package Manager (winget) is not available.
    echo Please install Node.js LTS from the official Node.js website,
    echo then run this installer again.
    start "Node.js LTS" "https://nodejs.org/en/download"
    pause
    exit /b 1
  )
  echo [INFO] Installing Node.js LTS with winget...
  winget install --id OpenJS.NodeJS.LTS --exact --source winget --silent --accept-package-agreements --accept-source-agreements
  if errorlevel 1 (
    echo [ERROR] Node.js LTS installation failed or was cancelled.
    echo Please install Node.js LTS manually, then run this installer again.
    start "Node.js LTS" "https://nodejs.org/en/download"
    pause
    exit /b 1
  )
  REM Refresh common installation locations after winget install.
  if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
  if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"
  if not defined NODE_EXE (
    for /f "delims=" %%N in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
  )
)

if not defined NODE_EXE (
  echo [ERROR] Node.js was installed but node.exe could not be located.
  echo Please restart Windows once, then run this installer again.
  pause
  exit /b 1
)

echo [OK] Node.js found: %NODE_EXE%
"%NODE_EXE%" --version
if errorlevel 1 (
  echo [ERROR] Node.js could not be executed.
  pause
  exit /b 1
)

echo SP-Manager Local Agent 1.0.6 > "%LOG_DIR%\agent-installed.flag"

REM --------------------------------------------------
REM 3) Check whether port 18765 is already serving the
REM    SP-Manager Agent.
REM --------------------------------------------------
set "PORT_IN_USE="
for /f "delims=" %%P in ('powershell -NoProfile -Command "try { (Get-NetTCPConnection -LocalPort 18765 -State Listen -ErrorAction Stop).OwningProcess } catch { }"') do set "PORT_IN_USE=%%P"
if defined PORT_IN_USE (
  powershell -NoProfile -Command "try { $r=Invoke-RestMethod 'http://127.0.0.1:18765/status' -TimeoutSec 3; Write-Host ('[OK] SP-Manager Local Agent is already running. PID: '+$r.pid+' Version: '+$r.version); exit 0 } catch { Write-Host '[ERROR] Port 18765 is already in use by another process.'; exit 2 }"
  if errorlevel 2 goto END
  goto TEST
)

REM --------------------------------------------------
REM 4) Start the Agent.
REM --------------------------------------------------
echo [INFO] Starting SP-Manager Local Agent...
powershell -NoProfile -Command "$p=Start-Process -FilePath '%NODE_EXE%' -ArgumentList 'server.js' -WorkingDirectory '%AGENT_DIR%' -WindowStyle Hidden -RedirectStandardOutput '%LOG%' -RedirectStandardError '%ERRLOG%' -PassThru; Write-Host ('Started PID: '+$p.Id)"

REM --------------------------------------------------
REM 5) Wait up to 15 seconds for the HTTP health endpoint.
REM --------------------------------------------------
set /a ATTEMPTS=0
:WAIT
set /a ATTEMPTS+=1
powershell -NoProfile -Command "try { $r=Invoke-RestMethod 'http://127.0.0.1:18765/status' -TimeoutSec 2; Write-Host ('[OK] Agent connected. Version: '+$r.version+' PID: '+$r.pid); exit 0 } catch { exit 1 }"
if not errorlevel 1 goto TEST
if !ATTEMPTS! GEQ 15 (
  echo [ERROR] Agent did not respond on port 18765.
  echo Check the logs:
  echo   %LOG%
  echo   %ERRLOG%
  goto END
)
timeout /t 1 /nobreak >nul
goto WAIT

:TEST
powershell -NoProfile -Command "try { $r=Invoke-RestMethod 'http://127.0.0.1:18765/status' -TimeoutSec 3; Write-Host ''; Write-Host '=================================================='; Write-Host 'SP-Manager Local Agent is READY.'; Write-Host '=================================================='; Write-Host ('URL: http://127.0.0.1:18765/status'); Write-Host ('Version: '+$r.version); Write-Host ('PID: '+$r.pid); Write-Host ''; exit 0 } catch { Write-Host '[ERROR] Agent is not responding.'; Write-Host 'Check:'; Write-Host ('  '+$LOG); Write-Host ('  '+$ERRLOG); exit 1 }"

:END
echo.
echo You can now open SP-Manager and press Refresh in Settings - Hardware.
echo.
pause
