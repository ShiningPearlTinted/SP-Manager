// Email navigation does not grant access; normal sign-in and outlet permissions apply.
export function bookingEmailTarget(hash=window.location.hash){
 const [route,query='']=String(hash).replace(/^#/, '').split('?');
 if(route!=='booking')return null;
 const p=new URLSearchParams(query),date=p.get('date')||'',reference=p.get('reference')||'',outlet=p.get('outlet')||'';
 return {date:/^\d{4}-\d{2}-\d{2}$/.test(date)?date:'',reference:/^[A-Za-z0-9-]{8,32}$/.test(reference)?reference:'',outlet:/^[1-9]\d*$/.test(outlet)?outlet:''};
}
