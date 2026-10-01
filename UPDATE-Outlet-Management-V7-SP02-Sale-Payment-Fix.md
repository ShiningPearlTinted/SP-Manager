# SP-Manager 1.0.38 — Outlet Management V7 — SP02 Sale / Payment Fix

Base: SP-Manager 1.0.38 + Outlet Management V6.

Focused changes only:
- POS resolves Payment Types from the current outlet immediately before payment completion.
- Stale payment IDs/names from another outlet are remapped by current-outlet payment type id/name before sale save.
- POS automatically switches to a valid enabled payment type when the current outlet does not contain the previously selected payment type.
- sales.php now auto-provisions a missing Payment Type into the current outlet by copying the matching definition from another outlet, without overwriting existing target-outlet settings.
- sales.php rejects a required missing payment_type_id with a useful message instead of inserting an invalid/null relation.
- Existing Product outlet scoping remains enforced; no SP01 product is attached directly to an SP02 sale.

Files changed:
- frontend/src/main.jsx
- api/sales.php

No database reset or schema overwrite is required.
