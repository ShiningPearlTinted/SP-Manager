# Customer Display Secondary Monitor Fix v1.1.3

Root cause of the remaining `Not found`: the Windows installer launches `agent/agent.ps1`, not `server.js`. The PowerShell agent was still v1.1.1 and had no `/display-window` endpoint, so the frontend correctly received HTTP 404 `Not found`.

Fix:
- `agent.ps1` status version is now 1.1.3.
- Added GET `/display-monitors`.
- Added POST `/display-window`.
- Secondary monitor is selected as the first non-primary Windows screen.
- Opens the local `/customer-display` page with Edge or Chrome and positions/resizes it to the secondary screen.
- Installer labels updated to v1.1.3.
- COM `/display` behavior remains unchanged.
