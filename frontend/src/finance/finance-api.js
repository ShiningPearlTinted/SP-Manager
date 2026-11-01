export function createFinanceRequest({base,headers}){
 const endpoint=base.replace(/\/app-state\.php(?:\?.*)?$/i,'').replace(/\/$/,'')+'/finance.php';
 return async(action,payload={},write=false)=>{
  const query=new URLSearchParams({action,...Object.fromEntries(Object.entries(payload).map(([k,v])=>[k,String(v)]))});
  const response=await fetch(endpoint+(write?'':'?'+query),{method:write?'POST':'GET',cache:'no-store',headers:headers({'Content-Type':'application/json'}),...(write?{body:JSON.stringify({action,...payload})}:{})});
  if(response.status===401){sessionStorage.removeItem('sp_api_token');sessionStorage.removeItem('sp_auth');sessionStorage.removeItem('sp_auth_version');window.dispatchEvent(new Event('sp-api-session-expired'));}
  const result=await response.json().catch(()=>null);
  if(!response.ok||result?.ok!==true){const error=new Error(result?.error||'Finance request failed.');error.status=response.status;throw error;}
  return result;
 };
}
