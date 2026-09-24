# SP-Manager — Allow Price Change at POS — Click Fix (LOCK)

## Scope
Only the POS item-selection flow related to **Product Master → Allow price change at POS** was touched.

## Fix
1. POS product/category/back controls are explicitly `type="button"` so they cannot behave as form-submit controls.
2. POS product click handlers explicitly prevent default/bubbling and call the existing `addPos()` flow.
3. POS product/category controls are explicitly kept `pointer-events:auto` with normal click cursor. This is scoped to POS controls only.
4. Escape from the Change Price input now also clears the pending price product/quantity.

## Intended flow remains
- Allow price change OFF → product adds normally.
- Allow price change ON → product is NOT added first; Change price opens immediately.
- Confirm price → product is then added to the cart with the entered price.
- No Price button/manual old flow is restored.

## Locked
No changes were made to Cash In/Out, End of Day, Payment, Invoice, Receipt, Product Master data model, Reports, Settings, Management, or other POS calculations.

## Validation
- TypeScript JSX parse: PASS.
- Transpiled JavaScript syntax check (`node --check`): PASS.
- Full Vite production build: not run because the local environment does not have the project's installed Vite dependency/cache available.
