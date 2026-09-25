# SP-Manager 1.0.47 – POS Product Group Navigation V1.1.27

## Locked flow
Select: Categories → Main Group → Second Group → Third Group → Product

Back: Product → Third Group → Second Group → Main Group → Categories

## Fix
When Back is pressed from a root/Main Group, POS now resets the selected category to `All Categories` and returns to the complete Categories level. It no longer renders a single-category screen containing only the category that was just selected.

Both the breadcrumb Back button and Back tile use the same `goBackGroup` handler.

## Scope
Only `frontend/src/main.jsx` POS Group Navigation was changed from V1.1.26.
Local Agent files and unrelated POS functions were not changed.
