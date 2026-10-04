$ErrorActionPreference = 'SilentlyContinue'
$AgentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentScript = Join-Path $AgentDir 'agent.ps1'
$PowerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$Port = 18765
$StatusUrl = "http://127.0.0.1:$Port/status"
$LogDir = Join-Path $env:LOCALAPPDATA 'SP-Manager'
$LogFile = Join-Path $LogDir 'agent-watchdog.log'

if(-not (Test-Path $LogDir)){ New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

function Log($Message){
  try { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message" | Add-Content -LiteralPath $LogFile -Encoding UTF8 } catch {}
}

function Test-Agent {
  try {
    $tokenPath=Join-Path $env:LOCALAPPDATA 'SP-Manager\agent-pairing-token.txt';$token=Get-Content -LiteralPath $tokenPath -Raw -ErrorAction Stop
    $r = Invoke-RestMethod -Uri $StatusUrl -Method Get -TimeoutSec 3 -Headers @{Authorization=('Bearer '+$token.Trim())}
    return ($r.connected -eq $true -and $r.agentDetected -eq $true -and [version]$r.version -ge [version]'1.2.0')
  } catch { return $false }
}

function Stop-StaleAgent {
  try {
    $procs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and ($_.CommandLine -match [regex]::Escape($AgentScript)) }
    foreach($proc in $procs){
      try { Stop-Process -Id ([int]$proc.ProcessId) -Force -ErrorAction SilentlyContinue; Log "Stopped stale Local Agent PID $($proc.ProcessId)." } catch {}
    }
  } catch {}
}

function Start-Agent {
  if(-not (Test-Path $AgentScript)){
    Log "ERROR: agent.ps1 not found at $AgentScript"
    return
  }
  try {
    $p = Start-Process -FilePath $PowerShell -ArgumentList @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',$AgentScript) -WindowStyle Hidden -PassThru
    Log "Started Local Agent PID $($p.Id)"
  } catch {
    Log "ERROR: failed to start Local Agent: $($_.Exception.Message)"
  }
}

Log "Watchdog started. Agent path: $AgentScript"
while($true){
  if(-not (Test-Agent)){
    Log 'Local Agent is not responding; restarting it.'
    Stop-StaleAgent
    Start-Sleep -Milliseconds 500
    Start-Agent
    for($i=0;$i -lt 10;$i++){
      Start-Sleep -Seconds 1
      if(Test-Agent){ Log 'Local Agent is online.'; break }
    }
  }
  Start-Sleep -Seconds 10
}
