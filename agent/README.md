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
