@echo off
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -Command "try{$t=(Get-Content -LiteralPath (Join-Path $env:LOCALAPPDATA 'SP-Manager\agent-pairing-token.txt') -Raw).Trim(); Invoke-RestMethod 'http://127.0.0.1:18765/status' -Headers @{Authorization=('Bearer '+$t)} | Format-List}catch{Write-Host $_.Exception.Message}"
pause
