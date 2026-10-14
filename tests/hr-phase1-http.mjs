import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.HR_TEST_BASE||'http://127.0.0.1:8173';
const address=new URL(base);
assert(['127.0.0.1','localhost'].includes(address.hostname),'Refusing remote API');
const fixtures=JSON.parse(fs.readFileSync(process.env.HR_TEST_FIXTURE_PATH,'utf8'));
let passed=0;
function check(condition,label){assert(condition,label);console.log('PASS: '+label);passed++;}
async function call(action,{actor='admin',outlet=fixtures.outlet_a,body,method=body?'POST':'GET',extra={},file='hr.php'}={}) {
  const query=new URLSearchParams({action,outlet_id:String(outlet),...extra});
  const response=await fetch(`${base}/${file}?${query}`,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:'Bearer '+fixtures.tokens[actor]}:{})},...(body?{body:JSON.stringify({outlet_id:outlet,...body})}:{})});
  return {status:response.status,data:await response.json()};
}
check((await call('list-employees',{actor:null})).status===401,'unsigned HR request rejected');
check((await call('list-employees',{actor:'denied'})).status===403,'HR access permission required');
check((await call('list-employees',{actor:'viewer',outlet:fixtures.outlet_b})).status===403,'guard rejects unassigned outlet');
const options=await call('options',{actor:'manager'});
check(options.status===200&&options.data.outlets.length===1,'options expose assigned outlets only');
check((await call('salary-history',{actor:'viewer',extra:{employee_id:fixtures.employee}})).status===403,'salary permission enforced on HTTP');
check((await call('salary-history',{actor:'payroll',extra:{employee_id:fixtures.employee}})).data.history.length===3,'authorized payroll user reads historical salaries');
check((await call('employee',{actor:'viewer',extra:{employee_id:fixtures.employee}})).data.employee.identity_number===null,'HTTP reader cannot read IC');
check((await call('employee',{extra:{employee_id:fixtures.employee}})).data.employee.identity_number==='TEST-IC-001','HTTP authorized identity access');
check((await call('employee',{actor:'viewer',extra:{employee_id:fixtures.transfer_employee}})).status===404,'IDOR employee lookup rejected');
check((await call('salary-history',{actor:'payroll',extra:{employee_id:fixtures.transfer_employee}})).status===404,'salary IDOR rejected');
check((await call('outlet-history',{actor:'viewer',extra:{employee_id:fixtures.transfer_employee}})).status===404,'outlet history IDOR rejected');
check((await call('masters',{actor:'hq_denied'})).data.can_manage_settings===false,'global settings hidden without HQ role');
check((await call('save-master',{actor:'hq_denied',body:{kind:'departments',code:'HTTP_HQ_BAD',name:'Should not save',request_id:crypto.randomUUID()}})).status===403,'HTTP global settings write requires HQ');
check((await call('save-employee',{actor:'viewer',body:{request_id:crypto.randomUUID()}})).status===403,'read-only user cannot write employee');
check((await call('unknown-action')).status===400,'unknown HR action rejected');
check((await call('save-employee')).status===405,'GET cannot mutate HR');
check((await call('list-employees',{body:{request_id:crypto.randomUUID()}})).status===405,'POST cannot use read action');
check((await call('list-employees',{extra:{q:"%' OR 1=1 --"}})).data.total===0,'search handles SQL and wildcard input literally');
check((await call('save-employee',{body:{outlet_id:fixtures.outlet_b,request_id:crypto.randomUUID()}})).status===400,'conflicting body and query outlets rejected');
const body={staff_code:'HTTP_TEST_001',full_name:'HTTP Test Employee',join_date:'2025-01-01',employment_type_id:fixtures.type,employment_status_id:fixtures.status,request_id:crypto.randomUUID()};
const saved=await call('save-employee',{actor:'manager',body});
check(saved.status===200&&saved.data.id>0,'HTTP manager creates employee without sensitive permission');
check((await call('save-employee',{actor:'manager',body})).data.id===saved.data.id,'HTTP idempotent retry returns same employee');
check((await call('save-employee',{actor:'manager',body:{...body,full_name:'Changed payload'}})).status!==200,'HTTP idempotency payload change rejected');
check((await call('save-employee',{actor:'manager',body:{...body,request_id:crypto.randomUUID()}})).status===409,'HTTP duplicate staff code rejected');
const row=(await call('employee',{actor:'manager',extra:{employee_id:saved.data.id}})).data.employee;
check((await call('transfer',{actor:'manager',body:{employee_id:saved.data.id,revision:row.revision,new_outlet_id:fixtures.outlet_b,effective_from:'2099-01-01',reason:'Not authorized',request_id:crypto.randomUUID()}})).status===403,'HTTP transfer destination ACL enforced');
for(const [file,action,actor] of [['users.php','list','admin'],['settings.php','all','viewer'],['products.php','list','viewer'],['customers.php','list','viewer'],['payment-types.php','list','admin'],['outlets.php','list','admin']]) {
 const response=await call(action,{file,actor});check(response.status===200&&response.data.ok===true,'existing '+file+' '+action+' responds after HR integration');
}
console.log(`RESULT: ${passed} HTTP checks passed.`);
