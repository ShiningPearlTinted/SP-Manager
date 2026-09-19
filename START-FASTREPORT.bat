@echo off
setlocal
cd /d "%~dp0agent"
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS_EXE%" (
 echo Windows PowerShell not found.
 pause
 exit /b 1
)
start "SP-Manager FastReport Bridge" /min "%PS_EXE%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0fastreport-price-tags.ps1" > "%ProgramData%\SP-Manager\fastreport-console.log" 2>&1
ping 127.0.0.1 -n 3 >nul
"%PS_EXE%" -NoProfile -Command "try{$r=Invoke-RestMethod 'http://127.0.0.1:18766/status' -TimeoutSec 3;Write-Host ('FastReport Bridge READY: '+$r.template);exit 0}catch{Write-Host 'FastReport Bridge failed. Check %ProgramData%\SP-Manager\fastreport-console.log';exit 1}"
pause
