@echo off
setlocal
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
echo Stopping old SP-Manager agents...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":18765 .*LISTENING"') do taskkill /PID %%P /F >nul 2>nul
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":18766 .*LISTENING"') do taskkill /PID %%P /F >nul 2>nul
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":18767 .*LISTENING"') do taskkill /PID %%P /F >nul 2>nul
ping 127.0.0.1 -n 2 >nul
call "%~dp0agent\install-windows.bat"
