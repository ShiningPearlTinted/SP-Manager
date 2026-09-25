# SP-Manager Customer Display — Hostinger MySQL setup

1. Create a MySQL database in Hostinger.
2. Upload the `api/` folder to the same Hostinger site (for example `public_html/SP-Manager-api/`).
3. Copy `api/config.example.php` to `api/config.php` and enter the Hostinger MySQL credentials.
4. Import `api/schema_customer_display.sql` if you want to create the tables manually. The API also creates the two display tables automatically on first request.
5. In SP-Manager > Settings > Customer display, set **API Base URL** to the public URL of the folder containing `customer-display.php`, for example `https://yourdomain.com/SP-Manager-api`.
6. Set Terminal ID and Customer Display ID.
7. Open the TV URL: `https://shiningpearltinted.github.io/SP-Manager/customer-display?display=CD-001`.

## Security
The first version uses a simple terminal/display code pairing and CORS. For a public production deployment, add an API token/authentication layer before exposing the endpoint to the internet. Do not commit MySQL credentials to GitHub.
