# SP-Manager — audited source package

Source supplied as `SP-Manager-main 1.0.63.zip` identifies itself internally as release 1.0.70 in frontend and API package metadata. The package preserves that internal release identity.

The API uses the existing Central MySQL database. No per-outlet database is created. See `SQL-CONNECTION-SETUP.md` for deployment and schema guidance.

The archive excludes database business records, deployment secrets, generated frontend build output, generated agent copies, and stale handoff/cleanup bundles. `scripts/sync-agent.mjs` restores bundled agent and public assets before `npm run build` or `npm run dev`.
