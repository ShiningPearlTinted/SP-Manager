SP-Manager 1.0.41 — GitHub update package

This source bundle contains the complete project tree. It includes the audit fixes for the Customer Display outlet fallback, a lockfile aligned to version 1.0.41, and a GitHub Pages workflow that uses npm ci.

SECURITY
- The live API config.php is intentionally omitted. It contains database credentials and signing secrets and must never be committed to GitHub.
- Keep the existing config.php on the API host. The repository contains api/config.example.php as a safe template only.
- The root .gitignore excludes api/config.php. Do not remove that rule.

UPDATE STEPS
1. Download and extract this archive.
2. Copy/merge the contents of SP-Manager-main into the root of the existing GitHub repository, keeping the same folder structure.
3. Confirm api/config.php is not present in the repository changes before committing.
4. Push to the main branch. The included GitHub Actions workflow builds frontend/ and deploys frontend/dist to GitHub Pages.
5. The API runs separately from GitHub Pages. If updating the API, upload the PHP source files from api/ to the existing API host while preserving its existing server-side config.php.

AUDIT NOTE
The Customer Display initial update now falls back to the active outlet when its configured outlet value is empty. The frontend dependency lockfile is aligned with package.json. Live deployment and production build were not performed by this package-generation step. The live audit also observed intermittent app-state/relational API database connection warnings; this frontend source bundle does not repair or verify that hosting-side connection issue.
