export function createLabelPrintingRequest({base,headers}){
 const endpoint=base.replace(/\/app-state\.php(?:\?.*)?$/i,'').replace(/\/$/,'')+'/label-printing.php';
 return async(action,payload={},write=false)=>{
  const outlet=payload.outlet_id;
  const query=new URLSearchParams({action,outlet_id:String(outlet)});
  const response=await fetch(endpoint+(write?'':'?'+query),{method:write?'POST':'GET',cache:'no-store',headers:headers({'Content-Type':'application/json'}),...(write?{body:JSON.stringify({action,...payload})}:{})});
  if(response.status===401){sessionStorage.removeItem('sp_api_token');sessionStorage.removeItem('sp_auth');sessionStorage.removeItem('sp_auth_version');window.dispatchEvent(new Event('sp-api-session-expired'));}
  const result=await response.json().catch(()=>null);
  if(!response.ok||result?.ok!==true){const error=new Error(result?.error||'Label Printing request failed.');error.status=response.status;throw error;}
  return result;
 };
}
