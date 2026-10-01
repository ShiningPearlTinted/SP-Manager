# SP-Manager 1.0.38 — V8 Deployment Notes

## Architecture change
Product Master is shared. Outlet-specific assignment, price, cost and stock are stored in `product_outlets`.

`products.outlet_id` is retained only for backward compatibility / one-time backfill. New runtime stock operations do not use it as the stock source of truth.

## Additive database change
Run `api/schema_product_outlets.sql` once in the Hostinger database if desired. The APIs also create the table automatically as a safeguard.

## Existing data
Existing product rows are backfilled to `product_outlets` according to their current `products.outlet_id`.

If V5/V6/V7 already created duplicate Product Master rows for the same product in different outlets, do NOT delete them blindly. They should be reconciled as a one-time data cleanup before treating the database as fully consolidated.

## Runtime
- POS sale stock deduction: `product_outlets.stock_qty`
- Purchase stock addition: `product_outlets.stock_qty`
- Inventory count / stock adjustments: `product_outlets.stock_qty`
- Product price/cost for an outlet: `product_outlets`
- Sales and purchases continue to use `outlet_id` on their parent documents
- Same Product Master `products.id` can be assigned to multiple outlets

## Current UI additions
Product Master has:
- Assign existing Product Master item to current outlet
- Outlet stock summary for the selected product

The current Assign UI is intentionally simple for this architecture phase; the underlying database model does not duplicate the master record.
