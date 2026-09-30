# SP-Manager 1.0.38 — Outlet Management V1

Scope: Outlet Management only. Built on locked base 1.0.38.

Changes:
- Added Management > Outlet Management.
- SQL-backed outlet list/create/edit/activate/deactivate.
- Outlet code, name, address, phone, email and active status.
- Search and refresh within Outlet Management.
- Soft deactivation only; no physical outlet deletion.
- Deactivation is blocked when the outlet still has enabled users.
- Added `api/outlets.php` only; existing screens/APIs are unchanged.
- Existing SP-Manager transaction screens remain on their current outlet routing (SP01) until a separate outlet-context update is explicitly requested.
