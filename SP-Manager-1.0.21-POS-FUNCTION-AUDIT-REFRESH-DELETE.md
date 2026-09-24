# SP-Manager 1.0.21 — POS Linkage / Refresh / Product Delete Audit

## Scope

Audited the supplied `SP-Manager-main 1.0.21.zip` at source level, with focus on:
1. POS linkage of Product, Inventory, Customer, Payment Type, Promotion, Open Order and Settings-related workflows.
2. Every visible `Refresh` button found in the source.
3. Product Master selection and deletion flow.

No unrelated POS calculations or locked business logic were intentionally changed.

## POS linkage findings

The supplied 1.0.21 source already contains the previously requested POS integration paths:
- Product Master → POS product data.
- Stock/Inventory → POS stock and Stock On Hand.
- `Allow price change at POS` → Change Price before cart insertion.
- Age restriction → POS age verification.
- Weighing barcode → POS Enter/search path.
- Customer Display → POS cart/total/customer effect.
- Comment → POS order/item comment.
- Service Type → POS order metadata.
- Order Name → POS order metadata and save-sale flow.
- Floor plan/table selection → POS order metadata when enabled.
- Open Order → retrieve into POS cart and remove the retrieved open order.
- Payment Type `printReceipt` and `openCashDrawer` → POS payment completion.
- Split payment → payment list and paid/outstanding calculation.

These paths were inspected and were not replaced or refactored by this patch.

## Refresh audit

### Named Order / Takeaway
**Before:** Refresh only cleared the search field. It did not reload persisted orders.

**Fixed:** Refresh now reloads `orders` from localStorage and clears the search.

### Products
**Before:** Refresh only cleared the filter and showed a success notice.

**Fixed:** Refresh now reloads products, categories, product groups and group/category mapping from localStorage, normalizes product stock-control fields, clears stale selection/editor state and resets the filter.

### Inventory
**Before:** Refresh only reset filters.

**Fixed:** Refresh now reloads products and stock history from localStorage and resets the inventory filters/selection.

### Customers
Refresh already reloaded customers from localStorage and cleared stale selection/editor state. Kept the existing logic; only made the button explicitly `type="button"`.

### Purchases
Refresh already reloaded purchases from localStorage and cleared a stale selected document. Kept existing logic.

### Payment Types
**Before:** Refresh performed a full `window.location.reload()`.

**Fixed:** Refresh now reloads only the Payment Types data from localStorage without reloading the whole application.

### Promotions
**Before:** Refresh performed a full `window.location.reload()`.

**Fixed:** Refresh now reloads only the Promotions data from localStorage without reloading the whole application.

### Local Hardware
Refresh already calls the Local Agent `/status` and `/printers` endpoints and is kept unchanged.

## Product Delete

Added `Delete product` to the Product Master action strip.

Rules:
- No product selected → Delete button is disabled.
- Clicking Delete without a selection also protects with a notice.
- Product must be selected first.
- A modern confirmation dialog appears.
- User must choose **No** or **Yes, delete**.
- Yes removes the product from the Product Master and persisted product database.
- Selection/editor state is cleared after deletion.
- The deleted product therefore disappears from future POS product searches/category lists.
- Historical sales are not modified.

## Validation

- TypeScript JSX parser: PASS (0 diagnostics).
- Source archive integrity: PASS.
- Full Vite production build: not executed because `frontend/node_modules` / Vite is not installed in the supplied source environment.

## Change boundary

Only these areas were changed:
1. Refresh behavior for the identified Refresh buttons.
2. Product Master product deletion and confirmation.
3. No changes to POS pricing calculations, payment calculations, inventory calculation rules, receipt/invoice templates, Cash In/Out, End of Day, or other unrelated locked functions.
