# End of Day — POS Routing Fix

Locked targeted change only.

- Removed the **End of day** card from the **Management** screen.
- Kept the existing **POS user menu -> End of day** entry and permission check unchanged.
- Changed the End of Day breadcrumb from `MANAGEMENT / POS CLOSING` to `POS / CLOSING`.
- No End of Day business logic, cash-out calculations, Z report logic, permissions, POS calculations, Cash In / Out, Invoice, Payment, or other modules were changed.
- Existing X / Z Report remains separate.
