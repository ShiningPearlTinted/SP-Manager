# SP-Manager

Release 1.0.70. React frontend (`frontend/`) + PHP API (`api/`) on one Central MySQL/MariaDB database. No per-outlet database is created. Frontend and API must be deployed together: the app refuses to save transactions unless `api/version.php` reports the same release.

| Folder | Contents |
|---|---|
| `frontend/` | Vite + React source. `npm run build` → `frontend/dist/` |
| `api/` | PHP 8.2+ endpoints. Upload to the `SP-Manager-api` folder on the host |
| `database/SCHEMA-CURRENT.sql` | Full current schema, structure only (106 tables) |
| `database/migrations/` | Changes still to apply to the live database (only `collation-normalize-v1.sql` remains) |
| `build-assets.json` | Canonical POS agent + Excel vendor files; `scripts/sync-agent.mjs` writes them into `agent/` and `frontend/public/` before every build |

## GitHub upload
Upload the **contents** of this folder to the repository root, including `.github/workflows/pages.yml` and `.gitignore`. GitHub Actions builds `frontend/dist` on every push to `main`. `node_modules/`, `frontend/dist/`, generated agent copies, secrets and database dumps are not committed. GitHub's web uploader accepts 100 files per upload; if needed, upload `api/` first and the rest second (the whole project is 93 files, so one upload also works). Uploading never deletes files already in the repository — delete removed files in GitHub separately.

## API configuration
The API reads its configuration from `sp-manager-private.php` placed beside `public_html` (outside the website), or from environment variables. Required values:

- `SP_MANAGER_DB_HOST`, `SP_MANAGER_DB_PORT`, `SP_MANAGER_DB_NAME`, `SP_MANAGER_DB_USER`, `SP_MANAGER_DB_PASSWORD`, `SP_MANAGER_DB_CHARSET` (default `utf8mb4`)
- `SP_MANAGER_AUTH_SECRET`, `SP_MANAGER_ENCRYPTION_KEY`, `SP_MANAGER_HR_ENCRYPTION_KEY` — three different random values, each at least 64 characters
- `SP_MANAGER_BACKUP_DIR` — writable path outside the web root
- `SP_MANAGER_ALLOWED_ORIGINS` — comma-separated frontend origins (CORS)

`sp-manager-private.php` returns the same array as `api/config.php` and takes precedence over environment variables. Never put credentials in the frontend, the repository or a public folder. Keep the production `config.php` on the server.

**Website booking bridge:** on the server only, create `api/booking-bridge-key.php` containing
`<?php return ['site'=>'https://shiningpearltinted.com','secret'=>'<random 64+ characters>'];`
and enter the same secret in WordPress > SP Booking > Website Connection. Never commit this file.

Set `VITE_API_BASE_URL` at build time to the API folder URL (default `https://app.shiningpearltinted.com/SP-Manager-api`) and add the frontend origin to `SP_MANAGER_ALLOWED_ORIGINS`.

## Database
- **New install:** import `database/SCHEMA-CURRENT.sql` into an empty database, configure the API, then run `php api/bootstrap-admin.php` once from a terminal (creates outlet SP01 and the first Administrator; refuses to run over HTTP or when users exist).
- **Live database:** back up, then run `database/migrations/collation-normalize-v1.sql` once.
- Check required tables/columns any time with `database-health.php`. Never import a production dump as an upgrade, and never commit one.

## Offline POS
1. Each terminal signs in online once; this registers it (default 3 per outlet, `offline_terminal_slots` 1–20 in the API config), allocates stock quotas and stores an encrypted offline grant in IndexedDB.
2. Reload once while online so the service worker caches the app. POS then works offline for up to 72 hours.
3. Queued sales sync automatically when the connection returns; sales rejected for stock/payment conflicts stay queued for review. Clearing browser site data removes offline access and any unsynced sales.

Only POS sales work offline; everything else is online-only.

## Booking push notifications
Notifications always appear in the in-app bell. Browser push additionally needs:
- PHP 8.2+ with cURL, mbstring and OpenSSL; HTTPS everywhere; API `encryption_key` ≥ 64 characters.
- `composer install --no-dev --prefer-dist --optimize-autoloader` in `api/` (installs `minishlink/web-push` into `api/notification-vendor`).
- VAPID keys (`VAPID::createVapidKeys()`) stored outside the web root as `SP_MANAGER_VAPID_PUBLIC_KEY`, `SP_MANAGER_VAPID_PRIVATE_KEY`, `SP_MANAGER_VAPID_SUBJECT` (mailto: or https URL).
- A cron job every minute: `php /absolute/path/to/api/dispatch-notifications.php`

Only users assigned to the outlet with `viewBookings` (and Administrators) receive notifications. Payloads contain no customer details. iOS needs the app installed to the Home Screen.

Reports module details: see the *Reporting* section at the end of this file.

## Changelog

### Staff password security (2026-11)
- Administrators can reset another user's password from **Users & Permissions > Reset password**. A random temporary password (`Tint-` + 6 digits) is shown once; it is stored only as a hash, the user is signed out on all devices and must choose a new password (12+ characters) at the next sign-in. Administrators cannot reset their own password this way.
- While a temporary password is active the API only allows changing it or signing out (`PASSWORD_CHANGE_REQUIRED`).
- New endpoint `users.php?action=change-password` for the signed-in user; it ends other sessions and returns a fresh token.
- Password hashes are upgraded automatically on sign-in (`password_needs_rehash`).
- Sign-in lockout tightened: 5 failed attempts per username + IP within 15 minutes lock that pair for 15 minutes (HTTP 429). The per-IP limit is unchanged.
- `users.must_change_password` is part of `database/SCHEMA-CURRENT.sql` (already applied in production).

---

## SP-Manager — Reporting keseluruhan projek

Tarikh: 26 Oktober 2026. Modul ini berada dalam menu Reports sedia ada, bukan HR Management. Production belum dikemas kini.

### Kandungan
38 pilihan laporan mengikut enam kategori Aronium: Sales (23), Purchase (10), Stock return (1), Loss and damage (1), Finance (1), Stock control (2). Termasuk carian laporan, penapis yang sesuai untuk setiap jenis, subgroups, date range, preview SQL, pagination, totals semua rekod, Print, XLSX sebenar dan PDF A4 landscape.

Rujukan sebenar: gambar 001.PNG/002.PNG; language catalogue dan template .frx di Aronium.zip. Template SQLite digunakan untuk memahami fungsi dan tanda refund, kemudian dipadankan kepada skema MySQL SP-Manager. Tiada DLL/installer Aronium dimasukkan ke pakej ini.

### Fail perubahan
Dua fail asal diubah:
- frontend/src/main.jsx: import ReportingPage, wrapper Reports dan render Reports sahaja.
- api/reports.php: tambahan dispatch untuk action laporan baharu sahaja. Action summary lama kekal byte-for-byte.

Fail baharu:
- frontend/src/reporting/reporting-page.jsx
- frontend/src/reporting/reporting.css
- frontend/src/reporting/report-exports.js
- api/reporting-lib.php
- api/reporting-dispatch.php
- api/reporting-pdf.php
- tests/reporting-engine.php, reporting-http.mjs, reporting-regression.py

Skrin POS, Dashboard, Login, Price Tag, Products, Customers, Purchases, HR, Booking dan CSS global tidak diubah. Bukti regression menunjukkan 141 fail asal di luar perubahan Reports sama dengan ZIP input. JS/CSS hasil compile memang berubah kerana mengandungi modul Reports baharu.

### Pemasangan
1. Backup frontend serta api/reports.php semasa.
2. Gunakan ZIP UPDATE untuk deployment minimum: upload kandungan frontend ke folder /SP-Manager/. Overlay hanya empat fail dalam api ke folder API aktif: reports.php, reporting-lib.php, reporting-dispatch.php, reporting-pdf.php.
3. Kekalkan config.php, security.php, hardening.php dan semua fail API lain di server. Jangan menggantikan credential/config production dengan template source.
4. Tiada SQL migration baharu. Jangan import semula dump SQL untuk update Reporting. Ujian telah menggunakan skema SQL terkini yang diberikan.
5. Pastikan pengguna mempunyai manageReports dan assignment outlet yang sah. Administrator juga mesti assigned ke outlet. Refresh browser/clear cache, masuk Reports, pilih laporan dan Show report.
6. ZIP FULL mengandungi source projek lengkap berdasarkan ZIP input, frontend/dist siap compile, API projek, tests dan panduan. Untuk hosting manual, gunakan kandungan frontend/dist. Untuk GitHub/source, overlay fail source yang diperlukan sahaja; jangan upload frontend/dist sebagai pengganti folder src.

Backend: PHP 8.1+ 64-bit, PDO MySQL dan iconv. Enjin menggunakan auth/permission/outlet guard sedia ada; action baharu GET sahaja, statement terikat dan transaksi read-only pada isolation REPEATABLE READ. Tiada hak pengguna, record lama atau kadar cukai ditulis/ditukar.

### Makna data dan batasan yang dipaparkan
- Header total/diskaun/cukai diagih kepada item mengikut nilai baris tersimpan, dengan integer cents dan remainder tepat. Jumlah item reconcile dengan header.
- Profit menggunakan cost_snapshot sejarah sahaja. Jika snapshot tiada, cost/profit dipaparkan sebagai unknown; harga kos semasa tidak mengganti sejarah.
- Refund ialah event negatif pada refund_date untuk product/group/customer/user/daily/profit dan item-list. Original sales kekal pada sale_date. Cukai refund diagih berkadar daripada cukai dokumen asal kerana tiada refund-tax table; jumlah refund sebenar tetap reconcile. Diskaun refund terperinci tidak direka.
- Hourly dan hourly by groups menunjukkan gross sales events seperti template Aronium hourly. Tender report menunjukkan receipt yang direkod, tanpa meneka kaedah cash refund yang tiada tender split.
- Invoice/unpaid lists berdasarkan dokumen asal dan payment yang direkod. Partial refund bukan automatic credit allocation kepada baki asal, kerana allocation tersebut tidak disimpan.
- Purchase payments/unpaid menggunakan purchases.data_json. Rekod lama tanpa paid/payment metadata kekal unknown, bukan dianggap paid atau unpaid secara automatik. Item discounts menggunakan metadata tersimpan sahaja.
- Collected credit payments menunjukkan explicit invoice collections dalam document_payments mengikut paid_at. POS creditPayment flag dalam frontend tidak disimpan sebagai marker relasional khusus; jangan menganggap laporan ini senarai lengkap POS credit collections lama. Tiada perubahan skrin Sales/Payments dibuat untuk menambah marker tersebut.
- Finance menggabungkan canonical sale_payments, recorded supplier payments dan cash movements. Invoice/deposit collections berasingan dilaporkan dalam Collected credit payments untuk mengelakkan pengiraan data yang berpotensi mirror dua kali. Ini transaction history sumber tersebut, bukan general ledger lengkap.
- Tarikh luput menggunakan metadata expirationDate/expiryDate/expiration_date yang sudah direkod. Penapis menggunakan tarikh luput, bukan purchase date. Kuantiti ialah batch yang dibeli; remaining per-batch stock tidak dapat diketahui kerana skema tiada batch allocation.
- Stock return/loss/damage memerlukan movement_type yang jelas; notes biasa tidak diteka sebagai transaksi loss/return.
- Reorder menggunakan min_stock sebagai reorder point dan preferred_quantity sebagai target, mengikut template Aronium. Low stock warning menggunakan metadata warning flag/quantity jika wujud, atau konfigurasi min_stock. Stock ialah snapshot semasa, bukan baki sejarah pada tarikh pilihan.
- Historical tax-rate IDs tiada. Tax rates report menunjukkan effective rates daripada recorded net/tax, bukan current tax master. Product/group names menggunakan master semasa kecuali nama item jualan yang ada snapshot.
- Cash register filter hanya digunakan untuk starting cash kerana sale schema tiada terminal/register link yang boleh dipercayai. Penapis tidak sesuai dinyahaktifkan dan backend menolaknya jika dihantar secara manual.
- Document/tender lists dengan product/group filter menunjukkan full document/payment amount apabila ada item sepadan; item-based reports menunjukkan allocated selected amounts. Nota ini dipaparkan dalam report.
- Preview 50 rows setiap page; totals/exports merangkumi semua rows. Maksimum 50,000 source rows dan period sepuluh tahun; request terlalu besar ditolak, bukan dipotong senyap.
- Excel mengekalkan Unicode dan nilai numerik. PDF download menggunakan Helvetica/WinAnsi dan mengembalikan mesej untuk menggunakan Print / Save PDF atau Excel jika ada aksara yang tidak disokong, tanpa menukar nama kepada tanda soal. PDF memendekkan sel sangat panjang dengan ellipsis; Excel mengekalkan teks penuh.
- Preview/Excel menggunakan result yang sudah dijana; PDF download membaca semula filter yang sama dalam snapshot baharu. Tekan Show report semula jika data berubah sebelum eksport. Filter berubah menutup akses eksport sehingga preview diperbaharui.

### Audit input dan compatibility
Nama ZIP frontend 1.0.61, tetapi package.json, lockfile dan api/version.php di dalamnya menyatakan 1.0.70. Nilai versi asal tidak diubah. Source frontend juga mempunyai ensureApiRelease lama yang membandingkan 1.0.56; mismatch itu sudah ada dalam input dan tidak dibaiki kerana scope melarang perubahan skrin/fungsi lain. Validate transaksi asal pada staging sebelum deploy full project; update Reports sendiri tidak menggunakan gate tersebut.

Beberapa fail API dalam ZIP standalone berbeza daripada API dalam ZIP frontend (booking, car-batteries, payment-types, relational-data/sync, settings). Full source mengekalkan API dari project archive; ZIP UPDATE hanya menyentuh empat fail Reports dan sesuai untuk mengelakkan replacement tidak berkaitan. reports.php asal sepadan antara kedua-dua ZIP sebelum extension ini.

Build frontend disahkan melalui esbuild CLI 0.28.2; React/ReactDOM yang digunakan sepadan dengan lockfile (19.3.0). npm/Vite build standard tidak dijalankan untuk kemas kini Reporting ini supaya prebuild asal tidak menjana semula agent yang tidak berkaitan. Public/static agent assets deployment dikekalkan daripada release input. Source scripts/package files asal tidak diubah. Pakej penuh tidak memasukkan node_modules, dump data production rujukan, token ujian atau config daripada ZIP API standalone.

### Pengesahan
- 71 semakan integration pada fresh local clone daripada SQL terkini, ditambah 1 semakan exact allocation amaun besar selepas hardening; 54 semakan HTTP diulang pada enjin akhir (126 semakan unik).
- Semua 38 report berjaya pada SQL sebenar dan fixture; fixture meliputi header allocation, refund, original cost, missing metadata, outlet isolation, subgroup selection, expiry dates, stock dan idempotent read-only output.
- Checksum semua jadual sebelum/selepas suite read-only sama. Tiada production connection atau migration dibuat.
- Semua 51 fail PHP API lulus syntax. Regression mengekalkan 141 fail asal dan membuktikan perubahan main.jsx terhad pada Reports; summary lama tidak berubah.
- Browser: search, Sales/Purchase selection, filter swap customer/supplier, selected product, stale export guard, Show report, download XLSX/PDF berjaya. XLSX yang dimuat turun dibaca semula dan numeric total disahkan.
- Print HTML: numeric headings/details/totals right-aligned pada tepi lajur yang sama; alignment preview turut disahkan melalui computed styles. PDF single/multipage 15 halaman diparse, dirender dan disemak pada halaman pertama/akhir. Footer/page size A4 landscape sah.
- Responsive viewport 390x844: satu kolum; body 375px, tiada horizontal body overflow. Jadual laporan boleh scroll secara mendatar dalam container bila perlu.
- Physical printer, transaksi jualan sebenar dan production deployment belum diuji/dilakukan. Ini bukan dakwaan semua data sejarah setara sepenuhnya dengan Aronium jika medan asal tidak disimpan dalam SP-Manager.

### Ulang tests dan rollback
Tests tidak boleh menggunakan production config. reporting-engine.php memerlukan REPORT_TEST_API_DIR kepada API copy dengan localhost DB prefix spm_reporting_test dan REPORT_TEST_OUTPUT_DIR. Ia menjangka fresh clone SQL tanpa fixture REPORT_A/REPORT_B. reporting-http.mjs memerlukan folder output fixture yang sama dan REPORT_TEST_BASE localhost. reporting-regression.py memerlukan REPORT_ORIGINAL_ZIP kepada ZIP input dan pilihan REPORT_PROJECT_ROOT.

Rollback: restore assets/frontend dan reports.php daripada backup; buang hanya tiga fail PHP extension serta source reporting yang ditambah apabila tiada lagi import. Tiada rollback SQL diperlukan. config.php/permission/security tidak berubah.

