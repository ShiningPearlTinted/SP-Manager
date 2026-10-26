# Offline POS deployment

1. Back up the **Central MySQL database**.
2. Run `api/UPGRADE-OFFLINE-1.0.62.sql` once against that same Central MySQL database. Do not create an outlet database.
3. Deploy the updated `api` directory and frontend from this package. Keep the existing API configuration and secrets.
4. The default limit is three active offline terminals per outlet. To change it, set `offline_terminal_slots` in the API config (1–20) before terminals register.
5. Each authorized terminal must sign in online once. That registers its terminal, allocates stock quotas, and encrypts the offline sign-in grant in the browser's IndexedDB.
6. Reload the app once while online so the service worker can cache the app shell. Then POS can continue offline for up to 72 hours from the last online registration.
7. When the connection returns, queued sales sync automatically to Central MySQL. Keep the browser profile and its IndexedDB intact until the pending count clears. A sale rejected for stock/payment-data conflicts remains queued for review.

Offline access is limited to POS sales. Other database actions remain online-only. Browser data is stored locally; clearing site storage removes offline access and any queued sales. Keep regular Central MySQL backups.
