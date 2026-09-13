@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "AGENT_DIR=%~dp0"
set "LOG_DIR=%ProgramData%\SP-Manager"
set "LOG=%LOG_DIR%\agent.log"
set "ERRLOG=%LOG_DIR%\agent-error.log"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>nul
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js LTS is not installed or is not in PATH.
  echo Install Node.js LTS, restart Windows, then run this file again.
  pause
  exit /b 1
)
for /f "delims=" %%N in ('where node') do if not defined NODE_EXE set "NODE_EXE=%%N"
echo SP-Manager Local Agent 1.0.6 > "%LOG_DIR%\agent-installed.flag"
set "PORT_IN_USE="
for /f "delims=" %%P in ('powershell -NoProfile -Command "try { (Get-NetTCPConnection -LocalPort 18765 -State Listen -ErrorAction Stop).OwningProcess } catch { }"') do set "PORT_IN_USE=%%P"
if defined PORT_IN_USE (
  powershell -NoProfile -Command "try { $r=Invoke-RestMethod 'http://127.0.0.1:18765/status' -TimeoutSec 3; Write-Host ('[OK] SP-Manager Local Agent is already running. PID: '+$r.pid+' Version: '+$r.version) } catch { Write-Host '[ERROR] Port 18765 is already in use by another process.'; exit 2 }"
  if errorlevel 2 goto END
  goto TEST
)
echo Starting SP-Manager Local Agent...
powershell -NoProfile -Command "$p=Start-Process -FilePath '%NODE_EXE%' -ArgumentList 'server.js' -WorkingDirectory '%AGENT_DIR%' -WindowStyle Hidden -RedirectStandardOutput '%LOG%' -RedirectStandardError '%ERRLOG%' -PassThru; Write-Host ('Started PID: '+$p.Id)"
:WAIT
powershell -NoProfile -Command "try { $r=Invoke-RestMethod 'http://127.0.0.1:18765/status' -TimeoutSec 2; Write-Host ('[OK] Agent connected. Version: '+$r.version+' PID: '+$r.pid); exit 0 } catch { exit 1 }"
if errorlevel 1 (
  timeout /t 1 /nobreak >nul
  goto WAIT
)
:TEST
powershell -NoProfile -Command "try { $r=Invoke-RestMethod 'http://127.0.0.1:18765/status' -TimeoutSec 3; Write-Host ''; Write-Host 'SP-Manager Local Agent is READY.'; Write-Host ('URL: http://127.0.0.1:18765/status'); Write-Host ('Version: '+$r.version); Write-Host ('PID: '+$r.pid) } catch { Write-Host '[ERROR] Agent is not responding.'; Write-Host 'Check:'; Write-Host ('  '+$LOG); Write-Host ('  '+$ERRLOG); exit 1 }"
:END
echo.
echo You can now open SP-Manager and press Refresh in Settings - Hardware.
pause
