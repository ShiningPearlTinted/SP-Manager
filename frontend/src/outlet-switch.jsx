import React,{useEffect,useLayoutEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";

// Outlet switcher used in the Management header pill and the POS menu.
// The list is rendered in a portal so no scrolling or clipped container (the phone header row,
// the POS side menu) can hide it. On a phone it opens as a bottom sheet.
const PHONE=700;

// The confirmation is shown inside the switcher itself: system dialogs on <body> can sit behind
// the POS screen on a phone.
export default function OutletSwitch({variant="pill",outlets=[],info={},current="",canSwitch=false,blocked=false,onSelect}){
 const [open,setOpen]=useState(false),[pos,setPos]=useState(null),[pending,setPending]=useState(null),[busy,setBusy]=useState(false);
 const button=useRef(null),list=useRef(null);
 const phone=()=>typeof window!=="undefined"&&window.innerWidth<=PHONE;
 const place=()=>{const r=button.current?.getBoundingClientRect();if(!r)return;
  if(phone()){setPos({sheet:true});return}
  const width=Math.max(300,variant==="menu"?r.width:0),left=Math.min(Math.max(8,variant==="menu"?r.left:r.right-width),window.innerWidth-width-8);
  setPos({sheet:false,top:Math.min(r.bottom+6,window.innerHeight-60),left,width});
 };
 useLayoutEffect(()=>{if(open)place();else setPending(null)},[open]);
 useEffect(()=>{if(!open)return;
  const outside=e=>{if(!button.current?.contains(e.target)&&!list.current?.contains(e.target))setOpen(false)};
  const key=e=>{if(e.key==="Escape"){setOpen(false);button.current?.focus()}};
  const move=()=>place();
  document.addEventListener("pointerdown",outside);document.addEventListener("keydown",key);window.addEventListener("resize",move);window.addEventListener("scroll",move,true);
  return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",key);window.removeEventListener("resize",move);window.removeEventListener("scroll",move,true)};
 },[open]);
 useEffect(()=>{if(open&&pos)list.current?.querySelector(pending?".outlet-switch-confirm button.primary,.outlet-switch-confirm button":"button.is-active,button")?.focus()},[open,pos,pending]);

 const code=info.code||"",name=info.name||"";
 const label=variant==="menu"
  ?<><span className="ar-outlet-code">{code}</span><span><b>{name||"Outlet"}</b>{canSwitch&&<small>Switch outlet ▾</small>}</span></>
  :<><i/> Outlet: {code}{canSwitch&&<span className="outlet-switch-caret" aria-hidden="true">▾</span>}</>;
 const cls=variant==="menu"?"ar-menu-outlet":"header-status-pill";
 if(!canSwitch)return variant==="menu"?<div className={cls} aria-label="Current outlet">{label}</div>:<span className={cls} title={name||undefined}>{label}</span>;

 const isActive=o=>String(o.id)===String(current)||String(o.outlet_code||"").toLowerCase()===String(current).toLowerCase();
 const choose=o=>{if(isActive(o)){setOpen(false);return}setPending(o)};
 const confirm=async()=>{if(!pending||busy)return;setBusy(true);try{await onSelect?.(pending)}finally{setBusy(false)}};
 const items=outlets.map(o=>{const active=isActive(o);return <button type="button" role="option" aria-selected={active} key={o.id} className={active?"is-active":""} onClick={()=>choose(o)}><b>{o.outlet_code}</b><span>{o.outlet_name}</span>{active&&<em aria-hidden="true">✓</em>}</button>});
 const body=!pending?items:blocked
  ?<div className="outlet-switch-confirm" role="alert"><p><b>Current sale is still open.</b> Complete, save or void the current sale before switching outlet.</p><div><button type="button" className="primary" onClick={()=>setOpen(false)}>OK</button></div></div>
  :<div className="outlet-switch-confirm"><p>Switch to <b>{pending.outlet_code}</b>{pending.outlet_name?` — ${pending.outlet_name}`:""}?</p><small>The app will reload with this outlet's data.</small><div><button type="button" disabled={busy} onClick={()=>setPending(null)}>Back</button><button type="button" className="primary" disabled={busy} onClick={confirm}>{busy?"Switching…":"Switch"}</button></div></div>;
 // Inside the POS the shell can be full screen at the highest z-index, so the list must be
 // rendered inside that shell; elsewhere it goes on <body>.
 const host=typeof document!=="undefined"?(button.current?.closest(".ar-pos-shell")||document.fullscreenElement||document.body):null;
 const popup=open&&pos&&host&&createPortal(pos.sheet
  ?<div className="outlet-switch-sheet-backdrop" onClick={e=>{if(e.target===e.currentTarget)setOpen(false)}}><div className="outlet-switch-sheet" ref={list} role="dialog" aria-modal="true" aria-label="Switch outlet"><div className="outlet-switch-sheet-head"><b>Switch outlet</b><button type="button" aria-label="Close" onClick={()=>setOpen(false)}>×</button></div><div className="outlet-switch-list is-sheet" role={pending?undefined:"listbox"} aria-label="Outlets">{body}</div></div></div>
  :<div className={"outlet-switch-list is-floating"+(variant==="menu"?" is-dark":"")} ref={list} role={pending?"dialog":"listbox"} aria-label="Switch outlet" style={{top:pos.top,left:pos.left,width:pos.width}}>{body}</div>,host);

 return <div className={"outlet-switch "+(variant==="menu"?"outlet-switch-pos":"outlet-switch-header")}>
  <button ref={button} type="button" className={cls+" outlet-switch-button"} aria-haspopup="listbox" aria-expanded={open} title={name?`${name} — switch outlet`:"Switch outlet"} onClick={()=>setOpen(v=>!v)}>{label}</button>
  {popup}
 </div>;
}
