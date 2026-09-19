@echo off
setlocal
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
echo ================================================
echo SP-Manager FastReport Diagnostic
 echo ================================================
echo.
"%PS_EXE%" -NoProfile -Command "Write-Host '--- Local Agent 18765 ---'; try{$r=Invoke-RestMethod 'http://127.0.0.1:18765/status' -TimeoutSec 3; $r|Format-List}catch{Write-Host ('ERROR: '+$_.Exception.Message)}; Write-Host '--- FastReport 18766 ---'; try{$r=Invoke-RestMethod 'http://127.0.0.1:18766/status' -TimeoutSec 3; $r|Format-List}catch{Write-Host ('ERROR: '+$_.Exception.Message)}; Write-Host '--- Processes ---'; Get-Process powershell -ErrorAction SilentlyContinue | Select-Object Id,Path | Format-Table -AutoSize"
echo.
echo FastReport log: %ProgramData%\SP-Manager\fastreport-console.log
echo Agent log: %ProgramData%\SP-Manager\agent-console.log
echo.
pause
