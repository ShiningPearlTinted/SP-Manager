# SP-Manager V10 — Relational Transaction Sync

Base: SP-Manager 1.0.33 V9.2 Users Notice Fix.

## Scope

This update adds a background relational sync layer for existing application state without changing existing UI or business logic.

Connected state keys:
- sales -> sales + sale_items + sale_payments
- purchases -> purchases + purchase_items
- orders -> open_orders + open_order_items
- cashMovements -> cash_movements
- stockHistory -> stock_movements
- paymentTypes -> payment_types
- promos -> promotions
- suppliers -> suppliers
- zReports -> end_of_day (when the table contains compatible columns)

`sp_app_state` remains enabled as cache/compatibility storage. The relational sync runs in addition to the existing save path so existing offline behavior is preserved.

## Hostinger

Upload:
`api/relational-sync.php`
to:
`public_html/app/SP-Manager-api/relational-sync.php`

Do not overwrite `config.php`.

Deploy the frontend files from this ZIP through the existing GitHub Pages workflow.

## Important

The API discovers the actual table columns using `DESCRIBE` and only writes columns that exist. A sync failure is logged and does not interrupt the existing local/app-state save path.

Invoice/Quotation/Warranty/Maintenance are not wired here because the current V9.2 frontend does not have active persistent state/functions for those modules. Adding them would require introducing or changing functionality, which is outside the requested scope.
