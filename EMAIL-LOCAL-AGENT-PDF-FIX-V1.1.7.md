# SP-Manager 1.0.27 – Email PDF Browser Fallback

Fixes Email Sending Failed when Microsoft Edge is not installed/detectable.

The Local Agent now detects Microsoft Edge, Google Chrome, or Brave and uses the first available Chromium browser for headless PDF generation. SMTP sending and all other Local Agent routes remain unchanged.

Restart the Local Agent after updating.
