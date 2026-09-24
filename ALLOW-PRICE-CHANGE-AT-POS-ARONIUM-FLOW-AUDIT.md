# Allow Price Change at POS — Aronium Flow Fix

## Source basis
Reviewed the supplied Aronium source archive and Aronium Help Center. Aronium documents that `Price change allowed` lets the user change/confirm the price **before every sale**. The implementation therefore opens the modern SP-Manager Change Price keypad before the product is committed to the cart.

## SP-Manager changes
- Product click checks `priceChangeAllowed` before calling the cart `add()` function.
- When enabled, the product is held as a pending price-change item and the Change Price keypad opens immediately.
- The cart is only updated after Apply/Enter with the entered price.
- When disabled, the product is added normally.
- The old `openPrice()` manual-price flow and its "Select an item before changing price" path are removed.
- Cart item click only selects the line; it no longer opens the price dialog.
- Existing Product Master flag aliases remain supported for legacy data.
- No Price toolbar button is present in the POS order tools.

## Validation
- TypeScript JSX parser: PASS
- ZIP/source integrity: to be checked after packaging
- Full Vite production build: not run because Vite is not installed in this environment.
