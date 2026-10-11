// Opens the Windows display once per signed-in session, after SQL settings load.
export function createDisplayAutoOpen({fetcher=fetch,getToken,onError=()=>{},schedule=setTimeout,cancel=clearTimeout}) {
 let generation=0,timer=null,abort=null,key='',done=false;
 const stop=()=>{generation++;if(timer!==null)cancel(timer);timer=null;abort?.abort();abort=null;key='';done=false};
 const start=({session,settings,ready,payload})=>{
  const cd=settings?.customerDisplay||{};
  if(!session||!ready||cd.secondaryMonitor!==true||cd.autoOpenOnLogin!==true){stop();return}
  const base=String(settings?.hardware?.agentUrl||'http://127.0.0.1:18765').replace(/\/$/,'');
  const nextKey=session+'|'+base;
  if(key===nextKey)return;
  stop();key=nextKey;const run=generation;
  const fail=message=>{if(run===generation){done=true;onError('Auto Customer Display: '+message)}};
  const request=async(path,body,timeout)=>{
   const token=getToken();if(!token)throw Object.assign(new Error('Set the pairing token in Settings > Hardware on this computer.'),{definitive:true});
   const controller=new AbortController();abort=controller;const deadline=schedule(()=>controller.abort(),timeout);
   try{
    const response=await fetcher(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:body?JSON.stringify(body):undefined,signal:controller.signal});
    const data=await response.json().catch(()=>null);
    if(!response.ok||data?.ok===false)throw Object.assign(new Error(data?.error||'HTTP '+response.status),{definitive:path==='/display-window'||response.status===401||response.status===403});
    if(!data)throw new Error('Invalid Local Agent response.');return data;
   }finally{cancel(deadline);if(abort===controller)abort=null}
  };
  const attempt=async(count)=>{
   if(run!==generation||done)return;
   try{
    const status=await request('/status',null,3000);if(run!==generation)return;
    if(!status.connected||!status.agentDetected)throw new Error('Local Agent is not ready.');
    const version=String(status.version||'').split('.').map(Number);
    if(version.length<3||!version.every(Number.isFinite)||version[0]<1||(version[0]===1&&(version[1]<2||(version[1]===2&&version[2]<2))))throw Object.assign(new Error('Update Local Agent to 1.2.2 or newer.'),{definitive:true});
    const opened=await request('/display-window',payload,25000);if(run!==generation)return;
    if(opened.details?.windowFound===false)throw Object.assign(new Error('The secondary display window could not be placed. Check Windows Extend displays.'),{definitive:true});
    done=true;
   }catch(error){
    if(run!==generation)return;
    if(error.definitive||count>=5){fail(error.message);return}
    timer=schedule(()=>{timer=null;attempt(count+1)},Math.min(1000*(count+1),5000));
   }
  };
  attempt(0);
 };
 return {start,stop};
}
