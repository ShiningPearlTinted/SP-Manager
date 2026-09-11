import express from "express";
import cors from "cors";
import crypto from "node:crypto";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const sales = [];

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "SP-Manager", version: "0.2.0" });
});

app.get("/api/products", (_req, res) => {
  res.json([]);
});

app.get("/api/sales", (_req, res) => {
  res.json(sales);
});

app.post("/api/sales", (req, res) => {
  const sale = {
    id: crypto.randomUUID(),
    documentNo: `INV-${Date.now()}`,
    ...req.body,
    createdAt: new Date().toISOString()
  };
  sales.push(sale);
  res.status(201).json(sale);
});

app.listen(PORT, () => {
  console.log(`SP-Manager API running on http://localhost:${PORT}`);
});
