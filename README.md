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


## Central MySQL persistence — SP-Central

This build adds transparent central persistence without rewriting the existing SP-Manager modules. Existing `load()` / `save()` callers are preserved; `save()` queues state to `api/app-state.php`, and startup synchronizes the browser cache with MySQL. The first connected browser initializes an empty outlet state from its existing local data; once central state exists, new devices load that state instead of replacing it with seed/demo data. LocalStorage remains an offline/cache fallback. Outlet scope defaults to `SP01`. The additive table is `sp_app_state`; existing Customer Display and relational SP-Central tables are preserved.

Upload `api/app-state.php` into the existing `public_html/app/SP-Manager-api/` API folder and keep the working private `config.php`. Import `api/schema_app_state.sql` into `u729423317_SPCentral` if preferred; the endpoint also creates the table automatically. The frontend is preconfigured for `https://app.shiningpearltinted.com/SP-Manager-api`. Never commit MySQL credentials to GitHub.
