# Panduan kemas kini UI Management

## Fail yang perlu digunakan

Gunakan FRONTEND-READY-UPLOAD.zip untuk kemas kini laman yang sedia ada. ZIP ini mengandungi frontend yang sudah siap build.

SP-Manager-MANAGEMENT-UI-FIXED.zip ialah projek penuh, termasuk source dan frontend/dist. API di dalamnya ialah fail asal yang tidak diubah oleh pembaikan UI ini.

## Cara upload

1. Backup folder frontend yang sedang digunakan dahulu.
2. Extract FRONTEND-READY-UPLOAD.zip di komputer.
3. Upload kandungan ZIP (index.html, assets, customer-display, vendor dan fail/folder lain) ke folder frontend yang sedang digunakan. Gantikan fail frontend lama. Jangan upload sebagai folder tambahan bernama dist atau FRONTEND-READY-UPLOAD.
4. Build ini menggunakan laluan aset /SP-Manager/. Pastikan ia digunakan pada lokasi frontend yang sama seperti build asal. Jika lokasi hosting anda berlainan, bina semula dengan laluan yang sesuai sebelum upload.
5. Selepas semua fail selesai upload, buka semula laman dan tekan Ctrl+F5.

SQL, API dan sp-manager-private.php tidak perlu ditukar untuk pembaikan UI ini. Jangan import semula dump SQL lama untuk kemas kini ini.

## Skop pembaikan

- Management/Admin: font Segoe UI dengan fallback sistem, card, table, form, button, modal, toolbar dan paparan telefon diseragamkan.
- CSS baharu terhad kepada skrin Management yang disenaraikan dan dialog yang dibuka daripada Management.
- POS, Login dan Dashboard dikecualikan daripada redesign.
- styles.css asal, API, SQL, agent dan kod business logic asal dikekalkan.
- Tiada dependency atau font global baharu. Versi dalaman projek kekal 1.0.47 seperti source asal walaupun nama ZIP input ialah 1.0.46.

## Semakan yang selesai

- Build berjaya tanpa warning.
- Semua 164 peraturan CSS baharu lulus semakan skop.
- Selepas tiga tambahan presentation dibuang daripada main.jsx, kodnya sepadan dengan kod asal.
- 76 fail asal di luar main.jsx dan hasil build kekal sama secara byte.
- Komponen Customers diuji dalam browser pada desktop dan telefon; Settings pada desktop, menggunakan data contoh tempatan.
- Input telefon 42px, form satu kolum dan modal muat dalam viewport 390px.

Semakan ini bukan ujian transaksi database pada hosting atau perbandingan pixel penuh untuk semua skrin. Hosting belum diubah. Bukti semakan disimpan dalam LOCK-VALIDATION.json dan gambar preview.

## Exact source files yang diubah

1. frontend/src/main.jsx — import stylesheet dan penanda skop presentation sahaja.
2. frontend/src/management-ui.css — stylesheet baharu khusus Management.
3. frontend/dist — hasil build frontend baharu.
