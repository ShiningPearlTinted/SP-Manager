# SP-Manager 1.0.37 – Hardware Install Button V1.1.17

- Added **Install** button beside **Refresh** in Settings > Hardware.
- Button is enabled when Local Agent Auto-start is not detected.
- Button becomes **✓ Installed** and disabled after the Windows watchdog task is registered.
- Local Agent `/status` now reports `autoStartInstalled`.
- Added `/install-autostart` to register `SP-Manager Local Agent Watchdog` for the current Windows user when the Agent is already running.
- If the Agent is not running, the button downloads a self-contained `RESTART-SP-MANAGER-LOCAL-AGENT.bat` installer.
- The downloaded installer places the Agent under `%LOCALAPPDATA%\SP-Manager\agent`, registers the watchdog, and starts the Agent.
- Existing POS, printing, cash drawer, customer display, email, products, groups and other functions are unchanged.
