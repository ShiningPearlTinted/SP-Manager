# SP-Manager 1.0.18 — Allow Price Change at POS Click Root-Cause Fix

## Root cause
The POS component `POS()` called `priceChangeAllowedFor(product)`, but that helper was declared inside `App()` and therefore was not in the lexical scope of `POS()`.

This caused the browser error:
`Uncaught ReferenceError: priceChangeAllowedFor is not defined`

Because the exception happened inside the product `onClick`, the click handler stopped before the product could be added to the sale or open the Change Price dialog.

## Exact fix
Only the helper location was changed:
- Moved `priceChangeAllowedFor` to module scope, alongside the product normalization helpers.
- Removed the duplicate inner `App()` declaration.

No POS layout, cart calculation, payment, customer, inventory, Management, End of Day, invoice, receipt, or other business logic was changed in this root-cause fix.

## Intended flow retained
- Allow price change OFF → clicking product adds it normally.
- Allow price change ON → clicking product opens Change price first; product is committed to cart only after price confirmation.
