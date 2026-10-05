# Panduan update SP-Manager 1.0.47 — 6 Oktober 2026

## Database SQL
SQL terbaru anda sudah serasi. TIDAK perlu import semula u729423317_SPCentral.sql, DATA-REPAIR-2026-10-05.sql, SCHEMA-EMPTY atau UPGRADE untuk update ini. Sembilan pembaikan lama sudah ada dalam SQL terbaru. Fail schema/upgrade dalam API hanya untuk pemasangan kosong atau database lebih lama selepas semakan berasingan.

## Cara tukar fail
1. Backup database melalui phpMyAdmin Export dan muat turun salinan fail website sekarang.
2. Extract ZIP penuh. Di dalamnya ada SP-Manager-main-1.0.47.zip dan SP-Manager-api-1.0.47.zip.
3. Extract ZIP API. Upload kandungan folder SP-Manager-api ke lokasi API sedia ada, contohnya public_html/app/SP-Manager-api. Gantikan fail kod termasuk fail tersembunyi .htaccess. Elakkan folder bersarang SP-Manager-api/SP-Manager-api. Kekalkan sp-manager-private.php di luar public_html. Jangan ubah password DB, auth_secret atau encryption_key yang sedang digunakan.
4. Untuk aplikasi production, upload KANDUNGAN SP-Manager-main/frontend/dist ke lokasi frontend sedia ada. Folder ini sudah dibina; jangan upload frontend/src sebagai website production. API yang digunakan frontend ialah https://app.shiningpearltinted.com/SP-Manager-api/app-state.php mengikut tetapan asal. Kedua-dua komponen mesti versi1.0.47.
5. Binaan menggunakan base /SP-Manager/ mengikut vite.config asal. Jika website anda menggunakan URL root / atau /app/, bina semula dengan base yang betul sebelum upload. Laluan File Manager tidak semestinya sama dengan URL subdomain. Kod sumber dan dist disertakan.
6. Refresh dengan Ctrl+F5, logout/login dan pilih outlet yang pengguna memang ditugaskan kepadanya. Dalam Settings > Database, tekan Verify / save database settings.
7. Uji satu jualan staging, email invoice, cetakan invoice, pelanggan Tax exempt dan stok. Semak rekod SQL serta elakkan jualan ujian pada akaun pelanggan sebenar. Jika perlu rollback, pulihkan fail aplikasi/API sebelumnya bersama; jangan import dump lama atas database aktif tanpa pelan pemulihan.

## Pembaikan
Simpanan selepas kegagalan sambungan boleh diteruskan. Tax exempt dikira menggunakan rekod SQL. Invoice browser dan email menggunakan alamat outlet; alamat syarikat menjadi fallback jika alamat outlet kosong. Fungsi Restore web diganti dengan panduan pemulihan melalui alat server ke staging, kerana API tidak membenarkan restore web. API embedded diselaraskan termasuk .htaccess. Versi About, package dan API ialah1.0.47. Fail vendor XLSX tambahan anda dikekalkan.

## Had pengesahan
Ujian dilakukan pada salinan SQL di komputer ini, bukan database hosting aktif. SMTP sebenar, printer, COM, backup cron server, audit dependency CVE terkini dan semua aliran UI browser belum disahkan. Konfigurasi persendirian dan dump pelanggan mentah tidak dimasukkan dalam pakej. Tidak perlu hantar password dalam chat.
