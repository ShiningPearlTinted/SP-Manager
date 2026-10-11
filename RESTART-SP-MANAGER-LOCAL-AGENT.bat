@echo off

setlocal

set "SP_INSTALL_SOURCE=%~dp0"

set "SP_AGENT_BASE=https://shiningpearltinted.github.io/SP-Manager/sp-manager-agent"

set "SP_AGENT_HASHES={"agent.ps1":"8263b11a5ddd0eea6d2dc0fad9950cae0031c94054c85f489e9d484d851eb1ab","autostart.ps1":"21dc4f018a43393de93476f59ad943db00b82af9084d61a09ff82b67c57aa4ea","check-agent.bat":"dd9d625c2829dd04dfa9ca6ea8f0254656ec463d153a25edbf5af53ed724822e","diagnose-agent.bat":"dd9d625c2829dd04dfa9ca6ea8f0254656ec463d153a25edbf5af53ed724822e","install-current-user.ps1":"660d6960b625352bc1fcfdf7f0525d2dd4fa6f58632c46ac1787cc58e4b2e4ed","install-windows.bat":"a96e19c60cb5f56b5c7df7f916e674293dbea45678559c030db9bcc6c9fef9d3","watchdog.ps1":"5d07f2b05c76feafd1d6b62c2b2d72d3f20a4ea4902519335921e48e75e280b8"}"

"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$dir=Join-Path $env:TEMP 'SP-Manager-Verified-Installer-1.0.51';New-Item -ItemType Directory -Path $dir -Force|Out-Null;$expected=ConvertFrom-Json $env:SP_AGENT_HASHES;foreach($entry in $expected.PSObject.Properties){$f=$entry.Name;$tmp=Join-Path $dir ($f+'.download');$local=Join-Path $env:SP_INSTALL_SOURCE ('agent\'+$f);if(Test-Path -LiteralPath $local){Copy-Item -LiteralPath $local -Destination $tmp -Force}else{Invoke-WebRequest -UseBasicParsing -Uri ($env:SP_AGENT_BASE+'/'+$f) -OutFile $tmp};if((Get-FileHash -LiteralPath $tmp -Algorithm SHA256).Hash.ToLower() -ne $entry.Value){throw ('Agent integrity check failed: '+$f)};Move-Item -LiteralPath $tmp -Destination (Join-Path $dir $f) -Force};& (Join-Path $dir 'install-current-user.ps1')"

set "RESULT=%ERRORLEVEL%"

if not "%RESULT%"=="0" echo Installation failed. Send this message to support.

pause

exit /b %RESULT%

