# SP-Manager Customer Display / Local Agent v1.1.5

- Local Agent now exposes GET `/customer-display` and `/display-state` so the secondary-monitor browser window has a real HTML endpoint.
- Secondary-monitor `/display-window` updates the display state before opening the browser.
- Local Agent status reports version 1.1.5.
- Added `RESTART-SP-MANAGER-LOCAL-AGENT.bat` to stop existing SP-Manager agent processes and start the bundled agent.
- Settings > Hardware > Refresh now has a manual loading state (`Refreshing...`) and disables the button during the request; the loading state clears on success or failure.
- Automatic 5-second hardware polling does not force the manual loading indicator.
