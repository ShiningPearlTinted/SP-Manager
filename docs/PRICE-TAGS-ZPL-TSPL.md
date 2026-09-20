# Price Tags — ZPL / TSPL

Price Tags no longer uses a .NET report engine. The module generates printer-native ZPL or TSPL commands directly from the selected products and layout settings.

- **ZPL**: Zebra-compatible label printers.
- **TSPL**: TSC-compatible label printers and compatible devices.
- Browser preview is an independent visual preview of the same label layout.
- `Save ZPL` and `Save TSPL` download the generated raw printer commands.
- `Print ZPL` / `Print TSPL` sends the selected raw language to the configured Windows printer through the existing SP-Manager Local Agent.
- Other POS, product, inventory, customer, sales and settings functions are unchanged.

Zebra documents ZPL commands for EAN-13 (`^BE`), EAN-8 (`^B8`), UPC-A (`^BU`), UPC-E (`^B9`), Code 39 (`^B3`), Code 93 (`^BA`), Code 128 (`^BC`), Interleaved 2 of 5 (`^B2`) and Codabar (`^BK`).

TSC's TSPL/TSPL2 programming documentation lists corresponding `BARCODE` types including 128, 39, 93, EAN13, EAN8, CODA, UPCA, UPCE and Interleaved 2 of 5.
