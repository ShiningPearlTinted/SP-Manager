# SP-Manager 1.0.15 – POS Aronium Search & Virtual Keyboard

## LOCKED scope
Only POS search selector and virtual keyboard presentation/function were changed. Other modules and POS calculations/functions were not intentionally changed.

### Changes
- Search selector now follows the Aronium-style four modes: all (name/code/barcode), barcode, code, name.
- All-search mode searches product name, SKU/code and barcode fields together.
- Search is global while typing instead of being restricted by the currently selected category.
- Virtual keyboard opens inline at the bottom of the POS product area instead of as a modal overlay.
- Virtual keyboard layout follows the supplied Aronium reference style: QWERTY rows, backspace, enter, shift/symbol/navigation keys and space bar.
- Existing keyboard shortcut Ctrl+T cycles All → Barcode → Code → Name.
- Transfer dialog styling from 1.0.14 is retained.

## Verification
ZIP integrity checked with `unzip -t`; no errors detected. A full browser/production Vite build was not claimed in this environment.
