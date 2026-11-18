import React,{useEffect,useMemo,useRef,useState} from 'react';
import {emptyBattery,validateBattery,parseBatterySheet,resolveBatteryImport,batteryWorkbook} from './price-check-excel.js';
import {ListSearch,PagedRows,DrTool,Toast,DR_ICONS} from "./dr-tool.jsx";

let excelLoading;
function loadExcel(){
 if(window.XLSX)return Promise.resolve(window.XLSX);
 if(!excelLoading)excelLoading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=(import.meta.env.BASE_URL||'/')+'vendor/xlsx.full.min.js';
  script.onload=()=>window.XLSX?resolve(window.XLSX):reject(Error('Excel library could not load.'));
  script.onerror=()=>{script.remove();excelLoading=null;reject(Error('Excel library could not load. Check the vendor folder.'));};document.head.appendChild(script);
 });return excelLoading;
}
function Dialog({title,children,onClose,busy=false}){
 const ref=useRef(null);
 useEffect(()=>{const before=document.activeElement;(ref.current?.querySelector('input')||ref.current?.querySelector('button'))?.focus();return()=>before?.isConnected&&before.focus();},[]);
 return <div className="pc-backdrop"><section ref={ref} className="pc-dialog" role="dialog" aria-modal="true" aria-label={title} onKeyDown={e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(!busy)onClose();}
  if(e.key==='Tab'){const nodes=[...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')];const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
 }}><header><h2>{title}</h2><button type="button" disabled={busy} aria-label="Close dialog" onClick={onClose}>×</button></header>{children}</section></div>;
}
const currency=v=>'RM '+Number(v||0).toFixed(2);
const qty=v=>{const n=Number(v)||0;return Number.isInteger(n)?String(n):n.toFixed(3).replace(/0+$/,'').replace(/\.$/,'');};
// Stock on hand of one product at every outlet that sells it (desktop dialog, phone bottom sheet).
function OutletStock({product,load,onClose}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const ref=useRef(null);
 const fetchStock=async()=>{setLoading(true);setError('');try{const d=await load(product.id);setData(d);}catch(e){setError(e.message||'Stock could not be loaded.');}finally{setLoading(false);}};
 useEffect(()=>{fetchStock();},[product.id]);
 useEffect(()=>{const before=document.activeElement;ref.current?.querySelector('.pcs-close')?.focus();const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();onClose();}};window.addEventListener('keydown',key,true);return()=>{window.removeEventListener('keydown',key,true);before?.isConnected&&before.focus();};},[]);
 const outlets=data?.outlets||[];const here=outlets.find(o=>o.current);const total=outlets.reduce((s,o)=>s+(Number(o.stock)||0),0);
 const status=n=>n>0?['ok','In stock']:n<0?['neg','Negative']:['zero','Out of stock'];
 const time=data?.read_at?new Date(data.read_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'';
 const meta=[product.code,[product.category,product.group].filter(Boolean).join(' / '),(product.barcodes||[product.barcode]).filter(Boolean)[0]].filter(Boolean).join(' · ');
 return <div className="pcs-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section ref={ref} className="pcs-dialog" role="dialog" aria-modal="true" aria-label={'Stock on hand: '+product.name}>
   <header className="pcs-head"><div><small>{meta}</small><h2>{product.name}</h2></div><button type="button" className="pcs-close" aria-label="Close" onClick={onClose}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg></button></header>
   <div className="pcs-sum"><div className="pcs-price"><span>Price</span><b>{currency(product.price)}</b></div><div><span>This outlet{here?' ('+here.outlet_code+')':''}</span><b>{loading&&!data?'…':here?qty(here.stock):'—'}</b></div><div><span>All outlets</span><b>{loading&&!data?'…':error||!data?'—':qty(total)}</b></div></div>
   <div className="pcs-title">Stock on hand by outlet</div>
   {error?<div className="pcs-error" role="alert">{error} <button type="button" onClick={fetchStock}>Try again</button></div>:
   <div className="pcs-table" aria-busy={loading}><table><thead><tr><th>Outlet</th><th>Status</th><th className="pcs-q">SOH</th></tr></thead>
    <tbody>{loading&&!data?<tr><td colSpan="3" className="pcs-empty">Loading…</td></tr>:outlets.length?outlets.map(o=>{const n=Number(o.stock)||0,[c,t]=status(n);return <tr key={o.id} className={o.current?'pcs-here':''}><td>{o.outlet_code}{o.outlet_name?' · '+o.outlet_name:''}{o.current&&<span className="pcs-tag">This outlet</span>}</td><td><span className={'pcs-pill pcs-'+c}>{t}</span></td><td className={'pcs-q pcs-q-'+c}>{qty(n)}</td></tr>}):<tr><td colSpan="3" className="pcs-empty">This product is not sold at any outlet.</td></tr>}</tbody>
    {outlets.length>0&&<tfoot><tr><td colSpan="2">Total</td><td className="pcs-q">{qty(total)}</td></tr></tfoot>}</table></div>}
   <footer className="pcs-foot"><span>Only outlets that sell this product are listed.</span>{time&&<span>Updated {time}</span>}</footer>
  </section></div>;
}

// ---- Phone layout ------------------------------------------------------------------------------
const PHONE_QUERY='(max-width:600px)';
function usePhone(){
 const get=()=>typeof window!=='undefined'&&!!window.matchMedia&&window.matchMedia(PHONE_QUERY).matches;
 const [phone,setPhone]=useState(get);
 useEffect(()=>{if(!window.matchMedia)return;const m=window.matchMedia(PHONE_QUERY);const on=()=>setPhone(m.matches);on();m.addEventListener?.('change',on);return()=>m.removeEventListener?.('change',on);},[]);
 return phone;
}
const hasSize=v=>{const t=String(v??'').trim();return t!==''&&t!=='-';};
const sizeCount=row=>Array.from({length:5},(_,i)=>row['size_option'+(i+1)]).filter(hasSize).length;
// Battery sizes inside a product name: "Century Optima Prime NS60L (55B24L / LS)" gives NS60L, 55B24L and 55B24LS;
// "DIN65L/R" gives DIN65L and DIN65R; "DIN 66" gives DIN66. A size also matches the same size with another terminal (L/R/S).
const sizeKey=v=>String(v||'').toUpperCase().replace(/DIN\s+(?=\d)/g,'DIN').replace(/[\s-]/g,'');
const sizeBase=v=>v.replace(/(?<=\d)[LRSZT]{1,3}$/,'');
function nameSizes(name){
 const text=String(name||'').toUpperCase().replace(/DIN\s+(?=\d)/g,'DIN').replace(/\s*\/\s*/g,'/').replace(/[()]/g,' ');
 const out=new Set();
 text.split(/\s+/).filter(Boolean).forEach(word=>{
  const parts=word.split('/').map(x=>x.replace(/-/g,'')).filter(Boolean);if(!parts.length)return;
  const first=parts[0];if(/\d/.test(first))out.add(first);
  parts.slice(1).forEach(part=>{if(/^[LRSZT]{1,3}$/.test(part)){if(/\d/.test(first)){out.add(sizeBase(first)+part);out.add(first.replace(/[LRSZT]{1,3}$/,'')+part);}}else if(/\d/.test(part))out.add(part);});
 });
 return [...out];
}
function batteryMatches(size,products){
 const key=sizeKey(size);if(!key||!/\d/.test(key))return[];
 const base=sizeBase(key);
 const scored=products.map(p=>{const sizes=nameSizes(p.name);const exact=sizes.includes(key);const near=!exact&&sizes.some(x=>sizeBase(x)===base);return exact||near?{p,exact}:null;}).filter(Boolean);
 // Exact sizes win; the same size with another terminal (L/R/S) is offered only when nothing matches exactly.
 const exact=scored.filter(x=>x.exact);
 return (exact.length?exact:scored).sort((a,b)=>String(a.p.name).localeCompare(String(b.p.name))).map(x=>x.p);
}
const isBatteryProduct=p=>p.active!==false&&/battery/i.test([p.category,p.group].join(' '));
const RECENT_KEY='sp_price_check_recent_cars';
const readRecent=()=>{try{const v=JSON.parse(localStorage.getItem(RECENT_KEY)||'[]');return Array.isArray(v)?v.filter(x=>x&&x.brand&&x.model).slice(0,3):[];}catch{return[];}};
const writeRecent=list=>{try{localStorage.setItem(RECENT_KEY,JSON.stringify(list.slice(0,3)));}catch{}};

function Sheet({title,onClose,children}){
 const ref=useRef(null);
 useEffect(()=>{const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();onClose();}};window.addEventListener('keydown',key,true);ref.current?.querySelector('input,button')?.focus();return()=>window.removeEventListener('keydown',key,true);},[]);
 return <div className="pcs-backdrop pcf-sheet-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section ref={ref} className="pcs-dialog pcf-sheet" role="dialog" aria-modal="true" aria-label={title}><header className="pcf-sheet-head"><h3>{title}</h3><button type="button" className="pcs-close" aria-label="Close" onClick={onClose}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg></button></header>{children}</section></div>;
}
function PickList({items,onPick,placeholder,current}){
 const [q,setQ]=useState('');const t=q.trim().toLowerCase();
 const list=t?items.filter(x=>x.label.toLowerCase().includes(t)):items;
 return <><div className="pcf-filter"><input value={q} onChange={e=>setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder}/></div>
  <ul className="pcf-pick">{list.map(x=><li key={x.label}><button type="button" className={x.label===current?'on':''} onClick={()=>onPick(x.label)}><span>{x.label}</span><em>{x.note}</em></button></li>)}{!list.length&&<li className="pcf-none">No match for “{q.trim()}”.</li>}</ul></>;
}

function BatteryFinder({rows,products,onStock,onResult,resultId}){
 const [brand,setBrand]=useState(''),[model,setModel]=useState(''),[picker,setPicker]=useState(''),[recent,setRecent]=useState(readRecent),[matchOf,setMatchOf]=useState(null);
 const brands=useMemo(()=>{const m=new Map();rows.forEach(r=>m.set(r.car_brand,(m.get(r.car_brand)||0)+1));return[...m].sort((a,b)=>String(a[0]).localeCompare(String(b[0]))).map(([label,n])=>({label,note:n+(n===1?' model':' models')}));},[rows]);
 const models=useMemo(()=>rows.filter(r=>r.car_brand===brand).sort((a,b)=>String(a.model).localeCompare(String(b.model),undefined,{numeric:true})).map(r=>({label:r.model,note:sizeCount(r)+(sizeCount(r)===1?' size':' sizes')})),[rows,brand]);
 const result=rows.find(r=>String(r.id)===String(resultId));
 const batteryProducts=useMemo(()=>products.filter(isBatteryProduct),[products]);
 const find=(b=brand,m=model)=>{const row=rows.find(r=>r.car_brand===b&&r.model===m);if(!row)return;const next=[{brand:b,model:m},...recent.filter(x=>!(x.brand===b&&x.model===m))].slice(0,3);setRecent(next);writeRecent(next);onResult(row.id);};
 if(result){
  const options=Array.from({length:5},(_,i)=>({n:i+1,size:result['size_option'+(i+1)],price:result['price_option'+(i+1)]})).filter(o=>hasSize(o.size));
  return <div className="pcf">
   <div className="pcf-car"><div><small>{result.car_brand}</small><b>{result.model}</b></div><button type="button" onClick={()=>{setBrand(result.car_brand);setModel(result.model);onResult(null);}}>Change car</button></div>
   {options.map((o,i)=>{const matches=batteryMatches(o.size,batteryProducts);const stock=matches.reduce((s,p)=>s+(Number(p.stock)||0),0);const open=()=>{if(matches.length===1)onStock(matches[0]);else if(matches.length)setMatchOf({...o,matches});};
    return <button type="button" key={o.n} className={'pcf-opt'+(i===0?' best':'')} onClick={open} disabled={!matches.length} aria-label={`Option ${o.n} ${o.size} ${currency(o.price)}`}>
     <span className="pcf-n">{o.n}</span><span className="pcf-t">{i===0&&<em className="pcf-badge">RECOMMENDED</em>}<b>{o.size}</b><small>Option {o.n}{matches.length?<> · <span className={stock>0?'pcf-ok':stock<0?'pcf-neg':'pcf-zero'}>{stock>0?'In stock '+qty(stock):stock<0?'Negative '+qty(stock):'Out of stock'}</span></>:null}</small></span><span className="pcf-p">{currency(o.price)}</span></button>;})}
   {!options.length&&<p className="pcf-foot">No battery size is recorded for this car.</p>}
   <p className="pcf-foot">Tap a size to see stock at every outlet.<br/>* Based on the latest records in Car Battery.</p>
   {matchOf&&<Sheet title={`${matchOf.size} · matching batteries`} onClose={()=>setMatchOf(null)}><ul className="pcf-pick pcf-products">{matchOf.matches.map(p=>{const n=Number(p.stock)||0;return <li key={p.id}><button type="button" onClick={()=>{setMatchOf(null);onStock(p);}}><span>{p.name}<small>{p.code} · <span className={n>0?'pcf-ok':n<0?'pcf-neg':'pcf-zero'}>SOH {qty(n)}</span></small></span><em className="pcf-price">{currency(p.price)}</em></button></li>})}</ul></Sheet>}
  </div>;
 }
 return <div className="pcf">
  <div className="pcf-hero">
   <span className="pcf-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M7 7V5h3v2M14 7V5h3v2M7 13h3M15.5 11.5v3M14 13h3"/></svg></span>
   <h2>Find the right battery</h2>
   <p>Choose the car make and model to see the battery sizes and prices that fit.</p>
   <button type="button" className={'pcf-step'+(brand?' done':'')} onClick={()=>setPicker('make')}><i>1</i><span>{brand?<><small>Car make</small>{brand}</>:'Car make'}</span><em aria-hidden="true">⌄</em></button>
   <button type="button" className={'pcf-step'+(brand?'':' off')+(model?' done':'')} disabled={!brand} onClick={()=>setPicker('model')}><i>2</i><span>{model?<><small>Car model</small>{model}</>:'Car model'}</span><em aria-hidden="true">⌄</em></button>
   <button type="button" className="pcf-go" disabled={!brand||!model} onClick={()=>find()}>FIND BATTERY</button>
   <p className="pcf-note">Sizes and prices come from the Car Battery list of this outlet.</p>
  </div>
  {recent.length>0&&<div className="pcf-recent"><h3>Recent searches</h3><div>{recent.map(x=><button type="button" key={x.brand+'|'+x.model} onClick={()=>{if(rows.some(r=>r.car_brand===x.brand&&r.model===x.model)){setBrand(x.brand);setModel(x.model);find(x.brand,x.model);}}}>{x.brand} {x.model}</button>)}</div></div>}
  {!rows.length&&<p className="pcf-foot">The Car Battery list is empty.</p>}
  {picker==='make'&&<Sheet title="1. Select car make" onClose={()=>setPicker('')}><PickList items={brands} current={brand} placeholder="Type to filter, e.g. perodua" onPick={v=>{if(v!==brand)setModel('');setBrand(v);setPicker('model');}}/></Sheet>}
  {picker==='model'&&<Sheet title={'2. Select car model · '+brand} onClose={()=>setPicker('')}><PickList items={models} current={model} placeholder="Type to filter, e.g. myvi" onPick={v=>{setModel(v);setPicker('');}}/></Sheet>}
 </div>;
}

function ProductCards({rows,onOpen}){
 const [limit,setLimit]=useState(40);
 useEffect(()=>setLimit(40),[rows]);
 return <div className="pcf-cards">{rows.slice(0,limit).map(r=>{const n=Number(r.stock)||0;return <button type="button" className="pcf-card" key={r.id} onClick={()=>onOpen(r)}><span className="pcf-t"><b>{r.name}</b><small>{[r.code,r.category||r.group].filter(Boolean).join(' · ')}</small></span><span className="pcf-p">{currency(r.price)}<small className={n>0?'pcf-ok':n<0?'pcf-neg':'pcf-zero'}>SOH {qty(n)}</small></span><span className="pcf-chev" aria-hidden="true">›</span></button>})}
  {!rows.length&&<p className="pcf-foot">No matching records.</p>}
  {rows.length>limit&&<button type="button" className="pcf-more" onClick={()=>setLimit(l=>l+40)}>Show more ({rows.length-limit} left)</button>}</div>;
}

export default function PriceCheck({request,loadProducts,loadOutletStock,canManage,outlet}){
 const [stockOf,setStockOf]=useState(null);
 const phone=usePhone();
 const [browseAll,setBrowseAll]=useState(false),[finderId,setFinderId]=useState(null),[moreOpen,setMoreOpen]=useState(false);
 const [tab,setTab]=useState('Product'),[search,setSearch]=useState(''),[brand,setBrand]=useState('');
 const [products,setProducts]=useState([]),[batteries,setBatteries]=useState([]),[outletId,setOutletId]=useState(null),[selected,setSelected]=useState(null);
 const [loading,setLoading]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [draft,setDraft]=useState(null),[formError,setFormError]=useState(''),[remove,setRemove]=useState(null),[pending,setPending]=useState(null);
 const [exportUrl,setExportUrl]=useState('');
 useEffect(()=>()=>{if(exportUrl)URL.revokeObjectURL(exportUrl);},[exportUrl]);
 const fileInput=useRef(null),requestSequence=useRef(0),mounted=useRef(true),mutationLock=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const refresh=async(which=tab)=>{
  const seq=++requestSequence.current;setLoading(true);setReady(false);setError('');setSelected(null);setExportUrl('');
  try{const data=which==='Product'?await loadProducts():await request('list');if(!mounted.current||seq!==requestSequence.current)return;
   if(which==='Product')setProducts(data);else{setBatteries(data.batteries||[]);setOutletId(data.outlet_id);}setReady(true);
  }catch(e){if(mounted.current&&seq===requestSequence.current)setError(e.message);}finally{if(mounted.current&&seq===requestSequence.current)setLoading(false);}
 };
 useEffect(()=>{refresh(tab);},[tab,outlet]);
 const mutate=async(action,payload,message)=>{
  if(mutationLock.current)return;mutationLock.current=true;setBusy(true);setFormError('');setError('');
  try{await request(action,payload);setDraft(null);setRemove(null);setPending(null);setNotice(message);await refresh('Car Battery');}
  catch(e){setFormError(e.message);setError(e.message+' Refresh the list before retrying if the connection was interrupted.');}
  finally{mutationLock.current=false;if(mounted.current)setBusy(false);}
 };
 const importFile=async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;setError('');setNotice('');setBusy(true);setFormError('');
  try{if(file.size>10*1024*1024)throw Error('Excel file must be smaller than 10 MB.');if(!/\.xlsx$/i.test(file.name))throw Error('Use an Excel .xlsx file.');
   const XLSX=await loadExcel();const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellFormula:true});
   const parsed=parseBatterySheet(XLSX,workbook,batteries,outletId);setPending({...parsed,file:file.name,choices:{}});
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const exportExcel=async()=>{setBusy(true);setError('');try{const XLSX=await loadExcel();const bytes=XLSX.write(batteryWorkbook(XLSX,batteries,outletId),{bookType:'xlsx',type:'array',compression:true});const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));setExportUrl(url);const link=document.createElement('a');link.href=url;link.download='SP-Manager-Car-Battery.xlsx';document.body.appendChild(link);link.click();link.remove();setNotice(batteries.length?'Car Battery Excel download prepared.':'Empty Excel template download prepared. Fill it and import it here.');}catch(e){setError(e.message);}finally{setBusy(false);}};
 const rows=(tab==='Product'?products.filter(p=>p.active!==false):batteries).filter(r=>(!brand||r.car_brand===brand)&&(!search||Object.values(tab==='Product'?{code:r.code,name:r.name,category:r.category,group:r.group,barcode:(r.barcodes||[r.barcode]).join(' ')}:r).join(' ').toLowerCase().includes(search.trim().toLowerCase())));
 useEffect(()=>{if(finderId&&batteries.some(r=>String(r.id)===String(finderId)))setSelected(finderId);},[finderId,batteries]);
 useEffect(()=>{if(tab==='Car Battery'&&phone&&!products.length&&loadProducts){let live=true;loadProducts().then(d=>{if(live&&mounted.current)setProducts(d||[]);}).catch(()=>{});return()=>{live=false};}},[tab,phone]);
 const importPlan=pending?resolveBatteryImport(pending.groups,pending.choices):null;
 const chosen=batteries.find(r=>String(r.id)===String(selected));
 const battery=tab==='Car Battery';
 const finder=phone&&battery&&!browseAll;
 const switchTab=t=>{if(t===tab)return;setBrowseAll(false);setFinderId(null);setMoreOpen(false);setTab(t);setBrand('');setSearch('');setError('');setNotice('');setReady(false);setSelected(null);};
 const noManage=!canManage?'Manage Products permission is required to change battery records.':undefined;
 return <section className="pc-page">
  <div className="dr-toolbar dr page-dr-toolbar" role="toolbar" aria-label="Price Check">
   <DrTool icon="refresh" label="Refresh" disabled={loading||busy} onClick={()=>{setNotice('');refresh();}}/>
   {battery&&phone&&<button type="button" className="dr-tool pcf-more-btn" title="More" aria-haspopup="dialog" disabled={busy||loading} onClick={()=>setMoreOpen(true)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3.2" strokeLinecap="round"/></svg><span>More</span></button>}
   {battery&&!phone&&<>
    <DrTool icon="add" label="Add" title={noManage} disabled={!canManage||!ready||busy||loading} onClick={()=>{setFormError('');setDraft(emptyBattery());}}/>
    <DrTool icon="edit" label="Edit" title={noManage||(!chosen?'Select a row first':undefined)} disabled={!canManage||!chosen||busy||loading||!ready} onClick={()=>{setFormError('');setDraft({...chosen});}}/>
    <DrTool icon="delete" label="Delete" title={noManage||(!chosen?'Select a row first':undefined)} disabled={!canManage||!chosen||busy||loading||!ready} onClick={()=>{setFormError('');setRemove(chosen);}}/>
    <DrTool icon="import" label="Import" title={noManage||'Import Car Battery from Excel (.xlsx)'} disabled={!canManage||!ready||busy||loading} onClick={()=>fileInput.current?.click()}/>
    <DrTool icon="export" label="Export" title="Export Car Battery to Excel (.xlsx)" disabled={!ready||busy||loading} onClick={exportExcel}/>
   </>}
   {battery&&<input hidden ref={fileInput} type="file" accept=".xlsx" onChange={importFile}/>}
  </div>
  {error&&<div className="pc-error" role="alert">{error}</div>}<Toast message={notice} onClose={()=>setNotice('')}/>
  {exportUrl&&battery&&<p className="pc-download"><a href={exportUrl} download="SP-Manager-Car-Battery.xlsx">Download Excel</a> · Use this link if the download did not start.</p>}
  <div className={"pc-card"+(phone?" pcf-phone"+(finder?" pcf-finder-mode":""):"")}>
   <div className="pc-list-head">
    <div><b>{ready?rows.length:0} record(s)</b><small>{battery?(canManage?'Car Battery · select a row to edit or delete':'Car Battery · view only'):'Product Master · prices are read directly from Product Master'}</small></div>
    <div className="pc-tabs" role="tablist" aria-label="Price check type">{['Product','Car Battery'].map(t=><button type="button" role="tab" key={t} id={'pc-tab-'+t.replace(' ','-')} aria-controls="pc-results" aria-selected={tab===t} disabled={busy} onClick={()=>switchTab(t)}>{t}</button>)}</div>
   </div>
   {!finder&&<div className="pc-search-row">
    {battery&&<select aria-label="Car brand filter" value={brand} onChange={e=>setBrand(e.target.value)}><option value="">All brands</option>{[...new Set(batteries.map(r=>r.car_brand))].sort().map(b=><option key={b}>{b}</option>)}</select>}
    <ListSearch value={search} onChange={setSearch} placeholder={battery?'Search car brand, model or battery size...':'Search name, code or barcode...'}/>
   </div>}
   <div id="pc-results" role="tabpanel" aria-labelledby={'pc-tab-'+tab.replace(' ','-')} aria-busy={loading||busy}>
   {loading?<p className="pc-empty" role="status">Loading from database…</p>:ready&&finder?<BatteryFinder rows={batteries} products={products} resultId={finderId} onResult={id=>{setFinderId(id);if(!id)setSelected(null);}} onStock={p=>loadOutletStock&&setStockOf(p)}/>:ready&&phone&&!battery?<ProductCards rows={rows} onOpen={r=>loadOutletStock&&setStockOf(r)}/>:ready?<div className="pc-table-wrap"><table><thead><tr>{tab==='Product'?['Code','Product','Category / Group','Barcode','Price'].map(h=><th key={h} className={h==='Price'?'pc-price-head':undefined}>{h}</th>):<><th className="pc-select-col"><span className="pc-sr">Select</span></th><th>Car Brand</th><th>Model</th>{Array.from({length:5},(_,i)=><th key={i}>Option {i+1}<small>Size / Price</small></th>)}</>}</tr></thead><tbody>{<PagedRows items={rows}>{r=>tab==='Product'?<tr key={r.id} className={loadOutletStock?'pc-clickable':undefined} tabIndex={loadOutletStock?0:undefined} title={loadOutletStock?'View stock on hand at every outlet':undefined} onClick={()=>loadOutletStock&&setStockOf(r)} onKeyDown={e=>{if(loadOutletStock&&(e.key==='Enter'||e.key===' ')){e.preventDefault();setStockOf(r);}}}><td>{r.code}</td><td><b>{r.name}</b></td><td>{[r.category,r.group].filter(Boolean).join(' / ')||'—'}</td><td>{(r.barcodes||[r.barcode]).filter(Boolean).join(', ')||'—'}</td><td className="pc-price">{currency(r.price)}</td></tr>:<tr key={r.id} className={String(selected)===String(r.id)?'pc-selected':''} aria-selected={String(selected)===String(r.id)} onClick={()=>setSelected(r.id)} onDoubleClick={()=>{if(canManage&&ready&&!busy){setSelected(r.id);setFormError('');setDraft({...r});}}}><td className="pc-select-col"><input type="radio" name="pc-battery" aria-label={'Select '+r.car_brand+' '+r.model} checked={String(selected)===String(r.id)} onChange={()=>setSelected(r.id)}/></td><td><b>{r.car_brand}</b></td><td>{r.model}</td>{Array.from({length:5},(_,i)=><td key={i}><b>{r['size_option'+(i+1)]}</b>{r['size_option'+(i+1)]!=='-'&&<small className="pc-price">{currency(r['price_option'+(i+1)])}</small>}</td>)}</tr>}</PagedRows>}</tbody></table>{!rows.length&&<p className="pc-empty">No matching records.{tab==='Car Battery'?' Use Add or import your Excel file.':''}</p>}{rows.length>200&&<p className="pc-empty">Showing the first 200 of {rows.length} matches. Narrow your search to find a specific model.</p>}</div>:<p className="pc-empty">Refresh to load database records.</p>}
  </div>
  </div>
  {draft&&<Dialog title={draft.id?'Edit Car Battery':'Add Car Battery'} busy={busy} onClose={()=>setDraft(null)}><form onSubmit={e=>{e.preventDefault();try{const row=validateBattery(draft);mutate('save',{battery:row},'Car Battery saved to database.');}catch(e){setFormError(e.message);}}}><div className="pc-form-grid"><label>Car Brand<input required maxLength={100} value={draft.car_brand} onChange={e=>setDraft({...draft,car_brand:e.target.value})}/></label><label>Model<input required maxLength={180} value={draft.model} onChange={e=>setDraft({...draft,model:e.target.value})}/></label></div><div className="pc-options">{Array.from({length:5},(_,n)=>{const i=n+1;return <div className="pc-form-grid" key={i}><label>Size Option {i}<input maxLength={64} value={draft['size_option'+i]} onChange={e=>setDraft({...draft,['size_option'+i]:e.target.value})}/></label><label>Price Option {i} (RM)<input required type="number" min="0" max="9999999999" step="0.01" value={draft['price_option'+i]} onChange={e=>setDraft({...draft,['price_option'+i]:e.target.value})}/></label></div>;})}</div><p>Use “-” and price 0 for an unavailable option.</p>{formError&&<div role="alert" className="pc-error">{formError}</div>}<footer><button type="button" disabled={busy} onClick={()=>setDraft(null)}>Cancel</button><button className="primary" disabled={busy}>{busy?'Saving…':'Save'}</button></footer></form></Dialog>}
  {remove&&<Dialog title="Delete Car Battery" busy={busy} onClose={()=>setRemove(null)}><p>Delete {remove.car_brand} / {remove.model} from this outlet?</p>{formError&&<div className="pc-error" role="alert">{formError}</div>}<footer><button disabled={busy} onClick={()=>setRemove(null)}>Cancel</button><button className="pc-danger" disabled={busy} onClick={()=>mutate('delete',{id:remove.id,revision:Number(remove.revision)},'Car Battery deleted.')}>{busy?'Deleting…':'Delete'}</button></footer></Dialog>}
  {pending&&<Dialog title="Import Car Battery" busy={busy} onClose={()=>setPending(null)}>
   <p>{pending.file}: <b>{importPlan.added} new</b> and <b>{importPlan.updated} updated</b> car models ready to import. Existing records not in this file will be kept.</p>
   {importPlan.duplicates>0&&<div className="pc-notice" role="status">{importPlan.duplicates} identical duplicate rows will be skipped automatically.</div>}
   {importPlan.conflicts.length>0&&<div className="pc-import-conflicts"><h3>Choose which row to import</h3><p>These car brands/models have different size or price values. Select one version for each car model. The other versions will not be imported. If these are different vehicles, Cancel and give each Model a distinct variant/year in Excel.</p>
    {importPlan.conflicts.map(group=><fieldset key={group.key}><legend>{group.car_brand} / {group.model}</legend>{group.variants.map((variant,index)=><label className="pc-import-choice" key={index}><input type="radio" name={'import-'+group.key} checked={pending.choices[group.key]===index} disabled={busy} onChange={()=>setPending({...pending,choices:{...pending.choices,[group.key]:index}})}/><div><b>Excel row {variant.excelRows.join(', ')}</b><span>{Array.from({length:5},(_,n)=>`${variant.row['size_option'+(n+1)]} / ${currency(variant.row['price_option'+(n+1)])}`).join(' · ')}</span></div></label>)}</fieldset>)}
    {importPlan.unresolved.length>0&&<p role="status">Choose a version for {importPlan.unresolved.length} remaining car model(s) to enable Confirm Import.</p>}
   </div>}
   <p>Only the first worksheet is imported. All selected rows are saved together; an invalid or outdated record cancels the entire import.</p>
   <div className="pc-table-wrap"><table><thead><tr><th>Car Brand</th><th>Model</th><th>Option 1</th></tr></thead><tbody>{importPlan.rows.slice(0,10).map((r,i)=><tr key={i}><td>{r.car_brand}</td><td>{r.model}</td><td>{r.size_option1} / {currency(r.price_option1)}</td></tr>)}</tbody></table></div>
   {formError&&<div className="pc-error" role="alert">{formError}</div>}<footer><button disabled={busy} onClick={()=>setPending(null)}>Cancel</button><button className="primary" disabled={busy||importPlan.unresolved.length>0||!importPlan.rows.length} onClick={()=>{if(importPlan.unresolved.length||!importPlan.rows.length)return;mutate('import',{batteries:importPlan.rows},`${importPlan.rows.length} Car Battery records imported; ${importPlan.duplicates} identical duplicates skipped.`);}}>{busy?'Importing…':'Confirm Import'}</button></footer>
  </Dialog>}


  {moreOpen&&<Sheet title="Car Battery" onClose={()=>setMoreOpen(false)}><div className="pcf-menu">
   {(()=>{const act=(fn)=>()=>{setMoreOpen(false);fn();};const items=[
    {icon:'view',label:browseAll?'Battery finder':'Browse all cars',on:act(()=>{setBrowseAll(b=>!b);setSearch('');setBrand('');})},
    {icon:'add',label:'Add car',dis:!canManage||!ready,on:act(()=>{setFormError('');setDraft(emptyBattery());})},
    {icon:'edit',label:chosen?'Edit '+chosen.car_brand+' '+chosen.model:'Edit (choose a car first)',dis:!canManage||!chosen,on:act(()=>{setFormError('');setDraft({...chosen});})},
    {icon:'delete',label:chosen?'Delete '+chosen.car_brand+' '+chosen.model:'Delete (choose a car first)',dis:!canManage||!chosen,danger:true,on:act(()=>{setFormError('');setRemove(chosen);})},
    {icon:'import',label:'Import from Excel',dis:!canManage||!ready,on:act(()=>fileInput.current?.click())},
    {icon:'export',label:'Export to Excel',dis:!ready,on:act(exportExcel)}];
    return items.map(x=><button type="button" key={x.icon} className={x.danger?'danger':''} disabled={x.dis||busy||loading} onClick={x.on}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={DR_ICONS[x.icon]}/></svg><span>{x.label}</span></button>);})()}
   {!canManage&&<p>Manage Products permission is required to change battery records.</p>}
  </div></Sheet>}
  {stockOf&&loadOutletStock&&<OutletStock product={stockOf} load={loadOutletStock} onClose={()=>setStockOf(null)}/>}
 </section>;
}
