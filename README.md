# SP-Manager 1.0.70 — Documents update

The Documents menu replaces Purchases. Quotation and Invoice remain separate menu pages and keep their existing workflows. The package includes the frontend, PHP API, SQL migration and build assets.

Build: open frontend, run npm install, then npm run build. Apply database/DOCUMENTS-REGISTER-MIGRATION.sql to the existing Central MySQL database. The migration adds Documents access and retains all existing transaction tables. Follow OFFLINE-SETUP.md for offline setup.
