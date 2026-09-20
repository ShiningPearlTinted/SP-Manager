$ErrorActionPreference='Continue'
$root=$PSScriptRoot
$ps=Join-Path $env:SystemRoot 'SysWOW64\WindowsPowerShell\v1.0\powershell.exe'
if(!(Test-Path $ps)){$ps=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'}
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
    # Launch the real FastReport bridge and capture BOTH stdout and stderr.
    # The previous versions hid a crashing child process, which made the test
    # appear to hang/fail without exposing the actual FastReport startup error.
    $outLog=Join-Path $root 'fastreport-child.stdout.log'
    $errLog=Join-Path $root 'fastreport-child.stderr.log'
    Remove-Item $outLog,$errLog -Force -ErrorAction SilentlyContinue
    $args=@('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',$bridge)
    $p=Start-Process -FilePath $ps -ArgumentList $args -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru -ErrorAction Stop
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
Write-Host ''
Write-Host '    ===== FASTREPORT CHILD PROCESS ====='
foreach($f in @((Join-Path $root 'fastreport-child.stderr.log'),(Join-Path $root 'fastreport-child.stdout.log'),$log,(Join-Path $root 'fastreport-startup.log'))){
  if(Test-Path $f){
    Write-Host "    --- $f ---"
    $lines=Get-Content $f -Tail 120 -ErrorAction SilentlyContinue
    if($lines){$lines | ForEach-Object { Write-Host "    $_" }} else { Write-Host '    (empty)' }
  }
}
Write-Host ''
Write-Host "    Bridge process state: PID $($p.Id)"
try { $proc=Get-Process -Id $p.Id -ErrorAction Stop; Write-Host "    Process still running: $($proc.Responding)" } catch { Write-Host '    Process has already exited.' }
exit 1
