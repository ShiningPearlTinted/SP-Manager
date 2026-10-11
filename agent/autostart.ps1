function Get-SPStartupPath {
  return Join-Path ([Environment]::GetFolderPath('Startup')) 'SP-Manager Local Agent.lnk'
}
function Test-AutoStartInstalled {
  try {
    $path=Get-SPStartupPath
    if(-not (Test-Path -LiteralPath $path)){return $false}
    $shell=New-Object -ComObject WScript.Shell
    $link=$shell.CreateShortcut($path)
    return ($link.TargetPath -eq $PowerShell -and $link.Arguments -eq ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "'+(Join-Path $AgentDir 'watchdog.ps1')+'"'))
  } catch {return $false}
}
function Install-AutoStart {
  $watchdog=Join-Path $AgentDir 'watchdog.ps1'
  if(-not (Test-Path -LiteralPath $watchdog)){throw 'watchdog.ps1 was not found.'}
  $path=Get-SPStartupPath
  if(-not (Split-Path -Parent $path)){throw 'Windows Startup directory is unavailable.'}
  New-Item -ItemType Directory -Path (Split-Path -Parent $path) -Force | Out-Null
  $shell=New-Object -ComObject WScript.Shell
  $link=$shell.CreateShortcut($path)
  $link.TargetPath=$PowerShell
  $link.Arguments='-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "'+$watchdog+'"'
  $link.WorkingDirectory=$AgentDir
  $link.WindowStyle=7
  $link.Description='SP-Manager Local Agent: current Windows user logon'
  $link.Save()
  if(-not (Test-AutoStartInstalled)){throw 'Startup shortcut could not be verified. Ask IT to check Windows startup policy.'}
  return $true
}
