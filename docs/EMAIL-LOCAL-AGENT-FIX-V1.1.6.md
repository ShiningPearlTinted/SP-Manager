# SP-Manager Email Local Agent Fix V1.1.6

## Root cause
The frontend sends `POST /email` to the SP-Manager Local Agent on `127.0.0.1:18765`, while the PowerShell agent (`agent/agent.ps1`) did not expose the `/email` route. The request therefore returned HTTP 404 `Not found` before SMTP was attempted.

## Fix
- Added `POST /email` to `agent/agent.ps1`.
- Kept the existing frontend contract unchanged.
- SMTP uses the configured host, port, SSL, sender, username, password, recipient, subject, message and BCC.
- Invoice HTML can be converted to a PDF attachment using Microsoft Edge headless, matching the existing Node agent workflow.
- Existing print, cash drawer, price tags and customer display routes were not changed.
- Updated restart/installer labels to Local Agent V1.1.6.

## Expected result
The previous `404 Not found` popup should no longer occur. If Gmail rejects authentication or SMTP settings, the Local Agent now returns the actual SMTP error instead of `Not found`.
