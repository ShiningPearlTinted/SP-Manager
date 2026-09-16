# SP-Manager 1.0.14 — POS UI / Keyboard Fix

## LOCK scope
Only the POS UI/functionality requested in this turn was changed. No other module, calculation, database structure, or existing POS workflow was intentionally refactored.

## Changes
- Transfer / Split Order dialog buttons polished to match the dark POS UI.
- Transfer dialog Cancel button no longer inherits the global white `.secondary` style.
- Transfer selected button has a consistent primary blue action style.
- POS search keyboard icon is now an actual button.
- Added a working on-screen virtual keyboard for POS product search.
- Virtual keyboard supports letters, numbers, space, backspace, clear, and Enter.
- Enter adds a product automatically when the current search resolves to exactly one product.

## Aronium reference check — Repeat round
The supplied Aronium files were inspected. Aronium's original `Repeat round` is a round-level restaurant workflow: rounds are created/saved separately and can later be selected for payment. The original language resource explicitly handles missing rounds, insufficient quantities, and grouped items. Therefore the existing SP-Manager `Repeat round` implementation was deliberately **not changed in 1.0.14**, because the user requested the currently working function to remain LOCKED.

Aronium official keyboard documentation also confirms the POS keyboard shortcuts such as F3 search, F4 quantity, F7 split order, F10 payment, F11 fullscreen, F12 default payment, Esc focus/search, Ctrl+D cash drawer and Ctrl+T search type.
