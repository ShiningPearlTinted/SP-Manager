# SP-Manager 1.0.38 — Outlet Management V6

## Fix
V5 assigned products to a target outlet but did not provision outlet-scoped payment types. The database schema seeds default payment types for SP01, while new outlets such as SP02 can have none. The POS can still show a stale cached Cash button from a previous outlet session.

V6 adds:
- `api/outlet-provision.php`: additive endpoint to copy missing payment types from source outlet to target outlet without overwriting target custom settings.
- Product Assignment now provisions missing payment types after product assignment.
- Before committing a POS sale, frontend refreshes the current outlet product catalog and payment types, then rebinds cart item IDs to the current outlet product by code/barcode/name. This prevents stale SP01 product IDs from being submitted after moving to SP02.
- Existing sales/business calculations remain unchanged.
