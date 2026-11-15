<?php
declare(strict_types=1);
require_once __DIR__ . '/security.php';
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}
$config=require __DIR__.'/config.php';
$db=$config['db']??null;
$host=(string)($db['host']??$config['db_host']??'localhost');
$port=(string)($db['port']??$config['db_port']??'3306');
$name=(string)($db['name']??$config['db_name']??'');
$user=(string)($db['user']??$config['db_user']??'');
$pass=(string)($db['pass']??$config['db_pass']??'');
function body():array{
  $raw=file_get_contents('php://input')?:'';
  $contentType=strtolower((string)($_SERVER['CONTENT_TYPE']??''));
  if(str_contains($contentType,'application/json')){ $v=json_decode($raw,true); return is_array($v)?$v:[]; }
  if(!empty($_POST)) return is_array($_POST)?$_POST:[];
  if($raw!==''){ parse_str($raw,$v); return is_array($v)?$v:[]; }
  return [];
}
function out(array $v,int $s=200):never{http_response_code($s);echo json_encode($v,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);exit;}
function outlet(PDO $pdo,mixed $v):int{$v=trim((string)($v??'SP01'));if($v==='' )$v='SP01';if(ctype_digit($v))return(int)$v;$q=$pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND active=1 LIMIT 1');$q->execute([$v]);$id=(int)($q->fetchColumn()?:0);if($id<=0)throw new InvalidArgumentException('Outlet not found.');return$id;}
function role(PDO $pdo,string $name):int{$name=trim($name)?:'Cashier';$code=preg_replace('/[^A-Z0-9_]+/','_',strtoupper($name));$q=$pdo->prepare('SELECT id FROM roles WHERE role_name=? OR role_code=? LIMIT 1');$q->execute([$name,$code]);$id=(int)($q->fetchColumn()?:0);if($id)return$id;$q=$pdo->prepare('INSERT INTO roles(role_code,role_name,description,active) VALUES(?,?,?,1)');$q->execute([$code,$name,'SP-Manager role']);return(int)$pdo->lastInsertId();}
function permission(PDO $pdo,string $key,string $label):int{$q=$pdo->prepare('SELECT id FROM permissions WHERE permission_key=? LIMIT 1');$q->execute([$key]);$id=(int)($q->fetchColumn()?:0);if($id)return$id;$q=$pdo->prepare('INSERT INTO permissions(permission_key,permission_name,description,active) VALUES(?,?,?,1)');$q->execute([$key,$label,'SP-Manager permission']);return(int)$pdo->lastInsertId();}
function tableExists(PDO $pdo,string $table):bool{
 $q=$pdo->prepare("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?");
 $q->execute([$table]);
 return (int)$q->fetchColumn()>0;
}
function columnExists(PDO $pdo,string $table,string $column):bool{
 $q=$pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?");
 $q->execute([$table,$column]);
 return (int)$q->fetchColumn()>0;
}
function ensureUserOutletsTable(PDO $pdo):void {spRequireColumns($pdo,'user_outlets',['is_default','active']);}
function syncRolePermissions(PDO $pdo,int $roleId,array $permissions):void { /* User overrides are stored in users.permissions_json; do not rewrite a shared role. */ }
function normalizeAssignedOutlets(PDO $pdo,array $u,int $fallbackOutletId):array{
 $raw=$u['outlet_ids']??$u['outlets']??[];
 if(!is_array($raw))$raw=[];
 $ids=[];
 foreach($raw as $v){
  if(is_array($v))$v=$v['id']??$v['outlet_id']??$v['outletId']??null;
  if($v===null||$v==='')continue;
  if(ctype_digit((string)$v))$id=(int)$v;
  else{$q=$pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND active=1 LIMIT 1');$q->execute([strtoupper(trim((string)$v))]);$id=(int)($q->fetchColumn()?:0);}
  if($id>0)$ids[]=$id;
 }
 $ids=array_values(array_unique($ids));
 if(!$ids)$ids=[$fallbackOutletId];
 $ph=implode(',',array_fill(0,count($ids),'?'));$q=$pdo->prepare("SELECT id FROM outlets WHERE id IN ($ph) AND active=1");$q->execute($ids);$valid=array_map('intval',$q->fetchAll(PDO::FETCH_COLUMN));
 if(count($valid)!==count($ids))throw new InvalidArgumentException('One or more selected outlets are inactive or not found.');
 $default=$u['default_outlet_id']??$u['defaultOutletId']??null;
 if($default!==null&&$default!==''){$default=(int)$default;if(!in_array($default,$valid,true))throw new InvalidArgumentException('Default outlet must be one of the assigned outlets.');}
 else $default=$valid[0];
 return[$valid,$default];
}
function assignedOutletRows(PDO $pdo,int $userId):array{
 ensureUserOutletsTable($pdo);
 $q=$pdo->prepare('SELECT uo.outlet_id AS id,o.outlet_code,o.outlet_name,uo.is_default,uo.active FROM user_outlets uo JOIN outlets o ON o.id=uo.outlet_id WHERE uo.user_id=? AND uo.active=1 ORDER BY uo.is_default DESC,o.outlet_name ASC');$q->execute([$userId]);
 $rows=[];foreach($q->fetchAll() as $r)$rows[]=['id'=>(int)$r['id'],'outlet_code'=>$r['outlet_code'],'outlet_name'=>$r['outlet_name'],'is_default'=>(int)$r['is_default']===1,'active'=>(int)$r['active']===1];
 if(!$rows){$q=$pdo->prepare('SELECT id,outlet_code,outlet_name,active FROM outlets WHERE id=(SELECT outlet_id FROM users WHERE id=?) LIMIT 1');$q->execute([$userId]);$r=$q->fetch();if($r)$rows[]=['id'=>(int)$r['id'],'outlet_code'=>$r['outlet_code'],'outlet_name'=>$r['outlet_name'],'is_default'=>true,'active'=>(int)$r['active']===1];}
 return$rows;
}
function saveAssignedOutlets(PDO $pdo,int $userId,array $ids,int $defaultId):void{
 ensureUserOutletsTable($pdo);
 $pdo->prepare('DELETE FROM user_outlets WHERE user_id=?')->execute([$userId]);
 $st=$pdo->prepare('INSERT INTO user_outlets(user_id,outlet_id,is_default,active) VALUES(?,?,?,1)');
 foreach($ids as $id)$st->execute([$userId,$id,$id===$defaultId?1:0]);
 $pdo->prepare('UPDATE users SET outlet_id=? WHERE id=?')->execute([$defaultId,$userId]);
}
// HR Management link: user accounts take their Name from a registered HR employee.
function hrEmployeesReady(PDO $pdo):bool{static $ready=null;return $ready??=tableExists($pdo,'hr_employees');}
function hrEmployeeIdForUser(PDO $pdo,int $userId):?int{if(!$userId||!hrEmployeesReady($pdo))return null;$q=$pdo->prepare('SELECT id FROM hr_employees WHERE user_id=? LIMIT 1');$q->execute([$userId]);$v=$q->fetchColumn();return $v===false?null:(int)$v;}
function hrEmployeeChoices(PDO $pdo):array{
 if(!hrEmployeesReady($pdo))return[];
 $rows=$pdo->query('SELECT e.id,e.staff_code,e.full_name,e.user_id,u.username AS linked_username,COALESCE(s.is_active_employment,1) AS active_employment FROM hr_employees e LEFT JOIN users u ON u.id=e.user_id LEFT JOIN hr_employment_statuses s ON s.id=e.employment_status_id ORDER BY e.full_name ASC,e.staff_code ASC')->fetchAll();
 return array_map(fn($r)=>['id'=>(int)$r['id'],'staff_code'=>(string)$r['staff_code'],'full_name'=>(string)$r['full_name'],'user_id'=>$r['user_id']===null?null:(int)$r['user_id'],'linked_username'=>$r['linked_username'],'active'=>(int)$r['active_employment']===1],$rows);
}
// Returns the employee row to link (locked), or null when no employee is selected.
function hrEmployeeForUser(PDO $pdo,array $u,int $userId):?array{
 if(!array_key_exists('hr_employee_id',$u)||!hrEmployeesReady($pdo))return null;
 $eid=(int)($u['hr_employee_id']??0);if($eid<=0)return null;
 $q=$pdo->prepare('SELECT id,full_name,user_id FROM hr_employees WHERE id=? FOR UPDATE');$q->execute([$eid]);$e=$q->fetch();
 if(!$e)throw new InvalidArgumentException('The selected HR employee was not found. Refresh and try again.');
 if($e['user_id']!==null&&(int)$e['user_id']!==$userId)throw new InvalidArgumentException('This HR employee is already linked to another user account.');
 return $e;
}
function linkHrEmployee(PDO $pdo,array $u,int $userId,?array $employee):void{
 if(!array_key_exists('hr_employee_id',$u)||!hrEmployeesReady($pdo)||$userId<=0)return;
 $actor=(int)($_SERVER['SP_AUTH_USER_ID']??0)?:$userId;$eid=$employee?(int)$employee['id']:0;
 $pdo->prepare('UPDATE hr_employees SET user_id=NULL,revision=revision+1,updated_by=? WHERE user_id=? AND id<>?')->execute([$actor,$userId,$eid]);
 if($eid)$pdo->prepare('UPDATE hr_employees SET user_id=?,revision=revision+1,updated_by=? WHERE id=? AND (user_id IS NULL OR user_id<>?)')->execute([$userId,$actor,$eid,$userId]);
}
function normalizeUser(PDO $pdo,array $u,int $outletId,bool $matchByUsername=false):array{
 $name=trim((string)($u['name']??''));$username=strtolower(trim((string)($u['username']??'')));$roleName=trim((string)($u['role']??'Cashier'))?:'Cashier';if($name===''||$username==='')throw new InvalidArgumentException('Name and username are required.');
 $permissions=is_array($u['permissions']??null)?$u['permissions']:[];global $permissionLabels;
 if($roleName==='Administrator')$permissions=array_fill_keys(array_keys($permissionLabels),true);
 [$assignedOutletIds,$defaultOutletId]=normalizeAssignedOutlets($pdo,$u,$outletId);
 $roleId=role($pdo,$roleName);$rq=$pdo->prepare('SELECT role_name FROM roles WHERE id=?');$rq->execute([$roleId]);$roleName=(string)$rq->fetchColumn();$hash='';$plain=(string)($u['password']??'');if($plain!==''&&strlen($plain)<12)throw new InvalidArgumentException('Use a password of at least 12 characters.');if($plain!=='')$hash=password_hash($plain,PASSWORD_DEFAULT);
 $id=(int)($u['dbId']??0);if(!$id)$id=(int)($u['id']??0);
 if($id){$q=$pdo->prepare('SELECT id FROM users WHERE id=? LIMIT 1');$q->execute([$id]);if(!(int)($q->fetchColumn()?:0))$id=0;}
 // Only batch sync may match an existing account by username. A new user from the Add user
 // form must never overwrite an existing account (e.g. when the browser autofills the username).
 if(!$id&&$matchByUsername){$q=$pdo->prepare('SELECT id FROM users WHERE LOWER(username)=? LIMIT 1');$q->execute([$username]);$id=(int)($q->fetchColumn()?:0);}
 $employee=hrEmployeeForUser($pdo,$u,$id);if($employee)$name=trim((string)$employee['full_name']);
 spValidateUserChange($pdo,$id,[...$u,'role'=>$roleName,'permissions'=>$permissions,'outlet_ids'=>$assignedOutletIds],$outletId);
 $q=$pdo->prepare('SELECT id FROM users WHERE LOWER(username)=? AND id<>? LIMIT 1');$q->execute([$username,$id]);if((int)($q->fetchColumn()?:0)>0)throw new InvalidArgumentException('Username already exists. Please use a different username.');
 $cols=['outlet_id','name','username','role_id','enabled','permissions_json'];$vals=[$defaultOutletId,$name,$username,$roleId,!empty($u['enabled'])?1:0,json_encode($permissions,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE)];
 if($hash!==''){$cols[]='password_hash';$vals[]=$hash;}
 if($id){$sets=[];foreach($cols as $c)$sets[]="`$c`=?";$vals[]=$id;$pdo->prepare('UPDATE users SET '.implode(',',$sets).' WHERE id=?')->execute($vals);}
 else{$pdo->prepare('INSERT INTO users (`'.implode('`,`',$cols).'`) VALUES('.implode(',',array_fill(0,count($cols),'?')).')')->execute($vals);$id=(int)$pdo->lastInsertId();}
 if($id>0)$pdo->prepare('UPDATE users SET session_version=session_version+1 WHERE id=?')->execute([$id]);
 spAudit($pdo,'USER_SAVE','users',$id,null,['username'=>$username,'role'=>$roleName,'enabled'=>!empty($u['enabled'])]);
 syncRolePermissions($pdo,$roleId,$permissions);
 saveAssignedOutlets($pdo,$id,$assignedOutletIds,$defaultOutletId);
 linkHrEmployee($pdo,$u,$id,$employee);
 return['id'=>$id,'dbId'=>$id,'hr_employee_id'=>hrEmployeeIdForUser($pdo,$id),'name'=>$name,'username'=>$username,'role'=>$roleName,'enabled'=>!empty($u['enabled']),'permissions'=>$permissions,'outlets'=>assignedOutletRows($pdo,$id),'outlet_ids'=>$assignedOutletIds,'default_outlet_id'=>$defaultOutletId];
}
$permissionLabels=['accessPaymentTypes'=>'Payment Types','accessRefundVoid'=>'Refund / Void','accessOutletManagement'=>'Outlet Management','accessXzReport'=>'X / Z Report','accessNamedOrder'=>'Named Order / Takeaway','accessCompanySettings'=>'My company','accessPosSales'=>'POS / Sales','accessPriceCheck'=>'Price Check','viewDashboard'=>'Dashboard','viewSalesHistory'=>'View sales history','viewOpenSales'=>'View open sales','cashInOut'=>'Cash In / Out','creditPayments'=>'Credit payments','endOfDay'=>'End of day','userInfo'=>'User info','manageUsers'=>'Users & Permissions','manageProducts'=>'Products','manageInventory'=>'Inventory','manageCustomers'=>'Customers','managePurchases'=>'Purchase documents','managePayments'=>'Payments','manageManagement'=>'Management','manageSettings'=>'Settings','manageReports'=>'Reports','manageTax'=>'Tax','manageDiscount'=>'Discount / Promotion','manageLoyalty'=>'Loyalty','manageQuotation'=>'Quotation','manageInvoice'=>'Invoice','manageDocuments'=>'Documents'];
$permissionLabels += ['viewHrEmployees'=>'HR Management','manageHrEmployees'=>'HR Employee Management','transferHrEmployees'=>'HR Outlet Transfers','viewHrSalary'=>'HR Salary Access','manageHrSalary'=>'HR Salary Revisions','manageHrSettings'=>'HR Settings','viewHrSensitive'=>'HR IC / Passport Access'];
$permissionLabels += ['viewBookings'=>'Booking','manageBookings'=>'Manage Booking','manageBookingSettings'=>'Booking Services & Schedule'];
try{
 if($name===''||$user==='')throw new RuntimeException('Database configuration is incomplete.');
 $pdo=spApiDatabase();
 ensureUserOutletsTable($pdo);
 $outletId=outlet($pdo,$_GET['outlet_id']??$_POST['outlet_id']??'SP01');$action=strtolower(trim((string)($_GET['action']??$_POST['action']??'')));
 if($action==='health')out(['ok'=>true,'service'=>'SP-Manager users API','outletId'=>$outletId]);
 if($action==='list-outlets'&&$_SERVER['REQUEST_METHOD']==='GET'){
  $rows=$pdo->query('SELECT id,outlet_code,outlet_name,active FROM outlets WHERE active=1 ORDER BY outlet_name ASC')->fetchAll();foreach($rows as &$r){$r['id']=(int)$r['id'];$r['active']=(int)$r['active']===1;}unset($r);out(['ok'=>true,'api_version'=>'V1','count'=>count($rows),'outlets'=>$rows]);
 }
 if($action==='hr-employees'&&$_SERVER['REQUEST_METHOD']==='GET')out(['ok'=>true,'available'=>hrEmployeesReady($pdo),'employees'=>hrEmployeeChoices($pdo)]);
 if($action==='list'&&$_SERVER['REQUEST_METHOD']==='GET'){
  $q=$pdo->prepare('SELECT DISTINCT u.id,u.name,u.username,u.enabled,u.permissions_json,r.role_name FROM users u LEFT JOIN roles r ON r.id=u.role_id LEFT JOIN user_outlets uo ON uo.user_id=u.id AND uo.active=1 WHERE (u.outlet_id=? OR u.outlet_id IS NULL OR uo.outlet_id=?)'.(columnExists($pdo,'users','deleted_at')?' AND u.deleted_at IS NULL':'').' AND u.username NOT LIKE \'%~deleted~%\' ORDER BY u.id ASC');$q->execute([$outletId,$outletId]);$rows=[];foreach($q->fetchAll() as $r){$per=json_decode((string)($r['permissions_json']??''),true);$id=(int)$r['id'];$assigned=assignedOutletRows($pdo,$id);$ids=array_map(fn($x)=>(int)$x['id'],$assigned);$def=$ids[0]??$outletId;foreach($assigned as $ao){if(!empty($ao['is_default'])){$def=(int)$ao['id'];break;}}$rows[]=['id'=>$id,'dbId'=>$id,'hr_employee_id'=>hrEmployeeIdForUser($pdo,$id),'name'=>$r['name'],'username'=>$r['username'],'role'=>$r['role_name']?:'Cashier','enabled'=>(int)$r['enabled']===1,'permissions'=>is_array($per)?$per:[],'outlets'=>$assigned,'outlet_ids'=>$ids,'default_outlet_id'=>$def];}out(['ok'=>true,'count'=>count($rows),'users'=>$rows]);
 }
 if($action==='save'&&$_SERVER['REQUEST_METHOD']==='POST'){$b=body();$u=is_array($b['user']??null)?$b['user']:[];$pdo->beginTransaction();spLockOutlet($pdo,$outletId);$saved=normalizeUser($pdo,$u,$outletId);$pdo->commit();out(['ok'=>true,'user'=>$saved]);}
 if($action==='save-batch'&&$_SERVER['REQUEST_METHOD']==='POST'){$b=body();$arr=$b['users']??[];if(!is_array($arr))throw new InvalidArgumentException('users must be an array.');$pdo->beginTransaction();spLockOutlet($pdo,$outletId);$saved=[];foreach($arr as $u)if(is_array($u))$saved[]=normalizeUser($pdo,$u,$outletId,true);$pdo->commit();out(['ok'=>true,'count'=>count($saved),'users'=>$saved]);}
 if($action==='logout'&&$_SERVER['REQUEST_METHOD']==='POST'){$pdo->prepare('UPDATE users SET session_version=session_version+1 WHERE id=?')->execute([(int)$_SERVER['SP_AUTH_USER_ID']]);out(['ok'=>true]);}
 if($action==='delete'&&$_SERVER['REQUEST_METHOD']==='POST'){$b=body();$id=(int)($b['id']??0);if($id<=0)throw new InvalidArgumentException('User id required.');
  if($id===(int)($_SERVER['SP_AUTH_USER_ID']??0))throw new InvalidArgumentException('You cannot delete the account you are signed in with.');
  $pdo->beginTransaction();spLockOutlet($pdo,$outletId);spValidateUserChange($pdo,$id,['role'=>'Cashier','enabled'=>false],$outletId);
  // The HR employee stays; only its login link is removed.
  if(hrEmployeesReady($pdo))$pdo->prepare('UPDATE hr_employees SET user_id=NULL,revision=revision+1,updated_by=? WHERE user_id=?')->execute([(int)($_SERVER['SP_AUTH_USER_ID']??0)?:$id,$id]);
  // Remove the account completely. A user with sales, audit or HR history cannot be removed without
  // breaking those records, so it is archived instead: login disabled, hidden from the list, username freed.
  $pdo->exec('SAVEPOINT sp_user_delete');$mode='deleted';
  try{$pdo->prepare('DELETE FROM user_outlets WHERE user_id=?')->execute([$id]);$pdo->prepare('DELETE FROM users WHERE id=?')->execute([$id]);}
  catch(PDOException $e){if($e->getCode()!=='23000')throw $e;$pdo->exec('ROLLBACK TO SAVEPOINT sp_user_delete');$mode='archived';
   $set='enabled=0,session_version=session_version+1,username=CONCAT(LEFT(username,60),?)';if(columnExists($pdo,'users','deleted_at'))$set.=',deleted_at=NOW()';
   $pdo->prepare('UPDATE users SET '.$set.' WHERE id=?')->execute(['~deleted~'.$id,$id]);$pdo->prepare('UPDATE user_outlets SET active=0 WHERE user_id=?')->execute([$id]);}
  $pdo->exec('RELEASE SAVEPOINT sp_user_delete');
  spAudit($pdo,'USER_DELETE','users',$id,null,['mode'=>$mode]);$pdo->commit();out(['ok'=>true,'deleted'=>1,'mode'=>$mode]);}
 if($action==='auth'&&$_SERVER['REQUEST_METHOD']==='POST'){$b=body();$username=strtolower(trim((string)($b['username']??'')));$password=(string)($b['password']??'');spThrottleLogin($pdo,$username);$q=$pdo->prepare('SELECT DISTINCT u.*,r.role_name FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE LOWER(u.username)=? LIMIT 1');$q->execute([$username]);$r=$q->fetch();if(!$r||!(int)$r['enabled']||!password_verify($password,(string)$r['password_hash']))out(['ok'=>false,'error'=>'Invalid username or password.'],401);$pdo->prepare('DELETE FROM sp_login_attempts WHERE bucket_key IN (?,?)')->execute([hash('sha256',strtolower($username).'|'.($_SERVER['REMOTE_ADDR']??'unknown')),hash('sha256','user:'.strtolower($username))]);if(password_needs_rehash((string)$r['password_hash'],PASSWORD_DEFAULT))$pdo->prepare('UPDATE users SET password_hash=? WHERE id=?')->execute([password_hash($password,PASSWORD_DEFAULT),(int)$r['id']]);$mustChange=!empty($r['must_change_password']);$per=json_decode((string)($r['permissions_json']??''),true);if(($r['role_name']??'')==='Administrator')$per=array_fill_keys(array_keys($permissionLabels),true);$pdo->prepare('UPDATE users SET last_login_at=NOW() WHERE id=?')->execute([(int)$r['id']]);$assigned=assignedOutletRows($pdo,(int)$r['id']);$ids=array_map(fn($x)=>(int)$x['id'],$assigned);$def=$r['outlet_id']?(int)$r['outlet_id']:($ids[0]??$outletId);foreach($assigned as $ao){if(!empty($ao['is_default'])){$def=(int)$ao['id'];break;}}out(['ok'=>true,'api_token'=>spIssueApiToken((int)$r['id'],trim((string)($b['device_id']??''))),'expires_in'=>7200,'must_change_password'=>$mustChange,'user'=>['id'=>(int)$r['id'],'must_change_password'=>$mustChange,'dbId'=>(int)$r['id'],'name'=>$r['name'],'username'=>$r['username'],'role'=>$r['role_name']?:'Cashier','enabled'=>true,'permissions'=>is_array($per)?$per:[],'outlets'=>$assigned,'outlet_ids'=>$ids,'default_outlet_id'=>$def]]);}
 // Administrator-only reset: sets a random temporary password that is shown to the Administrator once.
 // The user must choose a new password at the next sign-in, and existing sessions of that user end.
 if($action==='reset-password'&&$_SERVER['REQUEST_METHOD']==='POST'){
  if(!columnExists($pdo,'users','must_change_password'))throw new RuntimeException('Add users.must_change_password (see database/SCHEMA-CURRENT.sql) before resetting passwords.');
  if((string)($GLOBALS['spActor']['role_name']??'')!=='Administrator')out(['ok'=>false,'error'=>'Only an Administrator can reset passwords.'],403);
  $b=body();$id=(int)($b['id']??0);$actorId=(int)($_SERVER['SP_AUTH_USER_ID']??0);
  if($id<=0)throw new InvalidArgumentException('User id required.');
  if($id===$actorId)out(['ok'=>false,'error'=>'Use Change password to change your own password.'],403);
  $pdo->beginTransaction();spLockOutlet($pdo,$outletId);
  $q=$pdo->prepare('SELECT id,username,enabled FROM users WHERE id=? FOR UPDATE');$q->execute([$id]);$target=$q->fetch();
  if(!$target)throw new InvalidArgumentException('User was not found.');
  $temporary='Tint-'.str_pad((string)random_int(0,999999),6,'0',STR_PAD_LEFT);
  $pdo->prepare('UPDATE users SET password_hash=?,must_change_password=1,session_version=session_version+1 WHERE id=?')->execute([password_hash($temporary,PASSWORD_DEFAULT),$id]);
  spAudit($pdo,'USER_PASSWORD_RESET','users',$id,null,['username'=>(string)$target['username']]);
  $pdo->commit();
  out(['ok'=>true,'user'=>['id'=>$id,'username'=>(string)$target['username']],'temporary_password'=>$temporary]);
 }
 // Any signed-in user may change their own password; required after an Administrator reset.
 if($action==='change-password'&&$_SERVER['REQUEST_METHOD']==='POST'){
  $b=body();$userId=(int)($_SERVER['SP_AUTH_USER_ID']??0);$current=(string)($b['current_password']??'');$next=(string)($b['new_password']??'');
  if($userId<=0)out(['ok'=>false,'error'=>'A valid signed-in session is required.'],401);
  $q=$pdo->prepare('SELECT id,username,password_hash FROM users WHERE id=? AND enabled=1 LIMIT 1');$q->execute([$userId]);$r=$q->fetch();
  if(!$r)out(['ok'=>false,'error'=>'A valid signed-in session is required.'],401);
  spThrottleLogin($pdo,'password-change:'.strtolower((string)$r['username']));
  if(!password_verify($current,(string)$r['password_hash']))out(['ok'=>false,'error'=>'Current password is incorrect.'],400);
  if(strlen($next)<12)throw new InvalidArgumentException('Use a new password of at least 12 characters.');
  if(strlen($next)>200)throw new InvalidArgumentException('The new password is too long.');
  if(hash_equals($current,$next))throw new InvalidArgumentException('Choose a password that is different from the current one.');
  $pdo->prepare('DELETE FROM sp_login_attempts WHERE bucket_key=?')->execute([hash('sha256','password-change:'.strtolower((string)$r['username']).'|'.($_SERVER['REMOTE_ADDR']??'unknown'))]);
  $sets='password_hash=?,session_version=session_version+1'.(columnExists($pdo,'users','must_change_password')?',must_change_password=0':'');
  $pdo->prepare('UPDATE users SET '.$sets.' WHERE id=?')->execute([password_hash($next,PASSWORD_DEFAULT),$userId]);
  spAudit($pdo,'USER_PASSWORD_CHANGE','users',$userId);
  // Other sessions end; this device continues with a fresh token.
  out(['ok'=>true,'api_token'=>spIssueApiToken($userId,trim((string)($b['device_id']??''))),'expires_in'=>7200]);
 }
 throw new InvalidArgumentException('Unknown action.');
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();out(['ok'=>false,'error'=>spSafeErrorMessage($e)],500);}
