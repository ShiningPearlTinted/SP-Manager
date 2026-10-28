# SP-Manager

Release 1.0.70. React frontend (`frontend/`) + PHP API (`api/`) on one Central MySQL/MariaDB database. No per-outlet database is created. Frontend and API must be deployed together: the app refuses to save transactions unless `api/version.php` reports the same release.

| Folder | Contents |
|---|---|
| `frontend/` | Vite + React source. `npm run build` → `frontend/dist/` |
| `api/` | PHP 8.2+ endpoints. Upload to the `SP-Manager-api` folder on the host |
| `database/SCHEMA-CURRENT.sql` | Full current schema, structure only (106 tables) |
| `database/migrations/` | Changes still to apply to the live database |
| `build-assets.json` | Canonical POS agent + Excel vendor files; `scripts/sync-agent.mjs` writes them into `agent/` and `frontend/public/` before every build |

## GitHub upload
Upload the **contents** of this folder to the repository root, including `.github/workflows/pages.yml` and `.gitignore`. GitHub Actions builds `frontend/dist` on every push to `main`. `node_modules/`, `frontend/dist/`, generated agent copies, secrets and database dumps are not committed. GitHub's web uploader accepts 100 files per upload; if needed, upload `api/` first and the rest second (the whole project is 93 files, so one upload also works). Uploading never deletes files already in the repository — delete removed files in GitHub separately.

## API configuration
The API reads its configuration from `sp-manager-private.php` placed beside `public_html` (outside the website), or from environment variables. Required values:

- `SP_MANAGER_DB_HOST`, `SP_MANAGER_DB_PORT`, `SP_MANAGER_DB_NAME`, `SP_MANAGER_DB_USER`, `SP_MANAGER_DB_PASSWORD`, `SP_MANAGER_DB_CHARSET` (default `utf8mb4`)
- `SP_MANAGER_AUTH_SECRET`, `SP_MANAGER_ENCRYPTION_KEY`, `SP_MANAGER_HR_ENCRYPTION_KEY` — three different random values, each at least 64 characters
- `SP_MANAGER_BACKUP_DIR` — writable path outside the web root
- `SP_MANAGER_ALLOWED_ORIGINS` — comma-separated frontend origins (CORS)

`sp-manager-private.php` returns the same array as `api/config.php` and takes precedence over environment variables. Never put credentials in the frontend, the repository or a public folder. Keep the production `config.php` on the server.

**Website booking bridge:** on the server only, create `api/booking-bridge-key.php` containing
`<?php return ['site'=>'https://shiningpearltinted.com','secret'=>'<random 64+ characters>'];`
and enter the same secret in WordPress > SP Booking > Website Connection. Never commit this file.

Set `VITE_API_BASE_URL` at build time to the API folder URL (default `https://app.shiningpearltinted.com/SP-Manager-api`) and add the frontend origin to `SP_MANAGER_ALLOWED_ORIGINS`.

## Database
- **New install:** import `database/SCHEMA-CURRENT.sql` into an empty database, configure the API, then run `php api/bootstrap-admin.php` once from a terminal (creates outlet SP01 and the first Administrator; refuses to run over HTTP or when users exist).
- **Live database:** back up, then run `database/migrations/collation-normalize-v1.sql` once.
- Check required tables/columns any time with `database-health.php`. Never import a production dump as an upgrade, and never commit one.

## Offline POS
1. Each terminal signs in online once; this registers it (default 3 per outlet, `offline_terminal_slots` 1–20 in the API config), allocates stock quotas and stores an encrypted offline grant in IndexedDB.
2. Reload once while online so the service worker caches the app. POS then works offline for up to 72 hours.
3. Queued sales sync automatically when the connection returns; sales rejected for stock/payment conflicts stay queued for review. Clearing browser site data removes offline access and any unsynced sales.

Only POS sales work offline; everything else is online-only.

## Booking push notifications
Notifications always appear in the in-app bell. Browser push additionally needs:
- PHP 8.2+ with cURL, mbstring and OpenSSL; HTTPS everywhere; API `encryption_key` ≥ 64 characters.
- `composer install --no-dev --prefer-dist --optimize-autoloader` in `api/` (installs `minishlink/web-push` into `api/notification-vendor`).
- VAPID keys (`VAPID::createVapidKeys()`) stored outside the web root as `SP_MANAGER_VAPID_PUBLIC_KEY`, `SP_MANAGER_VAPID_PRIVATE_KEY`, `SP_MANAGER_VAPID_SUBJECT` (mailto: or https URL).
- A cron job every minute: `php /absolute/path/to/api/dispatch-notifications.php`

Only users assigned to the outlet with `viewBookings` (and Administrators) receive notifications. Payloads contain no customer details. iOS needs the app installed to the Home Screen.

Reports module details: see `REPORTING-README.md`.
