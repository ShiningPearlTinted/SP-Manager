import React, {useRef, useState} from 'react';

export default function DatabaseReset({request, onComplete}) {
 const [selection,setSelection]=useState({products:false,customers:false,documents:false});
 const [preview,setPreview]=useState(null),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState(null);
 const pending=useRef(null);
 const choose=(key,value)=>{setSelection(v=>({...v,[key]:value}));setPreview(null);setConfirmation('');pending.current=null;setError('');};
 const inspect=async()=>{setBusy(true);setError('');pending.current=null;try{setPreview(await request('preview',{selection}));setConfirmation('');}catch(e){setPreview(null);setError(e.message);}finally{setBusy(false);}};
 const reset=async e=>{e.preventDefault();if(busy||!preview||preview.blockers.length||!password||confirmation!==preview.confirmation)return;
  setBusy(true);setError('');
  const payload=pending.current||{selection,preview_token:preview.preview_token,confirmation,password,request_id:crypto.randomUUID()};pending.current=payload;
  try{const receipt=await request('reset',payload);pending.current=null;setPassword('');setResult(receipt);await onComplete(receipt);}
  catch(e){setError(e.message);if(e.status){pending.current=null;setPassword('');setPreview(null);setConfirmation('');}}
  finally{setBusy(false);}
 };
 if(result)return <div className="database-reset"><div className="reset-success" role="status"><h3>Outlet reset completed</h3><p>Backup verified: <strong>{result.backup_file}</strong></p><p>Sign in again before using this outlet.</p></div></div>;
 return <form className="database-reset" onSubmit={reset}>
  <div className="reset-warning" role="note">This permanently deletes selected data from the active outlet. Close other terminals first. A verified encrypted backup is mandatory.</div>
  <fieldset disabled={busy}><legend>1. Backup before reset</legend><p>The backup is saved in the private server folder configured by your administrator. A Windows folder on this computer cannot be used.</p><p>Users, permissions, company identity, shared masters and Car Battery data are protected.</p></fieldset>
  <fieldset disabled={busy}><legend>2. Select entities for the active outlet</legend>
   <label className="reset-option"><input type="checkbox" checked={selection.products} onChange={e=>choose('products',e.target.checked)}/><span><strong>Products</strong><small>Deactivate outlet product assignments, zero outlet stock, and remove outlet prices, promotions, discounts, taxes and open orders. Shared product masters remain.</small></span></label>
   <label className="reset-option"><input type="checkbox" checked={selection.customers} onChange={e=>choose('customers',e.target.checked)}/><span><strong>Customers / suppliers</strong><small>Delete outlet-owned records and associated vehicles, notes and loyalty accounts. Shared customers remain. Retained document references block reset.</small></span></label>
   <label className="reset-option"><input type="checkbox" checked={selection.documents} onChange={e=>choose('documents',e.target.checked)}/><span><strong>Documents</strong><small>Delete outlet sales, purchases, invoices, quotations, orders, payments, refunds, warranties, maintenance and daily reports. Zero outlet stock and reset document counters and business day.</small></span></label>
   <button type="button" disabled={!Object.values(selection).some(Boolean)} onClick={inspect}>{busy?'Checking…':'Preview reset'}</button>
  </fieldset>
  {error&&<div className="reset-warning" role="alert">{error}</div>}
  {preview&&<><section className="reset-preview" aria-label="Reset preview"><h3>Outlet: {preview.outlet.outlet_code} — {preview.outlet.outlet_name}</h3><p>Preview expires after 5 minutes. Changes to selected data require a new preview.</p>
   <div className="reset-counts"><div><h4>Records to delete</h4>{Object.entries(preview.counts).length?Object.entries(preview.counts).map(([key,n])=><p key={key}><span>{key.replaceAll('_',' ')}</span><strong>{n}</strong></p>):<p>None</p>}</div><div><h4>Records to update</h4>{Object.entries(preview.update_counts).length?Object.entries(preview.update_counts).map(([key,n])=><p key={key}><span>{key.replaceAll('_',' ')}</span><strong>{n}</strong></p>):<p>None</p>}</div></div>
   {preview.blockers.length>0&&<div className="reset-warning" role="alert">{preview.blockers.map(x=><p key={x}>{x}</p>)}</div>}
  </section><fieldset disabled={busy||preview.blockers.length>0}><legend>3. Administrator confirmation</legend>
   <label>Current Administrator password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
   <label><span>Type <strong>{preview.confirmation}</strong> to confirm the active outlet</span><input value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off" required/></label>
   <button className="reset-danger" type="submit" disabled={!password||confirmation!==preview.confirmation}>{busy?'Backing up and resetting…':pending.current?'Retry the same reset':'Reset selected data'}</button>
  </fieldset></>}
 </form>;
}
