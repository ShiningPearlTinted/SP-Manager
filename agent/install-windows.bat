@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "AGENT_DIR=%~dp0"
set "LOG_DIR=%ProgramData%\SP-Manager"
set "TASK_NAME=SP-Manager Local Agent Watchdog"
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>nul

echo ==================================================
echo SP-Manager Local Agent Installer v1.1.10
echo ==================================================
echo.
if not exist "%PS_EXE%" (
 echo [ERROR] Windows PowerShell was not found.
 pause
 exit /b 1
)
if not exist "%AGENT_DIR%agent.ps1" (
 echo [ERROR] agent.ps1 was not found.
 pause
 exit /b 1
)
if not exist "%AGENT_DIR%watchdog.ps1" (
 echo [ERROR] watchdog.ps1 was not found.
 pause
 exit /b 1
)

rem Stop any old agent currently using port 18765, but do not touch unrelated programs.
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":18765 .*LISTENING"') do set "PID_IN_USE=%%P"
if defined PID_IN_USE (
 "%PS_EXE%" -NoProfile -Command "$p=Get-CimInstance Win32_Process -Filter 'ProcessId=%PID_IN_USE%'; if($p -and (($p.CommandLine -match 'agent\\.ps1') -or ($p.CommandLine -match 'SP-Manager.*Agent'))){Stop-Process -Id %PID_IN_USE% -Force}"
 timeout /t 1 /nobreak >nul
 set "PID_IN_USE="
)

rem Register a per-user logon watchdog. It runs in the interactive Windows session so
rem Customer Display / secondary monitor functions continue to work.
"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $task='%TASK_NAME%'; $ps='%PS_EXE%'; $wd='%AGENT_DIR%watchdog.ps1'; $a=New-ScheduledTaskAction -Execute $ps -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File ' + [char]34 + $wd + [char]34); $u=[System.Security.Principal.WindowsIdentity]::GetCurrent().Name; $tr=New-ScheduledTaskTrigger -AtLogOn -User $u; $pr=New-ScheduledTaskPrincipal -UserId $u -LogonType Interactive -RunLevel Limited; $st=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1); Unregister-ScheduledTask -TaskName $task -Confirm:$false -ErrorAction SilentlyContinue; Register-ScheduledTask -TaskName $task -Action $a -Trigger $tr -Principal $pr -Settings $st -Description 'SP-Manager Local Agent watchdog' -Force | Out-Null; if(-not (Get-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue)){throw 'Task registration verification failed'}"
if errorlevel 1 (
 echo [WARNING] Windows Scheduled Task API registration failed. Trying schtasks fallback...
 set "FALLBACK_DIR=%ProgramData%\SP-Manager"
 if not exist "%FALLBACK_DIR%" mkdir "%FALLBACK_DIR%" >nul 2>nul
 >"%FALLBACK_DIR%\run-watchdog.bat" echo @echo off
 >>"%FALLBACK_DIR%\run-watchdog.bat" echo "%PS_EXE%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "%AGENT_DIR%watchdog.ps1"
 schtasks.exe /Delete /TN "%TASK_NAME%" /F >nul 2>nul
 schtasks.exe /Create /TN "%TASK_NAME%" /SC ONLOGON /TR "%FALLBACK_DIR%\run-watchdog.bat" /RU "%USERDOMAIN%\%USERNAME%" /RL LIMITED /F >nul 2>nul
 if errorlevel 1 (
  echo [ERROR] Could not create the Windows auto-start watchdog task.
  echo Please run this installer as Administrator once.
  echo.
  pause
  exit /b 1
 )
)
echo [OK] Auto-start watchdog task registered.
echo [OK] Auto-start watchdog task registered for user %USERNAME%.

echo [OK] The watchdog will restart Local Agent automatically if it stops.

rem Start the watchdog immediately for this session.
schtasks /Run /TN "%TASK_NAME%" >nul 2>nul

set /a TRY=0
:WAIT
set /a TRY+=1
"%PS_EXE%" -NoProfile -Command "try{$r=Invoke-RestMethod 'http://127.0.0.1:18765/status' -TimeoutSec 2;Write-Host ('[OK] Agent connected. Version: '+$r.version);exit 0}catch{exit 1}"
if not errorlevel 1 goto READY
if %TRY% GEQ 20 (
 echo [WARNING] Watchdog was registered, but the Agent is not online yet.
 echo It will continue trying automatically in the background.
 goto DONE
)
timeout /t 1 /nobreak >nul
goto WAIT

:READY
echo [OK] SP-Manager Local Agent 1.1.8 is READY.

:DONE
"%PS_EXE%" -NoProfile -Command "'SP-Manager Local Agent 1.1.10' | Set-Content -LiteralPath '%LOG_DIR%\agent-installed.flag' -Encoding UTF8"
echo.
echo ==================================================
echo Auto-start + Auto-restart is ENABLED.
echo ==================================================
echo You do NOT need to run this installer every time you open SP-Manager.
echo.
echo To manually verify: check-agent.bat
pause
