# SP-Manager Price Tags reference

The web Price Tags renderer is aligned to the supplied SP-Manager `Templates/Ltr/ProductsPriceTags.frx` geometry.

Key source geometry:
- DataBand: 718.2 x 236.25 FastReport units (190 x 62.5 mm)
- SKU: 18.9 x 236.25 (5 mm) docked left, rotated 270°
- Product name: 18.9 x 699.3 x 28.35 (5 mm left, 7.5 mm high)
- Price: top 28.35, height 47.25 (7.5 mm top, 12.5 mm high), Arial 16 pt bold in the supplied report
- EAN13 barcode: left 304.17, top 122.85, width 128.75, height 75.6 (approximately 80.47 mm left, 32.5 mm top, 34.06 x 20 mm)
- Barcode source: `Product.Barcode`
- Barcode symbology in the supplied template: EAN13

The `.frx` file is retained as a reference artifact. The React/Vite web app does not execute FastReport's .NET engine; instead it reproduces the report geometry in HTML/SVG for browser preview and printing.
