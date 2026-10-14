<?php
declare(strict_types=1);
// Run only against an isolated API copy configured for a localhost test database.
// Never include a production config. The directory and DB-name checks are intentional.
$api=getenv('HR_TEST_API_DIR') ?: '';
if (PHP_SAPI!=='cli' || $api==='' || !is_file($api.'/config.php')) throw new RuntimeException('Set HR_TEST_API_DIR to an isolated API copy.');
$config=require $api.'/config.php';
$db=$config['db'] ?? [];
if (!in_array($db['host'] ?? '',['127.0.0.1','localhost'],true) || !str_starts_with((string)($db['name'] ?? ''),'spm_hr_test')) throw new RuntimeException('Refusing non-local or non-test database.');
define('SP_MANAGER_CLI',true);
require $api.'/security.php';
require $api.'/hr-lib.php';
$pdo=spApiDatabase();$pdo->exec("SET time_zone='+08:00'");date_default_timezone_set('Asia/Kuala_Lumpur');
$count=0;
function check(bool $condition,string $message): void {global $count;if(!$condition)throw new RuntimeException('FAIL: '.$message);$count++;echo 'PASS: '.$message."\n";}
function fails(callable $operation,int $status,string $message): void {
    try {$operation();} catch (HrError $e) {check($e->status===$status,$message);return;}
    throw new RuntimeException('FAIL: '.$message.' did not reject');
}
function tx(callable $operation): mixed {
    global $pdo;$pdo->beginTransaction();
    try {$result=$operation();$pdo->commit();return $result;} catch(Throwable $e){$pdo->rollBack();throw $e;}
}
function actor(int $id,int $outlet,string $role,array $permissions): void {
    $_SERVER['SP_AUTH_USER_ID']=(string)$id;$_SERVER['SP_AUTH_OUTLET_ID']=(string)$outlet;
    $GLOBALS['spActor']=['id'=>$id,'role_name'=>$role,'permissions_json'=>json_encode($permissions)];
}
function fingerprint(PDO $pdo): array {
    $result=[];
    foreach($pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $table) {
        if(str_starts_with($table,'hr_'))continue;
        $row=$pdo->query('CHECKSUM TABLE `'.$table.'`')->fetch();$result[$table]=$row['Checksum'];
    }
    return $result;
}
$before=fingerprint($pdo);
$migration=getenv('HR_TEST_MIGRATION') ?: dirname(__DIR__).'/database/migrations/hr-phase1.sql';
$pdo->exec(file_get_contents($migration));
check($before===fingerprint($pdo),'migration preserves every existing table checksum');
check((int)$pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name LIKE 'hr\\_%'")->fetchColumn()===7,'seven foundation tables created');
try{$pdo->exec(file_get_contents($migration));throw new RuntimeException('Migration silently reran.');}catch(PDOException $e){check(true,'migration refuses duplicate schema');}
check(hrDate('2024-02-29','Date')==='2024-02-29','valid leap date');
fails(fn()=>hrDate('2025-02-29','Date'),400,'invalid calendar date rejected');
fails(fn()=>hrId(['1']),400,'array identifier rejected');
fails(fn()=>hrMoney('-2','Rate'),400,'negative salary rejected');
fails(fn()=>hrMoney('1.001','Rate'),400,'excess money precision rejected');
check(hrMoney('0001.2','Rate')==='1.20','money preserves decimal scale');
check(hrCrypt(hrCrypt('TEST-IC-001'),true)==='TEST-IC-001','sensitive field encryption roundtrip');
$protected=hrCrypt('TEST-IC-001');$raw=base64_decode(substr($protected,4));$raw[30]=chr(ord($raw[30])^1);
fails(fn()=>hrCrypt('hr1:'.base64_encode($raw),true),503,'tampered ciphertext rejected');
$outlets=$pdo->query('SELECT id FROM outlets WHERE active=1 ORDER BY id')->fetchAll(PDO::FETCH_COLUMN);
if(count($outlets)<2)throw new RuntimeException('Test clone requires two outlets.');
$a=(int)$outlets[0];$b=(int)$outlets[1];
$role=(int)hrQuery($pdo,"SELECT id FROM roles WHERE role_name='Administrator' LIMIT 1")->fetchColumn();
$regular=(int)hrQuery($pdo,"SELECT id FROM roles WHERE role_name<>'Administrator' LIMIT 1")->fetchColumn();
$all=array_fill_keys(['viewHrEmployees','manageHrEmployees','transferHrEmployees','viewHrSalary','manageHrSalary','manageHrSettings','viewHrSensitive'],true);
$userIds=[];
foreach(['admin'=>[$role,$all,[$a,$b]],'manager'=>[$regular,['viewHrEmployees'=>true,'manageHrEmployees'=>true,'transferHrEmployees'=>true],[$a]],'viewer'=>[$regular,['viewHrEmployees'=>true],[$a]],'payroll'=>[$regular,['viewHrEmployees'=>true,'viewHrSalary'=>true],[$a]],'denied'=>[$regular,[],[$a]],'hq_denied'=>[$regular,['viewHrEmployees'=>true,'manageHrSettings'=>true],[$a,$b]]] as $key=>[$rid,$permissions,$ids]) {
    hrQuery($pdo,'INSERT INTO users(outlet_id,name,username,password_hash,role_id,enabled,permissions_json) VALUES(?,?,?,?,?,1,?)',[$a,'HR Test '.ucfirst($key),'__hr_test_'.$key,password_hash('Hr-test-Only-2026!',PASSWORD_DEFAULT),$rid,json_encode($permissions)]);
    $uid=(int)$pdo->lastInsertId();$userIds[$key]=$uid;
    foreach($ids as $oid)hrQuery($pdo,'INSERT INTO user_outlets(user_id,outlet_id,is_default,active) VALUES(?,?,?,1)',[$uid,$oid,$oid===$a?1:0]);
}
actor($userIds['admin'],$a,'Administrator',$all);
$department=tx(fn()=>hrSaveMaster($pdo,['kind'=>'departments','code'=>'TEST_HR','name'=>'HR Test','active'=>true]))['id'];
$position=tx(fn()=>hrSaveMaster($pdo,['kind'=>'positions','code'=>'TEST_STAFF','name'=>'Test Staff','department_id'=>$department]))['id'];
$type=tx(fn()=>hrSaveMaster($pdo,['kind'=>'employment_types','code'=>'TEST_FULL','name'=>'Full Time']))['id'];
$status=tx(fn()=>hrSaveMaster($pdo,['kind'=>'employment_statuses','code'=>'TEST_ACTIVE','name'=>'Active','is_active_employment'=>true]))['id'];
$inactive=tx(fn()=>hrSaveMaster($pdo,['kind'=>'employment_statuses','code'=>'TEST_INACTIVE','name'=>'Inactive','is_active_employment'=>false]))['id'];
check(count(hrMasters($pdo)['departments'])===1,'configurable HR masters');
$base=['staff_code'=>'HR_TEST_001','full_name'=>'HR Test Employee','department_id'=>$department,'position_id'=>$position,'employment_type_id'=>$type,'employment_status_id'=>$status,'join_date'=>'2025-01-01','identity_number'=>'TEST-IC-001'];
$employee=tx(fn()=>hrSaveEmployee($pdo,$base,$a))['id'];
$row=hrEmployee($pdo,$employee,$a);
check($row['primary_outlet_id']==$a && !empty($row['employee_uid']),'employee created with unique immutable identity and primary outlet');
check($row['identity_ciphertext']!=='TEST-IC-001','identity stored encrypted');
check(hrPublicEmployee($row)['identity_number']===null && !isset(hrPublicEmployee($row)['identity_ciphertext']),'default employee response excludes protected identity');
check(hrPublicEmployee($row,true)['identity_number']==='TEST-IC-001','authorized sensitive projection decrypts identity');
try{tx(fn()=>hrSaveEmployee($pdo,$base,$a));throw new RuntimeException('Duplicate staff accepted');}catch(PDOException $e){check($e->getCode()==='23000','unique global staff code enforced');}
fails(fn()=>hrEmployee($pdo,$employee,$b),404,'employee inaccessible through another outlet');
fails(fn()=>tx(fn()=>hrSaveEmployee($pdo,[...$base,'id'=>$employee,'revision'=>999],$a)),409,'stale employee revision rejected');
$uid=$row['employee_uid'];
tx(fn()=>hrSaveEmployee($pdo,[...$base,'id'=>$employee,'revision'=>$row['revision'],'full_name'=>'HR Test Employee Updated','employee_uid'=>'attempted-replacement'],$a));
$row=hrEmployee($pdo,$employee,$a);
check($row['employee_uid']===$uid,'employee UID cannot be overwritten');
fails(fn()=>tx(fn()=>hrSaveEmployee($pdo,[...$base,'id'=>$employee,'revision'=>$row['revision'],'reporting_manager_id'=>$employee],$a)),400,'reporting manager cycle rejected');
actor($userIds['manager'],$a,'Manager',['viewHrEmployees'=>true,'manageHrEmployees'=>true,'transferHrEmployees'=>true]);
fails(fn()=>hrOutletAllowed($pdo,$b),403,'destination outlet requires assigned access');
fails(fn()=>hrRequire('viewHrSalary'),403,'employee management does not grant salary visibility');
fails(fn()=>tx(fn()=>hrSaveEmployee($pdo,[...$base,'id'=>$employee,'revision'=>$row['revision']],$a)),403,'employee management does not grant IC edit');
$safe=$base;unset($safe['identity_number']);
tx(fn()=>hrSaveEmployee($pdo,[...$safe,'id'=>$employee,'revision'=>$row['revision']],$a));
check(hrEmployee($pdo,$employee,$a)['identity_ciphertext']===$row['identity_ciphertext'],'ordinary edit preserves encrypted identity');
actor($userIds['hq_denied'],$a,'Manager',['manageHrSettings'=>true]);
fails(fn()=>tx(fn()=>hrSaveMaster($pdo,['kind'=>'departments','code'=>'NO','name'=>'No'])) ,403,'global master write requires explicit HQ access');
actor($userIds['admin'],$a,'Administrator',$all);$row=hrEmployee($pdo,$employee,$a);
$salary=['employee_id'=>$employee,'revision'=>$row['revision'],'effective_from'=>'2025-01-01','salary_type'=>'monthly','basic_rate'=>'2500.00','fixed_allowance'=>'100.00','bank_name'=>'Test Bank','bank_account'=>'TEST-BANK-001','reason'=>'Initial salary'];
tx(fn()=>hrSalary($pdo,$salary,$a,'salary-test-key-01'));
$salaryRow=hrQuery($pdo,'SELECT * FROM hr_salary_history WHERE employee_id=?',[$employee])->fetch();
check($salaryRow['basic_rate']==='2500.00' && hrCrypt($salaryRow['bank_account_ciphertext'],true)==='TEST-BANK-001','monthly salary and encrypted bank saved');
$row=hrEmployee($pdo,$employee,$a);
$daily=[...$salary,'revision'=>$row['revision'],'effective_from'=>'2025-02-01','salary_type'=>'daily','basic_rate'=>'120.00','reason'=>'Daily wage revision'];unset($daily['bank_account'],$daily['bank_name']);
tx(fn()=>hrSalary($pdo,$daily,$a,'salary-test-key-02'));
$carry=hrQuery($pdo,"SELECT bank_name,bank_account_ciphertext FROM hr_salary_history WHERE employee_id=? AND effective_from='2025-02-01'",[$employee])->fetch();
check($carry['bank_name']==='Test Bank' && hrCrypt($carry['bank_account_ciphertext'],true)==='TEST-BANK-001','omitted bank data carries forward without clearing protected fields');
$row=hrEmployee($pdo,$employee,$a);
tx(fn()=>hrSalary($pdo,[...$salary,'revision'=>$row['revision'],'effective_from'=>'2025-03-01','salary_type'=>'hourly','basic_rate'=>'15.00','reason'=>'Hourly wage revision'],$a,'salary-test-key-03'));
check((int)hrQuery($pdo,'SELECT COUNT(*) FROM hr_salary_history WHERE employee_id=?',[$employee])->fetchColumn()===3,'daily hourly monthly revisions retain salary history');
check(hrQuery($pdo,'SELECT basic_rate FROM hr_salary_history WHERE id=?',[$salaryRow['id']])->fetchColumn()==='2500.00','old salary remains unchanged');
$row=hrEmployee($pdo,$employee,$a);
fails(fn()=>tx(fn()=>hrSaveEmployee($pdo,[...$base,'id'=>$employee,'revision'=>$row['revision'],'join_date'=>'2025-02-01'],$a)),400,'join date cannot invalidate salary history');
fails(fn()=>tx(fn()=>hrSaveEmployee($pdo,[...$base,'id'=>$employee,'revision'=>['1']],$a)),400,'malformed revision rejected');
fails(fn()=>tx(fn()=>hrSalary($pdo,[...$salary,'revision'=>$row['revision']],$a,'salary-test-key-04')),409,'backdated salary revision rejected');
$assignment=['employee_id'=>$employee,'revision'=>$row['revision'],'new_outlet_id'=>$b,'effective_from'=>date('Y-m-d'),'effective_to'=>date('Y-m-d',strtotime('+1 day')),'reason'=>'Cover test outlet'];
tx(fn()=>hrAssignment($pdo,$assignment,$a,'temporary','assignment-test-key-01'));
check((int)hrEmployee($pdo,$employee,$a)['current_outlet_id']===$a,'temporary assignment does not change primary outlet');
$row=hrEmployee($pdo,$employee,$a);
fails(fn()=>tx(fn()=>hrAssignment($pdo,[...$assignment,'revision'=>$row['revision']],$a,'temporary','assignment-test-key-02')),409,'overlapping temporary assignment rejected');
tx(fn()=>hrAssignment($pdo,[...$assignment,'revision'=>$row['revision'],'effective_from'=>'2099-01-01'],$a,'transfer','assignment-test-key-03'));
check((int)hrEmployee($pdo,$employee,$a)['current_outlet_id']===$a,'future transfer does not take effect early');
$future=hrQuery($pdo,'SELECT '.hrOutletExpression("'2100-01-01'").' FROM hr_employees e WHERE e.id=?',[$employee])->fetchColumn();
check((int)$future===$b,'transfer outlet resolves after effective date');
$immediateBase=[...$base,'staff_code'=>'HR_TEST_002','full_name'=>'HR Test Transfer'];
$immediate=tx(fn()=>hrSaveEmployee($pdo,$immediateBase,$a))['id'];$row=hrEmployee($pdo,$immediate,$a);
tx(fn()=>hrAssignment($pdo,[...$assignment,'employee_id'=>$immediate,'revision'=>$row['revision']],$a,'transfer','assignment-test-key-04'));
check((int)hrEmployee($pdo,$immediate,$b)['current_outlet_id']===$b,'immediate transfer changes current outlet with stable employee id');
fails(fn()=>hrEmployee($pdo,$immediate,$a),404,'transferred employee removed from old outlet access');
$row=hrEmployee($pdo,$employee,$a);
tx(fn()=>hrSaveEmployee($pdo,[...$base,'id'=>$employee,'revision'=>$row['revision'],'employment_status_id'=>$inactive],$a));
check(hrEmployee($pdo,$employee,$a)['employment_status_id']==$inactive && (int)hrQuery($pdo,'SELECT COUNT(*) FROM hr_salary_history WHERE employee_id=?',[$employee])->fetchColumn()===3,'inactive status preserves salary history');
$payload=['request_id'=>'hr-stable-retry-01','outlet_id'=>$a,'test'=>'value'];
$key=spRequestKey($payload,'hr-test');
tx(function()use($pdo,$key,$payload){check(spRequestReplay($pdo,$key,$payload)===null,'first request not replayed');spRequestComplete($pdo,$key,['ok'=>true,'id'=>42]);});
tx(function()use($pdo,$key,$payload){check(spRequestReplay($pdo,$key,$payload)['id']===42,'same request replays saved response');});
try{tx(fn()=>spRequestReplay($pdo,$key,[...$payload,'test'=>'changed']));throw new RuntimeException('Changed retry accepted');}catch(RuntimeException $e){check(str_contains($e->getMessage(),'different request'),'changed idempotency payload rejected');}
$audit=hrQuery($pdo,"SELECT old_data,new_data FROM audit_logs WHERE action_name LIKE 'HR_%'")->fetchAll();
$serialized=json_encode($audit);
check(!str_contains($serialized,'TEST-IC-001')&&!str_contains($serialized,'TEST-BANK-001')&&!str_contains($serialized,'2500.00'),'audit excludes personal identifiers bank and salary values');
$fixturePath=getenv('HR_TEST_FIXTURE_PATH');
if($fixturePath) {
    $tokens=[];foreach($userIds as $name=>$id)$tokens[$name]=spIssueApiToken($id);
    file_put_contents($fixturePath,json_encode(['outlet_a'=>$a,'outlet_b'=>$b,'employee'=>$employee,'transfer_employee'=>$immediate,'users'=>$userIds,'tokens'=>$tokens,'department'=>$department,'position'=>$position,'type'=>$type,'status'=>$status],JSON_THROW_ON_ERROR));
}
echo "RESULT: $count checks passed. Local test data only.\n";
