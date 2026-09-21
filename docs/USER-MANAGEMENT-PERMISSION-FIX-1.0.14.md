# SP-Manager 1.0.14 — Management Permission Fix

## Requested change only

1. Added a new **Management** checkbox under **Permissions** in User Account, matching the existing permission style.
2. The **Management** menu button is now controlled by `manageManagement`.
3. If an Administrator does not enable **Management** for a user, that user cannot open Management.
4. Administrator continues to have automatic access.
5. Removed **Feedback** from the Permissions list.
6. Removed legacy `feedback` from the default permission definitions.

## Locked / unchanged

- POS functions
- Cash In / Out
- End of day
- Sign out
- Settings permission
- Existing individual Management permissions
- Users & Permissions
- Products / Inventory / Customers / Purchases / Payments
- Reports / Tax / Discount / Loyalty
- Existing user login and role handling
- FastReport cleanup
- Local Agent

Important: the individual Management functions were NOT removed. Only access to the Management page itself now has its own explicit permission.
