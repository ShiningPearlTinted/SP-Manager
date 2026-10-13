# Configure the SQL connection

The frontend talks to the PHP API; the PHP API connects to MySQL/MariaDB. The ZIP does not contain database credentials. Configure these values on the PHP host, outside the public web directory:

- `SP_MANAGER_DB_HOST`, `SP_MANAGER_DB_PORT`, `SP_MANAGER_DB_NAME`
- `SP_MANAGER_DB_USER`, `SP_MANAGER_DB_PASSWORD`, `SP_MANAGER_DB_CHARSET` (defaults to `utf8mb4`)
- `SP_MANAGER_AUTH_SECRET` (at least 64 random characters)
- `SP_MANAGER_ENCRYPTION_KEY` (a separate random value, at least 64 characters)
- `SP_MANAGER_BACKUP_DIR` (writable path outside the web root)
- `SP_MANAGER_ALLOWED_ORIGINS` (comma-separated exact frontend origins)

Alternatively, place `sp-manager-private.php` beside the host's `public_html` directory. It must return the same configuration array used by `config.example.php`; when this private file is found, it takes precedence over environment variables. Do not put database passwords or keys in the frontend, Git repository, SQL dump, or a public `api/` folder.

For a new empty database, import `SCHEMA-EMPTY-1.0.51.sql`, then apply the required later additive migrations for the features being enabled. For an existing database, take a backup and apply only the documented additive migration that its schema is missing; do not import a production dump as an upgrade. Confirm required tables and columns with `database-health.php` after configuration.

The empty schema has no outlet or administrator account. After configuring the API and importing the schema, run `php api/bootstrap-admin.php` once from a trusted terminal. It creates SP01 and the first Administrator only when `users` is empty, prompts for a password without echoing it, and cannot run over HTTP.

Set `VITE_API_BASE_URL` in the frontend build environment to the API folder URL (the directory containing `app-state.php`). The app defaults to `https://app.shiningpearltinted.com/SP-Manager-api`. Rebuild the frontend after changing it. Add the deployed frontend origin to `SP_MANAGER_ALLOWED_ORIGINS` so browser API requests pass CORS.

Do not copy the `database/` folder from older release archives. It may contain live business data and is not needed to connect the application to SQL.
