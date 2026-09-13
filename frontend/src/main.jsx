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
 const[page,setPage]=useState("Dashboard");
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
 const[customer,setCustomer]=useState(1);
 const[discount,setDiscount]=useState(0);
 const[payment,setPayment]=useState("Cash");
 const[taxRate,setTaxRate]=useState(()=>load("taxRate",0));
 const[notice,setNotice]=useState("");
 const[businessDay,setBusinessDay]=useState(()=>load("businessDay",{open:true,openingCash:0}));
 const[editing,setEditing]=useState(null);

 const activeSales=sales.filter(x=>!x.voided&&!x.refunded);
 const today=activeSales.reduce((a,x)=>a+x.total,0);
 const lowStock=products.filter(p=>p.stock<=p.reorder).length;
 const filtered=useMemo(()=>products.filter(p=>(p.name+" "+p.code+" "+p.group).toLowerCase().includes(q.toLowerCase())),[products,q]);
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
   {page==="POS / Sales"&&<POS filtered={filtered} q={q} setQ={setQ} add={add} cart={cart} changeQty={changeQty} customers={customers} customer={customer} setCustomer={setCustomer} discount={discount} setDiscount={setDiscount} payment={payment} setPayment={setPayment} subtotal={subtotal} disc={disc} taxRate={taxRate} setTaxRate={setTaxRate} tax={tax} grand={grand} sale={completeSale}/>}
   {page==="Products"&&<Products products={products} addProduct={addProduct} updateProduct={updateProduct} editing={editing} setEditing={setEditing} categories={categories} setCategories={setCategories} setNotice={setNotice}/>}
   {page==="Inventory"&&<Inventory products={products} setProducts={setProducts}/>}
   {page==="Customers"&&<Customers customers={customers} addCustomer={addCustomer}/>}
   {page==="Suppliers"&&<Suppliers suppliers={suppliers} setSuppliers={setSuppliers}/>}
   {page==="Purchases"&&<Purchases products={products} suppliers={suppliers} receivePurchase={receivePurchase} purchases={purchases}/>}
   {page==="Payments"&&<Payments sales={sales}/>}
   {page==="Refund / Void"&&<RefundVoid sales={sales} refund={refund} voidSale={voidSale}/>}
   {page==="Discount / Promotion"&&<Promotions promos={promos} savePromo={savePromo}/>}
   {page==="Tax"&&<Tax rate={taxRate} setRate={r=>{setTaxRate(r);save("taxRate",r);setNotice("Tax rate saved successfully.")}}/>}
   {page==="Loyalty"&&<Loyalty customers={customers}/>}
   {page==="Users & Permissions"&&<Users users={users} setUsers={u=>{persist("users",u,setUsers);setNotice("User updated successfully.")}}/>}
   {page==="Reports"&&<Reports sales={sales} products={products} customers={customers}/>}
   {page==="X / Z Report"&&<XZ sales={sales} businessDay={businessDay}/>}
   {page==="Named Order / Takeaway"&&<NamedOrders orders={orders} setOrders={o=>{persist("orders",o,setOrders);setNotice("Order saved successfully.")}} customers={customers}/>}
   {page==="Settings"&&<Settings businessDay={businessDay} toggleBusiness={toggleBusiness} taxRate={taxRate} setTaxRate={r=>{setTaxRate(r);save("taxRate",r)}}/>}
  </main>
 </div>
}

function Dashboard({sales,total,products,lowStock,setPage,businessDay,toggleBusiness}){
 const top=[...products].sort((a,b)=>b.stock-a.stock).slice(0,5);
 return <section className="content"><div className="hero"><div><small>WELCOME</small><h2>Manage smarter · Sell faster · Grow together</h2><p>SP-Manager business management system</p></div><div><button onClick={()=>setPage("POS / Sales")}>Open POS</button><button className="darkbtn" onClick={toggleBusiness}>{businessDay.open?"Close Business Day":"Open Business Day"}</button></div></div>
 <div className="cards"><Card t="Today's Sales" v={money(total)}/><Card t="Transactions" v={sales.length}/><Card t="Average Sale" v={sales.length?money(total/sales.length):money(0)}/><Card t="Low Stock" v={lowStock}/></div>
 <div className="grid2"><div className="panel"><h3>Recent Sales</h3>{sales.slice(-7).reverse().map(s=><div className="row" key={s.id}><span><b>{s.no}</b><small>{new Date(s.date).toLocaleString()}</small></span><strong>{money(s.total)}</strong></div>)}{!sales.length&&<Empty text="No transactions yet."/ >}</div>
 <div className="panel"><h3>Stock Snapshot</h3>{top.map(p=><div className="row" key={p.id}><span><b>{p.name}</b><small>{p.code} · {p.group}</small></span><strong>{p.stock}</strong></div>)}</div></div></section>
}
function Card({t,v}){return <div className="card"><small>{t}</small><strong>{v}</strong></div>}
function POS({filtered,q,setQ,add,cart,changeQty,customers,customer,setCustomer,discount,setDiscount,payment,setPayment,subtotal,disc,taxRate,setTaxRate,tax,grand,sale}){
 return <section className="pos"><div className="panel"><input autoFocus className="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Scan barcode / search product code or name..."/><div className="products">{filtered.map(p=><button className="product" onClick={()=>add(p)} key={p.id}><small>{p.code}</small><b>{p.name}</b><span>{p.group}</span><strong>{money(p.price)}</strong><em>Stock {p.stock}</em></button>)}</div>{!filtered.length&&<Empty text="No products found."/ >}</div>
 <div className="panel cart"><h3>Current Order</h3><label>Customer</label><select value={customer} onChange={e=>setCustomer(+e.target.value)}>{customers.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select>
 {cart.map(i=><div className="cartrow" key={i.id}><span><b>{i.name}</b><small>{money(i.price)} × {i.qty}</small></span><div><button onClick={()=>changeQty(i.id,1)}>+</button><button onClick={()=>changeQty(i.id,-1)}>−</button></div><strong>{money(i.price*i.qty)}</strong></div>)}{!cart.length&&<Empty text="Cart is empty"/>}
 <label>Discount %</label><input type="number" value={discount} onChange={e=>setDiscount(Math.max(0,Math.min(100,+e.target.value)))} min="0" max="100"/>
 <label>Tax %</label><input type="number" value={taxRate} onChange={e=>setTaxRate(Math.max(0,+e.target.value))} min="0"/>
 <div className="payments">{["Cash","Card","Online Transfer","QR Payment"].map(x=><button className={payment===x?"sel":""} onClick={()=>setPayment(x)} key={x}>{x}</button>)}</div>
 <div className="totals"><span>Subtotal <b>{money(subtotal)}</b></span><span>Discount <b>- {money(disc)}</b></span><span>Tax <b>{money(tax)}</b></span><strong>Total <b>{money(grand)}</b></strong></div><button className="complete" onClick={sale}>Complete Sale · {money(grand)}</button></div></section>
}
function Products({products,addProduct,updateProduct,editing,setEditing,categories,setCategories,setNotice}){
 const blank={code:"",barcode:"",name:"",category:"",group:"",price:0,cost:0,stock:0,reorder:5};
 const[form,setForm]=useState(blank);
 const[showCategory,setShowCategory]=useState(false);
 const[newCategory,setNewCategory]=useState("");
 const[filter,setFilter]=useState("");
 const openEdit=p=>{setEditing(p);setForm({...blank,...p,category:p.category||p.group||""});};
 const addCat=()=>{const name=newCategory.trim();if(!name)return; if(categories.includes(name)){setNotice("This category already exists.");return} const next=[...categories,name];save("categories",next);setCategories(next);setForm(f=>({...f,category:name,group:name}));setNewCategory("");setShowCategory(false);setNotice("Category added successfully.")};
 const submit=e=>{e.preventDefault();if(!form.name.trim()){setNotice("Product name is required.");return}if(!form.category){setNotice("Please select a product category.");return}const payload={...form,group:form.group||form.category,category:form.category,price:Number(form.price),cost:Number(form.cost),stock:Number(form.stock),reorder:Number(form.reorder)};editing?updateProduct(payload):addProduct(payload);setForm(blank)};
 const visible=products.filter(p=>(p.name+" "+p.code+" "+(p.barcode||"")+" "+(p.category||p.group||"")).toLowerCase().includes(filter.toLowerCase()));
 return <section className="content"><div className="toolbar"><div><h3>Products / Product Master</h3><small>Product master, categories, barcode, pricing and stock control</small></div><div className="toolbar-actions"><button className="secondary" onClick={()=>setShowCategory(true)}>Manage Categories</button><button onClick={()=>{setEditing(null);setForm(blank)}}>+ New Product</button></div></div>
 <div className="grid2"><div className="panel"><h3>{editing?"Edit Product":"Add Product"}</h3><form onSubmit={submit} className="formgrid product-form">
  <label>Product Code<input value={form.code} placeholder="e.g. SP009" onChange={e=>setForm({...form,code:e.target.value})}/></label>
  <label>Barcode<input value={form.barcode||""} placeholder="Barcode / EAN / UPC" onChange={e=>setForm({...form,barcode:e.target.value})}/></label>
  <label>Product Name<input value={form.name} placeholder="Product name" onChange={e=>setForm({...form,name:e.target.value})} required/></label>
  <label>Category<div className="inline-field"><select value={form.category} onChange={e=>setForm({...form,category:e.target.value,group:e.target.value})} required><option value="">Select category...</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select><button type="button" className="secondary smallbtn" onClick={()=>setShowCategory(true)}>+ Category</button></div></label>
  <label>Product Group<input value={form.group||""} placeholder="Product group" onChange={e=>setForm({...form,group:e.target.value})}/></label>
  <label>Selling Price (RM)<input type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label>
  <label>Cost Price (RM)<input type="number" min="0" step="0.01" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/></label>
  <label>Opening Stock<input type="number" min="0" step="1" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></label>
  <label>Reorder Level<input type="number" min="0" step="1" value={form.reorder} onChange={e=>setForm({...form,reorder:e.target.value})}/></label>
  <div className="form-actions"><button type="submit">{editing?"Save Changes":"Add Product"}</button>{editing&&<button type="button" className="secondary" onClick={()=>{setEditing(null);setForm(blank)}}>Cancel</button>}</div>
 </form></div>
 <div className="panel"><div className="table-head"><div><h3>Product List</h3><small>{visible.length} product(s)</small></div><input className="table-search" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search product, code or barcode..."/></div><Table cols={["Code","Barcode","Product","Category","Price","Stock","Status",""]} rows={visible.map(p=>[p.code,p.barcode||"-",p.name,p.category||p.group||"-",money(p.price),p.stock,p.stock<=p.reorder?"Low":"OK",<button onClick={()=>openEdit(p)}>Edit</button>])}/></div></div>
 {showCategory&&<div className="modal-backdrop" onMouseDown={()=>setShowCategory(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h3>Product Categories</h3><button className="iconbtn" onClick={()=>setShowCategory(false)}>×</button></div><div className="category-list">{categories.map(c=><div key={c}><span>{c}</span><small>{products.filter(p=>(p.category||p.group)===c).length} product(s)</small></div>)}</div><div className="inline-field"><input value={newCategory} placeholder="New category name" onChange={e=>setNewCategory(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCat()}/><button onClick={addCat}>Add Category</button></div></div></div>}
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
function Payments({sales}){return <section className="content"><div className="panel"><h3>Payments</h3><Table cols={["Document","Date","Payment Type","Amount","Status"]} rows={sales.slice().reverse().map(s=>[s.no,new Date(s.date).toLocaleString(),s.payment,money(s.total),s.refunded?"Refunded":s.voided?"Voided":"Paid"])}/></div></section>}
function RefundVoid({sales,refund,voidSale}){return <section className="content"><div className="panel"><h3>Refund / Void</h3><Table cols={["Document","Date","Total","Status","Action"]} rows={sales.slice().reverse().map(s=>[s.no,new Date(s.date).toLocaleString(),money(s.total),s.refunded?"Refunded":s.voided?"Voided":"Completed",<span className="actions">{!s.refunded&&!s.voided&&<><button onClick={()=>refund(s.id)}>Refund</button><button onClick={()=>voidSale(s.id)}>Void</button></>}</span>])}/></div></section>}
function Promotions({promos,savePromo}){const[form,setForm]=useState({name:"",type:"percent",value:5,active:true});return <section className="content"><div className="grid2"><div className="panel"><h3>Promotion / Discount Rule</h3><form className="formgrid" onSubmit={e=>{e.preventDefault();savePromo({...form,value:+form.value});setForm({name:"",type:"percent",value:5,active:true})}}><input value={form.name} placeholder="Promotion name" onChange={e=>setForm({...form,name:e.target.value})} required/><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="percent">Percent</option><option value="fixed">Fixed RM</option></select><input type="number" value={form.value} onChange={e=>setForm({...form,value:e.target.value})}/><label><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Active</label><button>Save Promotion</button></form></div><div className="panel"><h3>Promotion List</h3><Table cols={["Name","Type","Value","Active"]} rows={promos.map(p=>[p.name,p.type,p.type==="percent"?p.value+"%":money(p.value),p.active?"Yes":"No"])}/></div></div></section>}
function Tax({rate,setRate}){const[v,setV]=useState(rate);return <section className="content"><div className="panel narrow"><h3>Tax Configuration</h3><p>Set the default tax rate applied to POS sales.</p><input type="number" value={v} min="0" onChange={e=>setV(e.target.value)}/><button onClick={()=>setRate(+v)}>Save Tax Rate</button></div></section>}
function Loyalty({customers}){return <section className="content"><div className="panel"><h3>Loyalty / Customer Ranking</h3><Table cols={["Customer","Visits","Spend","Points"]} rows={[...customers].sort((a,b)=>b.spend-a.spend).map(c=>[c.name,c.visits,money(c.spend),Math.floor(c.spend)])}/></div></section>}
function Users({users,setUsers}){return <section className="content"><div className="panel"><h3>Users & Permissions</h3><Table cols={["User","Username","Role","Enabled","Action"]} rows={users.map(u=>[u.name,u.username,u.role,u.enabled?"Yes":"No",<button onClick={()=>setUsers(users.map(x=>x.id===u.id?{...x,enabled:!x.enabled}:x))}>{u.enabled?"Disable":"Enable"}</button>])}/></div></section>}
function Reports({sales,products,customers}){
 const valid=sales.filter(s=>!s.voided&&!s.refunded);
 const[report,setReport]=useState("Sales Daily Totals");
 const total=valid.reduce((a,s)=>a+s.total,0);
 const profit=valid.reduce((a,s)=>a+s.items.reduce((x,i)=>x+(i.price-i.cost)*i.qty,0),0);
 const qtyByProduct=p=>valid.reduce((a,s)=>a+s.items.filter(i=>i.id===p.id).reduce((z,i)=>z+i.qty,0),0);
 const paymentRows=["Cash","Card","Online Transfer","QR Payment"].map(x=>[x,money(valid.filter(s=>s.payment===x).reduce((a,s)=>a+s.total,0))]);
 const reportNames=["Sales Daily Totals","Sales Products","Sales Customers","Sales Payment Types","Sales Tax","Sales Discounts","Sales Refunds","Sales Unpaid","Purchase Products","Purchase Suppliers","Purchase Tax","Purchase Unpaid","Profit Margin","Stock Movement","Low Stock Warning","Reorder Product List","Products Price List","Inventory Count","Loss & Damage Products"];
 const content=()=>{
  if(report==="Sales Products")return <Table cols={["Code","Product","Category","Qty","Sales"]} rows={products.map(p=>[p.code,p.name,p.category||p.group||"-",qtyByProduct(p),money(qtyByProduct(p)*p.price)])}/>;
  if(report==="Sales Customers")return <Table cols={["Customer","Transactions","Spend"]} rows={customers.map(c=>{const ss=valid.filter(s=>s.customerId===c.id);return[c.name,ss.length,money(ss.reduce((a,s)=>a+s.total,0))]})}/>;
  if(report==="Sales Payment Types")return <Table cols={["Payment Type","Transactions","Amount"]} rows={["Cash","Card","Online Transfer","QR Payment"].map(x=>[x,valid.filter(s=>s.payment===x).length,money(valid.filter(s=>s.payment===x).reduce((a,s)=>a+s.total,0))])}/>;
  if(report==="Sales Tax")return <Table cols={["Document","Date","Tax","Total"]} rows={valid.map(s=>[s.no,new Date(s.date).toLocaleString(),money(s.tax),money(s.total)])}/>;
  if(report==="Sales Discounts")return <Table cols={["Document","Date","Discount","Total"]} rows={valid.filter(s=>s.discount>0).map(s=>[s.no,new Date(s.date).toLocaleString(),money(s.discount),money(s.total)])}/>;
  if(report==="Sales Refunds")return <Table cols={["Document","Date","Total","Status"]} rows={sales.filter(s=>s.refunded).map(s=>[s.no,new Date(s.date).toLocaleString(),money(s.total),"Refunded"])}/>;
  if(report==="Sales Unpaid")return <Table cols={["Document","Date","Amount","Status"]} rows={valid.filter(s=>s.payment==="Unpaid").map(s=>[s.no,new Date(s.date).toLocaleString(),money(s.total),"Unpaid"])}/>;
  if(report==="Profit Margin")return <Table cols={["Product","Qty","Sales","Gross Profit","Margin"]} rows={products.map(p=>{const q=qtyByProduct(p),salesValue=q*p.price,profitValue=q*(p.price-p.cost),margin=salesValue?profitValue/salesValue*100:0;return[p.name,q,money(salesValue),money(profitValue),margin.toFixed(2)+"%"]})}/>;
  if(report==="Low Stock Warning"||report==="Reorder Product List")return <Table cols={["Code","Product","Category","On Hand","Reorder","Status"]} rows={products.filter(p=>p.stock<=p.reorder).map(p=>[p.code,p.name,p.category||p.group||"-",p.stock,p.reorder,"Low"])}/>;
  if(report==="Products Price List")return <Table cols={["Code","Barcode","Product","Category","Selling Price","Cost Price"]} rows={products.map(p=>[p.code,p.barcode||"-",p.name,p.category||p.group||"-",money(p.price),money(p.cost)])}/>;
  if(report==="Inventory Count")return <Table cols={["Code","Product","Category","On Hand","Reorder","Variance"]} rows={products.map(p=>[p.code,p.name,p.category||p.group||"-",p.stock,p.reorder,"-"])}/>;
  if(report==="Stock Movement")return <Table cols={["Code","Product","Current Stock","Reorder Level","Status"]} rows={products.map(p=>[p.code,p.name,p.stock,p.reorder,p.stock<=p.reorder?"Low":"OK"])}/>;
  if(report==="Sales Daily Totals")return <Table cols={["Date","Transactions","Sales"]} rows={Object.values(valid.reduce((a,s)=>{const d=new Date(s.date).toLocaleDateString();a[d]??={date:d,qty:0,total:0};a[d].qty++;a[d].total+=s.total;return a},{})).map(x=>[x.date,x.qty,money(x.total)])}/>;
  return <Table cols={["Report","Records","Status"]} rows={[[report,report==="Loss & Damage Products"?0:valid.length,"Ready"]]}/>;
 };
 return <section className="content"><div className="toolbar"><div><h3>Reports</h3><small>Reports modelled on the Aronium report structure</small></div><select className="report-select" value={report} onChange={e=>setReport(e.target.value)}>{reportNames.map(r=><option key={r}>{r}</option>)}</select></div><div className="cards"><Card t="Sales" v={money(total)}/><Card t="Transactions" v={valid.length}/><Card t="Gross Profit" v={money(profit)}/><Card t="Customers" v={customers.length}/></div><div className="panel report-panel"><div className="report-title"><h3>{report}</h3><span>English report view</span></div>{content()}</div></section>
}
function XZ({sales,businessDay}){const valid=sales.filter(s=>!s.voided&&!s.refunded);const sum=t=>valid.filter(s=>s.payment===t).reduce((a,s)=>a+s.total,0);const total=valid.reduce((a,s)=>a+s.total,0);return <section className="content"><div className="cards"><Card t="Transactions" v={valid.length}/><Card t="Gross Sales" v={money(total)}/><Card t="Cash" v={money(sum("Cash"))}/><Card t="Card" v={money(sum("Card"))}/></div><div className="panel"><h3>X / Z Report</h3><p>Business day: <b>{businessDay.open?"Open":"Closed"}</b></p><Table cols={["Payment Type","Amount"]} rows={["Cash","Card","Online Transfer","QR Payment"].map(x=>[x,money(sum(x))])}/></div></section>}
function NamedOrders({orders,setOrders,customers}){const[name,setName]=useState("");const[service,setService]=useState("Takeaway");return <section className="content"><div className="grid2"><div className="panel"><h3>Named Order / Takeaway</h3><div className="formgrid"><input placeholder="Order name / table / reference" value={name} onChange={e=>setName(e.target.value)}/><select value={service} onChange={e=>setService(e.target.value)}><option>Takeaway</option><option>Named Order</option><option>Table</option></select><select><option>Walk-in Customer</option>{customers.slice(1).map(c=><option key={c.id}>{c.name}</option>)}</select><button onClick={()=>{if(!name)return;setOrders([...orders,{id:uid(),name,service,date:new Date().toISOString(),status:"Open"}]);setName("")}}>Save Order</button></div></div><div className="panel"><h3>Open Orders</h3><Table cols={["Reference","Service","Date","Status"]} rows={orders.slice().reverse().map(o=>[o.name,o.service,new Date(o.date).toLocaleString(),o.status])}/></div></div></section>}
function Settings({businessDay,toggleBusiness,taxRate,setTaxRate}){return <section className="content"><div className="grid2"><div className="panel"><h3>Business Day</h3><p>Opening cash: {money(businessDay.openingCash)}</p><p>Status: <b>{businessDay.open?"Open":"Closed"}</b></p><button onClick={toggleBusiness}>{businessDay.open?"Close Business Day":"Open Business Day"}</button></div><div className="panel"><h3>Application Settings</h3><label>Default Tax %</label><input type="number" value={taxRate} onChange={e=>{setTaxRate(+e.target.value);save("taxRate",+e.target.value)}}/><p className="muted">Data for this GitHub Pages test build is stored locally in the browser. Backend/database integration is the next deployment layer.</p></div></div></section>}
function Table({cols,rows}){return <div className="table"><table><thead><tr>{cols.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((x,j)=><td key={j}>{x}</td>)}</tr>)}</tbody></table></div>}
function Empty({text}){return <div className="empty">{text}</div>}
createRoot(document.getElementById("root")).render(<App/>);
