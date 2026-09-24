# SP-Manager 1.0.36 – POS Product Group Navigation V1.1.16

## Fix
When a POS category has a root Product Group with the same name (for example `Tinted Film`), selecting the category now enters that root group immediately instead of rendering the same group as a duplicate tile.

Expected flow:

Category → Main Group → Subgroup → Product

Example:

Tinted Film → Sputter / Nano → Sputter 1 → Products

## Navigation
- The selected category/group is shown in the breadcrumb.
- Back from the category's same-name root group returns to the category screen.
- Back from a child group returns to its actual parent.
- Empty groups remain hidden.
- Existing recursive hierarchy remains supported.

## Scope lock
Only POS Product Group navigation was changed. POS payment, cart, search, printing, cash drawer, customer display, email and other product functions were not intentionally changed.
