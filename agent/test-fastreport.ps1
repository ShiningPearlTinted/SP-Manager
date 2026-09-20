$ErrorActionPreference='Continue'
$root=$PSScriptRoot
$ps=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$bridge=Join-Path $root 'fastreport-price-tags.ps1'
$log=Join-Path $root 'fastreport-startup-error.log'

function Port-Open {
  $c=New-Object System.Net.Sockets.TcpClient
  try {
    $task=$c.ConnectAsync('127.0.0.1',18767)
    if(-not $task.Wait(700)){ return $false }
    return $c.Connected
  } catch { return $false } finally { try{$c.Close()}catch{} }
}

Write-Host '=================================================='
Write-Host 'SP-Manager REAL FASTREPORT TEST'
Write-Host '=================================================='
Write-Host ''
Write-Host '[0] Checking FastReport bridge startup...'

if(-not (Port-Open)) {
  Write-Host '    FastReport is not running. Launching bridge...'
  try {
    # One direct child only. No VBS and no wrapper script.
    $args=@('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',$bridge)
    $p=Start-Process -FilePath $ps -ArgumentList $args -WorkingDirectory $root -WindowStyle Hidden -PassThru -ErrorAction Stop
    Write-Host "    Bridge process started (PID $($p.Id))."
  } catch {
    Write-Host "    FAIL: Cannot launch FastReport bridge: $($_.Exception.Message)"
    exit 1
  }
}

$deadline=(Get-Date).AddSeconds(12)
while((Get-Date) -lt $deadline) {
  if(Port-Open) {
    Write-Host '[1] FastReport bridge: PORT 18767 READY'
    Write-Host ''
    Write-Host 'Startup check completed. Use Price Tags in SP-Manager to generate the real PDF.'
    exit 0
  }
  Start-Sleep -Milliseconds 400
}

Write-Host '    FAIL: FastReport bridge did not open port 18767 within 12 seconds.'
foreach($f in @($log,(Join-Path $root 'fastreport-startup.log'))){
  if(Test-Path $f){Write-Host "    --- $f ---"; Get-Content $f -Tail 80}
}
exit 1
