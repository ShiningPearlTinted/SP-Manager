# SP-Manager 1.0.16 — POS Cash In / Out Modal Fix

## Base lock

Base package: `SP-Manager-main 1.0.16.zip` supplied by the user.

Only these application source files were changed for this fix:

- `frontend/src/main.jsx`
- `frontend/src/styles.css`

All other application files remain from the supplied base package.

## Requested behaviour

When the POS user-menu **Cash In / Out** button is pressed:

- POS remains visible in the background.
- Cash In / Out opens as a modal overlay.
- It does not navigate to the standalone Management Cash In / Out page.
- The standalone Management Cash In / Out page remains available and unchanged.

## SP-Manager reference workflow reference

The supplied project contains the previous SP-Manager audit documenting the SP-Manager reference workflow from `SP-Manager reference(7).zip` / `Lang/en.lang`:

- Cash In / Out
- Add cash
- Remove cash
- Amount
- Description
- Cash entries
- No description / No records
- Cash drawer
- Save / Cancel

The current upload did not contain the original `SP-Manager reference(7).zip` source package itself; therefore the implementation follows the workflow recorded in that verified project audit while using the modern SP-Manager UI.

## Modal functions

- Add cash / Remove cash
- Amount validation (> 0)
- Description with reason tooltip
- Current logged-in user and timestamp on new movement
- Cash entries list
- Running cash balance
- Cash drawer action through the existing Local Agent callback
- Save
- Cancel
- Close / click backdrop

## Locked / not changed intentionally

- POS sales calculations and payment workflow
- Products / Inventory
- Customers
- Purchases
- Payments / Payment Types
- Refund / Void
- Discount / Promotion
- Tax
- Loyalty
- Users & Permissions
- Management standalone Cash In / Out page
- End of Day / X-Z
- Settings
- Local Agent implementation
- Price Tags / barcode functionality

## Verification

Static checks completed:

- One `CashInOutModal` component exists.
- POS Cash In / Out menu action uses the `cashInOut` permission.
- POS menu action opens the modal instead of changing `page`.
- Existing `cashMovements` localStorage persistence is reused.
- Existing cash drawer callback is reused.
- JSX brace/parenthesis counts are balanced.

A production Vite build was attempted but `npm ci` timed out in this environment because dependencies could not be installed. Therefore no claim of a completed production build is made here.
