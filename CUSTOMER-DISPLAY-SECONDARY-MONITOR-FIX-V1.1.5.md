# Customer Display Secondary Monitor Fix v1.1.5

- Fixed PowerShell IntPtr conversion when browser MainWindowHandle is returned as null/empty.
- Customer Display secondary monitor route now normalizes the window handle before ShowWindowAsync/SetWindowPos.
- Updated Local Agent version to 1.1.5.
- Hardware Refresh retains loading state while /status and /printers are being checked.
