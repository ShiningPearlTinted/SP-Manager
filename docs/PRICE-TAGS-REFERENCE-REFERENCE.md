# Price Tags — SP-Manager reference reference alignment

The uploaded SP-Manager reference package was inspected directly. The source template is
`Templates/Ltr/original SP-Manager reference price-tags template.frx`.

The original template uses:
- `Data1` width `718.2`, height `236.25`
- `Data1` border all sides, gray dashed
- `TextCode`: left dock, vertical (270°), SKU
- `TextName`: top dock, centered
- `TextPrice`: top dock, centered, currency format, bold 16pt
- `Barcode1`: EAN13, centered horizontally and bottom-aligned by the original report script

This implementation keeps that layout model for the browser preview and maps it
to native ZPL/TSPL printer commands. legacy report engine is not used by the application.
