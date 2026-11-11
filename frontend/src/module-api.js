// Request helpers for the Booking, Finance, HR and Label Printing modules.
// One shared core: endpoint from the API base, session expiry on 401, and readable errors.
// Each module keeps its own query/body rules exactly as before.

const endpointFor=(base,file,trimSlash=true)=>{let b=String(base).replace(/\/app-state\.php(?:\?.*)?$/i,'');if(trimSlash)b=b.replace(/\/$/,'');return b+'/'+file};

// A 401 means the signed-in session is gone: clear it and let the app show the sign-in screen.
const expireSessionOn401=response=>{if(response.status===401){sessionStorage.removeItem('sp_api_token');sessionStorage.removeItem('sp_auth');sessionStorage.removeItem('sp_auth_version');window.dispatchEvent(new Event('sp-api-session-expired'));}};

const failure=(message,status)=>{const error=new Error(message);error.status=status;return error};

// Adds every payload value that is not empty (GET reads).
const addNonEmpty=(query,payload)=>{for(const [key,value] of Object.entries(payload))if(value!==''&&value!==null&&value!==undefined)query.set(key,String(value));return query};

export function createBookingRequest({base,headers}){
 const endpoint=endpointFor(base,'bookings.php');
 return async(action,payload={},write=false)=>{
  const query=new URLSearchParams({action,outlet_id:String(payload.outlet_id)});
  if(!write)addNonEmpty(query,payload);
  const response=await fetch(endpoint+'?'+query,{method:write?'POST':'GET',cache:'no-store',headers:headers({'Content-Type':'application/json'}),...(write?{body:JSON.stringify(payload)}:{})});
  expireSessionOn401(response);
  let result;try{result=await response.json();}catch{throw new Error('Invalid Booking API response (HTTP '+response.status+').');}
  if(!response.ok||result?.ok!==true)throw failure((result?.error||'Booking request failed.')+(result?.detail?' — '+result.detail:''),response.status);
  return result;
 };
}

export function createFinanceRequest({base,headers}){
 const endpoint=endpointFor(base,'finance.php');
 return async(action,payload={},write=false)=>{
  const query=new URLSearchParams({action,...Object.fromEntries(Object.entries(payload).map(([k,v])=>[k,String(v)]))});
  const response=await fetch(endpoint+(write?'':'?'+query),{method:write?'POST':'GET',cache:'no-store',headers:headers({'Content-Type':'application/json'}),...(write?{body:JSON.stringify({action,...payload})}:{})});
  expireSessionOn401(response);
  const result=await response.json().catch(()=>null);
  if(!response.ok||result?.ok!==true)throw failure(result?.error||'Finance request failed.',response.status);
  return result;
 };
}

export function createHrRequest({base,headers}){
 return async function request(action,payload={},write=false){
  const endpoint=endpointFor(base,'hr.php',false);
  const query=new URLSearchParams({action,outlet_id:String(payload.outlet_id)});
  if(!write)addNonEmpty(query,payload);
  const response=await fetch(endpoint+'?'+query,{method:write?'POST':'GET',cache:'no-store',headers:headers({'Content-Type':'application/json'}),...(write?{body:JSON.stringify(payload)}:{})});
  expireSessionOn401(response);
  // Payslip PDFs and HR documents are files, not JSON.
  if(action==='payslip-pdf'||action==='operation-download'){
   if(!response.ok){let data=null;try{data=await response.json();}catch{}throw new Error(data?.error||'Could not download the file (HTTP '+response.status+').');}
   const blob=await response.blob();
   const match=(response.headers.get('content-disposition')||'').match(/filename="?([^";]+)"?/i);
   return {blob,filename:match?.[1]||(action==='payslip-pdf'?'Payslip.pdf':'HR-document')};
  }
  let data;try{data=await response.json();}catch{throw new Error('Invalid HR API response (HTTP '+response.status+').');}
  if(!response.ok||data?.ok!==true)throw new Error(data?.error||'HR request failed (HTTP '+response.status+').');
  return data;
 };
}

export function createLabelPrintingRequest({base,headers}){
 const endpoint=endpointFor(base,'label-printing.php');
 return async(action,payload={},write=false)=>{
  const query=new URLSearchParams({action,outlet_id:String(payload.outlet_id)});
  const response=await fetch(endpoint+(write?'':'?'+query),{method:write?'POST':'GET',cache:'no-store',headers:headers({'Content-Type':'application/json'}),...(write?{body:JSON.stringify({action,...payload})}:{})});
  expireSessionOn401(response);
  const result=await response.json().catch(()=>null);
  if(!response.ok||result?.ok!==true)throw failure(result?.error||'Label Printing request failed.',response.status);
  return result;
 };
}

// Booking links in emails only open the page; normal sign-in and outlet permissions still apply.
export function bookingEmailTarget(hash=window.location.hash){
 const [route,query='']=String(hash).replace(/^#/,'').split('?');
 if(route!=='booking')return null;
 const p=new URLSearchParams(query),date=p.get('date')||'',reference=p.get('reference')||'',outlet=p.get('outlet')||'';
 return {date:/^\d{4}-\d{2}-\d{2}$/.test(date)?date:'',reference:/^[A-Za-z0-9-]{8,32}$/.test(reference)?reference:'',outlet:/^[1-9]\d*$/.test(outlet)?outlet:''};
}
