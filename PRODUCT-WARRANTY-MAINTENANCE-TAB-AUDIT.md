# SP-Manager 1.0.18 — Product Warranty & Maintenance Tab Fix

## Changes
- Product editor reorganized into tabs to reduce vertical scrolling:
  - General
  - Image
  - Pricing
  - Stock
  - Warranty & Maintenance
  - Details
- Added product-level Warranty checkbox and warranty years.
- Added product-level Free Maintenance checkbox and maintenance count.
- Warranty output format on invoice: `Warranty N Year`.
- Free maintenance output format on invoice: `Free Maintenance N x`.
- Warranty/maintenance values are stored in the product master and carried into POS cart/sale item snapshots.
- Invoice output only shows these lines when the corresponding product checkbox is enabled.

## Locked / unchanged
- POS pricing, tax, discount and payment calculations unchanged.
- Inventory calculations unchanged.
- Existing product fields retained; only their editor location is tabbed.
- Existing Settings, Print Settings, Management and End of Day screens were not intentionally changed.

## Validation
- TypeScript JSX parser: PASS (0 diagnostics)
- TypeScript transpilation: PASS (0 diagnostics)
- Generated JavaScript `node --check`: PASS
- Full Vite build: NOT RUN / unavailable because the supplied local node_modules does not contain a usable Vite package/binary.
