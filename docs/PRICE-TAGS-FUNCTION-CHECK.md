# Price Tags – Aronium-style update

- Product name size: range slider (6–48)
- Price size: range slider (6–48)
- Barcode height: range slider (10–120)
- Removed the non-functional in-panel “Print preview” button. Live preview remains visible in the right pane; Print and Save as PDF remain in the preview toolbar.
- EAN-13 preview/print now includes standard EAN-13 human-readable digits below the bars, including the leading digit, with OCR-B/Arial Narrow fallback font styling.
- EAN-13 guard bars are extended lower than the normal bars to match the supplied reference appearance.
- Existing product selection, copies, layout, margins, columns, label sizing, display toggles and other POS functions were not intentionally changed.

Source reference: official Aronium Help Center documentation for Print product price tags and official community/support posts. No proprietary Aronium source code was supplied, so source-level equivalence is not claimed.

## Settings persistence
- Price Tags settings are persisted in browser localStorage under `sp-manager-pos-price-tags-settings-v16`.
- Saved values include paper/layout, margins, columns, label dimensions, row/column spacing, display toggles, barcode type, text/barcode sizes, product filters/selection, and copies.
- Settings are restored automatically when Price Tags is opened again in the same browser/device.
- Column spacing is a numeric textbox, matching the Aronium-style Layout control shown in the reference image.


## Aronium FastReport fidelity update
- Uses the supplied Aronium `Templates/Ltr/ProductsPriceTags.frx` through the real FastReport .NET bridge.
- Default A4 layout reset to 2 columns, 50 x 50 mm labels to match the supplied Aronium Price Tags screen reference.
- Paper presets include A3, A4, A5, Letter, Legal, Custom and Roll.
- Roll mode uses one column, label-width paper and FastReport `PrintOnRollPaper` + `UnlimitedHeight`.
- Tax-inclusive pricing is calculated in the FastReport data layer using the product tax rate when the product price is exclusive.
- FastReport currency rendering uses `ms-MY` culture so the supplied Currency format displays RM.
- Product search modes added for name, barcode, code and group, plus group filtering, select-all/clear, copies and Print preview.
- A new storage key prevents old Price Tags settings from carrying over after the Aronium-compatible defaults are deployed.
