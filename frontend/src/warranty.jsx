import React,{useMemo,useRef,useState} from 'react';

// Warranty check by vehicle plate: every item with a warranty (tint, battery, coating, PPF and others)
// sold to that vehicle at any outlet, with expiry date and how long is left.
const TZ='Asia/Kuala_Lumpur';
const fmtDate=v=>{try{return new Date(v).toLocaleDateString('en-GB',{timeZone:TZ,day:'numeric',month:'short',year:'numeric'});}catch{return String(v||'');}};
const plateText=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9 ]/g,'').replace(/\s+/g,' ').slice(0,15);
const KINDS=[
 {key:'Tint',test:/tint|film|sputter|ceramic|carbon|uv\b/i},
 {key:'Battery',test:/batter|amaron|century|marathoner|\bns\d|din\d/i},
 {key:'Coating',test:/coat/i},
 {key:'PPF',test:/\bppf\b|paint protection/i},
];
const kindOf=i=>{const text=[i.category,i.group,i.product].join(' ');return (KINDS.find(k=>k.test.test(i.category||''))||KINDS.find(k=>k.test.test(text))||{key:'Other'}).key;};
// "6y 7m", "11m", "19"
const shortSpan=n=>{const y=Math.floor(n/365),m=Math.floor(n%365/30);if(y)return `${y}y${m?` ${m}m`:''}`;if(n>=30)return `${Math.floor(n/30)}m`;return `${n}`;};
const longSpan=n=>{const y=Math.floor(n/365),m=Math.floor(n%365/30);if(y)return `${y} yr${m?` ${m} mo`:''}`;if(n>=30){const mm=Math.floor(n/30);return `${mm} month${mm===1?'':'s'}`;}return `${n} day${n===1?'':'s'}`;};
const TONE={ACTIVE:'wa-g',EXPIRING:'wa-y',EXPIRED:'wa-r'};
const Shield=({size=16})=><svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4"/></svg>;

// The ring shows the part of the warranty that is still left.
function Ring({item}){
 const left=Math.max(0,100-Number(item.used_percent||0));
 const pct=item.status==='EXPIRED'?100:Math.max(left,3);
 const d=item.days_left;
 return <span className={'wa-ring '+TONE[item.status]} style={{'--p':pct}} role="img" aria-label={d<0?'Expired':`${longSpan(d)} left`}>
  <span>{d<0?<><b>0</b><small>expired</small></>:d<30?<><b>{d}</b><small>{d===1?'day left':'days left'}</small></>:<><b>{shortSpan(d)}</b><small>left</small></>}</span>
 </span>;
}

export default function WarrantyCheck({lookup}){
 const [plate,setPlate]=useState(''),[result,setResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[filter,setFilter]=useState('All'),[open,setOpen]=useState(null);
 const inputRef=useRef(null),seq=useRef(0);
 const search=async e=>{
  e?.preventDefault();const value=plate.trim();
  if(value.replace(/\s/g,'').length<2){setError('Enter the vehicle plate number.');inputRef.current?.focus();return;}
  const id=++seq.current;setBusy(true);setError('');
  try{const r=await lookup(value);if(id!==seq.current)return;setResult(r);setFilter('All');setOpen(null);inputRef.current?.blur();}
  catch(err){if(id===seq.current){setResult(null);setError(err.message||'Warranty check could not be completed.');}}
  finally{if(id===seq.current)setBusy(false);}
 };
 const items=result?.items||[];
 const kinds=useMemo(()=>{const seen=[];items.forEach(i=>{const k=kindOf(i);if(!seen.includes(k))seen.push(k);});return seen;},[items]);
 const shown=filter==='All'?items:items.filter(i=>kindOf(i)===filter);
 const sum=result?.summary||{active:0,expiring:0,expired:0};
 const name=result?.customer?.name||'';
 const showName=name&&name.replace(/\s/g,'').toUpperCase()!==result?.plate?name:(result?.plate||'');
 const initials=(showName||'?').replace(/[^A-Za-z0-9 ]/g,'').split(' ').filter(Boolean).slice(0,2).map(w=>w.slice(0,showName.includes(' ')?1:2)).join('').toUpperCase()||'?';
 return <section className={result?"wa-page":"wa-page wa-page-start"}>
  <div className={result?"wa-hero":"wa-hero wa-start"}>
   {!result&&<div className="wa-intro"><h2>Check a vehicle's warranty</h2><p>Enter the plate number to see every tint, battery, coating and PPF job, with how long each warranty has left.</p></div>}
   <form className="wa-search" onSubmit={search} role="search">
    <input id="wa-plate-input" ref={inputRef} value={plate} onChange={e=>setPlate(plateText(e.target.value))} placeholder="WXY 1234" autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-label="Vehicle plate number"/>
    <button type="submit" className="wa-check" disabled={busy}>{busy?'Checking…':'Check'}</button>
   </form>
   {error&&<p className="wa-error" role="alert">{error}</p>}
   {result&&(result.customer||result.sales>0)&&<>
    <div className="wa-who"><span className="wa-avatar" aria-hidden="true">{initials}</span><div><b>{showName}</b><small>{[result.customer?.phone,result.sales?`${result.sales} visit${result.sales===1?'':'s'}`:null].filter(Boolean).join(' · ')||'No customer details'}</small></div></div>
    <div className="wa-stats"><div><b className="wa-g">{sum.active}</b><small>Active</small></div><div><b className="wa-y">{sum.expiring}</b><small>Expiring</small></div><div><b className="wa-r">{sum.expired}</b><small>Expired</small></div></div>
   </>}
  </div>

  {result&&<div className="wa-body" aria-live="polite">
   {items.length>0&&<div className="wa-chips" role="tablist" aria-label="Warranty type">{['All',...kinds].map(k=><button type="button" role="tab" key={k} aria-selected={filter===k} className={filter===k?'on':''} onClick={()=>setFilter(k)}>{k} <em>{k==='All'?items.length:items.filter(i=>kindOf(i)===k).length}</em></button>)}</div>}
   {!items.length?<div className="wa-empty"><span className="wa-empty-icon"><Shield size={30}/></span><b>{result.sales?'No warranty items for this vehicle':'No record for this plate'}</b><small>{result.sales?`${result.sales} sale${result.sales===1?' was':'s were'} found, but none of the items carries a warranty.`:'Check the plate number, or the job may have been recorded under another customer.'}</small></div>:
   <ul className="wa-list">{shown.map(i=>{const k=kindOf(i),tone=TONE[i.status],expanded=open===i.line_id;return <li key={i.line_id} className="wa-card">
    <button type="button" className="wa-card-main" aria-expanded={expanded} onClick={()=>setOpen(expanded?null:i.line_id)}>
     <Ring item={i}/>
     <span className="wa-t"><small>{k.toUpperCase()}{i.group&&i.group.toLowerCase()!==k.toLowerCase()?' · '+i.group:''}</small><b>{i.product}</b>
      <span className="wa-meta"><span className={'wa-pill '+tone}>{i.status==='ACTIVE'?'Active':i.status==='EXPIRING'?'Expiring':'Expired '+fmtDate(i.expires_at)}</span><span>{i.term}</span>{i.status!=='EXPIRED'&&<span>until {fmtDate(i.expires_at)}</span>}</span>
     </span>
     <span className="wa-chev" aria-hidden="true">{expanded?'−':'+'}</span>
    </button>
    {expanded&&<dl className="wa-details">
     <div><dt>Installed</dt><dd>{fmtDate(i.installed_at)}</dd></div>
     <div><dt>{i.days_left<0?'Expired on':'Expires on'}</dt><dd>{fmtDate(i.expires_at)}</dd></div>
     <div><dt>{i.days_left<0?'Expired':'Time left'}</dt><dd className={tone}>{i.days_left<0?longSpan(-i.days_left)+' ago':longSpan(i.days_left)+(i.days_left>=30?` (${i.days_left} days)`:'')}</dd></div>
     <div><dt>Warranty</dt><dd>{i.term}</dd></div>
     <div><dt>Receipt</dt><dd>{i.sale_no||'—'}</dd></div>
     <div><dt>Outlet</dt><dd>{i.outlet_code||'—'}{i.outlet_name?' · '+i.outlet_name:''}</dd></div>
     {i.maintenance>0&&<div><dt>Maintenance</dt><dd>{i.maintenance} service{i.maintenance===1?'':'s'}</dd></div>}
    </dl>}
   </li>})}</ul>}
   <p className="wa-note">Warranty runs from the sale date. Tap a card for details. Checked {fmtDate(result.checked_at)}.</p>
  </div>}
 </section>;
}
