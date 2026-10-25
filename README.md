# SP-Manager Reporting — SATU ZIP, 99 fail untuk GitHub

Pakej ini mengekalkan source penuh POS, Dashboard, Products, Inventory, Customers, Purchases, HR, Booking dan Reporting. Tiada data SQL production diubah dan tiada skrin direka semula. Versi dan konfigurasi asal dikekalkan.

## Muat naik ke GitHub
1. Extract ZIP ini. Buka folder SP-Manager di dalamnya.
2. Muat naik kandungan folder itu sebagai root repository, termasuk .github, frontend, api, scripts, database dan build-assets.json. Jangan upload folder SP-Manager sebagai lapisan folder tambahan.
3. Pakej mengandungi 99 fail biasa sebelum build. Had kurang daripada 100 fail dipenuhi dalam SATU muat naik. Tidak perlu dua bahagian.
4. Jangan extract MAINTENANCE.zip sebelum muat naik GitHub. Arkib itu satu fail sokongan dalam repository; kandungannya tidak diperlukan oleh build biasa.
5. Workflow GitHub Pages asal dikekalkan. npm prebuild membaca build-assets.json lalu menjana semula agent, vendor Excel, lesen dan public assets sebelum Vite membina frontend/dist. Tiada download tambahan atau library ZIP tambahan diperlukan untuk proses pemulihan aset ini.

## Mengapa jumlah fail berkurang
- 18 aset canonical/public/vendor disimpan secara lossless dalam build-assets.json. Skrip scripts/sync-agent.mjs mengesahkan SHA256 dan memulihkan byte asal. Lapan salinan public agent yang sama dijana dari canonical yang sama; varian public yang berbeza tetap dipelihara.
- frontend/dist ialah output build dan tidak perlu diduplikasi sebagai source GitHub. Salinan deployment terakhir masih tersedia dalam MAINTENANCE.zip, di archived/frontend/dist/.
- SQL maintenance API, tests, nota handoff dan SQL versi lama dikumpulkan dalam MAINTENANCE.zip, bukan dibuang secara kekal. Enam migration semasa bagi HR/Booking masih berada dalam database/migrations/.
- api/common.php dan api/db.php dikeluarkan daripada runtime kerana helper router lama itu tiada rujukan. api/index.php yang memberi respons legacy 410 dikekalkan.
- Helper JavaScript centralReportsRequest yang tidak lagi dipanggil dikeluarkan. React tidak dibuang kerana diperlukan oleh compiler JSX. Logic aplikasi lain tidak diubah.
- Metadata pnpm kosong/tidak digunakan diarkibkan. npm package.json dan package-lock.json yang digunakan workflow kekal.

## Pembangunan dan pemasangan
Dalam frontend jalankan npm ci, kemudian npm run build. Skrip prebuild akan menjana semua aset yang diperlukan secara automatik. Untuk hanya menjana aset tanpa build, jalankan node scripts/sync-agent.mjs dari root projek.

Selepas build, frontend/dist ialah folder untuk hosting statik /SP-Manager/. Fail agent yang dimuat turun melalui aplikasi kekal pada URL lama, dengan kandungan yang sama. Jika mahu menggunakan installer agent terus dari source sebelum build, jalankan generator dahulu supaya folder agent dan RESTART-SP-MANAGER-LOCAL-AGENT.bat tersedia. Pengguna POS yang memuat turun installer daripada aplikasi siap deploy tidak memerlukan Node.

API ialah source PHP dalam api/. Kekalkan config.php sebenar di server, auth secret dan encryption keys sedia ada ketika deployment. Jangan gantikan konfigurasi production dengan template source. Perubahan cleanup ini tidak memerlukan SQL migration.

Baca REPORTING-README.md untuk pemasangan Reports, 38 laporan, permissions dan batasan data. Reporting serta pembetulan penjajaran tajuk, angka dan TOTAL kekal dalam pakej ini.

## Arkib sokongan dalam fail yang sama
MAINTENANCE.zip mengandungi:
- archived/: fail rujukan lama, helper retired, output deployment terakhir serta salinan source sebelum cleanup.
- database-tools/api/: schema terkini dan feature migrations API yang mungkin diperlukan untuk pemasangan database baharu/penyelenggaraan.
- test-suite/tests/: semua tests asal HR dan Reporting.

Untuk database baharu, extract hanya script yang diperlukan dan ikuti api/SQL-CONNECTION-SETUP.md. Jangan import schema penuh ke atas database aktif sebagai cara update Reporting. Untuk menjalankan tests, extract test-suite/tests ke folder tests dalam salinan kerja dan gunakan database localhost test yang dinyatakan dalam panduan; bukan production.

CLEANUP-MANIFEST.json merekod fail yang dipindah, hash asal dan satu helper code yang dibuang. Semua fail asal boleh dipulihkan daripada source yang dikekalkan, bundle aset, atau arkib. Mengekstrak arkib/generator akan menambah fail tempatan seperti lazimnya build; .gitignore mengecualikan aset dan dist yang dijana. Muat naik pakej bersih sebelum menjalankan build tempatan jika menggunakan GitHub web uploader.

## Pengesahan
- Source aplikasi/Reports/POS/HR/Booking selain helper tidak digunakan kekal byte-exact.
- Semua public assets selepas generator sama dengan versi sebelumnya; canonical agent dan installer turut sama.
- Bundle frontend berjaya dikompilasi. CSS kekal byte-exact; JavaScript hanya mempunyai perubahan source helper yang dibuang dan penamaan semula oleh minifier.
- Semua PHP runtime yang dikekalkan disemak sintaks dan rujukan include.
- Tests dan migrasi disimpan; tiada transaksi, perubahan database production, pemasangan servis atau muat naik GitHub dilakukan semasa cleanup.

Jika repository lama sudah mengandungi fail generated/archive lama, upload fail baharu sahaja tidak memadam fail yang sudah tracked. Gunakan CLEANUP-MANIFEST.json sebagai senarai rujukan selepas backup untuk membersihkan tracked files tersebut, atau gunakan pakej bersih ini sebagai kandungan repository baharu.
