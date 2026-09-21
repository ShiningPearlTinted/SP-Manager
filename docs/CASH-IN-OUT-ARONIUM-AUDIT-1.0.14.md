# SP-Manager 1.0.14 — Cash In / Out Audit & Fix

## Source reviewed

- SP-Manager source: uploaded `SP-Manager-v1.0.14-MANAGEMENT-PERMISSION-FIX-NO-FEEDBACK.zip`
- Aronium source package: uploaded `Aronium(7).zip`

## Aronium workflow verified

The Aronium `Lang/en.lang` source identifies the Starting Cash workflow as:

- Cash In / Out
- Add cash
- Remove cash
- Amount
- Description
- Tooltip: enter the reason for adding/removing cash
- Cash entries
- No description
- No records
- Cash drawer
- Save / cancel style workflow

The SP-Manager implementation now follows this workflow concept while using the existing SP-Manager modern UI.

## Change made

The **Cash In / Out button from the POS user menu** no longer navigates away to a full Cash In / Out page.

It opens a modal over the POS screen.

The modal provides:

- Add cash
- Remove cash
- Amount
- Description
- Cash entries list
- Current logged-in user and timestamp for new entries
- Cash drawer button using the existing SP-Manager Local Agent
- Save
- Cancel
- Close button

## Locked

The following were not intentionally changed:

- POS sales workflow
- Products
- Inventory
- Customers
- Purchases
- Payments
- Payment Types
- Refund / Void
- Discount / Promotion
- Tax
- Loyalty
- Users & Permissions
- Management permission
- End of day
- Settings
- Local Agent
- FastReport cleanup

The existing standalone **Cash In / Out Management page** remains available. The requested change is specifically the POS user-menu action.

## Verification

Static source checks passed for:

- Cash In / Out modal state
- POS menu modal opening
- Existing cash movement persistence
- Cash drawer callback
- Modal UI CSS
- No FastReport runtime reference in `main.jsx`

A full npm production build could not be completed in this environment because the npm dependency installation timed out. Therefore this is a source-level verification, not a claim of a successful production build.
