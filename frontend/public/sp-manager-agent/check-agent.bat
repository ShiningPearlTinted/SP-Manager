@echo off
setlocal
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
echo SP-Manager Local Agent status
"%PS_EXE%" -NoProfile -Command "try{$r=Invoke-RestMethod 'http://127.0.0.1:18765/status' -TimeoutSec 3; Write-Host ('[ONLINE] '+$r.agent+' v'+$r.version+' PID '+$r.pid); Write-Host ('Uptime: '+$r.uptimeSeconds+' seconds')}catch{Write-Host '[OFFLINE] Local Agent is not responding.'; exit 1}"
echo.
schtasks /Query /TN "SP-Manager Local Agent Watchdog" /FO LIST 2>nul | findstr /I "TaskName Status" || echo Watchdog task is not registered.
echo.
pause
