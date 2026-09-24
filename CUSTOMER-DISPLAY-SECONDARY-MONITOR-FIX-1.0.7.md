# Customer Display — Secondary Monitor Fix 1.0.8

## Problem fixed
The Customer display Test button could return HTTP 500 even when the Local Agent was connected because the secondary-monitor flow launched the browser through `/display-window` and the UI only showed the status code, hiding the actual Windows error.

## Changes
- Secondary-monitor test still updates the shared customer-display state through `/display`.
- `/display-window` now detects Windows monitors, requires a second detected display, locates Microsoft Edge or Chrome, launches the customer display as an app window, and attempts to position/size it on monitor 2 using Win32 `SetWindowPos`.
- The Local Agent reports version 1.0.8.
- Added `/display-monitors` diagnostic endpoint.
- Frontend now displays the Local Agent error message instead of only `HTTP 500`.
- If the second display is not detected, the message tells the user to use Windows `Win + P` → `Extend`.

## Validation
- Node.js syntax check: passed.
- TypeScript check (`tsc --noEmit`): passed.
- Windows hardware/browser launch still requires testing on the user's POS PC because this environment is not Windows and has no physical monitors.


## v1.0.8 correction
- Secondary-monitor Test Customer Display now calls `/display-window` directly and does not require a COM port.
- `/display-window` now receives and stores the welcome lines before opening the second-monitor window.
- COM validation remains only for the serial/COM display path.
