# SP-Manager 1.0.24 - POS Render/Login Fix v1.1.7

Root cause fixed: the v1.1.6 source accidentally replaced the POS component body with Settings component code, leaving Settings variables such as `pr` referenced inside `POS`. This caused `ReferenceError: pr is not defined` immediately after login when POS rendered.

v1.1.7 restores the last known-good POS component structure from v1.1.5 while retaining the working Local Agent/customer-display secondary-monitor implementation.

No POS business calculations or locked functions were intentionally changed.
