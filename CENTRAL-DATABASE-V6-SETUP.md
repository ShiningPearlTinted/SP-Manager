# SP-Manager Central Database V6

This build makes MySQL-backed `sp_app_state` the central persistence layer while keeping browser localStorage as a cache for offline/fast startup. Existing UI and business functions are preserved.

## Hostinger API
Upload only `api/app-state.php` if the API file changed. Do not overwrite `api/config.php`.

## Important
Relational product persistence remains handled by `api/products.php` (products/category/group). Other application state is centrally persisted through `sp_app_state` so the current application behavior is preserved without rewriting unrelated modules.

## Direct local-only settings fixed
- Price Tags settings -> `priceTagSettings` central state
- Promotions delete -> central `promos` state
- Default tax rate -> central `taxRate` state
- Settings maintenance save -> central `settings` state
- Customer Display terminal settings are no longer excluded from central state

LocalStorage remains a cache/backup mechanism, not the authoritative database.
