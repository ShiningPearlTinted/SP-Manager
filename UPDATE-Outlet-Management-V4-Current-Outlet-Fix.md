# SP-Manager 1.0.38 — Outlet Management V4

## Fix: Current Outlet Context

Root cause found in V3:
- frontend `main.jsx` still sent hard-coded `outlet_id: "SP01"` to sales, relational sync, product refresh, loyalty, reports, document counters and other SQL calls.
- login also requested authentication against SP01, so User → Outlet assignment was not yet used as the runtime outlet context.

V4 change (focused):
- active outlet is resolved from the logged-in user's `default_outlet_id` / `outlet_id`, with SP01 only as a legacy fallback.
- sales save/delete, relational sync/reads, loyalty, reports, document counters, settings/master synchronisation and database calls now use the active outlet context.
- authentication now validates username/password without forcing the user to belong to SP01; the returned user record contains the assigned outlets/default outlet.
- header shows the current outlet code for verification.

No POS calculation, payment logic, product calculation, UI flow or unrelated business logic was refactored.
