import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import './notification-center.css';

function decodeKey(value){
 const input=String(value||'').replace(/-/g,'+').replace(/_/g,'/');
 const padded=input+'='.repeat((4-input.length%4)%4);
 const raw=atob(padded);return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
function toastClaim(key,id){
 const storageKey='sp_notification_toast_'+key;
 try{
  const prior=JSON.parse(localStorage.getItem(storageKey)||'null');
  if(Number(prior?.id)>=Number(id))return false;
  localStorage.setItem(storageKey,JSON.stringify({id:Number(id),at:Date.now()}));
  return true;
 }catch{return true}
}
function sound(){
 try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const context=new C();const oscillator=context.createOscillator();const gain=context.createGain();oscillator.frequency.value=740;gain.gain.value=.045;oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.12);oscillator.onended=()=>context.close()}catch{}
}
export default function NotificationCenter({base,headers,user,outletId,online}){
 const endpoint=useMemo(()=>base.replace(/\/app-state\.php(?:\?.*)?$/i,'').replace(/\/$/,'')+'/notifications.php',[base]);
 const cacheKey='sp_notifications_'+(user?.id||user?.username||'user')+'_'+outletId;
 const [items,setItems]=useState(()=>{try{return JSON.parse(localStorage.getItem(cacheKey)||'[]')}catch{return[]}});
 const [unread,setUnread]=useState(()=>items.filter(item=>!item.read_at).length);
 const [open,setOpen]=useState(false),[permission,setPermission]=useState(()=>('Notification'in window)?Notification.permission:'unsupported');
 const [available,setAvailable]=useState(false),[subscribed,setSubscribed]=useState(false),[busy,setBusy]=useState(false);
 const [soundOn,setSoundOn]=useState(()=>{try{return localStorage.getItem('sp_notification_sound')==='1'}catch{return false}});
 const [toast,setToast]=useState(null),seen=useRef(new Set(items.map(item=>String(item.id)))),buttonRef=useRef(null),panelRef=useRef(null);
 const request=useCallback(async(action,payload={},method='GET')=>{
  const query=new URLSearchParams({action,outlet_id:String(outletId)});
  const response=await fetch(endpoint+(method==='GET'?'?'+query:''),{method,cache:'no-store',headers:headers({'Content-Type':'application/json'}),...(method==='POST'?{body:JSON.stringify({action,outlet_id:outletId,...payload})}:{})});
  if(response.status===401){sessionStorage.removeItem('sp_api_token');sessionStorage.removeItem('sp_auth');sessionStorage.removeItem('sp_auth_version');window.dispatchEvent(new Event('sp-api-session-expired'));}
  const result=await response.json().catch(()=>({}));
  if(!response.ok||result?.ok!==true)throw new Error(result?.error||('Notification request failed ('+response.status+').'));
  return result;
 },[endpoint,headers,outletId]);
 const refresh=useCallback(async(initial=false)=>{
  if(!online)return;
  try{
   const result=await request('list');
   const next=Array.isArray(result.notifications)?result.notifications:[];
   if(!initial){
    for(const item of next){
     const id=String(item.id);
     if(seen.current.has(id)||item.read_at)continue;
     seen.current.add(id);
     if(permission!=='granted'&&toastClaim((user?.id||user?.username)+'_'+outletId,id)){
      setToast(item);if(soundOn)sound();window.setTimeout(()=>setToast(current=>current?.id===item.id?null:current),6500);
     }
    }
   }else for(const item of next)seen.current.add(String(item.id));
   setItems(next);setUnread(Number(result.unread)||0);
   try{localStorage.setItem(cacheKey,JSON.stringify(next))}catch{}
  }catch(e){if(e?.status!==401)console.warn('Notification refresh failed:',e?.message||e)}
 },[online,request,permission,soundOn,user?.id,user?.username,outletId,cacheKey]);
 useEffect(()=>{if(!online)return;let active=true;request('config').then(result=>{if(active)setAvailable(!!result.enabled)}).catch(()=>{if(active)setAvailable(false)});return()=>{active=false}},[online,request]);
 useEffect(()=>{if(!online||!available||!('serviceWorker'in navigator)||!('PushManager'in window))return;let active=true;navigator.serviceWorker.ready.then(async registration=>{const sub=await registration.pushManager.getSubscription();if(!active)return;setSubscribed(!!sub);if(sub)await request('subscribe',{subscription:sub.toJSON(),device_label:navigator.userAgent.slice(0,180)},'POST')}).catch(()=>{});return()=>{active=false}},[online,available,request]);
 useEffect(()=>{if(!('serviceWorker'in navigator))return;const onMessage=async event=>{if(event.data?.type!=='SP_PUSH_SUBSCRIPTION_CHANGE')return;try{const registration=await navigator.serviceWorker.ready;const sub=await registration.pushManager.getSubscription();setSubscribed(!!sub);if(sub&&online)await request('subscribe',{subscription:sub.toJSON(),device_label:navigator.userAgent.slice(0,180)},'POST')}catch{setSubscribed(false)}};navigator.serviceWorker.addEventListener('message',onMessage);return()=>navigator.serviceWorker.removeEventListener('message',onMessage)},[online,request]);
 useEffect(()=>{refresh(true)},[cacheKey,online]);
 useEffect(()=>{if(!online)return;let active=true;const poll=()=>{if(active&&document.visibilityState==='visible')refresh(false)};const timer=window.setInterval(poll,20000);window.addEventListener('online',poll);return()=>{active=false;window.clearInterval(timer);window.removeEventListener('online',poll)}},[online,refresh]);
 useEffect(()=>{const close=e=>{if(panelRef.current&&!panelRef.current.contains(e.target)&&!buttonRef.current?.contains(e.target))setOpen(false)};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[]);
 const enable=async()=>{
  if(!available||!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))return;
  setBusy(true);
  try{
   const nextPermission=await Notification.requestPermission();setPermission(nextPermission);
   if(nextPermission!=='granted')return;
   const config=await request('config');if(!config.public_key)throw new Error('Push notification settings are incomplete.');
   const registration=await navigator.serviceWorker.ready;
   const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(config.public_key)});
   await request('subscribe',{subscription:subscription.toJSON(),device_label:navigator.userAgent.slice(0,180)},'POST');
   setSubscribed(true);
  }catch(e){console.warn('Push subscription failed:',e?.message||e);setToast({id:'setup',title:'Notifications unavailable',body:e?.message||'Please try again.'});window.setTimeout(()=>setToast(null),6500)}
  finally{setBusy(false)}
 };
 const disable=async()=>{
  setBusy(true);
  try{const registration=await navigator.serviceWorker.ready;const subscription=await registration.pushManager.getSubscription();if(subscription){await request('unsubscribe',{endpoint:subscription.endpoint},'POST');await subscription.unsubscribe()}setSubscribed(false)}catch(e){console.warn('Push unsubscribe failed:',e?.message||e)}finally{setBusy(false)}
 };
 const markRead=async item=>{if(item.read_at)return;try{await request('read',{id:item.id},'POST');const next=items.map(row=>row.id===item.id?{...row,read_at:new Date().toISOString()}:row);setItems(next);setUnread(value=>Math.max(0,value-1));try{localStorage.setItem(cacheKey,JSON.stringify(next))}catch{}}catch{}};
 const markAll=async()=>{try{await request('read-all',{},'POST');const stamp=new Date().toISOString();const next=items.map(item=>({...item,read_at:item.read_at||stamp}));setItems(next);setUnread(0);try{localStorage.setItem(cacheKey,JSON.stringify(next))}catch{}}catch{}};
 const openBooking=item=>{
  const reference=item.data?.reference;if(!reference)return;
  const url=new URL(window.location.href);url.hash='booking?reference='+encodeURIComponent(reference)+'&outlet='+encodeURIComponent(item.data?.outlet_id||outletId);
  window.location.assign(url.href);window.location.reload();
 };
 const statusText=!online?'Offline':!available?'Push not configured':permission==='denied'?'Permission blocked':subscribed?'Push enabled':'Push disabled';
 return <div className="spn-center">
  <button ref={buttonRef} type="button" className="spn-bell" aria-label={'Notifications'+(unread?', '+unread+' unread':'')} aria-expanded={open} onClick={()=>{setOpen(value=>!value);if(!open)refresh(true)}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>{unread>0&&<span className="spn-count">{unread>99?'99+':unread}</span>}</button>
  {open&&<section className="spn-panel" ref={panelRef} aria-label="Notifications">
   <header className="spn-panel-head"><div><b>Notifications</b><small>{statusText}</small></div><button type="button" onClick={()=>setOpen(false)} aria-label="Close notifications">×</button></header>
   <div className="spn-panel-controls"><span>Browser push</span>{subscribed?<button type="button" disabled={busy} onClick={disable}>Disable</button>:<button type="button" disabled={busy||!online||!available||permission==='denied'} onClick={enable}>{busy?'Working…':'Enable'}</button>}<label><input type="checkbox" checked={soundOn} onChange={e=>{setSoundOn(e.target.checked);localStorage.setItem('sp_notification_sound',e.target.checked?'1':'0')}}/> Sound</label></div>
   <div className="spn-list-head"><span>{unread} unread</span>{unread>0&&<button type="button" onClick={markAll}>Mark all read</button>}</div>
   <div className="spn-list">{items.length?items.map(item=><button type="button" className={'spn-item'+(!item.read_at?' is-unread':'')} key={item.id} onClick={async()=>{await markRead(item);setOpen(false);openBooking(item)}}><span className="spn-item-dot"/><span><b>{item.title}</b><small>{item.body}</small><time>{new Date(item.created_at.replace(' ','T')+'+08:00').toLocaleString()}</time></span></button>):<p className="spn-empty">No notifications</p>}</div>
  </section>}
  {toast&&<div className="spn-toast" role="status" aria-live="polite"><button type="button" aria-label="Dismiss notification" onClick={()=>setToast(null)}>×</button><b>{toast.title}</b><span>{toast.body}</span>{toast.data?.reference&&<button type="button" className="spn-toast-link" onClick={async()=>{await markRead(toast);openBooking(toast)}}>View booking</button>}</div>}
 </div>
}
