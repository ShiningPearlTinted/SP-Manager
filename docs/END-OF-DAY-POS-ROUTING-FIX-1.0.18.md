# End of Day POS Routing Fix — 1.0.18 BASE

BASE LOCK: SP-Manager-main 1.0.18.zip

Requested behavior:
- End of day must be opened from the POS user menu, not from the Management page.
- Management must not show an End of day card.
- End of day stays over the POS screen as a modern SP-Manager overlay.
- Existing End of Day workflow and calculations are preserved.
- Existing Management, Cash In / Out, POS, permissions, X / Z Report, and other functions are not intentionally changed.

Changes:
- Added App-level `showEndOfDay` state.
- POS user menu End of day now opens the EndOfDay overlay without changing `page` away from `POS / Sales`.
- Removed End of day from the Management card list.
- EndOfDay is rendered only while POS / Sales is active.
- EndOfDay visual shell is fixed above POS with a dimmed/blurred backdrop.
- Changed the End of Day eyebrow from Management / POS Closing to POS / End of Day.
