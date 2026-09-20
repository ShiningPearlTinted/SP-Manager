$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$script=Join-Path $root 'fastreport-price-tags.ps1'
$ps=Join-Path $env:SystemRoot 'SysWOW64\WindowsPowerShell\v1.0\powershell.exe'
if(!(Test-Path $ps)){$ps=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'}
& $ps -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $script
