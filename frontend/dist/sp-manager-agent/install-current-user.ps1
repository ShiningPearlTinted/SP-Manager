$ErrorActionPreference='Stop'
try {
  $source=Split-Path -Parent $MyInvocation.MyCommand.Path
  $target=Join-Path $env:LOCALAPPDATA 'SP-Manager\LocalAgent'
  $PowerShell=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  New-Item -ItemType Directory -Path $target -Force | Out-Null
  if([IO.Path]::GetFullPath($source) -ne [IO.Path]::GetFullPath($target)){
    Get-ChildItem -LiteralPath $source -File | ForEach-Object {Copy-Item -LiteralPath $_.FullName -Destination $target -Force}
  }
  try {Stop-ScheduledTask -TaskName 'SP-Manager Local Agent Watchdog' -ErrorAction Stop} catch {}
  $knownDirs=@($source,$target,(Join-Path $env:LOCALAPPDATA 'SP-Manager\agent'))
  foreach($proc in Get-CimInstance Win32_Process){
    if($proc.ProcessId -eq $PID -or $proc.Name -notin @('powershell.exe','pwsh.exe')){continue}
    $owned=$false
    foreach($dir in $knownDirs){foreach($name in @('agent.ps1','watchdog.ps1')){
      if($proc.CommandLine -and $proc.CommandLine.Contains((Join-Path $dir $name))){$owned=$true}
    }}
    if($owned){Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue}
  }
  $AgentDir=$target
  . (Join-Path $target 'autostart.ps1')
  Install-AutoStart | Out-Null
  $watchdog=Join-Path $target 'watchdog.ps1'
  Start-Process -FilePath $PowerShell -ArgumentList ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "'+$watchdog+'"') -WindowStyle Hidden | Out-Null
  $ready=$false
  for($i=0;$i -lt 20;$i++){
    try {
      $token=(Get-Content -LiteralPath (Join-Path $env:LOCALAPPDATA 'SP-Manager\agent-pairing-token.txt') -Raw -ErrorAction Stop).Trim()
      $result=Invoke-RestMethod 'http://127.0.0.1:18765/status' -TimeoutSec 2 -Headers @{Authorization=('Bearer '+$token)}
      if($result.connected -and $result.agentDetected -and $result.autoStartInstalled){$ready=$true;break}
    } catch {}
    Start-Sleep -Seconds 1
  }
  if(-not $ready){throw 'Agent is not responding yet. Send the installer message and agent-watchdog.log to support. Windows policy may block PowerShell, or an old agent may still use port 18765.'}
  Write-Host ('[OK] Local Agent ready. Version: '+$result.version) -ForegroundColor Green
  Write-Host '[OK] Auto-start installed for THIS Windows user. Administrator is not required.'
  Write-Host ('Pairing token file: '+(Join-Path $env:LOCALAPPDATA 'SP-Manager\agent-pairing-token.txt'))
  exit 0
} catch {
  Write-Host ('[ERROR] '+$_.Exception.Message) -ForegroundColor Red
  Write-Host ('Log: '+(Join-Path $env:LOCALAPPDATA 'SP-Manager\agent-watchdog.log'))
  exit 1
}
