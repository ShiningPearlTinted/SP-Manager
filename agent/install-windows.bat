@echo off
setlocal
set "INSTALLER=%~dp0..\RESTART-SP-MANAGER-LOCAL-AGENT.bat"
if not exist "%INSTALLER%" (
 echo Verified SP-Manager installer was not found beside the project root.
 pause
 exit /b 1
)
call "%INSTALLER%"
exit /b %ERRORLEVEL%
