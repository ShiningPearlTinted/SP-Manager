# SP-Manager 1.0.18 — Print Settings Aronium-Style V11

## Scope
Only the **Settings > Print** screen and its existing receipt-print configuration were changed. Other application screens and business functions were not intentionally modified.

## Aronium reference verified
Aronium Print Options is organized into four sections/tabs:
1. Printer selection
2. Customize receipt
3. Localize receipt text
4. Print templates

This is documented in the official Aronium Help Center:
- Print options
- Customize receipt
- Localize receipt text
- Print templates

## V11 implementation
### Printer selection
- Print receipt
- Print credit payments
- Print locked sale
- Print kitchen ticket
- Print service messages
- Per-operation printer selection
- Printer type
- Paper size
- Number of copies
- Characters per line
- RTL
- Feed lines
- Cut paper
- Print bitmap/logo
- Rich formatting
- Barcode
- Full-width logo
- Alignment
- Code page
- Character set
- Margins
- Print test page

### Customize receipt
- Use system currency format
- Print tax totals
- Print tax name
- Print items count
- Print total quantity
- Short receipt number
- Print order number
- Print outstanding balance
- Decimal places
- Receipt counter
- Customer name/code/tax number/address/phone/email
- Address format tokens

### Localize receipt text
Receipt labels included:
- Company tax number
- Receipt number
- Refund number
- Order number
- User
- Items count
- Discount
- Subtotal
- Tax rate
- Total
- Paid amount
- Amount due
- Change
- Total savings
- Outstanding balance

Customer labels:
- Customer
- Address
- Tax number
- Code
- Phone number
- Email

Each customer label also has a show/hide control, matching the Aronium workflow.

### Print templates
- Font
- Invoice title
- A5
- Tax column
- Discount column
- Customer tax number/code/phone/email
- Payment methods
- Outstanding balance
- Footer
- Invoice-only footer option
- Font size

## Verification limitation
The Vite dependency is not installed in this working environment, and the environment could not fetch it offline. Therefore a full production Vite build was not run here. ZIP integrity and source-level checks were performed.
