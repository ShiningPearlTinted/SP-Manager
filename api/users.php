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
function body():array{$v=json_decode(file_get_contents('php://input')?:'',true);return is_array($v)?$v:[];}
function out(array $v,int $s=200):never{http_response_code($s);echo json_encode($v,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);exit;}
function outlet(PDO $pdo,mixed $v):int{$v=trim((string)($v??'SP01'));if($v==='' )$v='SP01';if(ctype_digit($v))return(int)$v;$q=$pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND active=1 LIMIT 1');$q->execute([$v]);$id=(int)($q->fetchColumn()?:0);if($id<=0)throw new InvalidArgumentException('Outlet not found.');return$id;}
function role(PDO $pdo,string $name):int{$name=trim($name)?:'Cashier';$code=preg_replace('/[^A-Z0-9_]+/','_',strtoupper($name));$q=$pdo->prepare('SELECT id FROM roles WHERE role_name=? OR role_code=? LIMIT 1');$q->execute([$name,$code]);$id=(int)($q->fetchColumn()?:0);if($id)return$id;$q=$pdo->prepare('INSERT INTO roles(role_code,role_name,description,active) VALUES(?,?,?,1)');$q->execute([$code,$name,'SP-Manager role']);return(int)$pdo->lastInsertId();}
function permission(PDO $pdo,string $key,string $label):int{$q=$pdo->prepare('SELECT id FROM permissions WHERE permission_key=? LIMIT 1');$q->execute([$key]);$id=(int)($q->fetchColumn()?:0);if($id)return$id;$q=$pdo->prepare('INSERT INTO permissions(permission_key,permission_name,description,active) VALUES(?,?,?,1)');$q->execute([$key,$label,'SP-Manager permission']);return(int)$pdo->lastInsertId();}
function normalizeUser(PDO $pdo,array $u,int $outletId):array{
 $name=trim((string)($u['name']??''));$username=strtolower(trim((string)($u['username']??'')));$roleName=trim((string)($u['role']??'Cashier'))?:'Cashier';if($name===''||$username==='')throw new InvalidArgumentException('Name and username are required.');
 $permissions=is_array($u['permissions']??null)?$u['permissions']:[];global $permissionLabels;
 if($roleName==='Administrator')$permissions=array_fill_keys(array_keys($permissionLabels),true);
 $roleId=role($pdo,$roleName);$hash='';$plain=(string)($u['password']??'');if($plain!=='')$hash=password_hash($plain,PASSWORD_DEFAULT);
 $id=(int)($u['dbId']??0);if(!$id)$id=(int)($u['id']??0);
 if(!$id){$q=$pdo->prepare('SELECT id FROM users WHERE username=? LIMIT 1');$q->execute([$username]);$id=(int)($q->fetchColumn()?:0);}
 $cols=['outlet_id','name','username','role_id','enabled','permissions_json'];$vals=[$outletId,$name,$username,$roleId,!empty($u['enabled'])?1:0,json_encode($permissions,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE)];
 if($hash!==''){$cols[]='password_hash';$vals[]=$hash;}
 if($id){$sets=[];foreach($cols as $c)$sets[]="`$c`=?";$vals[]=$id;$pdo->prepare('UPDATE users SET '.implode(',',$sets).' WHERE id=?')->execute($vals);}
 else{$pdo->prepare('INSERT INTO users (`'.implode('`,`',$cols).'`) VALUES('.implode(',',array_fill(0,count($cols),'?')).')')->execute($vals);$id=(int)$pdo->lastInsertId();}
 $pdo->prepare('DELETE FROM role_permissions WHERE role_id=?')->execute([$roleId]);foreach($permissions as $k=>$allowed){if(!$allowed)continue;$pid=permission($pdo,(string)$k,$permissionLabels[$k]??(string)$k);$pdo->prepare('INSERT INTO role_permissions(role_id,permission_id,allowed) VALUES(?,?,1) ON DUPLICATE KEY UPDATE allowed=1')->execute([$roleId,$pid]);}
 return['id'=>$id,'dbId'=>$id,'name'=>$name,'username'=>$username,'role'=>$roleName,'enabled'=>!empty($u['enabled']),'permissions'=>$permissions];
}
$permissionLabels=['viewSalesHistory'=>'View sales history','viewOpenSales'=>'View open sales','cashInOut'=>'Cash In / Out','creditPayments'=>'Credit payments','endOfDay'=>'End of day','userInfo'=>'User info','manageUsers'=>'Users & Permissions','manageProducts'=>'Products','manageInventory'=>'Inventory','manageCustomers'=>'Customers','managePurchases'=>'Purchases','managePayments'=>'Payments','manageManagement'=>'Management','manageSettings'=>'Settings','manageReports'=>'Reports','manageTax'=>'Tax','manageDiscount'=>'Discount / Promotion','manageLoyalty'=>'Loyalty'];
try{
 if($name===''||$user==='')throw new RuntimeException('Database configuration is incomplete.');
 $pdo=new PDO("mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
 $outletId=outlet($pdo,$_GET['outlet_id']??$_POST['outlet_id']??'SP01');$action=strtolower(trim((string)($_GET['action']??$_POST['action']??'')));
 if($action==='health')out(['ok'=>true,'service'=>'SP-Manager users API','outletId'=>$outletId]);
 if($action==='list'&&$_SERVER['REQUEST_METHOD']==='GET'){
  $q=$pdo->prepare('SELECT u.id,u.name,u.username,u.enabled,u.permissions_json,r.role_name FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.outlet_id=? OR u.outlet_id IS NULL ORDER BY u.id ASC');$q->execute([$outletId]);$rows=[];foreach($q->fetchAll() as $r){$per=json_decode((string)($r['permissions_json']??''),true);$rows[]=['id'=>(int)$r['id'],'dbId'=>(int)$r['id'],'name'=>$r['name'],'username'=>$r['username'],'role'=>$r['role_name']?:'Cashier','enabled'=>(int)$r['enabled']===1,'permissions'=>is_array($per)?$per:[]];}out(['ok'=>true,'count'=>count($rows),'users'=>$rows]);
 }
 if($action==='save'&&$_SERVER['REQUEST_METHOD']==='POST'){$b=body();$u=is_array($b['user']??null)?$b['user']:[];$pdo->beginTransaction();$saved=normalizeUser($pdo,$u,$outletId);$pdo->commit();out(['ok'=>true,'user'=>$saved]);}
 if($action==='save-batch'&&$_SERVER['REQUEST_METHOD']==='POST'){$b=body();$arr=$b['users']??[];if(!is_array($arr))throw new InvalidArgumentException('users must be an array.');$pdo->beginTransaction();$saved=[];foreach($arr as $u)if(is_array($u))$saved[]=normalizeUser($pdo,$u,$outletId);$pdo->commit();out(['ok'=>true,'count'=>count($saved),'users'=>$saved]);}
 if($action==='delete'&&$_SERVER['REQUEST_METHOD']==='POST'){$b=body();$id=(int)($b['id']??0);if($id<=0)throw new InvalidArgumentException('User id is required.');$q=$pdo->prepare('SELECT role_id FROM users WHERE id=? AND (outlet_id=? OR outlet_id IS NULL)');$q->execute([$id,$outletId]);$roleId=(int)($q->fetchColumn()?:0);if(!$roleId)throw new InvalidArgumentException('User not found.');$q=$pdo->prepare('SELECT COUNT(*) FROM users u JOIN roles r ON r.id=u.role_id WHERE (u.outlet_id=? OR u.outlet_id IS NULL) AND u.enabled=1 AND r.role_name="Administrator" AND u.id<>?');$q->execute([$outletId,$id]);if((int)$q->fetchColumn()===0){$q=$pdo->prepare('SELECT r.role_name,u.enabled FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=?');$q->execute([$id]);$x=$q->fetch();if(($x['role_name']??'')==='Administrator'&&(int)$x['enabled']===1)throw new InvalidArgumentException('At least one enabled Administrator must remain.');}$q=$pdo->prepare('DELETE FROM users WHERE id=? AND outlet_id=?');$q->execute([$id,$outletId]);out(['ok'=>true,'deleted'=>$q->rowCount()]);}
 if($action==='auth'&&$_SERVER['REQUEST_METHOD']==='POST'){$b=body();$username=strtolower(trim((string)($b['username']??'')));$password=(string)($b['password']??'');$q=$pdo->prepare('SELECT u.*,r.role_name FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE LOWER(u.username)=? AND (u.outlet_id=? OR u.outlet_id IS NULL) LIMIT 1');$q->execute([$username,$outletId]);$r=$q->fetch();if(!$r||!(int)$r['enabled']||!password_verify($password,(string)$r['password_hash']))out(['ok'=>false,'error'=>'Invalid username or password.'],401);$per=json_decode((string)($r['permissions_json']??''),true);if(($r['role_name']??'')==='Administrator')$per=array_fill_keys(array_keys($permissionLabels),true);$pdo->prepare('UPDATE users SET last_login_at=NOW() WHERE id=?')->execute([(int)$r['id']]);out(['ok'=>true,'user'=>['id'=>(int)$r['id'],'dbId'=>(int)$r['id'],'name'=>$r['name'],'username'=>$r['username'],'role'=>$r['role_name']?:'Cashier','enabled'=>true,'permissions'=>is_array($per)?$per:[]]]);}
 throw new InvalidArgumentException('Unknown action.');
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();out(['ok'=>false,'error'=>$e->getMessage()],500);}
