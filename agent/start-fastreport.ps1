$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$script=Join-Path $root 'fastreport-price-tags.ps1'
& (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $script
