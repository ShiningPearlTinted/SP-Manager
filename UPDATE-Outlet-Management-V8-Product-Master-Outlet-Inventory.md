# SP-Manager 1.0.38 — V8 Product Master + Outlet Inventory

Product Master is shared. Outlet-specific assignment, stock, cost, selling price and related operational values are stored in `product_outlets`. Existing `products.outlet_id` remains only as a legacy/backfill source.

POS and Purchases update outlet stock through `product_outlets.stock_qty`. The same Product Master row can be assigned to SP01, SP02, SP03, etc. without copying the master record.

Added Product Master actions: Assign product and Outlet stock summary.
