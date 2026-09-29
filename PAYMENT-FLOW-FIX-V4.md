# SP-Manager 1.0.36 — Payment Flow Fix V4

## Scope

Only POS payment completion / quick-payment database flow was changed.

## Root cause addressed

Payment completion previously depended on the generic relational-sync endpoint. That endpoint also handles multiple unrelated state collections and could fail for schema/mapping reasons unrelated to a completed sale. The POS payment path is now isolated through `api/sales.php`.

## V4 behaviour

`OK / Complete payment` and Quick Payment now use:

POS → `sales.php` → SQL transaction → sale + items + payments + stock + loyalty → COMMIT → receipt/print/email choices.

The server resolves customer, product and payment-type IDs against the real database IDs before writing foreign keys.

`document-counter.php` is not called by the browser during payment completion.

No POS navigation, pricing, product group navigation, or unrelated modules were changed.
