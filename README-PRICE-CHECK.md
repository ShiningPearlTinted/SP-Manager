# PRICE CHECK — Panduan update

Pakej ini menambah Price Check > Product dan Car Battery kepada projek Management UI yang telah dibetulkan. Frontend sudah siap build; tidak perlu build sendiri jika lokasi aset kekal /SP-Manager/ seperti pakej asal.

## Langkah pemasangan

1. Backup database dan folder frontend/API sedia ada dahulu.
2. Extract PRICE-CHECK-READY-UPDATE.zip di komputer.
3. Buka phpMyAdmin, pilih database SP-Manager yang sedang digunakan, kemudian Import fail PRICE-CHECK-MIGRATION.sql. Ini hanya menambah jadual car_batteries; tidak memadam atau menggantikan data sedia ada. Jangan import dump database lama atau SCHEMA-EMPTY untuk kemas kini ini.
4. Upload DUA fail dalam SP-Manager-api/ daripada ZIP update: car-batteries.php dan security.php ke folder API yang sedang digunakan. security.php berasaskan API 1.0.47 projek ini. Jika API anda sudah diubah selepas pakej terakhir, gabungkan penambahan permission Car Battery ke security.php semasa sebelum upload.
5. Upload semua KANDUNGAN folder frontend/ daripada ZIP update ke folder frontend laman yang sedang digunakan, gantikan fail lama. Jangan tambah folder frontend/dist di dalam laman. Pastikan index.html dan assets berada pada lokasi yang sama seperti build asal /SP-Manager/.
6. Kekalkan config.php dan sp-manager-private.php anda. ZIP update tidak mengandungi config atau password.
7. Selepas upload selesai, tekan Ctrl+F5. Buka Management > Price Check. Anda juga boleh membuka Price Check daripada senarai Modules.

SP-Manager-PRICE-CHECK-FULL.zip mengandungi source projek penuh dan frontend/dist. Gunakan ZIP ready update untuk pemasangan supaya config hosting kekal. Versi dalaman asas kekal 1.0.47, serasi dengan version guard sedia ada.

## Product

Product dibaca terus daripada API Product Master mengikut outlet pengguna yang sedang login. Carian menyokong nama, code, barcode, category dan group. Harga sepadan dengan Product Master. Modul ini tidak mengubah produk, stok atau transaksi POS. Tekan Refresh selepas mengemas kini Product Master di sesi lain.

## Car Battery

Format mengikut gambar Excel anda:

Car_Brand | Model | Size_Option1 | Price_Option1 | Size_Option2 | Price_Option2 | Size_Option3 | Price_Option3 | Size_Option4 | Price_Option4 | Size_Option5 | Price_Option5

- Add: masukkan car brand, model, lima pilihan saiz dan harga.
- Edit/Delete: pilih radio pada baris dahulu. Delete meminta pengesahan.
- Saiz tiada: gunakan '-' dan harga 0. Harga 0 untuk saiz yang tersedia juga diterima, seperti gambar anda.
- Car_Brand + Model mesti unik dalam outlet yang sama.
- Data disimpan dalam SQL mengikut outlet. Add/Edit/Delete/Import memerlukan permission Manage Products; Administrator mempunyai akses.

## Import dan Export Excel

Gunakan fail .xlsx asal anda, atau CAR-BATTERY-TEMPLATE.xlsx yang disertakan. Import membaca worksheet PERTAMA sahaja. Susunan kolum boleh berubah tetapi semua 12 nama kolum di atas mesti ada. Had: 10000 data rows, 10 MB. Paste values terlebih dahulu jika workbook mempunyai formula.

Import menunjukkan bilangan rekod baru dan rekod yang akan diubah sebelum Confirm Import. Padanan dibuat melalui Car_Brand + Model, bukan nombor baris. Rekod sedia ada yang tidak terdapat dalam Excel dikekalkan. Semua baris disimpan dalam satu transaksi; kegagalan membatalkan keseluruhan import.

Export menghasilkan Excel .xlsx untuk SEMUA rekod outlet yang sudah dimuatkan, termasuk rekod yang disembunyikan oleh search/filter. Harga ialah numeric cells, bukan CSV yang ditukar nama. Dua kolum metadata tersembunyi (_Revision, _Outlet_ID) membantu mengesan fail lama atau outlet yang salah semasa import semula; jangan ubahnya. Untuk menyediakan data baru bagi outlet lain, gunakan template kosong 12 kolum.

Jika download tidak bermula selepas Export Excel, klik pautan Download Excel yang muncul. Jika rekod diubah oleh sesi lain, Refresh sebelum Edit/Delete/Import dan gunakan export terkini.

## Data sebenar

Gambar anda digunakan sebagai rujukan STRUKTUR. Rekod contoh daripada database ujian tidak disertakan dalam release. Untuk mengisi data sebenar, import fail Excel asal anda melalui Car Battery > Import Excel selepas memasang migration dan API.

## Semakan

23 ujian SQL/API dan 15 ujian Excel lulus, termasuk create/edit/delete, permission, outlet isolation, stale updates, duplicate import, atomic rollback, serta roundtrip .xlsx dan harga numeric. Build berjaya tanpa warning; PHP syntax dan skop CSS baharu lulus.

Frontend sebenar diuji melalui browser dengan database SQL tempatan: navigasi Management, Product Master, Add, Edit, import preview/confirm dan carian Battery. Telefon 390px: modal 339px, input 42px, satu kolum, jadual scroll dalam card.

Export berjaya menjana workbook dan pautan blob dalam browser, tetapi sesi browser ujian tidak memberikan event download untuk mengesahkan fail disimpan. Struktur workbook diuji secara berasingan melalui write/read .xlsx. Delete diuji sehingga pengesahan UI; penghapusan sebenar disahkan melalui API tempatan.

POS/Login/Dashboard component code, styles.css, management-ui.css dan API handlers lama kekal sama. Tiada deployment atau ujian transaksi pada database hosting anda. Laporan terperinci berada dalam fail JSON yang disertakan.
