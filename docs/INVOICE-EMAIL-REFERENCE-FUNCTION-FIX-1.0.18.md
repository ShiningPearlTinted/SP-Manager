# Invoice / Email SP-Manager reference-aligned fix

- Invoice layout follows the supplied SP-Manager reference invoice PDF structure.
- Currency is RM.
- Company logo is taken from My company / Settings company.logo.
- Company address, phone, email and bank details are taken from My company settings.
- POS Print invoice and Save as PDF use the same invoice template.
- Send email uses SMTP settings from Settings > Email and sends directly through the SP-Manager Local Agent.
- If customer email is missing, a message box is shown.
- If SMTP settings are incomplete or sending fails, a message box is shown.
- Subject placeholders {receipt}, {date}, {total} are supported, matching the SP-Manager reference email-settings workflow.
