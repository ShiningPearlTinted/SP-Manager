# SP-Manager 1.0.36 — SQL-100 Database Integration

This build keeps the existing UI/business logic and changes the persistence architecture so SQL is the master data source for the application.

## SQL-first modules

Products, product categories, product groups, customers, suppliers, users, sales, sale items, sale payments, purchases, purchase items, open orders, cash movements, stock movements, payment types, promotions, end-of-day records, company settings, business day, tax, customer display settings, general settings, order/payment settings, product/document/weighing settings, email settings, print settings, hardware settings, POS search mode, price-tag settings, and SQL document counters are persisted through the PHP/MySQL API.

## Database utilities

- `api/database.php` — SQL database snapshot backup/restore service (SQL-100 / backup V1).
- `api/reports.php` — direct SQL reporting summary API.
- `api/settings.php` — dedicated settings persistence using `outlet_settings`, `email_settings`, `printers`, `hardware_devices`, and `backup_records`.
- `api/database-health.php` — schema/connection health verification.
- `api/version.php` — deployment/version verification.
- `api/backups/.htaccess` — prevents direct web access to server-side automatic backup files.

## Browser storage policy

`localStorage` remains only as a cache/offline fallback and for browser/session preferences. The SQL database is the authoritative online source. Intentional browser-only state includes the active login session and normal browser/UI cache behavior.

## Database backup

Manual backup exports a complete SQL database snapshot as JSON. Automatic backups store compressed snapshots on the API server and write metadata to `backup_records`. Restore requires an explicit Yes/No confirmation and replaces records in the snapshot tables; schema is not dropped.

## Order numbers

Order numbers now use the SQL document-counter service instead of the browser `orderCounter` cache.

## Price Tag settings

Price-tag configuration is persisted through the SQL settings API. The existing local key is kept only as a compatibility/cache mirror.

## Reports

The Reports page requests its primary KPI figures directly from `api/reports.php`, which queries the relational SQL tables. Existing UI state is retained only as a fallback when the database endpoint is unavailable.

## Validation performed on this build

- PHP syntax check: all API PHP files pass `php -l`.
- JSX/JavaScript parser check: TypeScript `transpileModule` reports 0 diagnostics for `frontend/src/main.jsx`.
- `npm run build` was not claimed as passed because frontend dependencies (`vite`) are not installed in the current execution environment.
- Live Hostinger/MySQL connectivity was not tested from this environment.

## Deployment

Upload the updated `api/` folder to the Hostinger API location and deploy the updated `frontend/` build to the existing frontend host. Confirm the live API reports `database_service: SQL-100`, `database_backup: V1`, `reports_version: V1`, and `settings_version: V3` from `version.php`.

No Outlet Management changes are included in this build.
