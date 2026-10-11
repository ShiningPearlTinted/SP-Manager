SP-Manager — clean source / Local Agent 1.2.3

Upload kandungan folder SP-Manager-main ke root repository, termasuk .github dan .gitignore. ZIP source mempunyai kurang100files. GitHub upload tidak memadam fail lama: padam frontend/dist dan frontend/public/sp-manager-agent serta frontend/public/RESTART-SP-MANAGER-LOCAL-AGENT.bat daripada repository jika masih tracked. Padam pnpm-lock.yaml, frontend/pnpm-workspace.yaml dan REMOVED-FILES.json yang lama. Kekalkan agent/ dan scripts/sync-agent.mjs.

Build: npm install --prefix frontend, kemudian npm run build. prebuild menjana hosted agent daripada agent/ dan installer daripada root. Jangan upload dist ke GitHub source; pakej hosting berasingan sudah siap build.

API config.php/private config tidak disertakan. Kekalkan konfigurasi hosting sedia ada. Database dan SQL production tidak perlu reset/import untuk cleanup. Skrip SQL dalam api/ ialah alat schema/migration sedia ada; jangan import semua sekaligus.

Local Agent fullscreen perlu dipasang pada komputer POS menggunakan agent/install-windows.bat. Menukar source di GitHub sahaja tidak update agent yang sudah berjalan. Build/deploy mesti selesai sebelum Ctrl+Shift+R.
