# SP-Manager Local Agent

Windows hardware bridge for SP-Manager. It runs locally on the POS PC and exposes:

- `GET /status` - agent status
- `GET /printers` - Windows printers from the Windows spooler
- `POST /print` - RAW text receipt to a selected Windows printer
- `POST /cash-drawer` - ESC/POS pulse command to the selected printer/drawer
- `POST /display` - text to a serial COM customer display

## Run

Install Node.js LTS on the POS PC, then double-click `install-windows.bat` or run `node server.js`.

Default address: `http://127.0.0.1:18765`

The agent binds only to localhost. The web app can therefore communicate with it without exposing the hardware service to the LAN.

## Cash drawer

The default pulse is `27,112,0,25,250`. Some printers/drawers require a different ESC/POS pulse; change the `cashDrawerPulse` setting in SP-Manager if needed.

## Notes

- Windows printer names come from the Windows Print Spooler.
- Customer displays must expose a compatible serial COM port and baud rate.
- This bridge does not bypass Windows security or printer drivers; the Windows account running it must have access to the printer.

## Installation status indicator

The SP-Manager Settings > Hardware page polls the local agent every 5 seconds. It shows **CONNECTED** when the agent responds. If it cannot reach localhost:18765, it shows **AGENT NOT DETECTED** and explains that the agent may be uninstalled or not running. A browser cannot reliably distinguish those two states when the local process is stopped.


## Installer note (v1.0.6)
`install-windows.bat` now detects Node.js outside PATH and attempts to install Node.js LTS automatically with Windows Package Manager (`winget`) when Node.js is missing. It also performs a bounded health check against `http://127.0.0.1:18765/status`.
