# SP-Manager Print Settings — SP-Manager reference Function Audit & Fix

Base: SP-Manager 1.0.18 PRINT SETTINGS A5 FUNCTION FIX
Reference: SP-Manager reference(8).zip and SP-Manager reference Help Center Print options documentation.

## Findings

The existing Print > Printer selection screen had the printer-operation cog button, but the cog only changed the selected operation. It did not open a dedicated printer-settings dialog like the SP-Manager reference workflow.

The existing Print test page action also used the general hardware printer instead of the selected receipt printer for the Print Settings operation.

## Fixed

- Printer-selection cog now opens a dedicated Printer settings dialog for the selected operation.
- Dialog includes General, Cash drawer, and Advanced tabs.
- General includes printer type, paper size, copies, characters per line, RTL, header, footer, feed lines, cut paper, bitmap, rich formatting, barcode, logo full width, alignment, and margins.
- Cash drawer includes enable, printer selection, and raw command.
- Advanced exposes code page and character set for Generic / Text only; other printer types show the SP-Manager reference-style unavailable notice.
- Print test page uses the selected operation printer.
- Cancel restores the settings snapshot from before opening the dialog.
- Revert changes restores the saved settings snapshot.
- Save closes the dialog and leaves changes in the Settings draft; the main Settings Save persists them.
- No POS, Management, End of Day, Cash In/Out, Products, Customers, Invoice A5 layout, or other unrelated screen logic was intentionally changed.

## Important runtime limitation

The browser UI can save and pass these settings, but physical printer-specific behaviour still depends on the SP-Manager Local Agent and printer protocol. In particular, true bitmap/logo raster printing, ESC/POS barcode commands, and model-specific paper cutting require printer/driver support. The current Local Agent endpoint accepts raw text and cash-drawer bytes; it does not expose a generic raster-image printing API.

Therefore this fix does not claim that every printer-specific output feature works identically on every printer model. The settings controls and printer-settings workflow are wired; hardware-dependent output must be verified with the target Windows/thermal printer.
