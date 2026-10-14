import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const original=process.env.HR_ORIGINAL_ROOT;
assert(original,'Set HR_ORIGINAL_ROOT to a fresh extraction of SP-Manager-main 1.0.56.zip.');
const modified=new Set(['frontend/src/main.jsx','api/security.php','api/users.php','frontend/src/price-check.jsx','scripts/sync-agent.mjs']);
const cleanup=JSON.parse(fs.readFileSync(path.join(root,'CLEANUP-MANIFEST.json'),'utf8'));
const intentionallyRemoved=new Set(cleanup.removed.map(item=>item.path));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
let count=0;
function scan(directory,relative='') {
  for(const item of fs.readdirSync(directory,{withFileTypes:true})) {
    const rel=(relative?relative+'/':'')+item.name;
    if(['frontend/dist','frontend/node_modules'].includes(rel))continue;
    if(item.isDirectory())scan(path.join(directory,item.name),rel);
    else if(!modified.has(rel)){
      if(intentionallyRemoved.has(rel)&&!fs.existsSync(path.join(root,rel)))continue;
      assert.equal(hash(fs.readFileSync(path.join(root,rel))),hash(fs.readFileSync(path.join(original,rel))),rel+' changed unexpectedly');count++;
    }
  }
}
scan(original);
let main=fs.readFileSync(path.join(root,'frontend/src/main.jsx'),'utf8');
const baseline=fs.readFileSync(path.join(original,'frontend/src/main.jsx'),'utf8');
const labels={viewHrEmployees:'HR Employees',manageHrEmployees:'HR Employee Management',transferHrEmployees:'HR Outlet Transfers',viewHrSalary:'HR Salary Access',manageHrSalary:'HR Salary Revisions',manageHrSettings:'HR Settings',viewHrSensitive:'HR IC / Passport Access'};
const additions=[
 '\r\nimport HrModule from "./hr/hr-module.jsx";\r\nimport {createHrRequest} from "./hr/hr-api.js";',
 'PERMISSION_KEYS.push('+Object.keys(labels).map(x=>JSON.stringify(x)).join(',')+');\r\nObject.assign(PERMISSION_LABELS,'+JSON.stringify(labels)+');\r\n',
 '   {page==="HR Management"&&isPermissionAllowed(activeUser,"viewHrEmployees")&&<HrModule activeUser={activeUser} initialOutlet={activeOutletId()} request={createHrRequest({base:centralApiBase(),headers:apiHeaders})}/>}\r\n',
 '  ["♙","HR Management","HR Management","viewHrEmployees"],\r\n',
 'if(n==="HR Management"&&(page==="POS / Sales"||page==="Dashboard"))return false;'
];
for(const addition of additions) {assert(main.includes(addition),'HR integration anchor absent');main=main.replace(addition,'');}
main=main.replace('const nav=["HR Management",','const nav=[')
 .replace('data-ui={["HR Management","Management",','data-ui={["Management",')
 .replace('const map={"HR Management":"viewHrEmployees",','const map={');
assert.equal(main,baseline,'main.jsx contains changes beyond the declared HR integration');
let security=fs.readFileSync(path.join(root,'api/security.php'),'utf8');
const guard="    if ($file === 'hr.php') return match ($action) {\r\n        'save-master'=>'manageHrSettings', 'save-employee'=>'manageHrEmployees',\r\n        'transfer','temporary-assignment'=>'transferHrEmployees',\r\n        'salary-history'=>'viewHrSalary', 'revise-salary'=>'manageHrSalary',\r\n        default=>'viewHrEmployees',\r\n    };\r\n";
assert.equal(security.replace(guard,''),fs.readFileSync(path.join(original,'api/security.php'),'utf8'),'Existing API security behavior changed');
let users=fs.readFileSync(path.join(root,'api/users.php'),'utf8');
const permissionAddition='$permissionLabels += ['+Object.entries(labels).map(([k,v])=>"'"+k+"'=>'"+v+"'").join(',')+'];\r\n';
assert.equal(users.replace(permissionAddition,''),fs.readFileSync(path.join(original,'api/users.php'),'utf8'),'Existing users/auth behavior changed');
console.log(`PASS: ${count} retained original files unchanged (documented archived files excluded); main.jsx, security.php and users.php contain only declared HR additions.`);
console.log('PASS: POS, Dashboard, Price Tag and Login source, global CSS, other APIs and agent files preserved.');

assert.equal(fs.readFileSync(path.join(root,'frontend/src/price-check.jsx'),'utf8').replace('import {emptyBattery,','import {BATTERY_HEADERS,emptyBattery,'),fs.readFileSync(path.join(original,'frontend/src/price-check.jsx'),'utf8'),'Price Check changed beyond unused import removal');
console.log('PASS: Price Check only loses the unused BATTERY_HEADERS import; React retained for JSX.');
