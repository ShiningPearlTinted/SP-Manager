@echo off
setlocal
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
echo ================================================
echo SP-Manager Local Agent Diagnostic
echo ================================================
echo.
echo [1] Port 18765:
netstat -ano | findstr ":18765 .*LISTENING"
if errorlevel 1 echo [OK] Nothing is listening on port 18765.
echo.
echo [2] Agent status:
"%PS_EXE%" -NoProfile -Command "try{Invoke-RestMethod 'http://127.0.0.1:18765/status' -TimeoutSec 3 | ConvertTo-Json -Compress}catch{Write-Host '[ERROR] Agent status endpoint is not reachable.'}"
echo.
echo [3] Processes:
"%PS_EXE%" -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object {($_.CommandLine -match 'agent\\.ps1') -or ($_.Name -match 'powershell|pwsh') -and ($_.CommandLine -match '18765|SP-Manager')} | Select-Object ProcessId,Name,CommandLine | Format-List"
echo.
pause
