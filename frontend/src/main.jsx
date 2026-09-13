import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const money = (n) => `RM ${Number(n || 0).toFixed(2)}`;

const modules = [
  ["dashboard", "Dashboard", "⌂"],
  ["pos", "POS / Sales", "▣"],
  ["products", "Products", "□"],
  ["inventory", "Inventory", "▤"],
  ["customers", "Customers", "♙"],
  ["suppliers", "Suppliers", "◇"],
  ["purchases", "Purchases", "↘"],
  ["payments", "Payments", "RM"],
  ["refund", "Refund / Void", "↩"],
  ["promotion", "Discount / Promotion", "%"],
  ["tax", "Tax", "T"],
  ["loyalty", "Loyalty", "★"],
  ["users", "Users & Permissions", "♙"],
  ["reports", "Reports", "▥"],
  ["xz", "X / Z Report", "X"],
  ["orders", "Named Order / Takeaway", "☰"],
  ["settings", "Settings", "⚙"]
];

function App() {
  const [module, setModule] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({});
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState(1);
  const [discountPct, setDiscountPct] = useState(0);
  const [paymentType, setPaymentType] = useState("Cash");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    const [p, c, s, v, r] = await Promise.all([
      fetch("/api/products").then(x => x.json()),
      fetch("/api/customers").then(x => x.json()),
      fetch("/api/suppliers").then(x => x.json()),
      fetch("/api/sales").then(x => x.json()),
      fetch("/api/reports/summary").then(x => x.json())
    ]);
    setProducts(p); setCustomers(c); setSuppliers(s); setSales(v); setSummary(r);
  };

  useEffect(() => { load().catch(() => setNotice("Backend belum berjalan. Jalankan npm run dev.")); }, []);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
  }, [products, search]);

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = subtotal * (Number(discountPct) / 100);
  const total = Math.max(0, subtotal - discount);

  const addToCart = (p) => {
    setCart(old => {
      const found = old.find(i => i.productId === p.id);
      if (found) return old.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...old, { productId: p.id, code: p.code, name: p.name, price: p.price, quantity: 1 }];
    });
    setNotice(`${p.name} ditambah ke cart`);
  };

  const changeQty = (id, delta) => {
    setCart(old => old
      .map(i => i.productId === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
      .filter(i => i.quantity > 0));
  };

  const completeSale = async () => {
    if (!cart.length) return setNotice("Cart masih kosong.");
    const response = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        items: cart,
        discount,
        paymentType
      })
    });
    const data = await response.json();
    if (!response.ok) return setNotice(data.error || "Sale gagal.");
    setCart([]);
    setDiscountPct(0);
    setNotice(`Sale berjaya: ${data.documentNo} — ${money(data.total)}`);
    await load();
  };

  const refund = async (id) => {
    const response = await fetch(`/api/sales/${id}/refund`, { method: "POST" });
    if (response.ok) {
      setNotice("Transaksi berjaya direfund.");
      await load();
    }
  };

  const title = modules.find(m => m[0] === module)?.[1] || "SP-Manager";

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SP</div>
          <div><strong>SP-Manager</strong><span>Shining Pearl Tinted</span></div>
        </div>
        <div className="nav-label">MODULES</div>
        <nav>
          {modules.map(([id, label, icon]) => (
            <button key={id} className={module === id ? "nav active" : "nav"} onClick={() => setModule(id)}>
              <span className="nav-icon">{icon}</span><span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">SHINING PEARL TINTED</div>
            <h1>{title}</h1>
          </div>
          <div className="top-actions">
            <span className="status-dot">● API Online</span>
            <button className="outline-btn" onClick={() => load()}>Refresh</button>
          </div>
        </header>

        {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}

        {module === "dashboard" && <Dashboard summary={summary} sales={sales} />}
        {module === "pos" && (
          <POS
            products={filteredProducts}
            search={search}
            setSearch={setSearch}
            cart={cart}
            addToCart={addToCart}
            changeQty={changeQty}
            customers={customers}
            customerId={customerId}
            setCustomerId={setCustomerId}
            discountPct={discountPct}
            setDiscountPct={setDiscountPct}
            paymentType={paymentType}
            setPaymentType={setPaymentType}
            subtotal={subtotal}
            discount={discount}
            total={total}
            completeSale={completeSale}
          />
        )}
        {module === "products" && <TablePage title="Products" columns={["Code","Product","Group","Price","Stock","Status"]} rows={products.map(p => [p.code,p.name,p.group,money(p.price),p.stock,p.status])} action="Add Product" />}
        {module === "inventory" && <Inventory products={products} />}
        {module === "customers" && <TablePage title="Customers" columns={["Name","Phone","Email","Visits","Total Spend"]} rows={customers.map(c => [c.name,c.phone,c.email,c.visits,money(c.spend)])} action="Add Customer" />}
        {module === "suppliers" && <TablePage title="Suppliers" columns={["Supplier","Contact","Products","Status"]} rows={suppliers.map(s => [s.name,s.contact,s.products,s.status])} action="Add Supplier" />}
        {module === "purchases" && <SimpleModule icon="↘" text="Purchase workflow: supplier → items → quantity → cost → receive stock → document." />}
        {module === "payments" && <Payments sales={sales} />}
        {module === "refund" && <Refund sales={sales} refund={refund} />}
        {module === "promotion" && <SimpleModule icon="%" text="Promotion rules: percentage discount, fixed discount, product/group promotion and customer discount." />}
        {module === "tax" && <SimpleModule icon="T" text="Tax setup area for tax rates and product tax mapping." />}
        {module === "loyalty" && <SimpleModule icon="★" text="Loyalty area for loyalty cards, points and customer rewards." />}
        {module === "users" && <TablePage title="Users & Permissions" columns={["User","Role","Status","Permissions"]} rows={[["Administrator","Admin","Active","All"],["Cashier","Cashier","Active","POS, Sales"],["Manager","Manager","Active","POS, Reports, Inventory"]]} action="Add User" />}
        {module === "reports" && <Reports summary={summary} sales={sales} />}
        {module === "xz" && <XZReport />}
        {module === "orders" && <SimpleModule icon="☰" text="Named Order / Takeaway area for open orders, customer assignment and order transfer." />}
        {module === "settings" && <Settings />}
      </main>
    </div>
  );
}

function Dashboard({ summary, sales }) {
  const cards = [
    ["Today's Sales", money(summary.totalSales), "Sales"],
    ["Transactions", summary.transactions || 0, "Orders"],
    ["Average Sale", money(summary.averageSale), "Per transaction"],
    ["Low Stock", summary.lowStock || 0, "Products to check"]
  ];
  return <div className="content">
    <div className="hero">
      <div><span>WELCOME</span><h2>Manage smarter · Sell faster · Grow together</h2><p>SP-Manager test build untuk POS dan pengurusan operasi.</p></div>
      <button className="primary-btn">Open POS</button>
    </div>
    <div className="cards">{cards.map(c => <div className="card" key={c[0]}><span>{c[0]}</span><strong>{c[1]}</strong><small>{c[2]}</small></div>)}</div>
    <div className="grid-2">
      <section className="panel"><div className="panel-head"><h3>Recent Sales</h3><span>{sales.length} records</span></div>
        {sales.slice(0,5).map(s => <div className="list-row" key={s.id}><div><b>{s.documentNo}</b><small>{new Date(s.date).toLocaleString()}</small></div><strong>{money(s.total)}</strong></div>)}
        {!sales.length && <Empty text="Belum ada transaksi. Pergi ke POS / Sales untuk test."/>}
      </section>
      <section className="panel"><div className="panel-head"><h3>System Modules</h3><span>17 modules</span></div>
        <div className="module-grid">{["POS","Products","Inventory","Customers","Suppliers","Purchases","Payments","Reports","X/Z Report","Users","Settings","Loyalty"].map(x => <div className="module-chip" key={x}>{x}</div>)}</div>
      </section>
    </div>
  </div>;
}

function POS({ products, search, setSearch, cart, addToCart, changeQty, customers, customerId, setCustomerId, discountPct, setDiscountPct, paymentType, setPaymentType, subtotal, discount, total, completeSale }) {
  return <div className="pos-layout">
    <section className="panel catalogue">
      <div className="searchbar"><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Scan barcode / search product code or name..." /><button onClick={() => setSearch("")}>Clear</button></div>
      <div className="product-grid">{products.map(p => <button className="product-card" key={p.id} onClick={() => addToCart(p)}>
        <span>{p.code}</span><b>{p.name}</b><small>{p.group}</small><strong>{money(p.price)}</strong><em>Stock {p.stock}</em>
      </button>)}</div>
    </section>
    <section className="panel cart-panel">
      <div className="panel-head"><h3>Current Order</h3><span>{cart.reduce((a,i)=>a+i.quantity,0)} items</span></div>
      <div className="field"><label>Customer</label><select value={customerId} onChange={e => setCustomerId(Number(e.target.value))}>{customers.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></div>
      <div className="cart-list">
        {cart.map(i => <div className="cart-row" key={i.productId}><div><b>{i.name}</b><small>{money(i.price)} × {i.quantity}</small></div><div className="qty"><button onClick={() => changeQty(i.productId,-1)}>−</button><span>{i.quantity}</span><button onClick={() => changeQty(i.productId,1)}>+</button></div><strong>{money(i.price*i.quantity)}</strong></div>)}
        {!cart.length && <Empty text="Cart kosong"/>}
      </div>
      <div className="checkout">
        <div className="field"><label>Discount %</label><input type="number" min="0" max="100" value={discountPct} onChange={e => setDiscountPct(e.target.value)} /></div>
        <div className="payment-buttons">{["Cash","Card","Online Transfer","QR Payment"].map(x => <button key={x} className={paymentType===x?"selected":""} onClick={() => setPaymentType(x)}>{x}</button>)}</div>
        <div className="totals"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Discount</span><b>- {money(discount)}</b></div><div className="grand"><span>Total</span><strong>{money(total)}</strong></div></div>
        <button className="complete-btn" onClick={completeSale}>Complete Sale · {money(total)}</button>
      </div>
    </section>
  </div>;
}

function Inventory({ products }) {
  return <div className="content"><div className="cards"><div className="card"><span>Total Products</span><strong>{products.length}</strong></div><div className="card"><span>Total Stock</span><strong>{products.reduce((a,p)=>a+p.stock,0)}</strong></div><div className="card"><span>Low Stock</span><strong>{products.filter(p=>p.stock<=p.reorder).length}</strong></div></div>
    <TablePage title="Inventory / Stock" columns={["Code","Product","Warehouse","Stock","Reorder","Status"]} rows={products.map(p=>[p.code,p.name,"Main Warehouse",p.stock,p.reorder,p.stock<=p.reorder?"Low":"OK"])} action="Stock Adjustment"/>
  </div>;
}

function Payments({ sales }) {
  return <TablePage title="Payments" columns={["Document","Date","Payment Type","Amount","Status"]} rows={sales.map(s=>[s.documentNo,new Date(s.date).toLocaleString(),s.paymentType,money(s.total),s.refunded?"Refunded":"Paid"])} action="Payment Entry"/>;
}

function Refund({ sales, refund }) {
  return <div className="content"><div className="panel"><div className="panel-head"><h3>Refund / Void</h3><span>Test refund restores stock</span></div>{sales.length ? sales.map(s=><div className="list-row" key={s.id}><div><b>{s.documentNo}</b><small>{new Date(s.date).toLocaleString()} · {s.paymentType}</small></div><div className="row-right"><strong>{money(s.total)}</strong>{s.refunded?<span className="badge">Refunded</span>:<button className="danger-btn" onClick={()=>refund(s.id)}>Refund</button>}</div></div>) : <Empty text="Tiada transaksi untuk refund."/>}</div></div>;
}

function Reports({ summary, sales }) {
  return <div className="content"><div className="cards"><div className="card"><span>Total Sales</span><strong>{money(summary.totalSales)}</strong></div><div className="card"><span>Transactions</span><strong>{summary.transactions||0}</strong></div><div className="card"><span>Customers</span><strong>{summary.customers||0}</strong></div><div className="card"><span>Products</span><strong>{summary.products||0}</strong></div></div><div className="panel"><div className="panel-head"><h3>Sales Report</h3><span>Current local test session</span></div><div className="report-bars">{sales.slice(0,8).map((s,i)=><div className="bar-row" key={s.id}><span>{s.documentNo}</span><div><i style={{width:`${Math.min(100, Math.max(8, s.total/5))}%`}}></i></div><b>{money(s.total)}</b></div>)}</div>{!sales.length&&<Empty text="Buat transaksi di POS untuk melihat report."/>}</div></div>;
}

function XZReport() {
  const [data,setData]=useState(null);
  const get=()=>fetch("/api/reports/xz").then(r=>r.json()).then(setData);
  useEffect(()=>{get()},[]);
  return <div className="content"><div className="panel"><div className="panel-head"><h3>X / Z Report</h3><button className="outline-btn" onClick={get}>Generate</button></div>{data&&<div className="xz-grid">{[["Transactions",data.transactionCount],["Gross Sales",money(data.grossSales)],["Cash",money(data.cash)],["Card",money(data.card)],["QR Payment",money(data.qr)],["Online Transfer",money(data.transfer)]].map(x=><div className="card" key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></div>)}</div>}</div></div>;
}

function TablePage({ title, columns, rows, action }) {
  return <div className="content"><div className="panel"><div className="panel-head"><h3>{title}</h3><button className="primary-btn">{action}</button></div><div className="table-wrap"><table><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((x,j)=><td key={j}>{x}</td>)}</tr>)}</tbody></table>{!rows.length&&<Empty text="Tiada data."/>}</div></div></div>;
}

function SimpleModule({ icon, text }) {
  return <div className="content"><div className="empty-module"><div className="big-icon">{icon}</div><h2>Module Ready</h2><p>{text}</p><span>UI foundation tersedia untuk implementation seterusnya.</span></div></div>;
}

function Settings() {
  return <div className="content"><div className="grid-2"><div className="panel"><div className="panel-head"><h3>Shop Information</h3></div>{["Business Name","Address","Phone","Email","Website"].map(x=><div className="field" key={x}><label>{x}</label><input defaultValue={x==="Business Name"?"Shining Pearl Tinted":""} placeholder={x}/></div>)}</div><div className="panel"><div className="panel-head"><h3>POS Settings</h3></div>{["Receipt Printing","Tax Calculation","Starting Cash","Cash Drawer","Customer Display","Barcode Scanner"].map(x=><label className="switch-row" key={x}><span>{x}</span><input type="checkbox" defaultChecked /></label>)}</div></div></div>;
}

function Empty({text}) { return <div className="empty">{text}</div>; }

createRoot(document.getElementById("root")).render(<App />);
