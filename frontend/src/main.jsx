import React from "react";
import {createRoot} from "react-dom/client";
import "./styles.css";

const modules=["Dashboard","POS / Sales","Products","Customers","Suppliers","Inventory","Purchases","Payments","Reports","Users","Settings"];

function App(){
 const [active,setActive]=React.useState("Dashboard");
 const [status,setStatus]=React.useState("Checking API...");
 React.useEffect(()=>{fetch("/api/health").then(r=>r.json()).then(d=>setStatus(d.ok?"API connected":"API error")).catch(()=>setStatus("API offline"))},[]);
 return <div className="app">
  <aside className="sidebar">
   <div className="brand"><div className="mark">SP</div><div><b>SP-Manager</b><small>Business Management</small></div></div>
   <nav>{modules.map(m=><button className={active===m?"nav active":"nav"} onClick={()=>setActive(m)} key={m}>{m}</button>)}</nav>
  </aside>
  <main className="main">
   <header className="topbar"><div><h1>{active}</h1><p>SP-Manager foundation</p></div><span className="status">{status}</span></header>
   <section className="content">{active==="Dashboard"?<>
    <div className="cards"><Metric t="Today's Sales" v="RM 0.00"/><Metric t="Orders" v="0"/><Metric t="Low Stock" v="0"/><Metric t="Outstanding" v="RM 0.00"/></div>
    <div className="panel"><h2>SP-Manager foundation ready</h2><p>The next stages will implement the POS workflow, master data, inventory, payments and reporting using the analysed functional baseline.</p></div>
   </>:<div className="panel"><h2>{active}</h2><p>This module is reserved for the next implementation stage.</p></div>}</section>
  </main>
 </div>
}
function Metric({t,v}){return <div className="metric"><span>{t}</span><strong>{v}</strong></div>}
createRoot(document.getElementById("root")).render(<App/>);
