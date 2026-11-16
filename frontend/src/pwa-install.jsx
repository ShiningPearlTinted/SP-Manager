import React,{useEffect,useState} from "react";

// "Install app": SP-Manager can be installed like a phone/desktop app (PWA) and then opens in its own
// window without the browser address bar or tabs.
// The button is shown only while the browser offers installation (Chrome/Edge on Android, Windows, macOS).
// It is hidden when the app is already installed: the browser stops offering installation, the
// "appinstalled" event fires, and inside the installed app (standalone window) it never appears.
let deferredPrompt=null;
const listeners=new Set();
const notify=()=>listeners.forEach(fn=>fn());
if(typeof window!=="undefined"){
 window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;notify();});
 window.addEventListener("appinstalled",()=>{deferredPrompt=null;notify();});
}
export const isStandalone=()=>typeof window!=="undefined"&&(window.matchMedia?.("(display-mode: standalone)").matches||window.matchMedia?.("(display-mode: minimal-ui)").matches||window.navigator.standalone===true);

export default function InstallAppButton({className="",variant="login"}){
 const [, setTick]=useState(0);
 useEffect(()=>{const fn=()=>setTick(t=>t+1);listeners.add(fn);return()=>listeners.delete(fn);},[]);
 if(isStandalone()||!deferredPrompt)return null;
 const install=async()=>{
  const prompt=deferredPrompt;if(!prompt)return;
  // A prompt can be shown only once; the browser sends a new one later if the user cancelled.
  deferredPrompt=null;notify();
  try{await prompt.prompt();await prompt.userChoice;}catch{}
 };
 return <div className={"pwa-install pwa-install-"+variant+" "+className}>
  <button type="button" className="pwa-install-button" onClick={install}>
   <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14"/></svg>
   <span>Install app</span>
  </button>
 </div>;
}
