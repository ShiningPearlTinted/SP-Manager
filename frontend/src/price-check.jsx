import React,{useEffect,useRef,useState} from 'react';
import {BATTERY_HEADERS,emptyBattery,validateBattery,parseBatterySheet,resolveBatteryImport,batteryWorkbook} from './price-check-excel.js';
import './price-check.css';

let excelLoading;
function loadExcel(){
 if(window.XLSX)return Promise.resolve(window.XLSX);
 if(!excelLoading)excelLoading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=(import.meta.env.BASE_URL||'/SP-Manager/')+'vendor/xlsx.full.min.js';
  script.onload=()=>window.XLSX?resolve(window.XLSX):reject(Error('Excel library could not load.'));
  script.onerror=()=>{script.remove();excelLoading=null;reject(Error('Excel library could not load. Check the vendor folder.'));};document.head.appendChild(script);
 });return excelLoading;
}
function Dialog({title,children,onClose,busy=false}){
 const ref=useRef(null);
 useEffect(()=>{const before=document.activeElement;(ref.current?.querySelector('input')||ref.current?.querySelector('button'))?.focus();return()=>before?.isConnected&&before.focus();},[]);
 return <div className="pc-backdrop"><section ref={ref} className="pc-dialog" role="dialog" aria-modal="true" aria-label={title} onKeyDown={e=>{
  if(e.key==='Escape'&&!busy){e.preventDefault();onClose();}
  if(e.key==='Tab'){const nodes=[...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')];const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
 }}><header><h2>{title}</h2><button type="button" disabled={busy} aria-label="Close dialog" onClick={onClose}>×</button></header>{children}</section></div>;
}
const currency=v=>'RM '+Number(v||0).toFixed(2);
export default function PriceCheck({request,loadProducts,canManage,outlet}){
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
 const importPlan=pending?resolveBatteryImport(pending.groups,pending.choices):null;
 const chosen=batteries.find(r=>String(r.id)===String(selected));
 return <section className="pc-page"><div className="pc-heading"><div><h2>Price Check</h2><p>Find product prices or battery sizes for a car model.</p></div><button disabled={loading||busy} onClick={()=>{setNotice('');refresh();}}>Refresh</button></div>
  <div className="pc-tabs" role="tablist" aria-label="Price check type">{['Product','Car Battery'].map(t=><button role="tab" key={t} id={'pc-tab-'+t.replace(' ','-')} aria-controls="pc-results" aria-selected={tab===t} disabled={busy} onClick={()=>{if(t===tab)return;setTab(t);setBrand('');setSearch('');setError('');setNotice('');setReady(false);setSelected(null);}}>{t}</button>)}</div>
  <div className="pc-controls"><label className="pc-search">Search<input aria-label="Search Price Check" value={search} onChange={e=>setSearch(e.target.value)} placeholder={tab==='Product'?'Product name, code or barcode':'Car brand, model or battery size'}/></label>
   {tab==='Car Battery'&&<label>Car brand<select aria-label="Car brand filter" value={brand} onChange={e=>setBrand(e.target.value)}><option value="">All brands</option>{[...new Set(batteries.map(r=>r.car_brand))].sort().map(b=><option key={b}>{b}</option>)}</select></label>}
  </div>
  {tab==='Car Battery'&&<div className="pc-actions"><button className="primary" disabled={!canManage||!ready||busy||loading} onClick={()=>{setFormError('');setDraft(emptyBattery());}}>+ Add</button><button disabled={!canManage||!chosen||busy||loading||!ready} onClick={()=>{setFormError('');setDraft({...chosen});}}>Edit</button><button disabled={!canManage||!chosen||busy||loading||!ready} onClick={()=>{setFormError('');setRemove(chosen);}}>Delete</button><button disabled={!canManage||!ready||busy||loading} onClick={()=>fileInput.current?.click()}>Import Excel</button><button disabled={!ready||busy||loading} onClick={exportExcel}>Export Excel</button><input hidden ref={fileInput} type="file" accept=".xlsx" onChange={importFile}/>{!canManage&&<span>Manage Products permission is required to change battery records.</span>}</div>}
  {error&&<div className="pc-error" role="alert">{error}</div>}{notice&&<div className="pc-notice" role="status">{notice}</div>}{exportUrl&&tab==='Car Battery'&&<p className="pc-download"><a href={exportUrl} download="SP-Manager-Car-Battery.xlsx">Download Excel</a> · Use this link if the download did not start.</p>}
  <div id="pc-results" role="tabpanel" aria-labelledby={'pc-tab-'+tab.replace(' ','-')} aria-busy={loading||busy} className="pc-card"><div className="pc-caption"><b>{tab==='Product'?'Product Master':'Car Battery'} · {ready?rows.length:0} records</b><span>{tab==='Product'?'Prices are read directly from Product Master.':'Select a row to edit or delete.'}</span></div>
   {loading?<p className="pc-empty" role="status">Loading from database…</p>:ready?<div className="pc-table-wrap"><table><thead><tr>{tab==='Product'?['Code','Product','Category / Group','Barcode','Price'].map(h=><th key={h}>{h}</th>):<><th>Select</th><th>Car Brand</th><th>Model</th>{Array.from({length:5},(_,i)=><th key={i}>Option {i+1}<small>Size / Price</small></th>)}</>}</tr></thead><tbody>{rows.slice(0,200).map(r=>tab==='Product'?<tr key={r.id}><td>{r.code}</td><td><b>{r.name}</b></td><td>{[r.category,r.group].filter(Boolean).join(' / ')||'—'}</td><td>{(r.barcodes||[r.barcode]).filter(Boolean).join(', ')||'—'}</td><td className="pc-price">{currency(r.price)}</td></tr>:<tr key={r.id} className={String(selected)===String(r.id)?'pc-selected':''} onClick={()=>setSelected(r.id)}><td><input type="radio" name="pc-battery" aria-label={'Select '+r.car_brand+' '+r.model} checked={String(selected)===String(r.id)} onChange={()=>setSelected(r.id)}/></td><td><b>{r.car_brand}</b></td><td>{r.model}</td>{Array.from({length:5},(_,i)=><td key={i}><b>{r['size_option'+(i+1)]}</b>{r['size_option'+(i+1)]!=='-'&&<small className="pc-price">{currency(r['price_option'+(i+1)])}</small>}</td>)}</tr>)}</tbody></table>{!rows.length&&<p className="pc-empty">No matching records.{tab==='Car Battery'?' Use Add or import your Excel file.':''}</p>}{rows.length>200&&<p className="pc-empty">Showing the first 200 of {rows.length} matches. Narrow your search to find a specific model.</p>}</div>:<p className="pc-empty">Refresh to load database records.</p>}
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

 </section>;
}
