import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const products = [
  { id: 1, code: "SP001", name: "Tinted Film Standard", price: 180, stock: 12 },
  { id: 2, code: "SP002", name: "Tinted Film Premium", price: 280, stock: 8 },
  { id: 3, code: "SP003", name: "Tinted Film Ceramic", price: 450, stock: 5 },
  { id: 4, code: "SP004", name: "Front Windscreen Film", price: 160, stock: 14 },
  { id: 5, code: "SP005", name: "Rear Windscreen Film", price: 140, stock: 10 },
  { id: 6, code: "SP006", name: "Door Glass Film", price: 95, stock: 20 }
];

const nav = ["Dashboard", "POS / Sales", "Products", "Customers", "Suppliers", "Inventory", "Purchases", "Payments", "Reports", "Users", "Settings"];

function App() {
  const [active, setActive] = React.useState("POS / Sales");
  const [search, setSearch] = React.useState("");
  const [cart, setCart] = React.useState([]);
  const [customer, setCustomer] = React.useState("Walk-in Customer");
  const [discount, setDiscount] = React.useState(0);
  const [payment, setPayment] = React.useState("Cash");

  const addProduct = (product) => {
    setCart(current => {
      const found = current.find(item => item.id === product.id);
      if (found) return current.map(item => item.id === product.id ? {...item, qty: item.qty + 1} : item);
      return [...current, {...product, qty: 1}];
    });
  };

  const changeQty = (id, delta) => {
    setCart(current => current.map(item => item.id === id ? {...item, qty: Math.max(1, item.qty + delta)} : item));
  };

  const removeItem = (id) => setCart(current => current.filter(item => item.id !== id));

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountAmount = subtotal * (Number(discount) / 100);
  const total = Math.max(0, subtotal - discountAmount);

  const filtered = products.filter(p =>
    `${p.code} ${p.name}`.toLowerCase().includes(search.toLowerCase())
  );

  const saveSale = () => {
    if (!cart.length) return alert("Cart is empty.");
    alert(`Sale saved\\nCustomer: ${customer}\\nPayment: ${payment}\\nTotal: RM ${total.toFixed(2)}`);
    setCart([]);
    setDiscount(0);
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark">SP</div>
          <div><strong>SP-Manager</strong><small>POS & Management</small></div>
        </div>
        <nav>
          {nav.map(item => (
            <button key={item} className={active === item ? "nav active" : "nav"} onClick={() => setActive(item)}>
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><h1>{active}</h1><p>Shining Pearl Tinted</p></div>
          <div className="user">Cashier <b>Admin</b></div>
        </header>

        {active === "POS / Sales" ? (
          <section className="pos">
            <div className="catalog">
              <div className="catalog-head">
                <div>
                  <h2>New Sale</h2>
                  <span>Search product or scan barcode</span>
                </div>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search / Barcode..."
                  autoFocus
                />
              </div>

              <div className="product-grid">
                {filtered.map(product => (
                  <button className="product" key={product.id} onClick={() => addProduct(product)}>
                    <span className="code">{product.code}</span>
                    <strong>{product.name}</strong>
                    <div><b>RM {product.price.toFixed(2)}</b><small>Stock {product.stock}</small></div>
                  </button>
                ))}
              </div>
            </div>

            <aside className="order">
              <div className="order-title">
                <div><h2>Current Order</h2><span>{cart.reduce((n,i) => n+i.qty,0)} item(s)</span></div>
                <button className="clear" onClick={() => setCart([])}>Clear</button>
              </div>

              <label>Customer
                <select value={customer} onChange={e => setCustomer(e.target.value)}>
                  <option>Walk-in Customer</option>
                  <option>Customer Account</option>
                </select>
              </label>

              <div className="cart">
                {!cart.length && <div className="empty">No items in the order</div>}
                {cart.map(item => (
                  <div className="cart-row" key={item.id}>
                    <div className="item-info">
                      <strong>{item.name}</strong>
                      <span>RM {item.price.toFixed(2)}</span>
                    </div>
                    <div className="qty">
                      <button onClick={() => changeQty(item.id, -1)}>−</button>
                      <b>{item.qty}</b>
                      <button onClick={() => changeQty(item.id, 1)}>+</button>
                    </div>
                    <strong className="line-total">RM {(item.price * item.qty).toFixed(2)}</strong>
                    <button className="remove" onClick={() => removeItem(item.id)}>×</button>
                  </div>
                ))}
              </div>

              <div className="totals">
                <div><span>Subtotal</span><b>RM {subtotal.toFixed(2)}</b></div>
                <div className="discount-line">
                  <span>Discount</span>
                  <input type="number" min="0" max="100" value={discount} onChange={e => setDiscount(e.target.value)} />%
                  <b>- RM {discountAmount.toFixed(2)}</b>
                </div>
                <div className="grand"><span>Total</span><strong>RM {total.toFixed(2)}</strong></div>
              </div>

              <label>Payment Type
                <select value={payment} onChange={e => setPayment(e.target.value)}>
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Online Transfer</option>
                  <option>QR Payment</option>
                </select>
              </label>

              <button className="pay" onClick={saveSale}>Complete Sale · RM {total.toFixed(2)}</button>
            </aside>
          </section>
        ) : (
          <section className="placeholder">
            <h2>{active}</h2>
            <p>This module is part of the SP-Manager implementation roadmap. POS / Sales is the first functional workflow.</p>
          </section>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
