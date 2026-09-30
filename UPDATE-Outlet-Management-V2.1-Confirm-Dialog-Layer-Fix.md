# SP-Manager 1.0.38 — Outlet Management V2.1

## Focused fix
- Fixed the Save / Update confirmation dialog (`Yes / No`) appearing behind the Outlet Profile modal.
- Only changed the global `.sp-action-dialog-backdrop` stacking layer in `frontend/src/styles.css`.
- No outlet logic, database logic, UI layout, calculations, or other functions were changed.

## CSS change
- Confirmation/action dialog z-index: `200000` → `2147483646`
- This places the confirmation dialog above the Outlet Profile modal and other standard application overlays.
