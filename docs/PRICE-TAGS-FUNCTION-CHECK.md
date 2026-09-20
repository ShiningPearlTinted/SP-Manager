# Price Tags – SP-Manager-style update

- Product name size: range slider (6–48)
- Price size: range slider (6–48)
- Barcode height: range slider (10–120)
- Price Tags now generates printer-native ZPL and TSPL commands. The live browser preview is independent of the printer language; the toolbar provides Preview / Print, Save ZPL, Save TSPL, and direct raw Print.
- EAN-13 browser preview/raw printer output now includes standard EAN-13 human-readable digits below the bars, including the leading digit, with OCR-B/Arial Narrow fallback font styling.
- EAN-13 guard bars are extended lower than the normal bars to match the supplied reference appearance.
- Existing product selection, copies, layout, margins, columns, label sizing, display toggles and other POS functions were not intentionally changed.

Printer-native output uses ZPL/TSPL command languages; Zebra documents ZPL barcode commands including EAN-13, EAN-8, UPC-A, UPC-E, Code 39, Code 93, Code 128, Interleaved 2 of 5 and Codabar, while TSC documents the corresponding TSPL BARCODE types.

## Settings persistence
- Price Tags settings are persisted in browser localStorage under `sp-manager-pos-price-tags-settings-v16`.
- Saved values include paper/layout, margins, columns, label dimensions, row/column spacing, display toggles, barcode type, text/barcode sizes, product filters/selection, and copies.
- Settings are restored automatically when Price Tags is opened again in the same browser/device.
- Column spacing is a numeric textbox, matching the SP-Manager-style Layout control shown in the reference image.
