@echo off

setlocal

set "SP_INSTALL_SOURCE=%~dp0"

set "SP_AGENT_BASE=https://shiningpearltinted.github.io/SP-Manager/sp-manager-agent"

set "SP_AGENT_HASHES={"agent.ps1":"ad43f23234bed7def4efd9c1f00f50b151c61cafbc36f3177374f0202246f653","autostart.ps1":"21dc4f018a43393de93476f59ad943db00b82af9084d61a09ff82b67c57aa4ea","check-agent.bat":"dd9d625c2829dd04dfa9ca6ea8f0254656ec463d153a25edbf5af53ed724822e","diagnose-agent.bat":"71e724ffe924d44d70f3b45866506405c3b4807e893847828578fb64060a821c","display-fullscreen.ps1":"0e68cf40bf993974f18f90687963900495c505ea6b80c4f8dc832df697f4b45f","display-window.ps1":"89ef053943f69d0342a676ab738c12827b73fc71e8c795663771e8bacab64399","install-current-user.ps1":"660d6960b625352bc1fcfdf7f0525d2dd4fa6f58632c46ac1787cc58e4b2e4ed","install-windows.bat":"91f6437ffded6da27ca32c524a93b2a4f3d94fb8e8605f31f39284a5b15d9abe","watchdog.ps1":"5d07f2b05c76feafd1d6b62c2b2d72d3f20a4ea4902519335921e48e75e280b8"}"

"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$dir=Join-Path $env:TEMP 'SP-Manager-Verified-Installer-1.0.58';New-Item -ItemType Directory -Path $dir -Force|Out-Null;$expected=ConvertFrom-Json $env:SP_AGENT_HASHES;foreach($entry in $expected.PSObject.Properties){$f=$entry.Name;$tmp=Join-Path $dir ($f+'.download');$local=Join-Path $env:SP_INSTALL_SOURCE ('agent\'+$f);if(Test-Path -LiteralPath $local){Copy-Item -LiteralPath $local -Destination $tmp -Force}else{Invoke-WebRequest -UseBasicParsing -Uri ($env:SP_AGENT_BASE+'/'+$f) -OutFile $tmp};if((Get-FileHash -LiteralPath $tmp -Algorithm SHA256).Hash.ToLower() -ne $entry.Value){throw ('Agent integrity check failed: '+$f)};Move-Item -LiteralPath $tmp -Destination (Join-Path $dir $f) -Force};& (Join-Path $dir 'install-current-user.ps1')"

set "RESULT=%ERRORLEVEL%"

if not "%RESULT%"=="0" echo Installation failed. Send this message to support.

pause

exit /b %RESULT%

