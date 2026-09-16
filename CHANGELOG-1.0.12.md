# SP-Manager 1.0.12

## Requested fixes only

1. Customer Master selection
   - Single-click a customer row selects the customer.
   - Edit and Delete toolbar actions operate on the selected customer.
   - Double-click still opens the customer edit form.
   - The right-side customer details panel follows the selected customer.
   - Refresh stays on Customer Master and does not clear the page by reloading the application.

2. Purchases Refresh
   - Refresh now reloads purchase data from local storage without `window.location.reload()`.
   - The user remains on the Purchases screen.
   - A selected purchase is retained when it still exists.

3. POS Add Customer uppercase
   - Name, Phone, Email and Vehicle Number are converted to uppercase while typing.
   - Saved POS customer data is also normalized to uppercase.

## LOCK

No unrelated POS, product, inventory, payment, report, tax, loyalty, settings or calculation logic was intentionally changed.
