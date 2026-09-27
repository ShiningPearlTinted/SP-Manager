# SP-Manager V9 — Settings + Users & Permissions Central Database

## Hostinger API files
Upload these files to `public_html/app/SP-Manager-api/`:

- `settings.php`
- `users.php`

Do **not** overwrite `config.php`.

## Database tables used
No new SQL import is required when the existing SP-Central schema is present.

- `outlet_settings` — SP-Manager Settings, business day, tax rate, Customer Display terminal configuration
- `company_settings` — My Company / company profile and logo metadata
- `users` — user accounts and password hashes
- `roles` — roles
- `permissions` — permission definitions
- `role_permissions` — role permission mapping
- `user_outlets` — outlet assignment support

## Behaviour
- MySQL is the primary source for Settings and Users when the API is available.
- Browser localStorage remains an offline cache/fallback and is still written for compatibility with the existing app.
- Existing UI and functions are preserved.
- User passwords are stored as PHP password hashes in MySQL; plaintext passwords are not returned by the API.
- Existing local users are migrated to MySQL automatically when the relational Users table is empty.
- Existing local Settings/Company data are migrated automatically when the corresponding Central records are empty.
- Login authenticates against MySQL when available, with the existing local credentials retained only as an offline fallback if the Central API itself is unreachable.

## Test endpoints
After upload:

- `settings.php?action=health&outlet_id=SP01`
- `settings.php?action=all&outlet_id=SP01`
- `users.php?action=health&outlet_id=SP01`
- `users.php?action=list&outlet_id=SP01`

## Important
Hardware test actions in Settings still intentionally communicate with the Windows Local Agent because printers, cash drawers and local serial displays are local hardware functions. Their configuration values are persisted centrally; the physical test itself remains local.
