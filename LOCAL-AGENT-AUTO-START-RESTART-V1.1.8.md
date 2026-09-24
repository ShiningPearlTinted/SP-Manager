# SP-Manager Local Agent Auto-Start + Auto-Restart V1.1.8

## What changed
- Local Agent version bumped to 1.1.8.
- Added `agent/watchdog.ps1`.
- `agent/install-windows.bat` now registers a per-user Windows Task Scheduler task named `SP-Manager Local Agent Watchdog`.
- The watchdog starts the Local Agent automatically after Windows logon.
- The watchdog checks the Local Agent every 10 seconds and restarts it when `http://127.0.0.1:18765/status` is unavailable.
- `check-agent.bat` now checks both the Agent and the watchdog task.

## Daily use
The user only needs to run the installer once after installing/updating SP-Manager. After that, opening SP-Manager does not require `RESTART-SP-MANAGER-AGENTS.bat`.

## Safety
The installer only attempts to stop a process on port 18765 when its command line identifies it as the SP-Manager Agent. It does not intentionally terminate unrelated applications.

## Update behavior
When a new SP-Manager package changes the Local Agent path or watchdog, run `agent/install-windows.bat` once again to refresh the scheduled task.
