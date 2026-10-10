@echo off
setlocal EnableExtensions
set "BASE_URL=https://shiningpearltinted.github.io/SP-Manager/sp-manager-agent"
set "INSTALL_DIR=%LOCALAPPDATA%\SP-Manager\agent"
set "SP_INSTALL_SOURCE=%~dp0"
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS_EXE%" (
 echo Windows PowerShell missing.
 pause
 exit /b 1
)
"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$dir=$env:INSTALL_DIR;New-Item -ItemType Directory -Path $dir -Force|Out-Null;foreach($f in @('agent.ps1','watchdog.ps1')){$tmp=Join-Path $dir ($f+'.download');$local=Join-Path $env:SP_INSTALL_SOURCE ('agent\'+$f);if(Test-Path -LiteralPath $local){Copy-Item -LiteralPath $local -Destination $tmp -Force}else{Invoke-WebRequest -UseBasicParsing -Uri ($env:BASE_URL+'/'+$f) -OutFile $tmp};$expected=if($f -eq 'agent.ps1'){'51cf1859fb6f2d1dc234c782aed669a6a1a01e573cbfcc102e919e832c98ccfb'}else{'78946e1b770de8a606f209b9385aadfe48888bd5a39d3bafc762611ef5e68fb0'};if((Get-FileHash -LiteralPath $tmp -Algorithm SHA256).Hash.ToLower() -ne $expected){throw 'Agent integrity check failed. Use the complete release ZIP.'};Move-Item -LiteralPath $tmp -Destination (Join-Path $dir $f) -Force};Stop-ScheduledTask -TaskName 'SP-Manager Local Agent Watchdog' -ErrorAction SilentlyContinue;foreach($proc in Get-CimInstance Win32_Process){if($proc.CommandLine -and (($proc.CommandLine -match [regex]::Escape((Join-Path $dir 'agent.ps1'))) -or ($proc.CommandLine -match [regex]::Escape((Join-Path $dir 'watchdog.ps1'))))){Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue}};$ps=$env:PS_EXE;$wd=Join-Path $dir 'watchdog.ps1';$u=[Security.Principal.WindowsIdentity]::GetCurrent().Name;$a=New-ScheduledTaskAction -Execute $ps -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File '+[char]34+$wd+[char]34);$t=New-ScheduledTaskTrigger -AtLogOn -User $u;$p=New-ScheduledTaskPrincipal -UserId $u -LogonType Interactive -RunLevel Limited;$s=New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 99 -RestartInterval (New-TimeSpan -Minutes 1);Register-ScheduledTask -TaskName 'SP-Manager Local Agent Watchdog' -Action $a -Trigger $t -Principal $p -Settings $s -Force|Out-Null;Start-Process -FilePath $ps -WindowStyle Hidden -ArgumentList ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File '+[char]34+(Join-Path $dir 'watchdog.ps1')+[char]34)"
if errorlevel 1 (
 echo Installation failed. No unverified script was executed.
 pause
 exit /b 1
)
echo Pairing token is saved at %LOCALAPPDATA%\SP-Manager\agent-pairing-token.txt
echo Copy it into Settings - Hardware - Pairing token on this computer.
pause
exit /b 0
