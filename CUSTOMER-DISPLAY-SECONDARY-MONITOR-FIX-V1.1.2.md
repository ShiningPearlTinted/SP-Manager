# Customer Display Secondary Monitor Fix v1.1.2

Root cause addressed:
- The web app calls Local Agent POST /display-window when Secondary monitor is enabled.
- An older running Local Agent without this route returns HTTP 404 `Not found`.
- The previous v1.0.8 route also had an incomplete PowerShell Add-Type declaration.

v1.1.2:
- Adds/fixes POST /display-window.
- Detects Windows displays through System.Windows.Forms.
- Requires Windows Extend displays and uses the second detected screen.
- Finds Microsoft Edge or Google Chrome.
- Opens the local customer display page on monitor 2 and positions/resizes the window.
- Returns a detailed error when no second monitor or browser is found.
- Updates agent status version to 1.1.2.

Important: the Local Agent running on the POS PC must be replaced/restarted with this version. Updating only the web frontend is not sufficient.
