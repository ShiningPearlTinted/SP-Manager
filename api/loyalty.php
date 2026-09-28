<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('X-SP-Manager-DB-Version: V10');
if($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}
$config=require __DIR__.'/config.php'; $db=$config['db']??null;
$host=(string)($db['host']??$config['db_host']??'localhost'); $port=(string)($db['port']??$config['db_port']??'3306'); $name=(string)($db['name']??$config['db_name']??''); $user=(string)($db['user']??$config['db_user']??''); $pass=(string)($db['pass']??$config['db_pass']??'');
function outletId(PDO $pdo,string $outlet):int{$outlet=trim($outlet?:'SP01');if(ctype_digit($outlet)){$q=$pdo->prepare('SELECT id FROM outlets WHERE id=? AND active=1 LIMIT 1');$q->execute([(int)$outlet]);}else{$q=$pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND active=1 LIMIT 1');$q->execute([$outlet]);}$id=(int)($q->fetchColumn()?:0);if(!$id)throw new RuntimeException('Outlet not found: '.$outlet);return$id;}
function sync(PDO $pdo,int $oid):array{
 if(!($pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='customers'")->fetchColumn())) return [];
 $salesExists=(bool)$pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='sales'")->fetchColumn();
 if(!$salesExists)return [];
 $sales=$pdo->prepare("SELECT customer_id, COUNT(*) visits, COALESCE(SUM(total),0) spend FROM sales WHERE outlet_id=? AND customer_id IS NOT NULL AND UPPER(COALESCE(payment_status,''))='PAID' AND UPPER(COALESCE(status,'')) NOT IN ('VOID','VOIDED','REFUND','REFUNDED') GROUP BY customer_id");
 $sales->execute([$oid]); $rows=$sales->fetchAll(); $summary=[];
 foreach($rows as $r){$cid=(int)$r['customer_id'];$visits=(int)$r['visits'];$spend=(float)$r['spend'];$points=(float)floor(max(0,$spend));$summary[$cid]=['visits'=>$visits,'spend'=>$spend,'points'=>$points];
  $q=$pdo->prepare("UPDATE customers SET visits=?, spend=?, loyalty_points=? WHERE id=? AND (outlet_id=? OR outlet_id IS NULL) LIMIT 1");$q->execute([$visits,$spend,$points,$cid,$oid]);
  if($pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='loyalty_accounts'")->fetchColumn()){
    $la=$pdo->prepare("INSERT INTO loyalty_accounts (outlet_id,customer_id,points_balance,visits,total_spend,active) VALUES (?,?,?,?,?,1) ON DUPLICATE KEY UPDATE points_balance=VALUES(points_balance),visits=VALUES(visits),total_spend=VALUES(total_spend),active=1");
    $la->execute([$oid,$cid,$points,$visits,$spend]);
  }
 }
 $all=$pdo->prepare("SELECT * FROM customers WHERE outlet_id=? OR outlet_id IS NULL ORDER BY id ASC");$all->execute([$oid]);
 return $all->fetchAll();
}
try{
 $pdo=new PDO("mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
 $oid=outletId($pdo,(string)($_GET['outlet_id']??$_POST['outlet_id']??'SP01')); $action=strtolower(trim((string)($_GET['action']??$_POST['action']??'summary')));
 if($action==='health'){echo json_encode(['ok'=>true,'api_version'=>'V10','service'=>'SP-Manager loyalty API','outlet_id'=>$oid]);exit;}
 if($action==='sync'||$action==='summary'){$pdo->beginTransaction();$rows=sync($pdo,$oid);$pdo->commit();echo json_encode(['ok'=>true,'api_version'=>'V10','outlet_id'=>$oid,'count'=>count($rows),'customers'=>$rows],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);exit;}
 throw new InvalidArgumentException('Unknown loyalty action.');
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();http_response_code(500);echo json_encode(['ok'=>false,'api_version'=>'V10','error'=>$e->getMessage()],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);}
