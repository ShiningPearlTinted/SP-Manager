# POS Function Check — 1.0.13

| POS function | Result | Notes |
|---|---|---|
| Product category navigation | OK | Existing visual layout preserved |
| Product group navigation | OK | Existing group navigation preserved |
| Product add | FIXED/OK | Locked-state guard added |
| Product search | FIXED | Search results are rendered |
| Search by Name | FIXED | Search mode button + Ctrl+T |
| Search by Code | FIXED | Search mode button + Ctrl+T |
| Search by Barcode | FIXED | Search mode button + Ctrl+T |
| Customer selection | OK | Existing flow preserved; locked state prevents change |
| Add customer from POS | FIXED | Persisted and uppercase |
| Transfer | FIXED/OK | Selected items become an open transfer order |
| Discount | OK | Existing percentage/fixed logic preserved |
| New sale | FIXED | Clears current sale; F8 remains save-and-new |
| Refund | OK | Opens Refund / Void module |
| Cash drawer | FIXED | Calls local hardware agent |
| Save sale / F9 | OK | Existing save-open-sale flow preserved |
| Payment / F10 | OK | Payment screen + paid amount + change |
| F12 Cash | FIXED | Uses Cash payment type explicitly |
| Card | OK | Quick payment/payment screen |
| QR | OK | Quick payment/payment screen |
| Bank Transfers | OK | Quick payment/payment screen |
| Check | OK | Quick payment/payment screen |
| Unpaid | OK | Customer requirement and unpaid flag follow payment type settings |
| Split payments | OK | Existing split payment screen preserved |
| Quantity button | FIXED | Selected item or next-item quantity |
| F4 | FIXED | Same quantity behaviour |
| Delete item | FIXED | Selected item; Delete key supported |
| Del keyboard key | FIXED | Removes selected item |
| Void order | FIXED | Confirmation before voiding current open order |
| Lock sale | FIXED | Locked-sale print preview + editing lock |
| Unlock sale | FIXED | Re-enables editing |
| Repeat round | OK | Existing repeat-round behaviour preserved |
| F3 | FIXED | Focuses product search |
| F7 | FIXED | Opens transfer/split screen |
| F11 | FIXED | Browser fullscreen toggle |
| Ctrl+D | FIXED | Cash drawer command |
| Esc | OK | Closes POS modal and clears item selection |

## Scope rule

Only POS code was modified in this version. Do not use this package to overwrite unrelated modules if a narrower file-level update is preferred.
