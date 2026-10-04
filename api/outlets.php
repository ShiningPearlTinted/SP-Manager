<?php
declare(strict_types=1);
require_once __DIR__ . '/security.php';
header('Content-Type: application/json; charset=utf-8');
if($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}
$config=require __DIR__.'/config.php';
$db=$config['db']??null;
$host=(string)($db['host']??$config['db_host']??'localhost');
$port=(string)($db['port']??$config['db_port']??'3306');
$name=(string)($db['name']??$config['db_name']??'');
$user=(string)($db['user']??$config['db_user']??'');
$pass=(string)($db['pass']??$config['db_pass']??'');
function body():array{$raw=file_get_contents('php://input')?:'';$type=strtolower((string)($_SERVER['CONTENT_TYPE']??''));if(str_contains($type,'application/json')){$v=json_decode($raw,true);return is_array($v)?$v:[];}if(!empty($_POST))return is_array($_POST)?$_POST:[];if($raw!==''){parse_str($raw,$v);return is_array($v)?$v:[];}return[];}
function out(array $v,int $s=200):never{http_response_code($s);echo json_encode($v,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);exit;}
try{
 if($name===''||$user==='')throw new RuntimeException('Database configuration is incomplete.');
 $pdo=spApiDatabase();
 spRequireTable($pdo,'outlets');
 $action=strtolower(trim((string)($_GET['action']??$_POST['action']??'')));
 if($action==='health')out(['ok'=>true,'service'=>'SP-Manager Outlets API','api_version'=>'V1']);
 if($action==='list'&&$_SERVER['REQUEST_METHOD']==='GET'){
  $userCount=spTableExists($pdo,'user_outlets')?"(SELECT COUNT(DISTINCT u.id) FROM users u LEFT JOIN user_outlets uo ON uo.user_id=u.id AND uo.active=1 WHERE u.enabled=1 AND (u.outlet_id=o.id OR uo.outlet_id=o.id))":"(SELECT COUNT(*) FROM users u WHERE u.enabled=1 AND u.outlet_id=o.id)";
  $productCount="(SELECT COUNT(*) FROM products p WHERE COALESCE(p.active,1)=1)";
  $sql="SELECT o.id,o.outlet_code,o.outlet_name,o.address,o.phone,o.email,o.active,o.created_at,o.updated_at,{$userCount} user_count,{$productCount} product_count,(SELECT COUNT(*) FROM sales s WHERE s.outlet_id=o.id) sales_count FROM outlets o ORDER BY o.active DESC,o.outlet_name ASC";
  $rows=$pdo->query($sql)->fetchAll();
  foreach($rows as &$r){$r['id']=(int)$r['id'];$r['active']=(int)$r['active']===1;$r['user_count']=(int)$r['user_count'];$r['product_count']=(int)$r['product_count'];$r['sales_count']=(int)$r['sales_count'];}
  unset($r);out(['ok'=>true,'api_version'=>'V1','count'=>count($rows),'outlets'=>$rows]);
 }
 if($action==='save'&&$_SERVER['REQUEST_METHOD']==='POST'){
  $b=body();$o=is_array($b['outlet']??null)?$b['outlet']:[];
  $id=(int)($o['id']??0);$code=strtoupper(trim((string)($o['outlet_code']??$o['code']??'')));$namev=trim((string)($o['outlet_name']??$o['name']??''));
  $address=trim((string)($o['address']??''));$phone=trim((string)($o['phone']??''));$email=trim((string)($o['email']??''));$active=array_key_exists('active',$o)?(!empty($o['active'])?1:0):1;
  if($code===''||!preg_match('/^[A-Z0-9_-]{2,50}$/',$code))throw new InvalidArgumentException('Outlet Code is required and may contain only A-Z, 0-9, underscore or hyphen.');
  if($namev==='')throw new InvalidArgumentException('Outlet Name is required.');
  if($email!==''&&!filter_var($email,FILTER_VALIDATE_EMAIL))throw new InvalidArgumentException('Please enter a valid email address.');
  $q=$pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND id<>? LIMIT 1');$q->execute([$code,$id]);if((int)($q->fetchColumn()?:0)>0)throw new InvalidArgumentException('Outlet Code is already in use.');
  if($id>0){$q=$pdo->prepare('UPDATE outlets SET outlet_code=?,outlet_name=?,address=?,phone=?,email=?,active=? WHERE id=?');$q->execute([$code,$namev,$address,$phone,$email,$active,$id]);}
  else{$q=$pdo->prepare('INSERT INTO outlets(outlet_code,outlet_name,address,phone,email,active) VALUES(?,?,?,?,?,?)');$q->execute([$code,$namev,$address,$phone,$email,$active]);$id=(int)$pdo->lastInsertId();}
  $q=$pdo->prepare('SELECT id,outlet_code,outlet_name,address,phone,email,active,created_at,updated_at FROM outlets WHERE id=?');$q->execute([$id]);$saved=$q->fetch();if(!$saved)throw new RuntimeException('Outlet could not be saved.');$saved['id']=(int)$saved['id'];$saved['active']=(int)$saved['active']===1;out(['ok'=>true,'api_version'=>'V1','outlet'=>$saved]);
 }
 if($action==='set-status'&&$_SERVER['REQUEST_METHOD']==='POST'){
  $b=body();$id=(int)($b['id']??0);$active=!empty($b['active'])?1:0;if($id<=0)throw new InvalidArgumentException('Outlet id is required.');
  $q=$pdo->prepare('SELECT id,outlet_code FROM outlets WHERE id=? LIMIT 1');$q->execute([$id]);$row=$q->fetch();if(!$row)throw new InvalidArgumentException('Outlet not found.');
  if($active===0){if(spTableExists($pdo,'user_outlets')){$q=$pdo->prepare('SELECT COUNT(DISTINCT u.id) FROM users u LEFT JOIN user_outlets uo ON uo.user_id=u.id AND uo.active=1 WHERE u.enabled=1 AND (u.outlet_id=? OR uo.outlet_id=?)');$q->execute([$id,$id]);}else{$q=$pdo->prepare('SELECT COUNT(*) FROM users WHERE outlet_id=? AND enabled=1');$q->execute([$id]);}$users=(int)$q->fetchColumn();if($users>0)throw new InvalidArgumentException('This outlet still has enabled users. Disable or reassign those users before deactivating the outlet.');}
  $q=$pdo->prepare('UPDATE outlets SET active=? WHERE id=?');$q->execute([$active,$id]);out(['ok'=>true,'api_version'=>'V1','id'=>$id,'active'=>$active===1]);
 }
 throw new InvalidArgumentException('Unknown action.');
}catch(Throwable $e){out(['ok'=>false,'api_version'=>'V1','error'=>$e->getMessage()],500);}
