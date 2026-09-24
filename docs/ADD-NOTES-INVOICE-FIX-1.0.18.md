# SP-Manager 1.0.18 — Add Notes + Invoice Template Fix

## Scope

Targeted fix only for the POS receipt dialog **Add notes** workflow and the generated A4 invoice template.

## Add Notes

- Uses a modern SP-Manager dialog following the SP-Manager reference Notes workflow.
- Shows Document number, Customer and Total.
- Provides **Public note** and **Internal note** fields.
- Public note is stored in `sale.note` and is printed on the invoice.
- Internal note is stored in `sale.internalNote` and is not printed on the invoice.
- Existing `updateSaleNote()` flow remains the persistence path.

SP-Manager reference's official support describes Public notes as printable on receipt/invoice and Private notes as visible in the document section only.

## Invoice

- A4 layout adjusted to the supplied reference image.
- Currency remains **RM** through the existing `money()` formatter.
- Company logo remains sourced from My Company settings.
- Bank account number and Bank details are removed from the invoice.
- The country suffix (including Malaysia) is removed from the company address line.
- Public Add notes content is printed below the payment summary when present.
- Existing invoice number, dates, payment status, payment methods and totals are retained.

## Locked / untouched

No changes were intentionally made to POS calculation, payment logic, Cash In/Out, Email/SMTP, customer management, permissions or other modules.
