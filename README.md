# SP-Manager 1.0.70 — Documents update

This package contains the unified Documents register and the existing offline workflow. It includes the frontend, PHP API, SQL migration and build assets; production database exports and duplicate generated files are excluded.

## Build

1. Open frontend.
2. Run npm install.
3. Run npm run build.

Deploy the frontend and API from this package. Apply database/DOCUMENTS-REGISTER-MIGRATION.sql to the existing Central MySQL database to add the Documents permission. Keep using the existing Central MySQL database; the migration does not remove or replace transaction tables. For offline setup, follow OFFLINE-SETUP.md.
