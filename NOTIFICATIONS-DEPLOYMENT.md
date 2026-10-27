SP-Manager booking notification deployment notes
==============================================

Requirements
------------
- HTTPS for the application, API and website bridge.
- API hosting with PHP 8.2+, Composer, cURL, mbstring and OpenSSL elliptic-curve support.
- Composer dependency: minishlink/web-push 11.0.0 (MIT, standards-based Web Push; no Firebase SDK/service).
- A hosting cron job that can invoke PHP CLI every minute.
- The existing API encryption_key configured, because browser subscription endpoints and encryption keys are encrypted at rest.
- Existing Central MySQL database. No outlet database is created.

Database
--------
Back up Central MySQL, then run database/migrations/booking-notifications-v1.sql once.
The migration is additive. It creates event, recipient, push-subscription and delivery-queue tables.
Do not import a full database dump to apply this change. The commented rollback drops only these four new tables and must be used only if intentionally removing the feature.

API dependencies
----------------
In the API directory, run:
  composer update --no-dev --with-dependencies
Then keep the generated composer.lock and install into api/notification-vendor on the server with:
  composer install --no-dev --prefer-dist --optimize-autoloader
The API host must satisfy the PHP/extensions requirements in composer.json before activation.

VAPID secrets
-------------
Generate one key pair with the library's VAPID::createVapidKeys() helper on the API host.
Store the public and private keys outside the web root (or as server environment variables):
  SP_MANAGER_VAPID_PUBLIC_KEY
  SP_MANAGER_VAPID_PRIVATE_KEY
  SP_MANAGER_VAPID_SUBJECT
The subject must be a mailto: address or HTTPS URL. Keep the same key pair; never commit the private key. Only the public key is returned to authenticated clients. Push remains disabled until the API encryption_key is at least 64 characters; the existing helper derives the AES key from it.

Dispatcher
----------
Configure the hosting cron runner once per minute:
  * * * * * /absolute/path/to/php /absolute/path/to/api/dispatch-notifications.php
The dispatcher runs in CLI mode only, requires PHP 8.2+, serializes concurrent runs with a MySQL advisory lock, retries temporary delivery failures with backoff, and deactivates expired subscriptions after HTTP 404/410. Delivery is at-least-once if interrupted after provider acceptance; stable notification tags let browsers replace duplicate visible notifications.

WordPress bridge
----------------
The supplied API already contains the signed HMAC booking bridge. A website booking notification is queued only after the API has accepted the booking inside the existing transaction. Notification queue failure is logged and does not cancel the booking.
The WordPress plugin/source was not included in the supplied archive, so its endpoint URL, signatures, outlet mapping and retry key must still be confirmed against the live WordPress configuration before production use.

User experience and limitations
-------------------------------
Users with viewBookings permission can enable browser permission from the notification bell. The API independently checks user status, outlet assignment and permission. Payload previews contain no customer name, phone, email, vehicle or service details.
The panel polls while online and caches the non-sensitive notification list locally for viewing during a disconnect. Push delivery requires Internet and browser/OS support. iOS requires an installed Home Screen web app; a denied browser permission cannot be overridden by SP-Manager.

Verification
------------
After API dependency installation and migration, verify:
1. A signed WordPress booking creates exactly one booking and one notification event.
2. Only users assigned to that outlet with viewBookings (and authorized Administrators) receive an inbox item.
3. Two devices for one user each receive push once; repeated bridge request IDs do not create duplicate events.
4. Revoked/expired subscriptions are removed; temporary failures retry.
5. Opening the notification routes through the normal login/session check to the booking reference and outlet.
6. Existing POS, sales, payment, stock, Login, Dashboard and Price Tag flows are unchanged.
