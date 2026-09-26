# SP-Manager

Phase 2 expands the GitHub Pages test build with working browser-local business workflows.

Implemented:
- Dashboard / business day
- POS / Sales, barcode-ready search, cart, customer, discount, tax, payment types
- Product master and editing
- Inventory / stock adjustment
- Customers
- Suppliers
- Purchases / goods received
- Payments
- Refund / Void
- Discount / Promotion rules
- Tax configuration
- Loyalty ranking
- Users & permissions
- Reports
- X / Z report
- Named Order / Takeaway
- Settings

LOCK RULE: existing functions and design are preserved unless explicitly requested. This phase adds functionality to the current SP-Manager build. GitHub Pages stores demo data in browser localStorage; production backend/database comes later.


## Local Agent Auto-Start / Auto-Restart V1.1.8
Run `agent\install-windows.bat` once after installation/update. It registers a per-user Windows Task Scheduler watchdog that starts the Local Agent at Windows logon and restarts it automatically if the agent stops responding. The POS application itself does not need to be changed.

## SP-Central persistence bridge (V2)

`api/app-state.php` provides central persistence for the existing SP-Manager `sp_*` application state without changing the existing POS/UI calculation logic. It uses the existing `u729423317_SPCentral` database and the existing `sp_app_state` table.

- GET `?action=health&outlet_id=SP01` checks the connection.
- GET `?action=all&outlet_id=SP01` returns central application state.
- POST `?action=save&outlet_id=SP01` saves one state key.
- POST `?action=save-batch&outlet_id=SP01` initializes the central state in one transaction.

The browser keeps `activeUser`, `posSearchMode`, and `customerDisplayTerminal` terminal-local. Other existing persisted `sp_*` application state is synchronized to the central database. Existing localStorage remains as an offline/cache fallback.

This bridge is deliberately additive. Existing relational tables such as `products`, `customers`, `sales`, `sale_items`, `stock_movements`, `payments`, `invoices`, etc. are not altered by this bridge. Relational module mapping should be implemented separately and tested module-by-module before replacing the application's current state model.
