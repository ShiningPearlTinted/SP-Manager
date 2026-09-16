# SP-Manager 1.0.24 – Render / Permission Hardening

## Root cause addressed
The deployed console error was:

`Uncaught ReferenceError: hasPermission is not defined`

This is a JavaScript scope/reference error. It stops React rendering and results in a blank page.

## Changes
- Removed the runtime identifier `hasPermission` from the application render path.
- Added the consistently named `canPermission()` helper inside `App`.
- Updated Management permission checks to use the same helper safely.
- Updated the Management component permission prop to `canPermission`.
- Kept the Login password Show/Hide control.
- Kept versioned authentication at 1.0.24.
- Added a React error boundary so a future render exception displays a diagnostic screen instead of a completely blank page.
- Disabled automatic Local Agent polling by default. This prevents repeated `127.0.0.1:18765/status` console errors when the optional Windows Local Agent is not running. The Hardware settings page can enable it when required.
- POS business functions and existing UI calculations were not intentionally changed.
