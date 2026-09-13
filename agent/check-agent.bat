@echo off
setlocal
powershell -NoProfile -Command "try{$r=Invoke-RestMethod 'http://127.0.0.1:18765/status' -TimeoutSec 3;Write-Host '';Write-Host '=== SP-Manager Local Agent ===';Write-Host 'Status : CONNECTED';Write-Host ('Version: '+$r.version);Write-Host ('PID    : '+$r.pid);Write-Host ('Uptime : '+$r.uptimeSeconds+' seconds');Write-Host ('URL    : http://127.0.0.1:18765/status')}catch{Write-Host '';Write-Host '=== SP-Manager Local Agent ===';Write-Host 'Status : NOT DETECTED';Write-Host $_.Exception.Message;exit 1}"
echo.
pause
