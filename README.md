# SP-Manager 1.0.70

GitHub source package for SP-Manager. Use the contents of this ZIP as the repository root. It keeps application source, required migrations, npm lockfiles, and the GitHub workflow. It omits generated `frontend/dist`, generated agent copies, and production database exports. This archive contains no more than 100 files.

## Database setup

The source package stays below GitHub's 100-file web upload limit. It omits generated `frontend/dist` and duplicate public agent copies; the build regenerates those from `agent/`. It includes the current schema-only `database/u729423317_SPCentral.sql` with no production row data. Use it only to initialize a new empty MariaDB database. It was generated from MariaDB 11.8 and uses that release family's collation; confirm compatibility before importing on another server. Never import it over an existing database.

For an existing database, back it up and apply only the missing additive migration. `api/UPGRADE-1.0.51.sql` covers the older car battery and payment type image structures. Apply Booking migrations in `database/migrations/booking-v1.sql` and, for the website bridge, `booking-website-bridge.sql`. Apply HR migrations in the order listed under HR migrations below. Do not rerun migrations unless their instructions explicitly permit it.

Configure `SP_MANAGER_DB_HOST`, `SP_MANAGER_DB_PORT`, `SP_MANAGER_DB_NAME`, `SP_MANAGER_DB_USER`, `SP_MANAGER_DB_PASSWORD`, `SP_MANAGER_DB_CHARSET`, `SP_MANAGER_AUTH_SECRET`, `SP_MANAGER_ENCRYPTION_KEY`, `SP_MANAGER_HR_ENCRYPTION_KEY`, `SP_MANAGER_BACKUP_DIR`, and `SP_MANAGER_ALLOWED_ORIGINS` privately on the PHP host. Alternatively, use a private `sp-manager-private.php` outside `public_html`. Set `VITE_API_BASE_URL` to the API directory when building for a different host. For a new empty database, run `php api/bootstrap-admin.php` once from a trusted terminal after importing the schema and configuring the API. It creates the initial outlet and administrator only if there are no users.
## Local Agent\n\nThe Windows Local Agent can be installed or repaired with `RESTART-SP-MANAGER-LOCAL-AGENT.bat`. For a new installation, use `agent/install-windows.bat`. Run it in the Windows account used for SP-Manager POS. Keep pairing tokens private.\n\n## Build the frontend

From `frontend/`, run `npm ci` and `npm run build`. The prebuild script copies the canonical local agent assets from `agent/` into the public folder. Deploy the resulting `frontend/dist` separately from this source archive.

## Configure the API

Use PHP 8.1 or later with PDO MySQL and OpenSSL. Before running the API, copy `api/config.example.php` to `api/config.php` or configure a private config file outside `public_html`. Configure database credentials and API secrets on the PHP host. Do not commit real credentials or encryption keys. Keep `auth_secret`, `encryption_key`, and `hr_encryption_key` separate and stable. The HR key is read from `SP_MANAGER_HR_ENCRYPTION_KEY`, or from `hr_encryption_key` in the private config array. Each key must be at least 64 characters.

## HR migrations

Back up the database and test against a staging copy first. For a database without HR, apply `database/migrations/hr-phase1.sql`. Then apply `database/migrations/hr-phase3-payslip.sql`, followed by `database/migrations/hr-phase3-salary-advance.sql`, and finally `database/migrations/hr-phase4-operations.sql`. Phase 4 adds attendance, shifts, leave, overtime, claims and secure HR document storage. Run each migration once in this order. Do not re-run migrations if their tables or columns already exist. Never import a production SQL dump as an upgrade; it may contain live records.

After migration, assign `viewHrEmployees`, `viewHrSalary`, and `manageHrSalary` to the appropriate roles through Users & Permissions. HR outlet access follows the user's assigned outlets. The HR key is required to protect sensitive employee fields; keep a secure backup of it because rotating or losing the key prevents decryption of existing fields.

## Payslips

The Payslip tab supports monthly payslip drafts, manual earnings and deductions, salary advance repayment, review/edit of drafts, issuing, browser printing, and a responsive payslip layout with clearer headings and spacing. Payslip labels and email/WhatsApp copy use English. Issued payslips can be emailed to the employee email saved in HR with the payslip PDF attached; configure and enable SMTP under Settings > Email first. WhatsApp can share the PDF through the device share sheet when supported. Otherwise, the app downloads the PDF and opens the employee WhatsApp chat so the user can attach the file and press Send. WhatsApp requires user confirmation; a web page cannot silently attach a file to a chat. Issue and void actions use an in-app confirmation dialog. Record a salary advance from the employee profile after the advance has been paid. On Payslip, choose its outstanding balance and repayment amount; the repayment appears as a deduction and reduces the balance only when the payslip is issued. The system does not transfer money. Monthly basic pay and fixed allowance are prefilled from the employee salary profile; daily/hourly staff enter the actual period amount. Verify amounts before saving. Statutory deductions such as EPF, SOCSO, EIS, and PCB are entered by the payroll administrator; the app does not calculate statutory rates. Issued payslips are locked unless voided with a reason.

Deploy the frontend build and API from this same release. Do not overwrite a production `api/config.php` with the source placeholder config. No production database changes or deployment are performed by preparing this source package.

Release 1.0.70 activates Attendance, Shift & Schedule, Leave Management, Overtime, Payroll, Claims & Advances, HR Documents and HR Reports. Payroll is summarized from payslips; leave and overtime support pending, approved and rejected states; approved claims can be marked paid. HR Documents are encrypted before storage, require the HR encryption key and the HR Sensitive Data permission, and support PDF, JPG and PNG files up to 5 MB. HR Reports can be exported to CSV. Continue using HR Settings for HR master data and administrator-only payslip reset. Statutory payroll deductions remain manually entered on payslips and are not calculated automatically.

Release 1.0.69 supports multiple salary advance repayments on one draft payslip. The salary advance migration creates `hr_payslip_salary_advances` and backfills existing links. For an existing database that already ran the original migration, apply only its appended CREATE TABLE and INSERT statements once.

Grant HR permissions in Users & Permissions: `viewHrEmployees` for employee and operations screens; `manageHrEmployees` to maintain attendance, schedules, leave, overtime and HR documents; `viewHrSalary` and `manageHrSalary` for payroll, payslips, advances and claims; `viewHrSensitive` to view/download HR documents; and `manageHrSettings` for HR master settings. Document upload requires employee-management access, and documents are encrypted with the configured HR encryption key.
