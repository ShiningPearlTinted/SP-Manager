$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$fr='http://127.0.0.1:18767'
$script=Join-Path $root 'fastreport-price-tags.ps1'
$log=Join-Path $root 'fastreport-startup.log'
$elog=Join-Path $root 'fastreport-startup-error.log'
function Ready {
  try { $r=Invoke-RestMethod "$fr/status" -TimeoutSec 1; return $true } catch { return $false }
}
function Write-Log([string]$m){ try { Add-Content -Path $log -Value ("{0} {1}" -f (Get-Date -Format s),$m) } catch {} }

if(Ready){ exit 0 }

# Remove only a stale SP-Manager FastReport PowerShell process that owns port 18767
# but no longer answers /status. This prevents repeated startup attempts from hanging.
try {
  $conns=Get-NetTCPConnection -LocalPort 18767 -State Listen -ErrorAction SilentlyContinue
  foreach($c in @($conns)){
    $pid=[int]$c.OwningProcess
    if($pid -gt 0 -and $pid -ne $PID){
      $proc=Get-CimInstance Win32_Process -Filter "ProcessId=$pid" -ErrorAction SilentlyContinue
      if($proc -and ([string]$proc.CommandLine -match 'fastreport-price-tags\.ps1')){
        Write-Log "Stopping stale FastReport process PID $pid"
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 300
      }
    }
  }
} catch { Write-Log "Stale-process cleanup warning: $($_.Exception.Message)" }

if(Ready){ exit 0 }

try {
  Write-Log 'Starting FastReport bridge hidden.'
  $p=Start-Process -FilePath "$PSHOME\powershell.exe" `
      -ArgumentList @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',$script) `
      -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $elog -PassThru
  Write-Log "FastReport process PID $($p.Id) started."
} catch {
  Write-Log "START FAILED: $($_.Exception.ToString())"
  exit 2
}

for($i=0;$i -lt 30;$i++){
  Start-Sleep -Milliseconds 500
  if(Ready){ exit 0 }
  try {
    if($p.HasExited){
      Write-Log "FastReport process exited with code $($p.ExitCode)."
      break
    }
  } catch {}
}
Write-Log 'FastReport bridge did not become ready.'
exit 3
