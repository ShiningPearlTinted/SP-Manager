# SP-Manager 1.0.58

GitHub source package for SP-Manager. Use the contents of this ZIP as the repository root. It keeps application source, required migrations, npm lockfiles, and the GitHub workflow. It omits generated `frontend/dist`, generated agent copies, and production database exports. This archive contains 99 files, within the 100-file upload limit.

## Build the frontend

From `frontend/`, run `npm ci` and `npm run build`. The prebuild script copies the canonical local agent assets from `agent/` into the public folder. Deploy the resulting `frontend/dist` separately from this source archive.

## Configure the API

Use PHP 8.1 or later with PDO MySQL and OpenSSL. Before running the API, copy `api/config.example.php` to `api/config.php` or configure a private config file outside `public_html`. Configure database credentials and API secrets on the PHP host. Do not commit real credentials or encryption keys. Keep `auth_secret`, `encryption_key`, and `hr_encryption_key` separate and stable. The HR key is read from `SP_MANAGER_HR_ENCRYPTION_KEY`, or from `hr_encryption_key` in the private config array. Each key must be at least 64 characters.

## HR migrations

Back up the database and test against a staging copy first. For a database without HR, apply `database/migrations/hr-phase1.sql`. Then apply `database/migrations/hr-phase3-payslip.sql`. Do not re-run a migration if its tables already exist. Never import the attached production SQL dump as an upgrade; it contains live records.

After migration, assign `viewHrEmployees`, `viewHrSalary`, and `manageHrSalary` to the appropriate roles through Users & Permissions. HR outlet access follows the user's assigned outlets. The HR key is required to protect sensitive employee fields; keep a secure backup of it because rotating or losing the key prevents decryption of existing fields.

## Payslips

The Payslip tab supports monthly payslip drafts, manual earnings and deductions, review/edit of drafts, issuing, and browser printing. Monthly basic pay and fixed allowance are prefilled from the employee salary profile; daily/hourly staff enter the actual period amount. Verify amounts before saving. Statutory deductions such as EPF, SOCSO, EIS, and PCB are entered by the payroll administrator; the app does not calculate statutory rates. Issued payslips are locked unless voided with a reason.

Deploy the frontend build and API from this same release. Do not overwrite a production `api/config.php` with the source placeholder config. No production database changes or deployment are performed by preparing this source package.
