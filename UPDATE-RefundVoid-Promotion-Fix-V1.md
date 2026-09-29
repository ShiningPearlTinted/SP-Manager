# SP-Manager 1.0.37 — Refund/Void + Discount/Promotion Fix V1

Scope is intentionally limited to the Refund / Void and Discount / Promotion screens.

- Renamed the Refund/Void screen component to a unique `RefundVoidScreen` binding to prevent the deployed bundle's `RefundVoid is not defined` render failure.
- Promotion refresh now catches database read failures and retains the current promotion state instead of causing an unhandled page action.
- `relational-data.php` now retries a local MySQL connection over TCP (`127.0.0.1`) when the configured `localhost` connection returns SQLSTATE 2002. Other configured hosts are unchanged.
- No POS, Payments, Purchases, Inventory, Settings, Customer, or other screen UI/business logic was intentionally changed.
