# SP-Manager — Price Tags (Aronium-style)

## Scope
This change adds the Product Master **Price tags** workflow only. Existing POS, product, inventory, payment, customer, tax and other business functions remain unchanged.

## Implemented
- Full-screen Price Tags workspace with Aronium-style dark preview area.
- Layout controls: paper size, page width/height, roll-paper option, margins, columns, label width/height, row/column spacing.
- Display controls: product name, price, SKU/code, barcode, tax-inclusive text, borders.
- Barcode type selector: EAN13 and Code128-style fallback rendering.
- Product search and product selection.
- Default behavior: when no products are explicitly selected, visible products are used.
- Number of copies.
- Live print preview with label count.
- Browser print flow for physical printing / Save as PDF through the browser print dialog.
- A4 defaults match the supplied Aronium reference: 210 × 297 mm, 2 columns, 105 × 148.5 mm labels, zero margins/spacing.

## Aronium reference checked
The supplied Aronium package contains the Price Tags module under `Aronium.Pos.Management.Products` and the localized strings define the same major groups: Layout, Display and Products, including paper size, page dimensions, label dimensions, columns, row/column spacing, barcode type/height, product/price display, SKU, tax-inclusive price, borders and number of copies.
