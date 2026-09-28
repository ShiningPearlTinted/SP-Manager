# SP-Manager 1.0.36 — POS Payment & Quick Payment Fix V2

## Root cause fixed
The payment flow was failing before the sale reached SQL because the frontend called `document-counter.php` directly from the GitHub Pages origin. The live Hostinger endpoint was rejecting the CORS preflight, so `completeSale()` stopped before saving the sale.

## V2 changes
- POS payment no longer depends on a browser cross-origin call to `document-counter.php`.
- `relational-sync.php` generates the Invoice/Sale number inside the SQL transaction when the sale number is `Auto generated`.
- The generated SQL document number is returned to the frontend and applied to the completed sale before the receipt dialog is shown.
- OK / Complete Payment and all Quick Payment buttons share the same corrected completion path.
- Receipt actions remain unchanged: Print receipt, Print invoice, Send email, Save as PDF, Add notes, Done.
- No POS calculation, navigation, product group flow, inventory rules, or other functions were changed.
