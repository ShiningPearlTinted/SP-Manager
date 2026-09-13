# SP-Manager — Test Build

Web-based POS and business management system for Shining Pearl Tinted.

## What is included

This package is a **working local test build** with:
- Dashboard
- POS / Sales
- Products
- Customers
- Suppliers
- Inventory
- Purchases
- Payments
- Refund / Void
- Discount / Promotion
- Tax
- Loyalty
- Users & Permissions
- Reports
- X / Z Report
- Named Order / Takeaway
- Settings
- Product search / barcode-ready input
- Cart quantity controls
- Customer selection
- Discount calculation
- Payment selection
- Complete Sale API
- Recent sales
- Basic X/Z report endpoints
- Responsive UI

> This is the test/demo foundation, not yet the final production system. The business modules are structured so the real database, authentication, printing, inventory rules, reports and Aronium-equivalent workflows can be added without replacing the whole application.

## Requirements

- Node.js 18+ recommended
- npm

## Run

Open a terminal in this folder:

```bash
npm install
npm run dev
```

Then open:
http://localhost:5173

The backend API runs on:
http://localhost:4000

Health check:
http://localhost:4000/api/health

## Production-style local build

```bash
npm run build
npm start
```

Then open:
http://localhost:4000

## Important

The application is an independent implementation. No Aronium executable, DLL, proprietary source code, or proprietary binary is included in this package.
