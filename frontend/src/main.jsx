import React,{useMemo,useState}from"react";
import{createRoot}from"react-dom/client";
import"./styles.css";

const seedProducts=[
{id:1,code:"SP001",name:"Tinted Film Standard",group:"Tinted Film",category:"Tinted Film",price:180,cost:90,stock:12,reorder:5},
{id:2,code:"SP002",name:"Tinted Film Premium",group:"Tinted Film",category:"Tinted Film",price:280,cost:140,stock:8,reorder:5},
{id:3,code:"SP003",name:"Tinted Film Ceramic",group:"Tinted Film",category:"Tinted Film",price:450,cost:220,stock:5,reorder:5},
{id:4,code:"SP004",name:"Front Windscreen Film",group:"Windscreen",category:"Windscreen",price:160,cost:80,stock:14,reorder:5},
{id:5,code:"SP005",name:"Rear Windscreen Film",group:"Windscreen",category:"Windscreen",price:140,cost:70,stock:10,reorder:5},
{id:6,code:"SP006",name:"Door Glass Film",group:"Glass",category:"Glass",price:95,cost:45,stock:20,reorder:5},
{id:7,code:"SP007",name:"Security Film",group:"Security",category:"Security",price:520,cost:260,stock:4,reorder:5},
{id:8,code:"SP008",name:"UV Protection Film",group:"Protection",category:"Protection",price:320,cost:160,stock:9,reorder:5}
];
const seedCustomers=[
{id:1,name:"Walk-in Customer",phone:"-",email:"-",visits:0,spend:0},
{id:2,name:"Ahmad Customer",phone:"012-000 0000",email:"ahmad@example.com",visits:8,spend:2480},
{id:3,name:"Corporate Account",phone:"03-0000 0000",email:"sales@example.com",visits:14,spend:5820}
];
const seedSuppliers=[
{id:1,name:"SP Film Supplier",phone:"03-1111 2222",email:"supplier@example.com",balance:0},
{id:2,name:"Auto Glass Trading",phone:"03-3333 4444",email:"sales@autoglass.example",balance:0}
];
const seedPromos=[
{id:1,name:"Standard 5%",type:"percent",value:5,active:true},
{id:2,name:"Premium RM20",type:"fixed",value:20,active:true}
];
const seedUsers=[
{id:1,name:"Administrator",username:"admin",role:"Administrator",enabled:true},
{id:2,name:"Cashier",username:"cashier",role:"Cashier",enabled:true}
];
const nav=["Dashboard","POS / Sales","Products","Inventory","Customers","Suppliers","Purchases","Payments","Refund / Void","Discount / Promotion","Tax","Loyalty","Users & Permissions","Reports","X / Z Report","Named Order / Takeaway","Settings"];
const money=n=>"RM "+Number(n||0).toFixed(2);
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem("sp_"+k))??d}catch{return d}};
const save=(k,v)=>localStorage.setItem("sp_"+k,JSON.stringify(v));
const uid=()=>Date.now()+Math.floor(Math.random()*999);

function App(){
 const[page,setPage]=useState("POS / Sales");
 const[posMenu,setPosMenu]=useState(false);
 const[products,setProducts]=useState(()=>load("products",seedProducts));
 const[categories,setCategories]=useState(()=>load("categories",["Tinted Film","Windscreen","Glass","Security","Protection"]));
 const[customers,setCustomers]=useState(()=>load("customers",seedCustomers));
 const[suppliers,setSuppliers]=useState(()=>load("suppliers",seedSuppliers));
 const[sales,setSales]=useState(()=>load("sales",[]));
 const[purchases,setPurchases]=useState(()=>load("purchases",[]));
 const[promos,setPromos]=useState(()=>load("promos",seedPromos));
 const[users,setUsers]=useState(()=>load("users",seedUsers));
 const[orders,setOrders]=useState(()=>load("orders",[]));
 const[cart,setCart]=useState([]);
 const[q,setQ]=useState("");
 const[posCategory,setPosCategory]=useState("All Categories");
 const[customer,setCustomer]=useState(1);
 const[discount,setDiscount]=useState(0);
 const[payment,setPayment]=useState("Cash");
 const[taxRate,setTaxRate]=useState(()=>load("taxRate",0));
 const[notice,setNotice]=useState("");
 const[businessDay,setBusinessDay]=useState(()=>load("businessDay",{open:true,openingCash:0}));
 const[editing,setEditing]=useState(null);
 const[productGroups,setProductGroups]=useState(()=>load("productGroups",[...new Set(seedProducts.map(p=>p.group||p.category).filter(Boolean))]));
 const[lastSale,setLastSale]=useState(null);

 const activeSales=sales.filter(x=>!x.voided&&!x.refunded);
 const today=activeSales.reduce((a,x)=>a+x.total,0);
 const lowStock=products.filter(p=>p.stock<=p.reorder).length;
 const filtered=useMemo(()=>products.filter(p=>{const text=(p.name+" "+p.code+" "+(p.barcode||"")+" "+(Array.isArray(p.barcodes)?p.barcodes.join(" "):"")+" "+(p.group||"")+" "+(p.category||"")).toLowerCase();const cat=posCategory==="All Categories"||((p.category||p.group||"")===posCategory);return cat&&text.includes(q.toLowerCase())}),[products,q,posCategory]);
 const emailReceipt=(sale)=>{const c=customers.find(x=>x.id===sale.customerId);const to=c?.email&&c.email!=="-"?c.email:"";const cols=["Qty","Description","Amount"];const rows=sale.items.map(i=>[i.qty,i.name,money(i.price*i.qty)]);downloadReportPDF("Receipt-"+sale.no,cols,rows);const body=["Dear "+(c?.name||"Customer")+",","","Please find your sales receipt details below.","Receipt: "+sale.no,"Date: "+new Date(sale.date).toLocaleString(),"Total: "+money(sale.total),"Payment: "+sale.payment,"","Thank you,","Shining Pearl Tinted"].join("\n");window.location.href="mailto:"+encodeURIComponent(to)+"?subject="+encodeURIComponent("Sales Receipt "+sale.no)+"&body="+encodeURIComponent(body);};
 const subtotal=cart.reduce((a,x)=>a+x.price*x.qty,0);
 const disc=subtotal*Number(discount||0)/100;
 const taxable=Math.max(0,subtotal-disc);
 const tax=taxable*Number(taxRate||0)/100;
 const grand=taxable+tax;

 const persist=(key,val,setter)=>{save(key,val);setter(val)};
 const add=p=>setCart(c=>c.some(x=>x.id===p.id)?c.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x):[...c,{...p,qty:1}]);
 const changeQty=(id,d)=>setCart(c=>c.flatMap(x=>x.id===id?((x.qty+d)>0?[{...x,qty:x.qty+d}]:[]):[x]));

 const completeSale=()=>{
  if(!cart.length)return setNotice("The cart is empty.");
  const sale={id:uid(),no:"INV-"+String(uid()).slice(-8),date:new Date().toISOString(),customerId:customer,items:cart,subtotal,discount:disc,tax,total:grand,payment,voided:false,refunded:false};
  const ns=[...sales,sale];
  const np=products.map(p=>{const i=cart.find(x=>x.id===p.id);return i?{...p,stock:Math.max(0,p.stock-i.qty)}:p});
  persist("sales",ns,setSales);persist("products",np,setProducts);
  const nc=customers.map(c=>c.id===customer?{...c,visits:c.visits+1,spend:c.spend+grand}:c);
  persist("customers",nc,setCustomers);
  setLastSale(sale);
  setCart([]);setDiscount(0);setNotice("Sale completed successfully: "+sale.no+" — "+money(grand));setPage("POS / Sales");
 };
 const refund=id=>{
  const s=sales.find(x=>x.id===id);if(!s||s.refunded||s.voided)return;
  const ns=sales.map(x=>x.id===id?{...x,refunded:true}:x);
  const np=products.map(p=>{const i=s.items.find(x=>x.id===p.id);return i?{...p,stock:p.stock+i.qty}:p});
  persist("sales",ns,setSales);persist("products",np,setProducts);setNotice("Refund completed successfully for "+s.no);
 };
 const voidSale=id=>{
  const s=sales.find(x=>x.id===id);if(!s||s.voided||s.refunded)return;
  const ns=sales.map(x=>x.id===id?{...x,voided:true}:x);
  const np=products.map(p=>{const i=s.items.find(x=>x.id===p.id);return i?{...p,stock:p.stock+i.qty}:p});
  persist("sales",ns,setSales);persist("products",np,setProducts);setNotice("Transaction "+s.no+" has been voided.");
 };
 const addProduct=p=>{
  const np=[...products,{...p,id:uid(),price:Number(p.price),cost:Number(p.cost),stock:Number(p.stock),reorder:Number(p.reorder)}];
  persist("products",np,setProducts);setNotice("Product added successfully.");
 };
 const updateProduct=p=>{
  const np=products.map(x=>x.id===p.id?{...p}:x);persist("products",np,setProducts);setEditing(null);setNotice("Product updated successfully.");
 };
 const addCustomer=c=>{
  const nc=[...customers,{...c,id:uid(),visits:0,spend:0}];persist("customers",nc,setCustomers);setNotice("Customer added successfully.");
 };
 const receivePurchase=(supplierId,items,total)=>{
  const po={id:uid(),no:"PO-"+String(uid()).slice(-7),date:new Date().toISOString(),supplierId,items,total,status:"Received"};
  const np=products.map(p=>{const i=items.find(x=>x.productId===p.id);return i?{...p,stock:p.stock+Number(i.qty)}:p});
  persist("purchases",[...purchases,po],setPurchases);persist("products",np,setProducts);setNotice("Purchase received and stock updated successfully.");
 };
 const savePromo=p=>{const np=p.id?promos.map(x=>x.id===p.id?{...p}:x):[...promos,{...p,id:uid()}];persist("promos",np,setPromos);setNotice("Promotion saved successfully.")};
 const toggleBusiness=()=>{
  const b={...businessDay,open:!businessDay.open,closedAt:businessDay.open?new Date().toISOString():null};
  persist("businessDay",b,setBusinessDay);setNotice(b.open?"Business day opened successfully.":"Business day closed successfully.");
 };

 return <div className="app">
  <aside><div className="brand"><b>SP</b><span><strong>SP-Manager</strong><small>Shining Pearl Tinted</small></span></div><label>MODULES</label>
   {nav.map(n=><button className={page===n?"active":""} onClick={()=>{setPage(n);setQ("")}} key={n}>▸ {n}</button>)}
  </aside>
  <main><header><div><small>SHINING PEARL TINTED</small><h1>{page}</h1></div><div className="head-actions"><span className="day">● {businessDay.open?"Business Day Open":"Closed"}</span><span>● Online</span></div></header>
   {notice&&<div className="notice">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
   {page==="Dashboard"&&<Dashboard sales={activeSales} total={today} products={products} lowStock={lowStock} setPage={setPage} businessDay={businessDay} toggleBusiness={toggleBusiness}/>}
   {page==="POS / Sales"&&<POS filtered={filtered} q={q} setQ={setQ} add={add} cart={cart} changeQty={changeQty} customers={customers} customer={customer} setCustomer={setCustomer} discount={discount} setDiscount={setDiscount} payment={payment} setPayment={setPayment} subtotal={subtotal} disc={disc} taxRate={taxRate} setTaxRate={setTaxRate} tax={tax} grand={grand} sale={completeSale} categories={categories} posCategory={posCategory} setPosCategory={setPosCategory} products={products} menuOpen={posMenu} setMenuOpen={setPosMenu} setPage={setPage} sales={sales} emailReceipt={emailReceipt}/>}
   {page==="Products"&&<Products products={products} setProducts={setProducts} addProduct={addProduct} updateProduct={updateProduct} editing={editing} setEditing={setEditing} categories={categories} setCategories={setCategories} productGroups={productGroups} setProductGroups={setProductGroups} setNotice={setNotice}/>}
   {page==="Inventory"&&<Inventory products={products} setProducts={setProducts}/>}
   {page==="Customers"&&<Customers customers={customers} addCustomer={addCustomer}/>}
   {page==="Suppliers"&&<Suppliers suppliers={suppliers} setSuppliers={setSuppliers}/>}
   {page==="Purchases"&&<Purchases products={products} suppliers={suppliers} receivePurchase={receivePurchase} purchases={purchases}/>}
   {page==="Payments"&&<Payments sales={sales} customers={customers} emailReceipt={emailReceipt}/>}
   {page==="Refund / Void"&&<RefundVoid sales={sales} refund={refund} voidSale={voidSale}/>}
   {page==="Discount / Promotion"&&<Promotions promos={promos} savePromo={savePromo}/>}
   {page==="Tax"&&<Tax rate={taxRate} setRate={r=>{setTaxRate(r);save("taxRate",r);setNotice("Tax rate saved successfully.")}}/>}
   {page==="Loyalty"&&<Loyalty customers={customers}/>}
   {page==="Users & Permissions"&&<Users users={users} setUsers={u=>{persist("users",u,setUsers);setNotice("User updated successfully.")}}/>}
   {page==="Reports"&&<Reports sales={sales} products={products} customers={customers} purchases={purchases} businessDay={businessDay} users={users} suppliers={suppliers}/>}
   {page==="X / Z Report"&&<XZ sales={sales} businessDay={businessDay}/>}
   {page==="Named Order / Takeaway"&&<NamedOrders orders={orders} setOrders={o=>{persist("orders",o,setOrders);setNotice("Order saved successfully.")}} customers={customers}/>}
   {page==="Settings"&&<Settings businessDay={businessDay} toggleBusiness={toggleBusiness} taxRate={taxRate} setTaxRate={r=>{setTaxRate(r);save("taxRate",r)}}/>}
   {lastSale&&<div className="receipt-modal-backdrop"><div className="receipt-modal"><div className="receipt-head"><div><small>SHINING PEARL TINTED</small><h2>Sales Receipt</h2></div><button onClick={()=>setLastSale(null)}>×</button></div><div className="receipt-meta"><span>Receipt <b>{lastSale.no}</b></span><span>{new Date(lastSale.date).toLocaleString()}</span></div><Table cols={["Qty","Description","Amount"]} rows={lastSale.items.map(i=>[i.qty,i.name,money(i.price*i.qty)])}/><div className="receipt-total"><span>Total <b>{money(lastSale.total)}</b></span><span>Payment <b>{lastSale.payment}</b></span></div><div className="receipt-actions"><button onClick={()=>downloadReportPDF("Receipt-"+lastSale.no,["Qty","Description","Amount"],lastSale.items.map(i=>[i.qty,i.name,money(i.price*i.qty)]))}>Download PDF</button><button onClick={()=>emailReceipt(lastSale)}>Email Receipt</button><button className="secondary" onClick={()=>setLastSale(null)}>Close</button></div><p className="muted">Email Receipt opens the customer email application with the receipt details and creates the PDF for attachment.</p></div></div>}
  </main>
 </div>
}

function Dashboard({sales,total,products,lowStock,setPage,businessDay,toggleBusiness}){
 const monthly=Array.from({length:12},(_,i)=>sales.filter(s=>new Date(s.date).getMonth()===i&&new Date(s.date).getFullYear()===new Date().getFullYear()).reduce((a,s)=>a+s.total,0));
 const yearTotal=monthly.reduce((a,v)=>a+v,0);
 const max=Math.max(1,...monthly);
 const topProducts=[...products].sort((a,b)=>b.stock-a.stock).slice(0,6);
 const topSelling=[...products].map(p=>({p,qty:sales.reduce((n,s)=>n+s.items.filter(i=>i.id===p.id).reduce((q,i)=>q+i.qty,0),0)})).sort((a,b)=>b.qty-a.qty).slice(0,5);
 const recent=[...sales].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);
 return <section className="content dashboard-modern">
  <div className="dashboard-head"><div><small>MANAGEMENT</small><h2>Dashboard</h2><p>Business overview and sales performance</p></div><div className="dashboard-actions"><button className="secondary" onClick={()=>setPage("Reports")}>View Reports</button><button onClick={()=>setPage("POS / Sales")}>Open POS</button></div></div>
  <div className="dashboard-cards">
   <Card t="Today's Sales" v={money(total)}/><Card t="Total Sales" v={money(yearTotal)}/><Card t="Products" v={products.length}/><Card t="Low Stock" v={lowStock}/>
  </div>
  <div className="dashboard-layout">
   <div className="panel dashboard-chart-panel"><div className="panel-title"><div><h3>Monthly Sales - {new Date().getFullYear()}</h3><small>Sales data grouped by month</small></div><strong>{money(yearTotal)}</strong></div><div className="sales-chart">{monthly.map((v,i)=><div className="sales-bar-wrap" key={i}><div className="sales-bar" style={{height:Math.max(3,(v/max)*100)+"%"}}><span>{v?Math.round(v):""}</span></div><small>{new Date(2026,i,1).toLocaleString("en-GB",{month:"short"})}</small></div>)}</div></div>
   <div className="panel dashboard-day-panel"><div className="panel-title"><div><h3>Business Day</h3><small>Current register status</small></div><span className={businessDay.open?"status-pill ok":"status-pill"}>{businessDay.open?"Open":"Closed"}</span></div><div className="day-value">{businessDay.open?"Business day is open":"Business day is closed"}</div><button onClick={toggleBusiness}>{businessDay.open?"Close Business Day":"Open Business Day"}</button></div>
  </div>
  <div className="dashboard-grid">
   <div className="panel"><div className="panel-title"><div><h3>Top Products</h3><small>Products currently carrying the most stock</small></div><button className="linkbtn" onClick={()=>setPage("Products")}>View all</button></div>{topProducts.length?topProducts.map(p=><div className="dash-row" key={p.id}><div><b>{p.name}</b><small>{p.category||p.group||"Uncategorised"}</small></div><strong>{p.stock}</strong></div>):<Empty text="No data to display"/>}</div>
   <div className="panel"><div className="panel-title"><div><h3>Top Selling Products</h3><small>Based on completed sales</small></div></div>{topSelling.some(x=>x.qty)?topSelling.map(x=><div className="dash-row" key={x.p.id}><div><b>{x.p.name}</b><small>{x.p.category||x.p.group||"Uncategorised"}</small></div><strong>{x.qty}</strong></div>):<Empty text="No sales data to display"/>}</div>
   <div className="panel"><div className="panel-title"><div><h3>Recent Sales</h3><small>Latest completed transactions</small></div><button className="linkbtn" onClick={()=>setPage("Payments")}>View history</button></div>{recent.length?recent.map(s=><div className="dash-row" key={s.id}><div><b>{s.no}</b><small>{new Date(s.date).toLocaleString("en-GB")} · {s.payment}</small></div><strong>{money(s.total)}</strong></div>):<Empty text="No transactions yet."/>}</div>
   <div className="panel quick-panel"><div className="panel-title"><div><h3>Quick Actions</h3><small>Common management tasks</small></div></div><div className="quick-actions"><button onClick={()=>setPage("Products")}>Products</button><button onClick={()=>setPage("Inventory")}>Stock</button><button onClick={()=>setPage("Customers")}>Customers</button><button onClick={()=>setPage("Purchases")}>Purchases</button><button onClick={()=>setPage("Reports")}>Reporting</button><button onClick={()=>setPage("Settings")}>Settings</button></div></div>
  </div>
 </section>
}
function Card({t,v}){return <div className="card"><small>{t}</small><strong>{v}</strong></div>}
function POS({filtered,q,setQ,add,cart,changeQty,customers,customer,setCustomer,discount,setDiscount,payment,setPayment,subtotal,disc,taxRate,setTaxRate,tax,grand,sale,categories,posCategory,setPosCategory,products,menuOpen,setMenuOpen,setPage,sales,emailReceipt}){
 const[catLevel,setCatLevel]=useState("root");
 const[group,setGroup]=useState("");
 const[showCustomer,setShowCustomer]=useState(false);
 const[showPayment,setShowPayment]=useState(false);
 const rootCats=categories.length?categories:["Accessories","Car Detailing","Coating","Installation Service","PPF","Tint","Wrapping"];
 const categoryProducts=products.filter(p=>{
  if(posCategory==="All Categories") return true;
  return (p.category||p.group||"")===posCategory || (p.group||"")===posCategory;
 });
 const groups=[...new Set(categoryProducts.map(p=>p.group||p.category).filter(Boolean))];
 const groupProducts=group?categoryProducts.filter(p=>(p.group||p.category||"")===group):categoryProducts;
 const shown=groupProducts;
 const iconFor=(name)=>({"Accessories":"🧰","Car Detailing":"✨","Coating":"◈","Installation Service":"🛠","PPF":"◆","Tint":"◉","Wrapping":"◇","Windscreen":"▱","Glass":"◫","Security":"⬡","Protection":"✦"}[name]||"✦");
 const categoryTile=(name)=><button className="ar-category-tile" key={name} onClick={()=>{setPosCategory(name);setGroup("");setCatLevel("group")}}><div className="ar-cat-icon"><span>{iconFor(name)}</span></div><strong>{name}</strong><small>{products.filter(p=>(p.category||p.group)===name).length} products</small></button>;
 const groupTile=(name)=><button className="ar-category-tile ar-group-tile" key={name} onClick={()=>{setGroup(name);setCatLevel("items")}}><div className="ar-cat-icon"><span>{iconFor(name)}</span></div><strong>{name}</strong><small>{categoryProducts.filter(p=>(p.group||p.category)===name).length} products</small></button>;
 return <section className="ar-pos-shell">
  <div className="ar-topbar">
   {[['⌕','Search'],['♙','Customer'],['⇄','Transfer'],['%','Discount'],['＋','New sale'],['↶','Refund'],['▤','Cash drawer'],['F9','Save sale'],['F10','Payment'],['F12','Cash'],['▣','Card'],['▣','QR'],['⇄','Bank Transfers'],['▣','Check'],['▣','Deposit'],['▣','Unpaid']].map(([ic,label],i)=><button key={label} className={'ar-action '+(label==='Payment'?'selected':'')} onClick={()=>{if(label==='Search')document.querySelector('.ar-search-input')?.focus();if(label==='Customer')setShowCustomer(true);if(label==='New sale'){setQ('');setPosCategory('All Categories');setGroup('');setCatLevel('root')}if(label==='Refund')setPage('Refund / Void');if(label==='Cash drawer')setPage('Payments');if(label==='Save sale')setPage('Named Order / Takeaway');if(label==='Cash'||label==='Card'||label==='QR'||label==='Bank Transfers'||label==='Check'||label==='Deposit'||label==='Unpaid'){setPayment(label);setShowPayment(true)}}}><span>{ic}</span><b>{label==='Save sale'?'F9 Save sale':label==='Payment'?'F10 Payment':label==='Cash'?'F12 Cash':label}</b></button>)}
   <button className="ar-menu-btn" onClick={()=>setMenuOpen(!menuOpen)}>☰</button>
  </div>
  <div className="ar-main">
   <div className="ar-order-panel">
    <div className="ar-order-tools"><button onClick={()=>cart.length&&changeQty(cart[cart.length-1].id,-cart[cart.length-1].qty)}>× Delete</button><button>Quantity</button><button>---</button></div>
    <div className="ar-order-customer"><span>Customer</span><button onClick={()=>setShowCustomer(true)}>{customers.find(c=>c.id===customer)?.name||'Walk-in Customer'} <b>⌄</b></button></div>
    <div className="ar-order-items">{cart.map(i=><div className="ar-order-item" key={i.id}><button className="ar-item-plus" onClick={()=>add(i)}>＋</button><div><b>{i.name}</b><small>{i.code||'—'} · {money(i.price)} × {i.qty}</small></div><strong>{money(i.price*i.qty)}</strong></div>)}{!cart.length&&<div className="ar-no-items"><span>🛒</span><b>No items</b><small>Select a category or search for a product</small></div>}</div>
    <div className="ar-order-total"><span>Subtotal <b>{money(subtotal)}</b></span><span>Discount <b>{money(disc)}</b></span><span>Tax <b>{money(tax)}</b></span><strong>Total <b>{money(grand)}</b></strong></div>
    <div className="ar-bottom-actions"><button onClick={()=>setPage('Refund / Void')}>▣<small>Void order</small></button><button onClick={()=>setMenuOpen(true)}>♙<small>Lock</small></button><button onClick={()=>{setQ('');setPosCategory('All Categories');setGroup('');setCatLevel('root')}}>⇄<small>Repeat round</small></button></div>
   </div>
   <div className="ar-product-panel">
    <div className="ar-search-row"><button className="home-search" onClick={()=>{setCatLevel('root');setGroup('');setPosCategory('All Categories')}}>✦</button><button onClick={()=>setQ('')}>▥</button><button>#</button><button>◆</button><input className="ar-search-input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products by name, code or barcode"/><span>⌕</span><span>⌨</span></div>
    {q&&<div className="ar-search-hint">{filtered.length} product(s) found</div>}
    {catLevel==='root'&&<><div className="ar-breadcrumb"><span>Products</span><b>›</b><strong>Categories</strong></div><div className="ar-category-grid">{rootCats.map(categoryTile)}</div></>}
    {catLevel==='group'&&<><div className="ar-breadcrumb"><button onClick={()=>{setCatLevel('root');setGroup('');setPosCategory('All Categories')}}>Products</button><b>›</b><strong>{posCategory}</strong></div><div className="ar-grid-wrap">{groups.length?groups.map(groupTile):<Empty text="No groups found in this category."/>}</div></>}
    {catLevel==='items'&&<><div className="ar-breadcrumb"><button onClick={()=>{setCatLevel('root');setGroup('');setPosCategory('All Categories')}}>Products</button><b>›</b><button onClick={()=>setCatLevel('group')}>{posCategory}</button><b>›</b><strong>{group}</strong></div><div className="ar-grid-wrap"><button className="ar-back-tile" onClick={()=>setCatLevel('group')}><span>←</span><small>Back to {posCategory}</small></button>{shown.map(p=><button className="ar-product-tile" key={p.id} onClick={()=>add(p)}><div className="ar-product-image">{p.image?<img src={p.image} alt=""/>:<span className="product-mark">SP</span>}</div><div className="product-card-body"><strong>{p.name}</strong><small>{p.code||'No code'}</small><b>{money(p.price)}</b></div></button>)}</div></>}
    {catLevel==='items'&&!shown.length&&<Empty text="No products found in this category."/>}
    <div className="ar-page-footer"><span>Page 1 / 1</span><span className="footer-home">⌂</span><span>│‹　‹　›　›│</span></div>
   </div>
  </div>
  {menuOpen&&<div className="ar-menu-panel"><div className="ar-menu-title">POS - Administrator <b onClick={()=>setMenuOpen(false)}>→</b></div><div className="ar-update"><span>◔</span><b>Update is available</b><small>Click here to install new version</small></div>{[['⚒','Management','Dashboard'],['✓','View sales history','Payments'],['▱','View open sales','Named Order / Takeaway'],['↕','Cash In / Out','Payments'],['▤','Credit payments','Payments'],['⚑','End of day','X / Z Report'],['♙','User info','Users & Permissions'],['⇥','Sign out','POS / Sales'],['◉','Feedback','Settings']].map(([ic,label,target])=><button key={label} onClick={()=>{setMenuOpen(false);setPage(target)}}><span>{ic}</span>{label}</button>)}<div className="ar-menu-date">{new Date().toLocaleDateString('en-GB')}</div><div className="ar-menu-footer">☷　 ⛶　 ◉</div></div>}
  {showCustomer&&<div className="ar-modal-backdrop" onMouseDown={()=>setShowCustomer(false)}><div className="ar-modal" onMouseDown={e=>e.stopPropagation()}><div className="ar-modal-head"><div><small>POS CUSTOMER</small><h3>Select Customer</h3></div><button onClick={()=>setShowCustomer(false)}>×</button></div><div className="ar-customer-list">{customers.map(c=><button key={c.id} className={c.id===customer?'chosen':''} onClick={()=>{setCustomer(c.id);setShowCustomer(false)}}><span>♙</span><div><b>{c.name}</b><small>{c.phone} · {c.email}</small></div><strong>{c.id===customer?'✓':''}</strong></button>)}</div></div></div>}
  {showPayment&&<div className="ar-modal-backdrop" onMouseDown={()=>setShowPayment(false)}><div className="ar-modal payment-modal" onMouseDown={e=>e.stopPropagation()}><div className="ar-modal-head"><div><small>PAYMENT</small><h3>{money(grand)}</h3></div><button onClick={()=>setShowPayment(false)}>×</button></div><div className="payment-methods">{['Cash','Card','QR','Bank Transfers','Check','Deposit','Unpaid'].map(x=><button className={payment===x?'chosen':''} key={x} onClick={()=>{setPayment(x);setShowPayment(false)}}>{x}<small>{payment===x?'Selected':''}</small></button>)}</div><button className="payment-complete" onClick={()=>{setShowPayment(false);sale()}}>Complete Sale</button></div></div>}
 </section>
}
function Products({products,setProducts,addProduct,updateProduct,editing,setEditing,categories,setCategories,productGroups,setProductGroups,setNotice}){
 const blank={code:"",barcode:"",barcodes:[],name:"",category:"",group:"",plu:"",unit:"pcs",price:0,cost:0,margin:0,stock:0,reorder:5,taxInclusive:true,priceChangeAllowed:false,isService:false,defaultQuantity:true,active:true,description:"",image:"",rank:0,ageRestriction:"",lastPurchasePrice:0,comments:""};
 const[form,setForm]=useState(blank);
 const[selectedCategory,setSelectedCategory]=useState("All Products");
 const[selectedGroup,setSelectedGroup]=useState("All Groups");
 const[filter,setFilter]=useState("");
 const[showCategory,setShowCategory]=useState(false);
 const[showGroup,setShowGroup]=useState(false);
 const[newCategory,setNewCategory]=useState("");
 const[newGroup,setNewGroup]=useState("");
 const[showEditor,setShowEditor]=useState(false);
 const groups=[...new Set(productGroups.length?productGroups:products.map(p=>p.group||p.category).filter(Boolean))];
 const categoryGroups=selectedCategory==="All Products"?groups:groups.filter(g=>products.some(p=>(p.category||"")===selectedCategory&&(p.group||p.category)===g));
 const editorGroups=form.category?groups.filter(g=>products.some(p=>(p.category||"")===form.category&&(p.group||p.category)===g)||g===form.group):groups;
 const visible=products.filter(p=>{
  const text=(p.name+" "+(p.code||"")+" "+(p.barcode||"")+" "+(Array.isArray(p.barcodes)?p.barcodes.join(" "):"")+" "+(p.group||"")+" "+(p.category||"")).toLowerCase();
  const c=selectedCategory==="All Products"||(p.category||p.group||"")===selectedCategory;
  const g=selectedGroup==="All Groups"||(p.group||p.category||"")===selectedGroup;
  return c&&g&&text.includes(filter.toLowerCase());
 });
 const openNew=()=>{setEditing(null);setForm({...blank,category:selectedCategory!=="All Products"?selectedCategory:"",group:selectedGroup!=="All Groups"?selectedGroup:""});setShowEditor(true)};
 const openEdit=p=>{setEditing(p);setForm({...blank,...p,barcode:p.barcode||p.barcodes?.[0]||"",barcodes:Array.isArray(p.barcodes)?p.barcodes:(p.barcode?[p.barcode]:[]),category:p.category||"",group:p.group||p.category||""});setShowEditor(true)};
 const editGroup=()=>{if(selectedGroup==="All Groups"){setNotice("Please select a product group first.");return}const name=window.prompt("Enter the new product group name:",selectedGroup);if(!name||!name.trim()||name.trim()===selectedGroup)return;const next=groups.map(g=>g===selectedGroup?name.trim():g);const np=products.map(p=>(p.group||p.category)===selectedGroup?{...p,group:name.trim(),updatedAt:new Date().toISOString()}:p);save("productGroups",next);setProductGroups(next);save("products",np);setSelectedGroup(name.trim());setNotice("Product group updated successfully.");};
 const deleteGroup=()=>{if(selectedGroup==="All Groups"){setNotice("Please select a product group first.");return}const count=products.filter(p=>(p.group||p.category)===selectedGroup).length;if(count){setNotice("This group contains "+count+" product(s). Move or remove the products before deleting the group.");return}const next=groups.filter(g=>g!==selectedGroup);save("productGroups",next);setProductGroups(next);setSelectedGroup("All Groups");setNotice("Product group deleted successfully.");};
 const exportProducts=()=>{const blob=new Blob([JSON.stringify({categories,productGroups:groups,products},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="sp-manager-products.json";a.click();URL.revokeObjectURL(a.href);setNotice("Product data exported successfully.");};
 const importProducts=()=>{const input=document.createElement("input");input.type="file";input.accept=".json,application/json";input.onchange=()=>{const file=input.files?.[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);if(!Array.isArray(data.products))throw new Error("Invalid file");const np=data.products.map(x=>({...x,id:x.id||uid()}));save("products",np);if(Array.isArray(data.categories)){save("categories",data.categories);setCategories(data.categories)}const ng=Array.isArray(data.productGroups)?data.productGroups:[...new Set(np.map(x=>x.group||x.category).filter(Boolean))];save("productGroups",ng);setProductGroups(ng);setNotice("Product data imported successfully.");}catch{setNotice("The selected file is not a valid SP-Manager product file.");}};r.readAsText(file)};input.click();};
 const movingAverage=()=>{if(!visible.length){setNotice("No products available for moving average price.");return}const np=products.map(p=>visible.some(v=>v.id===p.id)?{...p,lastPurchasePrice:Number(p.lastPurchasePrice||p.cost||0),cost:Number(p.lastPurchasePrice||p.cost||0),updatedAt:new Date().toISOString()}:p);save("products",np);setProducts(np);setNotice("Moving average price updated for "+visible.length+" product(s). Refreshing product data is required to display the result.");};
 const saveGroup=()=>{const name=newGroup.trim();if(!name)return;if(groups.includes(name)){setNotice("This product group already exists.");return}const next=[...groups,name];save("productGroups",next);setProductGroups(next);setNewGroup("");setShowGroup(false);setForm(f=>({...f,group:name}));setNotice("Product group added successfully.")};
 const addCat=()=>{const name=newCategory.trim();if(!name)return;if(categories.includes(name)){setNotice("This category already exists.");return}const next=[...categories,name];save("categories",next);setCategories(next);setNewCategory("");setShowCategory(false);setForm(f=>({...f,category:name}));setNotice("Category added successfully.")};
 const submit=e=>{e.preventDefault();if(!form.name.trim()){setNotice("Product name is required.");return}if(!form.category){setNotice("Please select a product category.");return}if(!form.group){setNotice("Please select or create a product group.");return}const bars=[form.barcode,...(form.barcodes||[])].map(x=>String(x||"").trim()).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i);const payload={...form,barcode:bars[0]||"",barcodes:bars,price:Number(form.price)||0,cost:Number(form.cost)||0,margin:Number(form.margin)||0,stock:Number(form.stock)||0,reorder:Number(form.reorder)||0,rank:Number(form.rank)||0,lastPurchasePrice:Number(form.lastPurchasePrice)||0};if(!groups.includes(payload.group)){const next=[...groups,payload.group];save("productGroups",next);setProductGroups(next)}editing?updateProduct(payload):addProduct(payload);setForm(blank);setShowEditor(false)};
 return <section className="content product-master-modern">
  <div className="toolbar product-master-toolbar"><div><h3>Products</h3><small>Product master, product groups, barcodes, pricing and stock control</small></div><div className="product-action-strip"><button title="Refresh" onClick={()=>{setFilter("");setNotice("Product list refreshed successfully.")}}>↻ <span>Refresh</span></button><button title="New group" onClick={()=>setShowGroup(true)}>＋ <span>New group</span></button><button title="Edit group" onClick={editGroup}>✎ <span>Edit group</span></button><button title="Delete group" onClick={deleteGroup}>▢ <span>Delete group</span></button><button title="New product" onClick={openNew}>＋ <span>New product</span></button><button title="Print" onClick={()=>window.print()}>▣ <span>Print</span></button><button title="Save as PDF" onClick={()=>downloadReportPDF("Products",["Code","Name","Group","Barcode","Cost","Sale Price"],visible.map(p=>[p.code||"-",p.name,p.group||p.category||"-",p.barcode||"-",money(p.cost),money(p.price)]))}>PDF <span>Save as PDF</span></button><button title="Price tags" onClick={()=>downloadReportPDF("Price-Tags",["Product","Code","Sale Price"],visible.map(p=>[p.name,p.code||"-",money(p.price)]))}>▤ <span>Price tags</span></button><button title="Moving average price" onClick={movingAverage}>↯ <span>Mov. avg. price</span></button><button title="Import" onClick={importProducts}>↓ <span>Import</span></button><button title="Export" onClick={exportProducts}>↑ <span>Export</span></button><button title="Help" onClick={()=>setNotice("Products supports categories, groups, multiple products per group, multiple barcodes, pricing, stock, tax settings and product details." )}>? <span>Help</span></button></div></div>
  <div className="product-master-shell">
   <aside className="product-tree"><div className="tree-title">Product Groups</div><button className={selectedCategory==="All Products"?"tree-item selected":"tree-item"} onClick={()=>{setSelectedCategory("All Products");setSelectedGroup("All Groups")}}>▣ <span>All Products</span><em>{products.length}</em></button>{categories.map(c=>{const cg=groups.filter(g=>products.some(p=>(p.category||"")===c&&(p.group||p.category)===g));return <div key={c} className="tree-category"><button className={selectedCategory===c&&selectedGroup==="All Groups"?"tree-item selected":"tree-item"} onClick={()=>{setSelectedCategory(c);setSelectedGroup("All Groups")}}>▾ <span>{c}</span><em>{products.filter(p=>(p.category||p.group)===c).length}</em></button>{selectedCategory===c&&cg.map(g=><button key={g} className={selectedGroup===g?"tree-item child selected":"tree-item child"} onClick={()=>setSelectedGroup(g)}>▪ <span>{g}</span><em>{products.filter(p=>(p.category||"")===c&&(p.group||p.category)===g).length}</em></button>)}</div>})}</aside>
   <div className="product-master-main">
    <div className="product-master-toolbar2"><div><b>{selectedGroup!=="All Groups"?selectedGroup:selectedCategory}</b><span>{visible.length} product(s)</span></div><div className="product-list-actions"><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search name, code, barcode..."/><button className="secondary smallbtn" onClick={()=>{setSelectedCategory("All Products");setSelectedGroup("All Groups");setFilter("")}}>Reset</button></div></div>
    <div className="product-table-wrap"><table className="product-master-table"><thead><tr><th>Code</th><th>Name</th><th>Group</th><th>Barcode</th><th>Cost</th><th>Sale price</th><th>Tax</th><th>Active</th><th>Stock</th><th>Updated</th><th></th></tr></thead><tbody>{visible.map(p=><tr key={p.id} onDoubleClick={()=>openEdit(p)}><td>{p.code||"-"}</td><td><b>{p.name}</b><small>{p.description||p.unit||""}</small></td><td>{p.group||p.category||"-"}</td><td>{(p.barcodes?.length?p.barcodes:[p.barcode]).filter(Boolean).join(", ")||"-"}</td><td>{money(p.cost)}</td><td>{money(p.price)}</td><td>{p.taxInclusive===false?"Exclusive":"Inclusive"}</td><td>{p.active===false?"—":"✓"}</td><td>{p.stock}</td><td>{p.updatedAt?new Date(p.updatedAt).toLocaleDateString("en-GB"):"-"}</td><td><button className="smallbtn" onClick={()=>openEdit(p)}>Edit</button></td></tr>)}</tbody></table>{!visible.length&&<Empty text="No products found."/>}</div>
   </div>
  </div>
  {showEditor&&<div className="ar-modal-backdrop" onMouseDown={()=>setShowEditor(false)}><div className="ar-modal product-editor-modal" onMouseDown={e=>e.stopPropagation()}><div className="ar-modal-head"><div><small>PRODUCT MASTER</small><h3>{editing?"Edit Product":"New Product"}</h3></div><button onClick={()=>setShowEditor(false)}>×</button></div><form onSubmit={submit} className="product-editor-form">
   <div className="editor-section"><h4>General</h4><div className="editor-grid"><label>Product Name*<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Product Code<input value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/></label><label>PLU<input value={form.plu} onChange={e=>setForm({...form,plu:e.target.value})}/></label><label>Measurement Unit<input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></label><label>Category*<div className="inline-field"><select value={form.category} onChange={e=>setForm({...form,category:e.target.value,group:""})}><option value="">Select category...</option>{categories.map(c=><option key={c}>{c}</option>)}</select><button type="button" className="secondary smallbtn" onClick={()=>setShowCategory(true)}>+</button></div></label><label>Product Group*<div className="inline-field"><select value={form.group} onChange={e=>setForm({...form,group:e.target.value})}><option value="">Select group...</option>{editorGroups.map(g=><option key={g}>{g}</option>)}</select><button type="button" className="secondary smallbtn" onClick={()=>setShowGroup(true)}>+</button></div></label></div></div>
   <div className="editor-section"><h4>Barcodes & Pricing</h4><div className="editor-grid"><label>Primary Barcode<input value={form.barcode} onChange={e=>setForm({...form,barcode:e.target.value})}/></label><label>Additional Barcodes<input value={(form.barcodes||[]).filter(x=>x!==form.barcode).join(", ")} onChange={e=>setForm({...form,barcodes:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})} placeholder="Separate multiple barcodes with commas"/></label><label>Selling Price (RM)<input type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label><label>Cost Price (RM)<input type="number" min="0" step="0.01" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/></label><label>Markup / Margin<input type="number" step="0.01" value={form.margin} onChange={e=>setForm({...form,margin:e.target.value})}/></label><label>Last Purchase Price<input type="number" min="0" step="0.01" value={form.lastPurchasePrice} onChange={e=>setForm({...form,lastPurchasePrice:e.target.value})}/></label></div><div className="check-grid"><label><input type="checkbox" checked={!!form.taxInclusive} onChange={e=>setForm({...form,taxInclusive:e.target.checked})}/> Tax inclusive price</label><label><input type="checkbox" checked={!!form.priceChangeAllowed} onChange={e=>setForm({...form,priceChangeAllowed:e.target.checked})}/> Allow price change at POS</label><label><input type="checkbox" checked={!!form.isService} onChange={e=>setForm({...form,isService:e.target.checked})}/> Service item</label><label><input type="checkbox" checked={!!form.defaultQuantity} onChange={e=>setForm({...form,defaultQuantity:e.target.checked})}/> Use default quantity</label><label><input type="checkbox" checked={!!form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Active</label></div></div>
   <div className="editor-section"><h4>Stock & Details</h4><div className="editor-grid"><label>Opening / Current Stock<input type="number" min="0" step="1" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></label><label>Reorder Level<input type="number" min="0" step="1" value={form.reorder} onChange={e=>setForm({...form,reorder:e.target.value})}/></label><label>Rank / Sort Order<input type="number" value={form.rank} onChange={e=>setForm({...form,rank:e.target.value})}/></label><label>Age Restriction<input value={form.ageRestriction} onChange={e=>setForm({...form,ageRestriction:e.target.value})}/></label><label className="full">Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label className="full">Product Comment<textarea value={form.comments} onChange={e=>setForm({...form,comments:e.target.value})}/></label></div></div>
   <div className="form-actions"><button type="submit">{editing?"Save Changes":"Create Product"}</button><button type="button" className="secondary" onClick={()=>setShowEditor(false)}>Cancel</button></div>
  </form></div></div>}
  {showCategory&&<div className="modal-backdrop" onMouseDown={()=>setShowCategory(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h3>Product Categories</h3><button className="iconbtn" onClick={()=>setShowCategory(false)}>×</button></div><div className="category-list">{categories.map(c=><div key={c}><span>{c}</span><small>{products.filter(p=>(p.category||p.group)===c).length} product(s)</small></div>)}</div><div className="inline-field"><input value={newCategory} placeholder="New category name" onChange={e=>setNewCategory(e.target.value)}/><button onClick={addCat}>Add Category</button></div></div></div>}
  {showGroup&&<div className="modal-backdrop" onMouseDown={()=>setShowGroup(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h3>Product Groups</h3><button className="iconbtn" onClick={()=>setShowGroup(false)}>×</button></div><p className="muted">One product group can contain any number of products. Select the same group when creating multiple items.</p><div className="category-list">{groups.map(g=><div key={g}><span>{g}</span><small>{products.filter(p=>(p.group||p.category)===g).length} product(s)</small></div>)}</div><div className="inline-field"><input value={newGroup} placeholder="New product group name" onChange={e=>setNewGroup(e.target.value)}/><button onClick={saveGroup}>Add Group</button></div></div></div>}
 </section>
}
function Inventory({products,setProducts}){
 const adjust=(id,d)=>{const np=products.map(p=>p.id===id?{...p,stock:Math.max(0,p.stock+d)}:p);save("products",np);setProducts(np)};
 return <section className="content"><div className="panel"><h3>Inventory / Stock Control</h3><Table cols={["Code","Product","Warehouse","On Hand","Reorder","Status","Adjustment"]} rows={products.map(p=>[p.code,p.name,"Main Warehouse",p.stock,p.reorder,p.stock<=p.reorder?"Low":"OK",<span className="actions"><button onClick={()=>adjust(p.id,-1)}>−</button><button onClick={()=>adjust(p.id,1)}>+</button></span>])}/></div></section>
}
function Customers({customers,addCustomer}){
 const[form,setForm]=useState({name:"",phone:"",email:""});
 return <section className="content"><div className="grid2"><div className="panel"><h3>New Customer</h3><form className="formgrid" onSubmit={e=>{e.preventDefault();addCustomer(form);setForm({name:"",phone:"",email:""})}}>{["name","phone","email"].map(k=><input key={k} value={form[k]} placeholder={k} onChange={e=>setForm({...form,[k]:e.target.value})} required={k==="name"}/>)}<button>Add Customer</button></form></div><div className="panel"><h3>Customer Database</h3><Table cols={["Name","Phone","Email","Visits","Total Spend"]} rows={customers.map(c=>[c.name,c.phone,c.email,c.visits,money(c.spend)])}/></div></div></section>
}
function Suppliers({suppliers,setSuppliers}){
 const[form,setForm]=useState({name:"",phone:"",email:""});
 return <section className="content"><div className="grid2"><div className="panel"><h3>New Supplier</h3><form className="formgrid" onSubmit={e=>{e.preventDefault();const ns=[...suppliers,{...form,id:uid(),balance:0}];save("suppliers",ns);setSuppliers(ns);setForm({name:"",phone:"",email:""})}}>{["name","phone","email"].map(k=><input key={k} value={form[k]} placeholder={k} onChange={e=>setForm({...form,[k]:e.target.value})} required={k==="name"}/>)}<button>Add Supplier</button></form></div><div className="panel"><h3>Supplier Database</h3><Table cols={["Supplier","Phone","Email","Balance"]} rows={suppliers.map(s=>[s.name,s.phone,s.email,money(s.balance)])}/></div></div></section>
}
function Purchases({products,suppliers,receivePurchase,purchases}){
 const[form,setForm]=useState({supplierId:suppliers[0]?.id||1,productId:products[0]?.id||1,qty:1});
 const items=purchases;
 const receive=()=>{const p=products.find(x=>x.id===+form.productId);if(!p)return;const qty=Math.max(1,+form.qty);receivePurchase(+form.supplierId,[{productId:p.id,qty}],qty*p.cost);};
 return <section className="content"><div className="grid2"><div className="panel"><h3>Purchase / Goods Received</h3><div className="formgrid"><select value={form.supplierId} onChange={e=>setForm({...form,supplierId:e.target.value})}>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><select value={form.productId} onChange={e=>setForm({...form,productId:e.target.value})}>{products.map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select><input type="number" min="1" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})}/><button onClick={receive}>Receive Stock</button></div></div><div className="panel"><h3>Purchase History</h3><Table cols={["Document","Date","Supplier","Total","Status"]} rows={items.slice().reverse().map(x=>[x.no,new Date(x.date).toLocaleString(),suppliers.find(s=>s.id===x.supplierId)?.name||"-",money(x.total),x.status])}/></div></div></section>
}
function Payments({sales,emailReceipt}){return <section className="content"><div className="panel"><div className="toolbar"><div><h3>Payments / Receipt</h3><small>Sales history, receipt PDF and customer email</small></div></div><Table cols={["Document","Date","Payment Type","Amount","Status","Receipt"]} rows={sales.slice().reverse().map(s=>[s.no,new Date(s.date).toLocaleString(),s.payment,money(s.total),s.refunded?"Refunded":s.voided?"Voided":"Paid",<span className="actions"><button onClick={()=>downloadReportPDF("Receipt-"+s.no,["Qty","Description","Amount"],s.items.map(i=>[i.qty,i.name,money(i.price*i.qty)]))}>PDF</button><button onClick={()=>emailReceipt(s)}>Email</button></span>])}/></div></section>}
function RefundVoid({sales,refund,voidSale}){return <section className="content"><div className="panel"><h3>Refund / Void</h3><Table cols={["Document","Date","Total","Status","Action"]} rows={sales.slice().reverse().map(s=>[s.no,new Date(s.date).toLocaleString(),money(s.total),s.refunded?"Refunded":s.voided?"Voided":"Completed",<span className="actions">{!s.refunded&&!s.voided&&<><button onClick={()=>refund(s.id)}>Refund</button><button onClick={()=>voidSale(s.id)}>Void</button></>}</span>])}/></div></section>}
function Promotions({promos,savePromo}){const[form,setForm]=useState({name:"",type:"percent",value:5,active:true});return <section className="content"><div className="grid2"><div className="panel"><h3>Promotion / Discount Rule</h3><form className="formgrid" onSubmit={e=>{e.preventDefault();savePromo({...form,value:+form.value});setForm({name:"",type:"percent",value:5,active:true})}}><input value={form.name} placeholder="Promotion name" onChange={e=>setForm({...form,name:e.target.value})} required/><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="percent">Percent</option><option value="fixed">Fixed RM</option></select><input type="number" value={form.value} onChange={e=>setForm({...form,value:e.target.value})}/><label><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Active</label><button>Save Promotion</button></form></div><div className="panel"><h3>Promotion List</h3><Table cols={["Name","Type","Value","Active"]} rows={promos.map(p=>[p.name,p.type,p.type==="percent"?p.value+"%":money(p.value),p.active?"Yes":"No"])}/></div></div></section>}
function Tax({rate,setRate}){const[v,setV]=useState(rate);return <section className="content"><div className="panel narrow"><h3>Tax Configuration</h3><p>Set the default tax rate applied to POS sales.</p><input type="number" value={v} min="0" onChange={e=>setV(e.target.value)}/><button onClick={()=>setRate(+v)}>Save Tax Rate</button></div></section>}
function Loyalty({customers}){return <section className="content"><div className="panel"><h3>Loyalty / Customer Ranking</h3><Table cols={["Customer","Visits","Spend","Points"]} rows={[...customers].sort((a,b)=>b.spend-a.spend).map(c=>[c.name,c.visits,money(c.spend),Math.floor(c.spend)])}/></div></section>}
function Users({users,setUsers}){return <section className="content"><div className="panel"><h3>Users & Permissions</h3><Table cols={["User","Username","Role","Enabled","Action"]} rows={users.map(u=>[u.name,u.username,u.role,u.enabled?"Yes":"No",<button onClick={()=>setUsers(users.map(x=>x.id===u.id?{...x,enabled:!x.enabled}:x))}>{u.enabled?"Disable":"Enable"}</button>])}/></div></section>}
function buildSimplePDF(title,cols,rows){
 const esc=v=>String(v??"").replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)").replace(/[\r\n]+/g," ");
 const lines=[title,"Shining Pearl Tinted","Generated: "+new Date().toLocaleString(),"",cols.join(" | ")];
 rows.forEach(r=>lines.push(r.map(esc).join(" | ")));
 const pageLines=42,pages=[];for(let i=0;i<lines.length;i+=pageLines)pages.push(lines.slice(i,i+pageLines));
 const objects=[null];const add=o=>{objects.push(o);return objects.length-1};
 const catalogId=add(null),pagesId=add(null),fontId=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
 const pageIds=[];
 pages.forEach(ls=>{
  const pageId=add(null);pageIds.push(pageId);
  const content=["BT","/F1 8 Tf","45 790 Td"];
  ls.forEach((line,i)=>{if(i>0)content.push("0 -18 Td");content.push("("+esc(line).slice(0,190)+") Tj");});content.push("ET");
  const stream=content.join("\n");
  const contentId=add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  objects[pageId]=`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
 });
 objects[catalogId]=`<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
 objects[pagesId]=`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(id=>id+" 0 R").join(" ")}] >>`;
 let pdf="%PDF-1.4\n";const offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=i+" 0 obj\n"+objects[i]+"\nendobj\n";}const xref=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";pdf+=`trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return new Blob([pdf],{type:"application/pdf"});
}
function downloadReportPDF(title,cols,rows){const blob=buildSimplePDF(title,cols,rows);const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=title.replace(/[^a-z0-9]+/gi,"-").toLowerCase()+".pdf";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function Reports({sales,products,customers,purchases,businessDay,users,suppliers}){
 const[report,setReport]=useState("Sales Daily Totals");
 const[fromDate,setFromDate]=useState("");const[toDate,setToDate]=useState("");
 const allValid=sales.filter(s=>!s.voided&&!s.refunded);
 const inRange=s=>{const d=new Date(s.date);if(fromDate&&d<new Date(fromDate+"T00:00:00"))return false;if(toDate&&d>new Date(toDate+"T23:59:59"))return false;return true};
 const valid=allValid.filter(inRange);
 const total=valid.reduce((a,s)=>a+s.total,0);
 const profit=valid.reduce((a,s)=>a+s.items.reduce((x,i)=>x+(i.price-i.cost)*i.qty,0),0);
 const qtyByProduct=p=>valid.reduce((a,s)=>a+s.items.filter(i=>i.id===p.id).reduce((z,i)=>z+i.qty,0),0);
 const customerName=id=>customers.find(c=>c.id===id)?.name||"Walk-in Customer";
 const productName=id=>products.find(p=>p.id===id)?.name||"Unknown Product";
 const paymentTypes=["Cash","Card","Online Transfer","QR Payment","Unpaid"];
 const reportNames=[
 "Sales Daily Totals","Sales Products","Sales Customers","Sales Payment Types","Sales Payment Types - Customers","Sales Payment Types - Users","Sales Tax","Sales Discounts","Sales Discounts Before Tax","Sales Refunds","Sales Unpaid","Sales Users","Sales Product Groups","Sales Item Discounts","Sales Item Discounts Before Tax","Sales Item List","Sales Invoice List","Sales By Order Number","Sales Hourly","Sales Hourly By Product Groups",
 "Purchase Products","Purchase Suppliers","Purchase Tax","Purchase Unpaid","Purchase Discounts","Purchase Invoice List","Purchase Item Discounts","Profit Margin","Finance Transaction History","Starting Cash","Stock Movement","Stock Return Products","Low Stock Warning","Reorder Product List","Loss & Damage Products","Voided Items","Products","Products Price List","Items Report","Inventory Count","Products Expiration Date"
 ];
 const data=()=>{
  if(report==="Sales Products")return {cols:["Code","Product","Category","Qty","Sales"],rows:products.map(p=>[p.code,p.name,p.category||p.group||"-",qtyByProduct(p),money(qtyByProduct(p)*p.price)])};
  if(report==="Sales Customers")return {cols:["Customer","Transactions","Spend"],rows:customers.map(c=>{const ss=valid.filter(s=>s.customerId===c.id);return[c.name,ss.length,money(ss.reduce((a,s)=>a+s.total,0))]})};
  if(report.startsWith("Sales Payment Types")){let rows=paymentTypes.map(x=>{const ss=valid.filter(s=>s.payment===x);return[x,ss.length,money(ss.reduce((a,s)=>a+s.total,0))]});if(report.includes("Customers"))rows=valid.map(s=>[s.payment,customerName(s.customerId),money(s.total)]);if(report.includes("Users"))rows=valid.map(s=>[users.find(u=>u.id===(s.userId||1))?.name||"Administrator",s.payment,money(s.total)]);return {cols:report.includes("Customers")?["Payment Type","Customer","Amount"]:report.includes("Users")?["User","Payment Type","Amount"]:["Payment Type","Transactions","Amount"],rows};}
  if(report==="Sales Tax")return {cols:["Document","Date","Tax","Total"],rows:valid.map(s=>[s.no,new Date(s.date).toLocaleString(),money(s.tax),money(s.total)])};
  if(report.includes("Sales Discounts"))return {cols:["Document","Date","Discount","Total"],rows:valid.filter(s=>s.discount>0).map(s=>[s.no,new Date(s.date).toLocaleString(),money(s.discount),money(s.total)])};
  if(report==="Sales Refunds")return {cols:["Document","Date","Total","Status"],rows:sales.filter(s=>s.refunded&&inRange(s)).map(s=>[s.no,new Date(s.date).toLocaleString(),money(s.total),"Refunded"])};
  if(report==="Sales Unpaid")return {cols:["Document","Date","Customer","Amount","Status"],rows:valid.filter(s=>s.payment==="Unpaid").map(s=>[s.no,new Date(s.date).toLocaleString(),customerName(s.customerId),money(s.total),"Unpaid"]) };
  if(report==="Sales Users")return {cols:["User","Transactions","Sales"],rows:users.map(u=>{const ss=valid.filter(s=>(s.userId||1)===u.id);return[u.name,ss.length,money(ss.reduce((a,s)=>a+s.total,0))]})};
  if(report==="Sales Product Groups")return {cols:["Product Group","Qty","Sales"],rows:[...new Set(products.map(p=>p.group||p.category||"Other"))].map(g=>{const ps=products.filter(p=>(p.group||p.category||"Other")===g);const q=ps.reduce((a,p)=>a+qtyByProduct(p),0);return[g,q,money(ps.reduce((a,p)=>a+qtyByProduct(p)*p.price,0))]})};
  if(report.includes("Sales Item Discounts"))return {cols:["Document","Product","Qty","Discount"],rows:valid.flatMap(s=>s.items.filter(i=>i.discount||s.discount).map(i=>[s.no,i.name,i.qty,money(i.discount||0)]))};
  if(report==="Sales Item List")return {cols:["Document","Date","Product","Category","Qty","Unit Price","Amount"],rows:valid.flatMap(s=>s.items.map(i=>[s.no,new Date(s.date).toLocaleString(),i.name,i.category||i.group||"-",i.qty,money(i.price),money(i.price*i.qty)]))};
  if(report==="Sales Invoice List")return {cols:["Invoice","Date","Customer","Payment","Total","Status"],rows:sales.filter(inRange).map(s=>[s.no,new Date(s.date).toLocaleString(),customerName(s.customerId),s.payment,money(s.total),s.refunded?"Refunded":s.voided?"Voided":"Completed"])};
  if(report==="Sales By Order Number")return {cols:["Order Number","Date","Customer","Total"],rows:valid.map(s=>[s.no,new Date(s.date).toLocaleString(),customerName(s.customerId),money(s.total)])};
  if(report==="Sales Hourly"||report==="Sales Hourly By Product Groups"){const map={};valid.forEach(s=>{const h=new Date(s.date).getHours().toString().padStart(2,"0")+":00";if(!map[h])map[h]={n:0,v:0};map[h].n++;map[h].v+=s.total});return {cols:["Hour","Transactions","Sales"],rows:Object.entries(map).sort().map(([h,x])=>[h,x.n,money(x.v)])};}
  if(report.startsWith("Purchase")){if(report==="Purchase Suppliers")return {cols:["Supplier","Purchases","Amount"],rows:[...new Set(purchases.map(p=>p.supplierId))].map(id=>[suppliers.find(x=>x.id===id)?.name||String(id),purchases.filter(p=>p.supplierId===id).length,money(purchases.filter(p=>p.supplierId===id).reduce((a,p)=>a+p.total,0))])};if(report==="Purchase Products")return {cols:["Document","Product","Qty","Cost"],rows:purchases.flatMap(po=>po.items.map(i=>[po.no,productName(i.productId),i.qty,money(i.qty*(products.find(p=>p.id===i.productId)?.cost||0))]))};return {cols:["Document","Date","Amount","Status"],rows:purchases.map(p=>[p.no,new Date(p.date).toLocaleString(),money(p.total),p.status])};}
  if(report==="Profit Margin")return {cols:["Product","Qty","Sales","Gross Profit","Margin"],rows:products.map(p=>{const q=qtyByProduct(p),sv=q*p.price,pv=q*(p.price-p.cost),m=sv?pv/sv*100:0;return[p.name,q,money(sv),money(pv),m.toFixed(2)+"%"]})};
  if(report==="Finance Transaction History")return {cols:["Date","Type","Reference","Amount"],rows:[...valid.map(s=>[new Date(s.date).toLocaleString(),"Sale",s.no,money(s.total)]),...purchases.map(p=>[new Date(p.date).toLocaleString(),"Purchase",p.no,"- "+money(p.total)])].sort((a,b)=>new Date(b[0])-new Date(a[0]))};
  if(report==="Starting Cash")return {cols:["Business Day","Opening Cash","Status","Closed At"],rows:[[new Date().toLocaleDateString(),money(businessDay.openingCash||0),businessDay.open?"Open":"Closed",businessDay.closedAt?new Date(businessDay.closedAt).toLocaleString():"-"]]};
  if(report==="Stock Movement")return {cols:["Code","Product","Category","Current Stock","Reorder","Status"],rows:products.map(p=>[p.code,p.name,p.category||p.group||"-",p.stock,p.reorder,p.stock<=p.reorder?"Low":"OK"])};
  if(report==="Stock Return Products")return {cols:["Document","Product","Qty","Status"],rows:sales.filter(s=>s.refunded).flatMap(s=>s.items.map(i=>[s.no,i.name,i.qty,"Returned"]))};
  if(report==="Low Stock Warning"||report==="Reorder Product List")return {cols:["Code","Product","Category","On Hand","Reorder","Status"],rows:products.filter(p=>p.stock<=p.reorder).map(p=>[p.code,p.name,p.category||p.group||"-",p.stock,p.reorder,"Low"])};
  if(report==="Voided Items")return {cols:["Document","Date","Total","Status"],rows:sales.filter(s=>s.voided&&inRange(s)).map(s=>[s.no,new Date(s.date).toLocaleString(),money(s.total),"Voided"])};
  if(report==="Products Price List")return {cols:["Code","Barcode","Product","Category","Selling Price","Cost Price"],rows:products.map(p=>[p.code,p.barcode||"-",p.name,p.category||p.group||"-",money(p.price),money(p.cost)])};
  if(report==="Items Report")return {cols:["Code","Product","Category","Stock","Price","Cost"],rows:products.map(p=>[p.code,p.name,p.category||p.group||"-",p.stock,money(p.price),money(p.cost)])};
  if(report==="Inventory Count")return {cols:["Code","Product","Category","On Hand","Reorder","Variance"],rows:products.map(p=>[p.code,p.name,p.category||p.group||"-",p.stock,p.reorder,"-"])};
  if(report==="Products Expiration Date")return {cols:["Code","Product","Expiration Date","Status"],rows:products.map(p=>[p.code,p.name,p.expirationDate||"-",p.expirationDate?(new Date(p.expirationDate)<new Date()?"Expired":"Valid"):"Not Set"])};
  if(report==="Loss & Damage Products")return {cols:["Code","Product","Qty","Reason"],rows:[]};
  if(report==="Sales Daily Totals")return {cols:["Date","Transactions","Sales"],rows:Object.values(valid.reduce((a,s)=>{const d=new Date(s.date).toLocaleDateString();a[d]??={date:d,qty:0,total:0};a[d].qty++;a[d].total+=s.total;return a},{})).map(x=>[x.date,x.qty,money(x.total)])};
  return {cols:["Report","Records","Status"],rows:[[report,valid.length,"Ready"]]};
 };
 const out=data();
 return <section className="content"><div className="toolbar"><div><h3>Reports</h3><small>Aronium-inspired reports with date filtering, print and PDF export</small></div><select className="report-select" value={report} onChange={e=>setReport(e.target.value)}>{reportNames.map(r=><option key={r}>{r}</option>)}</select></div><div className="report-filters"><label>From <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}/></label><label>To <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)}/></label><button className="secondary" onClick={()=>{setFromDate("");setToDate("")}}>Clear Dates</button><button onClick={()=>window.print()}>Print</button><button onClick={()=>downloadReportPDF(report,out.cols,out.rows)}>Download PDF</button></div><div className="cards"><Card t="Sales" v={money(total)}/><Card t="Transactions" v={valid.length}/><Card t="Gross Profit" v={money(profit)}/><Card t="Customers" v={customers.length}/></div><div className="panel report-panel"><div className="report-title"><h3>{report}</h3><span>{out.rows.length} record(s)</span></div>{out.rows.length?<Table cols={out.cols} rows={out.rows}/>:<Empty text="No records found for this report."/>}</div></section>
}
function XZ({sales,businessDay}){const valid=sales.filter(s=>!s.voided&&!s.refunded);const sum=t=>valid.filter(s=>s.payment===t).reduce((a,s)=>a+s.total,0);const total=valid.reduce((a,s)=>a+s.total,0);return <section className="content"><div className="cards"><Card t="Transactions" v={valid.length}/><Card t="Gross Sales" v={money(total)}/><Card t="Cash" v={money(sum("Cash"))}/><Card t="Card" v={money(sum("Card"))}/></div><div className="panel"><h3>X / Z Report</h3><p>Business day: <b>{businessDay.open?"Open":"Closed"}</b></p><Table cols={["Payment Type","Amount"]} rows={["Cash","Card","Online Transfer","QR Payment"].map(x=>[x,money(sum(x))])}/></div></section>}
function NamedOrders({orders,setOrders,customers}){const[name,setName]=useState("");const[service,setService]=useState("Takeaway");return <section className="content"><div className="grid2"><div className="panel"><h3>Named Order / Takeaway</h3><div className="formgrid"><input placeholder="Order name / table / reference" value={name} onChange={e=>setName(e.target.value)}/><select value={service} onChange={e=>setService(e.target.value)}><option>Takeaway</option><option>Named Order</option><option>Table</option></select><select><option>Walk-in Customer</option>{customers.slice(1).map(c=><option key={c.id}>{c.name}</option>)}</select><button onClick={()=>{if(!name)return;setOrders([...orders,{id:uid(),name,service,date:new Date().toISOString(),status:"Open"}]);setName("")}}>Save Order</button></div></div><div className="panel"><h3>Open Orders</h3><Table cols={["Reference","Service","Date","Status"]} rows={orders.slice().reverse().map(o=>[o.name,o.service,new Date(o.date).toLocaleString(),o.status])}/></div></div></section>}
function Settings({businessDay,toggleBusiness,taxRate,setTaxRate}){return <section className="content"><div className="grid2"><div className="panel"><h3>Business Day</h3><p>Opening cash: {money(businessDay.openingCash)}</p><p>Status: <b>{businessDay.open?"Open":"Closed"}</b></p><button onClick={toggleBusiness}>{businessDay.open?"Close Business Day":"Open Business Day"}</button></div><div className="panel"><h3>Application Settings</h3><label>Default Tax %</label><input type="number" value={taxRate} onChange={e=>{setTaxRate(+e.target.value);save("taxRate",+e.target.value)}}/><p className="muted">Data for this GitHub Pages test build is stored locally in the browser. Backend/database integration is the next deployment layer.</p></div></div></section>}
function Table({cols,rows}){return <div className="table"><table><thead><tr>{cols.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((x,j)=><td key={j}>{x}</td>)}</tr>)}</tbody></table></div>}
function Empty({text}){return <div className="empty">{text}</div>}
createRoot(document.getElementById("root")).render(<App/>);
