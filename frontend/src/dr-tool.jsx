import React,{useEffect,useMemo,useRef,useState} from "react";
import {createPortal} from "react-dom";

// Toolbar icons shared by every Management page (same set as the Products toolbar).
export const DR_ICONS={
 refresh:"M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6",
 add:"M12 5v14M5 12h14",
 edit:"M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
 delete:"M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3",
 print:"M7 9V3h10v6M6 18H4v-7h16v7h-2M7 14h10v7H7z",
 pdf:"M6 2h9l5 5v15H6zM14 2v6h6M9 13h6M9 17h4",
 export:"M12 15V3M7 8l5-5 5 5M4 21h16",
 import:"M12 3v12M7 10l5 5 5-5M4 21h16",
 help:"M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01",
 history:"M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2",
 count:"M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
 quick:"M13 2 4 14h7l-1 8 9-12h-7z",
 convert:"M4 7h13l-3-3M20 17H7l3 3",
 back:"M15 18l-6-6 6-6",
 save:"M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6",
 mail:"M4 6h16v12H4zM4 7l8 6 8-6",
 view:"M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
 qr:"M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2M14 18h2v2M18 18h2v2h-2"
};

// Compact icon + label button for actions inside table rows.
export function RowAction({icon,label,danger,className="",...props}){
 return <button type="button" className={"row-action"+(danger?" danger":"")+(className?" "+className:"")} title={label} {...props}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={DR_ICONS[icon]||DR_ICONS.add}/></svg><span>{label}</span></button>;
}

// Products-style toolbar button: icon above label, borderless.
export function DrTool({icon,label,danger,className="",...props}){
 return <button type="button" className={"dr-tool"+(danger?" danger":"")+(className?" "+className:"")} title={label} {...props}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={DR_ICONS[icon]||DR_ICONS.add}/></svg><span>{label}</span></button>;
}

// Date field that always shows dd/mm/yyyy (native date inputs follow the computer's locale, e.g. mm/dd/yyyy).
// The value stays yyyy-mm-dd (or yyyy-mm-ddThh:mm for type="datetime-local"), so callers keep using e.target.value.
const pad2=n=>String(n).padStart(2,"0");
export const isoToDmy=v=>{const m=/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(v||""));if(!m)return "";return `${m[3]}/${m[2]}/${m[1]}`+(m[4]?` ${m[4]}:${m[5]}`:"")};
const dmyToIso=(text,withTime)=>{const m=/^\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?\s*$/.exec(text);if(!m)return null;const d=+m[1],mo=+m[2],y=+m[3];const dt=new Date(y,mo-1,d);if(dt.getFullYear()!==y||dt.getMonth()!==mo-1||dt.getDate()!==d)return null;let iso=`${y}-${pad2(mo)}-${pad2(d)}`;if(withTime){const h=+(m[4]??0),mi=+(m[5]??0);if(h>23||mi>59)return null;iso+=`T${pad2(h)}:${pad2(mi)}`}return iso};
export function DateInput({value,onChange,name,type="date",min,max,required,disabled,className="",id,style,step,...rest}){
 const withTime=type==="datetime-local";
 const[text,setText]=useState(()=>isoToDmy(value));
 const[bad,setBad]=useState(false);
 const picker=useRef(null);
 useEffect(()=>{setText(isoToDmy(value));setBad(false)},[value]);
 const emit=v=>onChange?.({target:{value:v,name,type},currentTarget:{value:v,name,type}});
 const commit=()=>{const t=text.trim();if(!t){setBad(false);if(value)emit("");return}const iso=dmyToIso(t,withTime);if(!iso||(min&&iso<String(min))||(max&&iso>String(max))){setBad(true);return}setBad(false);if(iso!==value)emit(iso);else setText(isoToDmy(iso))};
 const open=()=>{const p=picker.current;if(!p||disabled)return;try{p.showPicker()}catch{p.focus();p.click()}};
 return <span className={"sp-date"+(bad?" invalid":"")+(disabled?" disabled":"")} style={style}>
  <input {...rest} id={id} name={name} className={className} type="text" inputMode="numeric" autoComplete="off" placeholder={withTime?"dd/mm/yyyy hh:mm":"dd/mm/yyyy"} value={text} required={required} disabled={disabled} aria-invalid={bad||undefined} title={bad?"Use dd/mm/yyyy":undefined} onChange={e=>setText(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")commit()}}/>
  <button type="button" className="sp-date-btn" tabIndex={-1} aria-label="Open calendar" disabled={disabled} onClick={open}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/></svg></button>
  <input ref={picker} className="sp-date-native" type={withTime?"datetime-local":"date"} tabIndex={-1} aria-hidden="true" value={value||""} min={min} max={max} disabled={disabled} onChange={e=>emit(e.target.value)}/>
 </span>;
}

// Show a stored date (yyyy-mm-dd or yyyy-mm-dd hh:mm[:ss]) as dd/mm/yyyy [hh:mm]; anything else is returned unchanged.
export const showDate=v=>/^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(String(v??""))?isoToDmy(v):v;

// ---- Long lists: search + next page for any table body -----------------------------------------
// <PagedRows items={rows} search>{(row,index)=><tr>…</tr>}</PagedRows> renders one page of rows, an optional
// search row at the top and a pager row at the bottom (only when there is more than one page).
export const LIST_PAGE_SIZE=25;
const listText=v=>{if(v===null||v===undefined||typeof v==="boolean")return "";if(typeof v==="string"||typeof v==="number")return String(v);if(Array.isArray(v))return v.map(listText).join(" ");if(React.isValidElement(v))return listText(v.props?.children);if(typeof v==="object")return Object.values(v).map(x=>typeof x==="object"&&x!==null&&!Array.isArray(x)&&!React.isValidElement(x)?"":listText(x)).join(" ");return ""};
// The one search box used by every Management page (same size, icon, focus ring and clear button).
export function ListSearch({value,onChange,placeholder="Search…",autoFocus=false}){
 return <div className="sp-search"><svg className="sp-search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><input className="sp-search-input" type="text" inputMode="search" value={value??""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} autoFocus={autoFocus}/>{value?<button type="button" className="sp-search-clear" onClick={()=>onChange("")} aria-label="Clear search" title="Clear"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg></button>:null}</div>;
}
export function ListPager({page,pages,from,to,total,onPage}){
 if(pages<=1)return null;
 return <div className="list-pager"><span className="list-pager-info">{from}–{to} of {total}</span><div className="list-pager-nav"><button type="button" disabled={page<=1} onClick={()=>onPage(1)} aria-label="First page">«</button><button type="button" disabled={page<=1} onClick={()=>onPage(page-1)} aria-label="Previous page">‹</button><span className="list-pager-page">Page {page} of {pages}</span><button type="button" disabled={page>=pages} onClick={()=>onPage(page+1)} aria-label="Next page">›</button><button type="button" disabled={page>=pages} onClick={()=>onPage(pages)} aria-label="Last page">»</button></div></div>;
}
export function PagedRows({items,children,search=false,query,placeholder="Search…",pageSize=LIST_PAGE_SIZE,empty=null}){
 const list=Array.isArray(items)?items:[];
 const [own,setQ]=useState(""),[page,setPage]=useState(1);
 const q=typeof query==="string"?query:own;
 const term=q.trim().toLowerCase();
 const filtered=useMemo(()=>term?list.filter(x=>listText(x).toLowerCase().includes(term)):list,[list,term]);
 useEffect(()=>{setPage(1)},[term,list.length]);
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize)),cur=Math.min(page,pages),start=(cur-1)*pageSize;
 const rows=filtered.slice(start,start+pageSize);
 return <>
  {search&&<tr className="list-tools-row"><td colSpan={99}><ListSearch value={q} onChange={setQ} placeholder={placeholder}/></td></tr>}
  {rows.length?rows.map((x,i)=>children(x,start+i)):term?<tr className="list-empty-row"><td colSpan={99}>No results for “{q.trim()}”.</td></tr>:empty}
  {filtered.length>pageSize&&<tr className="list-pager-row"><td colSpan={99}><ListPager page={cur} pages={pages} from={start+1} to={Math.min(start+pageSize,filtered.length)} total={filtered.length} onPage={setPage}/></td></tr>}
 </>;
}


// Standard success/info message: appears at the bottom of the screen and hides itself.
// Messages that need an OK button (confirm dialogs) and the POS screen do not use this.
const TOAST_ERROR=/fail|error|invalid|cannot|could not|can't|denied|not allowed|required|unable/i;
const toastStack=()=>{let host=document.getElementById("sp-toast-stack");if(!host){host=document.createElement("div");host.id="sp-toast-stack";host.className="sp-toast-stack";document.body.appendChild(host);}return host;};
export function Toast({message,onClose,kind,duration}){
 const text=typeof message==="string"?message:String(message??"");
 const type=kind||(TOAST_ERROR.test(text)?"error":"success");
 const ms=Math.max(2000,Number(duration)||(type==="error"?8000:4000));
 const [leaving,setLeaving]=useState(false),[paused,setPaused]=useState(false);
 const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{setLeaving(false);},[text]);
 useEffect(()=>{if(!text||paused)return;const hide=setTimeout(()=>setLeaving(true),ms);return()=>clearTimeout(hide);},[text,ms,paused]);
 useEffect(()=>{if(!leaving)return;const done=setTimeout(()=>close.current?.(),220);return()=>clearTimeout(done);},[leaving]);
 if(!text||typeof document==="undefined")return null;
 return createPortal(<div className={"sp-toast-card "+type+(leaving?" leaving":"")+(paused?" paused":"")} role={type==="error"?"alert":"status"} aria-live={type==="error"?"assertive":"polite"} onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}>
  <span className="sp-toast-icon" aria-hidden="true">{type==="error"?"!":type==="info"?"i":"✓"}</span>
  <span className="sp-toast-text">{text}</span>
  <button type="button" aria-label="Dismiss message" onClick={()=>setLeaving(true)}>×</button>
  <i className="sp-toast-timer" key={text+String(paused)} style={{animationDuration:ms+"ms"}} aria-hidden="true"/>
 </div>,toastStack());
}
