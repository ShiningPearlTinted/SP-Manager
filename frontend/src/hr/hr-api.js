export function createHrRequest({base,headers}) {
  return async function request(action,payload={},write=false) {
    const endpoint=base.replace(/\/app-state\.php(?:\?.*)?$/i,'')+'/hr.php';
    const query=new URLSearchParams({action,outlet_id:String(payload.outlet_id)});
    if(!write) for(const [key,value] of Object.entries(payload)) if(value!==''&&value!==null&&value!==undefined) query.set(key,String(value));
    const response=await fetch(endpoint+'?'+query,{
      method:write?'POST':'GET',cache:'no-store',headers:headers({'Content-Type':'application/json'}),
      ...(write?{body:JSON.stringify(payload)}:{})
    });
    if(response.status===401) {
      sessionStorage.removeItem('sp_api_token'); sessionStorage.removeItem('sp_auth'); sessionStorage.removeItem('sp_auth_version');
      window.dispatchEvent(new Event('sp-api-session-expired'));
    }
    if(action==='payslip-pdf'||action==='operation-download') {
      if(!response.ok) {
        let data=null;try{data=await response.json();}catch{}
        throw new Error(data?.error||'Could not download the file (HTTP '+response.status+').');
      }
      const blob=await response.blob();
      const disposition=response.headers.get('content-disposition')||'';
      const match=disposition.match(/filename="?([^";]+)"?/i);
      return {blob,filename:match?.[1]||(action==='payslip-pdf'?'Payslip.pdf':'HR-document')};
    }
    let data;
    try {data=await response.json();} catch {throw new Error('Invalid HR API response (HTTP '+response.status+').');}
    if(!response.ok||data?.ok!==true) throw new Error(data?.error||'HR request failed (HTTP '+response.status+').');
    return data;
  };
}
