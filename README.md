# SP-Manager 1.0.62 — Clean offline source

This package contains 99 files. It keeps the current frontend, PHP API, offline queue, service worker, SQL upgrade and current database migrations. Old build output, generated copies, production database export and duplicate files are excluded.

## Build

1. Open `frontend`.
2. Run `npm install`.
3. Run `npm run build`.

The build regenerates agent and vendor assets from `build-assets.json` through `scripts/sync-agent.mjs`. Deploy the frontend and API from this same package. Apply `api/UPGRADE-OFFLINE-1.0.62.sql` once to the existing Central MySQL database before using offline sync. See `OFFLINE-SETUP.md`.
