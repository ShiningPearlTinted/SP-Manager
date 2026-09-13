import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const products = [
  { id: 1, code: "SP001", name: "Tinted Film Standard", group: "Tinted Film", price: 180, stock: 12, reorder: 5, status: "Active" },
  { id: 2, code: "SP002", name: "Tinted Film Premium", group: "Tinted Film", price: 280, stock: 8, reorder: 5, status: "Active" },
  { id: 3, code: "SP003", name: "Tinted Film Ceramic", group: "Tinted Film", price: 450, stock: 5, reorder: 3, status: "Active" },
  { id: 4, code: "SP004", name: "Front Windscreen Film", group: "Windscreen", price: 160, stock: 14, reorder: 5, status: "Active" },
  { id: 5, code: "SP005", name: "Rear Windscreen Film", group: "Windscreen", price: 140, stock: 10, reorder: 5, status: "Active" },
  { id: 6, code: "SP006", name: "Door Glass Film", group: "Glass", price: 95, stock: 20, reorder: 8, status: "Active" },
  { id: 7, code: "SP007", name: "Security Film", group: "Security", price: 520, stock: 4, reorder: 3, status: "Active" },
  { id: 8, code: "SP008", name: "UV Protection Film", group: "Protection", price: 320, stock: 9, reorder: 4, status: "Active" }
];

const customers = [
  { id: 1, name: "Walk-in Customer", phone: "-", email: "-", visits: 0, spend: 0 },
  { id: 2, name: "Ahmad Customer", phone: "012-000 0000", email: "ahmad@example.com", visits: 8, spend: 2480 },
  { id: 3, name: "Corporate Account", phone: "03-0000 0000", email: "sales@example.com", visits: 14, spend: 5820 }
];

const suppliers = [
  { id: 1, name: "SP Film Supplier", contact: "03-1111 2222", products: 6, status: "Active" },
  { id: 2, name: "Auto Glass Trading", contact: "03-3333 4444", products: 4, status: "Active" }
];

const sales = [];
const payments = [];
let nextSaleId = 1;

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "SP-Manager API", time: new Date().toISOString() });
});

app.get("/api/products", (_req, res) => res.json(products));
app.get("/api/customers", (_req, res) => res.json(customers));
app.get("/api/suppliers", (_req, res) => res.json(suppliers));
app.get("/api/sales", (_req, res) => res.json(sales.slice().reverse().slice(0, 50)));
app.get("/api/payments", (_req, res) => res.json(payments.slice().reverse().slice(0, 50)));

app.post("/api/sales", (req, res) => {
  const { customerId = 1, items = [], discount = 0, paymentType = "Cash", tax = 0 } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Sale must contain at least one item." });
  }

  const normalizedItems = items.map((item) => ({
    productId: item.productId,
    code: item.code,
    name: item.name,
    price: Number(item.price) || 0,
    quantity: Math.max(1, Number(item.quantity) || 1)
  }));

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = Math.max(0, Math.min(subtotal, Number(discount) || 0));
  const taxable = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.max(0, Number(tax) || 0);
  const total = taxable + taxAmount;

  for (const item of normalizedItems) {
    const product = products.find((p) => p.id === item.productId);
    if (product) product.stock = Math.max(0, product.stock - item.quantity);
  }

  const sale = {
    id: nextSaleId++,
    documentNo: `INV-${String(Date.now()).slice(-8)}`,
    date: new Date().toISOString(),
    customerId,
    items: normalizedItems,
    subtotal,
    discount: discountAmount,
    tax: taxAmount,
    total,
    paymentType
  };

  sales.push(sale);
  payments.push({
    id: sale.id,
    documentNo: sale.documentNo,
    date: sale.date,
    paymentType,
    amount: total
  });

  const customer = customers.find((c) => c.id === customerId);
  if (customer) {
    customer.visits += 1;
    customer.spend += total;
  }

  res.status(201).json(sale);
});

app.post("/api/sales/:id/refund", (req, res) => {
  const id = Number(req.params.id);
  const sale = sales.find((s) => s.id === id);
  if (!sale) return res.status(404).json({ error: "Sale not found." });

  for (const item of sale.items) {
    const product = products.find((p) => p.id === item.productId);
    if (product) product.stock += item.quantity;
  }

  sale.refunded = true;
  sale.refundedAt = new Date().toISOString();
  res.json({ ok: true, sale });
});

app.get("/api/reports/summary", (_req, res) => {
  const validSales = sales.filter((s) => !s.refunded);
  const totalSales = validSales.reduce((sum, s) => sum + s.total, 0);
  const transactions = validSales.length;
  res.json({
    totalSales,
    transactions,
    averageSale: transactions ? totalSales / transactions : 0,
    customers: customers.length,
    products: products.length,
    lowStock: products.filter((p) => p.stock <= p.reorder).length
  });
});

app.get("/api/reports/xz", (_req, res) => {
  const validSales = sales.filter((s) => !s.refunded);
  const gross = validSales.reduce((sum, s) => sum + s.total, 0);
  res.json({
    reportType: "X/Z",
    generatedAt: new Date().toISOString(),
    transactionCount: validSales.length,
    grossSales: gross,
    cash: validSales.filter((s) => s.paymentType === "Cash").reduce((a, s) => a + s.total, 0),
    card: validSales.filter((s) => s.paymentType === "Card").reduce((a, s) => a + s.total, 0),
    qr: validSales.filter((s) => s.paymentType === "QR Payment").reduce((a, s) => a + s.total, 0),
    transfer: validSales.filter((s) => s.paymentType === "Online Transfer").reduce((a, s) => a + s.total, 0)
  });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, "../../frontend/dist");

app.use(express.static(frontendDist));
app.get("*splat", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"), (err) => {
    if (err) res.status(404).send("SP-Manager frontend is not built yet. Run npm run build.");
  });
});

app.listen(PORT, () => {
  console.log(`SP-Manager API running at http://localhost:${PORT}`);
});
