# SP-Manager — Source kemas, HR Fasa 1 + Sidebar

Source penuh untuk GitHub/CI. Gunakan folder kandungan ZIP sebagai root repository supaya .github/workflows/pages.yml berada di root, bukan folder bersarang tambahan. Pakej GitHub mempunyai 97 fail; frontend/dist dan salinan agent yang dijana tidak dimasukkan. Skrip npm prebuild/predev menjana semula lapan fail agent yang sama dengan salinan canonical. Empat public variant sedia ada dikekalkan kerana berbeza daripada canonical.

## Deployment
Frontend siap compile terdapat dalam DEPLOYMENT.zip di pakej FULL-CLEAN, atau gunakan ZIP DEPLOY terdahulu: JavaScript/CSS adalah sama byte demi byte selepas cleanup. Upload kandungan frontend daripada deployment ZIP ke /SP-Manager/. API penuh kekal dalam api/. Jangan gantikan config.php sebenar di server dengan template source. Tiada migration SQL baru diperlukan untuk cleanup atau sidebar jika HR sudah dipasang.

Build source: dalam frontend, jalankan npm ci dan npm run build. Workflow GitHub Pages asal dikekalkan. Skrip generator kini mengekalkan public overrides asal; ia tidak lagi menimpa agent runtime berbeza secara tidak sengaja. node_modules, dist dan asset agent yang dijana disenaraikan dalam .gitignore. npm/package-lock dikekalkan; metadata pnpm yang tidak digunakan dikeluarkan.

## Pemasangan HR pertama
Backup database dan fail dahulu. Gunakan Central MySQL sedia ada; jalankan database/migrations/hr-phase1.sql pada staging kemudian database pusat apabila disahkan. Jangan import dump penuh ke atas database aktif. Jika jadual hr_* sudah wujud, jangan jalankan semula migration.

Backend PHP 8.1+ dengan PDO MySQL dan OpenSSL. Dalam config API sebenar, tambah hr_encryption_key (secret berasingan 64 hexadecimal chars; jana menggunakan bin2hex(random_bytes(32))). Kekalkan auth/database/encryption keys sedia ada. hr_hq_user_ids ialah array ID HQ bukan admin yang dibenarkan mengurus master global; default kosong. Simpan HR key untuk recovery, jangan tukar tanpa decrypt/re-encrypt terancang.

Sign in semula. Berikan viewHrEmployees serta permissions HR yang sesuai melalui Users & Permissions. manageManagement diperlukan untuk masuk ke Management dari POS jika peranan tersebut belum ada akses. Permission tambahan: manageHrEmployees, transferHrEmployees, viewHrSalary, manageHrSalary, manageHrSettings, viewHrSensitive. Non-admin master settings memerlukan HQ ID dalam config juga. Outlet source/destination mesti assigned. Tiada permission atau data production diubah oleh cleanup.

Tambah department/position/employment types/statuses sebenar di HR Settings dahulu. Employee ID kekal; staff code unik. Status inactive/terminated mengekalkan sejarah. Transfer bertarikh masa depan tidak berkuat kuasa awal; temporary assignment tidak menukar primary outlet. Revisi gaji kekal dengan tarikh bertambah; IC/bank/statutory identifiers dienkripsi.

Skop siap ialah HR Fasa 1 sahaja. Attendance/shift/leave/OT ialah Fasa 2; payroll/statutory/payslip ialah Fasa 3; claims/documents/ESS/reports advanced ialah Fasa 4. Cleanup tidak menambah modul fasa berikutnya. Production belum dikemas kini oleh agent.

## Apa yang dibuang atau diasingkan
- Dua helper PHP lama api/common.php dan api/db.php: tiada rujukan atau pemanggilan spm_* dalam source runtime semasa. api/index.php (respons legacy 410) dikekalkan.
- Import BATTERY_HEADERS yang tidak digunakan dalam Price Check. React dikekalkan kerana compiler JSX memerlukannya.
- Lapan salinan agent yang byte-identical: dijana semula dari agent/, tanpa mengubah URL fail public.
- Build frontend dipindahkan ke ZIP deployment; ini output yang diperlukan, bukan kod mati.
- SQL lama/duplicate dan dump rujukan dipindahkan ke arkib maintenance. Schema terkini dan feature migrations yang digunakan dikekalkan.
- Nota handoff lama digabungkan dalam README ini; rekod asal berada dalam arkib.

Semua fail yang dikeluarkan boleh dipulihkan daripada MAINTENANCE-ARCHIVE.zip. ZIP arkib mengandungi dump database rujukan; simpan sebagai backup tempatan, bukan muat naik ke GitHub. Tidak semua fail yang tiada import dibuang: endpoint HTTP, CLI backup/restore/bootstrap, receipt-pdf wrapper, version, database-health, PDF, licenses dan vendor masih diperlukan.

## Semakan yang dijalankan
- AST: tiada binding peringkat atas tidak digunakan dalam main.jsx atau HR; hanya import BATTERY_HEADERS yang selamat dikeluarkan. Tidak membuang React secara salah.
- PHP syntax: semua 38 fail API yang dikekalkan lulus. Semua target include literal __DIR__ wujud.
- Source regression: 88 fail asal yang dikekalkan sama; source POS/Dashboard/Price Tag/Login dan CSS global dikekalkan. Price Check berubah hanya pada unused import. Backend aplikasi/HR/security/users kekal.
- Generator: 14 public assets selepas prebuild sama byte demi byte dengan pakej penuh sebelum cleanup.
- Production esbuild compile: app.js dan app.css sama byte demi byte dengan deployment sebelumnya.
- 74 semakan backend HR daripada fasa sebelumnya tidak diulang kerana runtime API tidak berubah, selain mengeluarkan dua helper yang tiada rujukan. Tiada transaksi POS, printing hardware atau production deployment dibuat dalam cleanup ini. Batasan Vite spawn EPERM dalam sandbox Windows kekal; build standard perlu disahkan di CI/hosting.

CLEANUP-MANIFEST.json merekod paths, sebab pengasingan dan hash fail asal. Test regression memerlukan HR_ORIGINAL_ROOT ke extraction ZIP asal 1.0.56; ia menerima pengasingan yang direkodkan dalam manifest. Test API tetap memerlukan isolated API copy dengan DB localhost prefix spm_hr_test, bukan production config. Arkib menyimpan panduan ujian lama untuk maklumat lanjut.
