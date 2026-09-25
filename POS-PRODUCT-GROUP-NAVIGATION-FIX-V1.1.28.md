# SP-Manager 1.0.48 – POS Product Group Navigation V1.1.28

## Fix
Restore the POS category-entry behavior from the proven V1.1.16 flow.

When a POS category has a root Product Group with the same name (for example `Tinted Film`), selecting the category immediately enters that Main Group. The intermediate screen that only shows the same Main Group as a single tile is not rendered.

Expected select flow:

Categories → Main Group → Second Group → Third Group → Product

Expected back flow:

Product → Third Group → Second Group → Main Group → Categories

Example:

Categories → Tinted Film → Sputter → Standard → Product

Back:

Product → Standard → Sputter → Tinted Film → Categories

## Scope lock
Only the POS category/group navigation entry logic was changed from V1.1.27. Local Agent files and unrelated POS functions are unchanged.
