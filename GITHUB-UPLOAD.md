# GitHub source upload (under 100 files)

Extract this ZIP. Upload the CONTENTS of SP-Manager-main/ to the repository root, not the ZIP or an extra wrapper folder. Include .github/workflows/pages.yml. Use a desktop folder picker that includes hidden .github files, or upload that workflow separately if the picker hides it.

GitHub Actions builds frontend/dist automatically. node_modules, generated dist and demo pages are excluded. Existing canonical agent files, the three distinct public agent variants and the distinct public restart script are retained; sync-agent.mjs regenerates the remaining public copies during build.

Keep the production API config.php on the API server; do not replace it with the repository example. Historical SQL, production SQL backup, tests and old documentation are preserved in the separate PRIVATE archive and original full ZIP. Do not upload the private archive to the repository.

For an EXISTING repository, GitHub upload adds/replaces files but does not remove old files already tracked. This ZIP is fewer than 100 files per upload; deleting existing generated files is a separate repository change, not performed here.

For Booking installation, follow BOOKING-INSTALL.md. Only apply database/migrations/booking-v1.sql to upgrade Booking. This source cleanup does not deploy or alter the live database.
