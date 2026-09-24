# SP-Manager Local Agent 1.1.8

This Windows Local Agent does not require Node.js. It uses built-in Windows PowerShell and listens only on `127.0.0.1:18765`.

## Auto-start and auto-restart
Run `install-windows.bat` once. It registers the **SP-Manager Local Agent Watchdog** in Windows Task Scheduler for the current Windows user. The watchdog starts the Local Agent at logon and checks it every 10 seconds; if the agent stops responding, it starts it again automatically.

You do **not** need to run the installer or restart batch every time you open SP-Manager.

Endpoints:
- GET `/status`
- GET `/printers`
- POST `/print`
- POST `/cash-drawer`
- POST `/display`
- GET `/display-state`
- GET `/customer-display`
- GET `/display-monitors`
- POST `/display-window`
- POST `/email`

## Diagnostic
Run `check-agent.bat` to verify the Local Agent and watchdog task. Run `diagnose-agent.bat` to identify what is using port 18765. The installer only terminates a stale SP-Manager Agent process; it will not terminate unrelated programs.
