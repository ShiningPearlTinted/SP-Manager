# Promotion + Customer Loyalty Fix

- Promotions now map to the deployed SQL `promotions` schema (`promotion_name`, `start_at`, `end_at`, `price`, `discount_percent`, `data_json`).
- Relational read reconstructs the UI-friendly promotion shape from `data_json` and SQL columns.
- Sales resolve the selected customer to the real SQL `customers.id` before writing `sales.customer_id`.
- Loyalty is recalculated from paid, non-voided/non-refunded SQL sales on sale completion and on Loyalty page load.
- Customer `visits`, `spend`, `loyalty_points` and `loyalty_accounts` are updated from SQL aggregates.
