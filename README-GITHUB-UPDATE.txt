SP-Manager 1.0.56 — release notes

Source package: copy the contents of this ZIP to the repository root. Keep `.github` and `.gitignore`. This source release omits generated frontend output, generated agent assets, package-manager files for unused package managers, and production database exports. The frontend build recreates the generated assets from `agent/`.

Never publish a production database export. The `database/` folder is intentionally excluded from this release; `.gitignore` also blocks SQL exports stored there. Keep the SQL schema/migration files under `api/`.

Generated `frontend/dist/` and `frontend/public/sp-manager-agent/` are intentionally omitted. The frontend build creates these from `agent/`; GitHub Actions then deploys `frontend/dist` to Pages. Build locally with `npm ci --prefix frontend` followed by `npm run build`. Set `VITE_API_BASE_URL` for a non-default API host; see `frontend/.env.example`.

Deploy the frontend and API from this same release. The frontend verifies API release 1.0.56 before saving transactions. Back up the database first. On an existing database, run `api/PAYMENT-TYPE-OUTLET-IMAGE-MIGRATION.sql` once if `payment_type_display_images` is missing. Configure SQL credentials on the PHP host using `api/SQL-CONNECTION-SETUP.md`. Do not import a production dump to apply an upgrade.

To update the Windows Local Agent, run the root `RESTART-SP-MANAGER-LOCAL-AGENT.bat`. `agent/install-windows.bat` delegates to that SHA-256-verified installer. For fullscreen Customer Display, install the agent on the POS computer and enable the secondary monitor with Windows set to Extend.
