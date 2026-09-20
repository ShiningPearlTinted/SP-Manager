# SP-Manager 1.0.17 — Settings Function Check

Scope: Settings only. Existing POS behaviour is preserved; the latest POS source is used as the base.

## SP-Manager reference checked
- General: language, writing direction, color scheme, layout, zoom, virtual keyboard, notifications, business day, button bar.
- Order & payment: floor plans, sounds, default search, search options, default quantity, discount type, separate rows, prevent sale below cost, negative inventory, single user, payment form options, due date, merge receipt items, single-item discount, payment shortcut confirmation, void options and advanced order options.
- Products: tax-inclusive display/print, discount rule, sorting and negative price.
- Documents: default document number format and overrides.
- Weighing scale: variable-measure barcode settings.
- Customer display: COM/serial-oriented settings and test path through the local agent.
- Email: SMTP/default message fields.
- Print: printer selection, printer type, paper, copies, characters per line, RTL, feed, cut, bitmap, rich formatting, barcode, logo, alignment, code page/character set, margins, invoice/receipt fields and customer details.
- Database: backup, restore, automatic backup schedule, old-backup cleanup and local maintenance note.

## Functions fixed/wired
- General message duration now controls automatic notice dismissal.
- General message position and close/click behaviour are applied to application notices.
- Visual/Standard POS layout selection now changes product navigation presentation.
- Visual row/column settings are applied to POS product/category grids.
- Virtual keyboard setting controls the POS virtual keyboard state.
- Default search setting controls the POS search mode.
- Search-option visibility is controlled by the setting.
- Prevent-sale-below-cost is enforced when adding an item.
- Negative sale-price restriction is enforced when adding an item.
- Show-items-on-payment controls the payment item preview.
- Display-receipt-dialog controls whether the receipt-choice dialog is shown after sale completion.
- Merge-items-on-receipt merges identical product/price lines in printed receipt text.
- Print header/footer/feed-line settings are applied to receipt text.
- Backup-on-close stores a browser-safe automatic snapshot on page close.
- Starting cash / business-day selection can be requested on application start when enabled.
- Customer-display, printer and cash-drawer test buttons use the SP-Manager Local Agent.

## Platform differences
SP-Manager is browser-based. Windows/SQLite-native SP-Manager operations cannot be copied 1:1:
- direct SQLite optimization is represented by saving the current local application database/settings state;
- Windows printer capabilities and ESC/POS hardware require the Local Agent;
- native SP-Manager licensing/account/update services are not reproduced;
- full application translation requires a separate language resource layer.

No unrelated POS, sales, customer, inventory, payment or reporting functions were intentionally changed in this settings patch.
