@echo off
setlocal EnableExtensions
set "BASE_URL=https://shiningpearltinted.github.io/SP-Manager/sp-manager-agent"
set "INSTALL_DIR=%LOCALAPPDATA%\SP-Manager\agent"
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "TASK_NAME=SP-Manager Local Agent Watchdog"
if not exist "%PS_EXE%" echo [ERROR] Windows PowerShell was not found.&pause&exit /b 1
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%" >nul 2>nul

echo ==================================================
echo SP-Manager Local Agent Installer / Restart V1.1.19
echo ==================================================
echo.

echo [1/4] Downloading Local Agent files...
"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $base='%BASE_URL%'; $dir='%INSTALL_DIR%'; foreach($f in @('agent.ps1','watchdog.ps1')){Invoke-WebRequest -UseBasicParsing -Uri ($base+'/'+$f) -OutFile (Join-Path $dir $f)}"
if errorlevel 1 echo [ERROR] Could not download Local Agent files.&pause&exit /b 1

echo [2/4] Registering Auto-start + Auto-restart...
"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $task='SP-Manager Local Agent Watchdog'; $ps='%PS_EXE%'; $wd=Join-Path '%INSTALL_DIR%' 'watchdog.ps1'; $a=New-ScheduledTaskAction -Execute $ps -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File ' + [char]34 + $wd + [char]34); $u=[System.Security.Principal.WindowsIdentity]::GetCurrent().Name; $t=New-ScheduledTaskTrigger -AtLogOn -User $u; $p=New-ScheduledTaskPrincipal -UserId $u -LogonType Interactive -RunLevel Limited; $s=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1); Unregister-ScheduledTask -TaskName $task -Confirm:$false -ErrorAction SilentlyContinue; Register-ScheduledTask -TaskName $task -Action $a -Trigger $t -Principal $p -Settings $s -Description 'SP-Manager Local Agent watchdog' -Force | Out-Null; if(-not (Get-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue)){throw 'Task registration verification failed'}"
if errorlevel 1 (
  echo [WARNING] Windows Scheduled Task API registration failed. Trying schtasks fallback...
  set "FALLBACK_DIR=%ProgramData%\SP-Manager"
  if not exist "%FALLBACK_DIR%" mkdir "%FALLBACK_DIR%" >nul 2>nul
  >"%FALLBACK_DIR%\run-watchdog.bat" echo @echo off
  >>"%FALLBACK_DIR%\run-watchdog.bat" echo "%PS_EXE%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "%INSTALL_DIR%\watchdog.ps1"
  schtasks.exe /Delete /TN "%TASK_NAME%" /F >nul 2>nul
  schtasks.exe /Create /TN "%TASK_NAME%" /SC ONLOGON /TR "%FALLBACK_DIR%\run-watchdog.bat" /RU "%USERDOMAIN%\%USERNAME%" /RL LIMITED /F >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] Could not register the Windows watchdog task.
    echo Please run this installer as Administrator once.
    echo.
    pause
    exit /b 1
  )
)
echo [OK] Auto-start watchdog task registered.
echo [OK] Auto-start watchdog task registered.

echo [3/4] Starting Local Agent...
start "SP-Manager Local Agent" /min "%PS_EXE%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "%INSTALL_DIR%\agent.ps1"

echo [4/4] Waiting for Agent...
set /a TRY=0
:WAIT
set /a TRY+=1
"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "try{$r=Invoke-RestMethod 'http://127.0.0.1:18765/status' -TimeoutSec 2;Write-Host ('[OK] Agent connected. Version: '+$r.version);exit 0}catch{exit 1}"
if not errorlevel 1 goto READY
if %TRY% GEQ 20 goto DONE
timeout /t 1 /nobreak >nul
goto WAIT
:READY
echo.
echo [OK] SP-Manager Local Agent is READY.
:DONE
echo.
echo ==================================================
echo Auto-start + Auto-restart is ENABLED.
echo ==================================================
echo You do NOT need to run this installer every time you open SP-Manager.
echo.
pause
exit /b 0
