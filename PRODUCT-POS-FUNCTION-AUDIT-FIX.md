# SP-Manager Product Master ↔ POS Audit / Fix

## Basis
Reviewed the current SP-Manager Product Master source and `SP-Manager reference(9).zip` reference, focusing on Product Master fields that are expected to affect POS behavior.

## Fixed POS-linked functions
- **Active**: inactive products are no longer shown in POS search/category lists and cannot be added to a sale.
- **Allow price change at POS**: now controls a POS Change price action. When enabled, the selected line can be edited; when disabled, POS shows a clear message and does not change the price.
- **Default quantity**: when enabled, the POS global default quantity is used; when disabled, adding the product uses quantity 1.
- **Service item**: service products are excluded from stock-negative validation and stock deduction logic, matching the intended meaning of a service item.
- **Rank / Sort Order**: used as the first POS ordering key, then the configured Name/Code sorting is used.
- **Manual price change persistence**: changing quantity after a manual price change keeps the manually entered line price instead of silently replacing it with a promotion price.
- **Product flags are explicitly normalized/saved**: `priceChangeAllowed`, `isService`, `defaultQuantity`, and `active` are persisted as booleans when a product is created/updated.

## Existing links retained
- Product name/code/barcode/category/group → POS search and product selection.
- Product image → POS product tiles.
- Selling price → POS line price.
- Cost price → sale-below-cost validation when that POS setting is enabled.
- Stock → negative-inventory validation and stock deduction.
- Description → invoice item details.
- Warranty / Free Maintenance → invoice item details.
- Reorder / low-stock settings → stock/low-stock workflow.
- Supplier / last purchase price → purchase/inventory workflow.

## Deliberately not changed
- Product-level **Tax inclusive price** is retained as product data. The current POS tax/display behavior is controlled by the existing global Products setting; changing this into per-line tax accounting would alter existing tax calculations and is outside the requested locked POS fix.
- Preferred quantity, supplier, comments, and last purchase price remain in their existing Inventory/Purchase workflows rather than being forced into POS behavior.
- Age Restriction remains stored in Product Master; no new validation was introduced because the existing field does not define an age/date rule format.

## Validation
- TypeScript JSX parser: PASS (`tsc --jsx react-jsx --allowJs --checkJs false --noEmit` with isolated check config)
- Full Vite production build: not run because the supplied source does not contain an installed Vite runtime in `node_modules`.
