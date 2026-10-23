export function createBookingRequest({base,headers}) {
  const endpoint=base.replace(/\/app-state\.php(?:\?.*)?$/i,'').replace(/\/$/,'')+'/bookings.php';
  return async (action,payload={},write=false)=>{
    const query=new URLSearchParams({action,outlet_id:String(payload.outlet_id)});
    if(!write)for(const [key,value] of Object.entries(payload))if(value!==''&&value!==null&&value!==undefined)query.set(key,String(value));
    const response=await fetch(endpoint+'?'+query,{method:write?'POST':'GET',cache:'no-store',headers:headers({'Content-Type':'application/json'}),...(write?{body:JSON.stringify(payload)}:{})});
    if(response.status===401){sessionStorage.removeItem('sp_api_token');sessionStorage.removeItem('sp_auth');sessionStorage.removeItem('sp_auth_version');window.dispatchEvent(new Event('sp-api-session-expired'));}
    let result;try{result=await response.json();}catch{throw new Error('Invalid Booking API response (HTTP '+response.status+').');}
    if(!response.ok||result?.ok!==true){const error=new Error(result?.error||'Booking request failed.');error.status=response.status;throw error;}return result;
  };
}
