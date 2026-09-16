# SP-Manager 1.0.13 — POS Function Check & Fix

BASE: SP-Manager 1.0.12

Scope: POS / Sales only. Existing non-POS modules and calculations were not intentionally changed.

## Fixed / verified by code review

- Product search now displays actual search results instead of only showing a result count.
- Search mode buttons now switch between Name, Code and Barcode.
- F3 focuses product search.
- Ctrl+T cycles Name → Code → Barcode search mode.
- F4 / Quantity works on the selected item; with no selection it sets the next-item quantity.
- Delete removes the selected item only.
- Selected POS item is visually highlighted.
- F7 opens the transfer/split-order screen.
- Customer added from POS is persisted to localStorage.
- POS customer fields remain uppercase while typing.
- Cash drawer button now calls the configured local hardware agent instead of only displaying a notice.
- Ctrl+D calls the cash drawer command.
- F11 toggles fullscreen.
- F12 explicitly uses the Cash payment type when available, matching the displayed F12 Cash action.
- New Sale clears the current open sale instead of accidentally saving it as an open sale; F8 remains the save-and-new workflow.
- Void Order asks for confirmation before clearing the current order.
- Lock now creates a printable locked-sale/order preview and prevents item modifications until Unlock is pressed.
- Transfer, discount, quantity and item changes respect the locked state.

## Aronium behaviour used as reference

The implementation is independent. Aronium was used only as a functional reference.

Reference areas reviewed:
- Keyboard shortcuts
- Changing quantity
- Removing a product / void order
- Payment / split payments
- Order and payment settings
- Cash drawer
- Credit/unpaid payments

## Not claimed as production parity

The build has not been runtime-tested against every possible printer, cash drawer, scanner, payment device, fiscal device or Windows environment. Hardware features require the SP-Manager Local Agent and configured hardware.
