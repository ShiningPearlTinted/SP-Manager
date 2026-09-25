# SP-Manager 1.0.46 – POS Product Group Navigation V1.1.26

## Locked navigation flow

Select:
Categories → Main Group → Second Group → Third Group → Product

Back:
Product → Third Group → Second Group → Main Group → Categories

## Changes
- Categories is a dedicated navigation level.
- A Main Group is never skipped, even when its name matches the Category (for example Tinted Film).
- Removed the standalone POS home state that showed only a single Categories tile.
- Back from a Main Group returns to Categories.
- Back from a child group returns to its actual parent.
- Product selection remains the leaf level.

## Scope lock
Only POS Product Group Navigation was changed. Local Agent files and unrelated POS functions remain unchanged.
