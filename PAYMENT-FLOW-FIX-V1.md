# SP-Manager 1.0.36 — POS Payment / Quick Payment Fix V1

Scope: Payment completion sequencing and Quick Payment actions only.

Compared against the supplied Aronium workflows, the payment flow must validate and create/save the document before leaving the payment screen, then present the post-payment receipt/print options. SP-Manager previously closed the payment UI immediately without awaiting the async sale/database operation.

Changes:
- `finishPayment()` is now async and waits for the sale/database operation to finish successfully before closing Payment.
- `completeSale()` returns the saved sale on success and `false` on failure, so the UI can distinguish completion from failure.
- Quick Payment now awaits the same completion path instead of firing the async save without waiting.
- POS action buttons and payment buttons are explicitly `type="button"` to avoid accidental form submission/close behaviour.
- Existing receipt choice dialog is preserved: Print receipt, Print invoice, Send email, Save as PDF, Add notes.
- Existing payment flags remain respected: mark paid, change allowed, print receipt, cash drawer, customer required.
- No POS calculation, navigation hierarchy, product flow, inventory calculation or unrelated modules were changed.
