<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
function ensureUserOutletsTable(PDO $pdo):void{
 $pdo->exec("CREATE TABLE IF NOT EXISTS user_outlets (user_id BIGINT UNSIGNED NOT NULL,outlet_id BIGINT UNSIGNED NOT NULL,is_default TINYINT(1) NOT NULL DEFAULT 0,active TINYINT(1) NOT NULL DEFAULT 1,PRIMARY KEY(user_id,outlet_id),CONSTRAINT fk_user_outlets_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,CONSTRAINT fk_user_outlets_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}
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
function normalizeUser(PDO $pdo,array $u,int $outletId):array{
 $name=trim((string)($u['name']??''));$username=strtolower(trim((string)($u['username']??'')));$roleName=trim((string)($u['role']??'Cashier'))?:'Cashier';if($name===''||$username==='')throw new InvalidArgumentException('Name and username are required.');
 $permissions=is_array($u['permissions']??null)?$u['permissions']:[];global $permissionLabels;
 if($roleName==='Administrator')$permissions=array_fill_keys(array_keys($permissionLabels),true);
 [$assignedOutletIds,$defaultOutletId]=normalizeAssignedOutlets($pdo,$u,$outletId);
 $roleId=role($pdo,$roleName);$hash='';$plain=(string)($u['password']??'');if($plain!=='')$hash=password_hash($plain,PASSWORD_DEFAULT);
 $id=(int)($u['dbId']??0);if(!$id)$id=(int)($u['id']??0);
 if($id){$q=$pdo->prepare('SELECT id FROM users WHERE id=? LIMIT 1');$q->execute([$id]);if(!(int)($q->fetchColumn()?:0))$id=0;}
 if(!$id){$q=$pdo->prepare('SELECT id FROM users WHERE LOWER(username)=? LIMIT 1');$q->execute([$username]);$id=(int)($q->fetchColumn()?:0);}
 $cols=['outlet_id','name','username','role_id','enabled','permissions_json'];$vals=[$defaultOutletId,$name,$username,$roleId,!empty($u['enabled'])?1:0,json_encode($permissions,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE)];
 if($hash!==''){$cols[]='password_hash';$vals[]=$hash;}
 if($id){$sets=[];foreach($cols as $c)$sets[]="`$c`=?";$vals[]=$id;$pdo->prepare('UPDATE users SET '.implode(',',$sets).' WHERE id=?')->execute($vals);}
 else{$pdo->prepare('INSERT INTO users (`'.implode('`,`',$cols).'`) VALUES('.implode(',',array_fill(0,count($cols),'?')).')')->execute($vals);$id=(int)$pdo->lastInsertId();}
 $pdo->prepare('DELETE FROM role_permissions WHERE role_id=?')->execute([$roleId]);foreach($permissions as $k=>$allowed){if(!$allowed)continue;$pid=permission($pdo,(string)$k,$permissionLabels[$k]??(string)$k);$pdo->prepare('INSERT INTO role_permissions(role_id,permission_id,allowed) VALUES(?,?,1) ON DUPLICATE KEY UPDATE allowed=1')->execute([$roleId,$pid]);}
 saveAssignedOutlets($pdo,$id,$assignedOutletIds,$defaultOutletId);
 return['id'=>$id,'dbId'=>$id,'name'=>$name,'username'=>$username,'role'=>$roleName,'enabled'=>!empty($u['enabled']),'permissions'=>$permissions,'outlets'=>assignedOutletRows($pdo,$id),'outlet_ids'=>$assignedOutletIds,'default_outlet_id'=>$defaultOutletId];
}
$permissionLabels=['viewSalesHistory'=>'View sales history','viewOpenSales'=>'View open sales','cashInOut'=>'Cash In / Out','creditPayments'=>'Credit payments','endOfDay'=>'End of day','userInfo'=>'User info','manageUsers'=>'Users & Permissions','manageProducts'=>'Products','manageInventory'=>'Inventory','manageCustomers'=>'Customers','managePurchases'=>'Purchases','managePayments'=>'Payments','manageManagement'=>'Management','manageSettings'=>'Settings','manageReports'=>'Reports','manageTax'=>'Tax','manageDiscount'=>'Discount / Promotion','manageLoyalty'=>'Loyalty'];
try{
 if($name===''||$user==='')throw new RuntimeException('Database configuration is incomplete.');
 $pdo=new PDO("mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
 ensureUserOutletsTable($pdo);
 $outletId=outlet($pdo,$_GET['outlet_id']??$_POST['outlet_id']??'SP01');$action=strtolower(trim((string)($_GET['action']??$_POST['action']??'')));
 if($action==='health')out(['ok'=>true,'service'=>'SP-Manager users API','outletId'=>$outletId]);
 if($action==='list-outlets'&&$_SERVER['REQUEST_METHOD']==='GET'){
  $rows=$pdo->query('SELECT id,outlet_code,outlet_name,active FROM outlets WHERE active=1 ORDER BY outlet_name ASC')->fetchAll();foreach($rows as &$r){$r['id']=(int)$r['id'];$r['active']=(int)$r['active']===1;}unset($r);out(['ok'=>true,'api_version'=>'V1','count'=>count($rows),'outlets'=>$rows]);
 }
 if($action==='list'&&$_SERVER['REQUEST_METHOD']==='GET'){
  $q=$pdo->prepare('SELECT DISTINCT u.id,u.name,u.username,u.enabled,u.permissions_json,r.role_name FROM users u LEFT JOIN roles r ON r.id=u.role_id LEFT JOIN user_outlets uo ON uo.user_id=u.id AND uo.active=1 WHERE (u.outlet_id=? OR u.outlet_id IS NULL OR uo.outlet_id=?) ORDER BY u.id ASC');$q->execute([$outletId,$outletId]);$rows=[];foreach($q->fetchAll() as $r){$per=json_decode((string)($r['permissions_json']??''),true);$id=(int)$r['id'];$assigned=assignedOutletRows($pdo,$id);$ids=array_map(fn($x)=>(int)$x['id'],$assigned);$def=$ids[0]??$outletId;foreach($assigned as $ao){if(!empty($ao['is_default'])){$def=(int)$ao['id'];break;}}$rows[]=['id'=>$id,'dbId'=>$id,'name'=>$r['name'],'username'=>$r['username'],'role'=>$r['role_name']?:'Cashier','enabled'=>(int)$r['enabled']===1,'permissions'=>is_array($per)?$per:[],'outlets'=>$assigned,'outlet_ids'=>$ids,'default_outlet_id'=>$def];}out(['ok'=>true,'count'=>count($rows),'users'=>$rows]);
 }
 if($action==='save'&&$_SERVER['REQUEST_METHOD']==='POST'){$b=body();$u=is_array($b['user']??null)?$b['user']:[];$pdo->beginTransaction();$saved=normalizeUser($pdo,$u,$outletId);$pdo->commit();out(['ok'=>true,'user'=>$saved]);}
 if($action==='save-batch'&&$_SERVER['REQUEST_METHOD']==='POST'){$b=body();$arr=$b['users']??[];if(!is_array($arr))throw new InvalidArgumentException('users must be an array.');$pdo->beginTransaction();$saved=[];foreach($arr as $u)if(is_array($u))$saved[]=normalizeUser($pdo,$u,$outletId);$pdo->commit();out(['ok'=>true,'count'=>count($saved),'users'=>$saved]);}
 if($action==='delete'&&$_SERVER['REQUEST_METHOD']==='POST'){$b=body();$id=(int)($b['id']??0);if($id<=0)throw new InvalidArgumentException('User id is required.');$q=$pdo->prepare('SELECT role_id FROM users u WHERE u.id=? AND (u.outlet_id=? OR u.outlet_id IS NULL OR EXISTS(SELECT 1 FROM user_outlets uo WHERE uo.user_id=u.id AND uo.outlet_id=? AND uo.active=1)) LIMIT 1');$q->execute([$id,$outletId,$outletId]);$roleId=(int)($q->fetchColumn()?:0);if(!$roleId)throw new InvalidArgumentException('User not found.');$q=$pdo->prepare('SELECT COUNT(*) FROM users u JOIN roles r ON r.id=u.role_id WHERE (u.outlet_id=? OR u.outlet_id IS NULL OR EXISTS(SELECT 1 FROM user_outlets uo WHERE uo.user_id=u.id AND uo.outlet_id=? AND uo.active=1)) AND u.enabled=1 AND r.role_name="Administrator" AND u.id<>?');$q->execute([$outletId,$outletId,$id]);if((int)$q->fetchColumn()===0){$q=$pdo->prepare('SELECT r.role_name,u.enabled FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=?');$q->execute([$id]);$x=$q->fetch();if(($x['role_name']??'')==='Administrator'&&(int)$x['enabled']===1)throw new InvalidArgumentException('At least one enabled Administrator must remain.');}$q=$pdo->prepare('DELETE FROM users WHERE id=?');$q->execute([$id]);out(['ok'=>true,'deleted'=>$q->rowCount()]);}
 if($action==='auth'&&$_SERVER['REQUEST_METHOD']==='POST'){$b=body();$username=strtolower(trim((string)($b['username']??'')));$password=(string)($b['password']??'');$q=$pdo->prepare('SELECT DISTINCT u.*,r.role_name FROM users u LEFT JOIN roles r ON r.id=u.role_id LEFT JOIN user_outlets uo ON uo.user_id=u.id AND uo.active=1 WHERE LOWER(u.username)=? AND (u.outlet_id=? OR u.outlet_id IS NULL OR uo.outlet_id=?) LIMIT 1');$q->execute([$username,$outletId,$outletId]);$r=$q->fetch();if(!$r||!(int)$r['enabled']||!password_verify($password,(string)$r['password_hash']))out(['ok'=>false,'error'=>'Invalid username or password.'],401);$per=json_decode((string)($r['permissions_json']??''),true);if(($r['role_name']??'')==='Administrator')$per=array_fill_keys(array_keys($permissionLabels),true);$pdo->prepare('UPDATE users SET last_login_at=NOW() WHERE id=?')->execute([(int)$r['id']]);$assigned=assignedOutletRows($pdo,(int)$r['id']);$ids=array_map(fn($x)=>(int)$x['id'],$assigned);$def=$r['outlet_id']?(int)$r['outlet_id']:($ids[0]??$outletId);foreach($assigned as $ao){if(!empty($ao['is_default'])){$def=(int)$ao['id'];break;}}out(['ok'=>true,'user'=>['id'=>(int)$r['id'],'dbId'=>(int)$r['id'],'name'=>$r['name'],'username'=>$r['username'],'role'=>$r['role_name']?:'Cashier','enabled'=>true,'permissions'=>is_array($per)?$per:[],'outlets'=>$assigned,'outlet_ids'=>$ids,'default_outlet_id'=>$def]]);}
 throw new InvalidArgumentException('Unknown action.');
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();out(['ok'=>false,'error'=>$e->getMessage()],500);}
