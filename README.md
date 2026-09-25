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
