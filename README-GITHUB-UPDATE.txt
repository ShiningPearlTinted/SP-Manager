SP-Manager 1.0.54 — release notes

Source package: copy the contents of this ZIP to the repository root. It has fewer than 100 files. Keep .github and .gitignore. If the repository already contains generated/obsolete files, remove `frontend/dist/`, `frontend/public/sp-manager-agent/`, `frontend/public/RESTART-SP-MANAGER-LOCAL-AGENT.bat`, `pnpm-lock.yaml`, `frontend/pnpm-workspace.yaml` and `REMOVED-FILES.json`; `.gitignore` does not remove files already tracked.

Never publish a production database export. The `database/` folder is intentionally excluded from this release; `.gitignore` also blocks SQL exports stored there. Keep the SQL schema/migration files under `api/`.

Generated `frontend/dist/` and `frontend/public/sp-manager-agent/` are intentionally omitted. The frontend build creates these from `agent/`; GitHub Actions then deploys `frontend/dist` to Pages. Build locally with `npm ci --prefix frontend` followed by `npm run build`.

Deploy the frontend and API from this same release. The frontend verifies API release 1.0.54 before saving transactions. Back up the database first. On an existing database, run `api/PAYMENT-TYPE-OUTLET-IMAGE-MIGRATION.sql` once if `payment_type_display_images` is missing. Do not import a production dump to apply an upgrade.

To update the Windows Local Agent, run the root `RESTART-SP-MANAGER-LOCAL-AGENT.bat`. `agent/install-windows.bat` delegates to that SHA-256-verified installer. For fullscreen Customer Display, install the agent on the POS computer and enable the secondary monitor with Windows set to Extend.
