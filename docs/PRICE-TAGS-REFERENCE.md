# SP-Manager — Price Tags (SP-Manager reference-style)

## Scope
This change adds the Product Master **Price tags** workflow only. Existing POS, product, inventory, payment, customer, tax and other business functions remain unchanged.

## Implemented
- Full-screen Price Tags workspace with SP-Manager reference-style dark preview area.
- Layout controls: paper size, page width/height, roll-paper option, margins, columns, label width/height, row/column spacing.
- Display controls: product name, price, SKU/code, barcode, tax-inclusive text, borders.
- Barcode type selector: EAN13 and Code128-style fallback rendering.
- Product search and product selection.
- Default behavior: when no products are explicitly selected, visible products are used.
- Number of copies.
- Live print preview with label count.
- Browser print flow for physical printing / Save as PDF through the browser print dialog.
- A4 defaults match the supplied SP-Manager reference reference: 210 × 297 mm, 2 columns, 105 × 148.5 mm labels, zero margins/spacing.

## SP-Manager reference reference checked
The supplied SP-Manager reference package contains the Price Tags module under `SP-Manager reference.Pos.Management.Products` and the localized strings define the same major groups: Layout, Display and Products, including paper size, page dimensions, label dimensions, columns, row/column spacing, barcode type/height, product/price display, SKU, tax-inclusive price, borders and number of copies.
