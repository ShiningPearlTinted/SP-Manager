# SP-Manager 1.0.18 — Payment / Receipt Function Fix

Base remains 1.0.18 and is locked. Only payment/receipt helper functions were repaired.

Fixed missing runtime handlers used by:
- POS receipt dialog: Print invoice
- POS receipt dialog: Save as PDF (browser print/save-to-PDF flow)
- POS receipt dialog: Send email
- Payments page: Invoice
- Payments page: PDF
- Payments page: Email

No POS calculations, payment calculations, Cash In/Out, End of Day, permissions, inventory or other business functions were changed.

The implementation follows the SP-Manager reference receipt workflow concept: receipt, invoice, email and PDF/print actions are separate actions after payment completion.
