# SP-Manager Local Agent 1.0.13

This Windows Local Agent does **not require Node.js**. It uses built-in Windows PowerShell and listens only on `127.0.0.1:18765`.

Run `install-windows.bat`, then verify with `check-agent.bat` or open `http://127.0.0.1:18765/status`.

Endpoints:
- GET `/status`
- GET `/printers`
- POST `/print`
- POST `/cash-drawer`
- POST `/display`


## Diagnostic
Run `diagnose-agent.bat` to identify what is using port 18765. The installer automatically recovers a stale SP-Manager Agent process, but it will not terminate unrelated programs.
