<?php
declare(strict_types=1);
require_once __DIR__ . '/security.php';
header('Content-Type: application/json; charset=utf-8');
header('X-SP-Manager-DB-Version: V10');
if($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}
$config=require __DIR__.'/config.php'; $db=$config['db']??null;
$host=(string)($db['host']??$config['db_host']??'localhost'); $port=(string)($db['port']??$config['db_port']??'3306'); $name=(string)($db['name']??$config['db_name']??''); $user=(string)($db['user']??$config['db_user']??''); $pass=(string)($db['pass']??$config['db_pass']??'');
function outletId(PDO $pdo,string $outlet):int{$outlet=trim($outlet?:'SP01');if(ctype_digit($outlet)){$q=$pdo->prepare('SELECT id FROM outlets WHERE id=? AND active=1 LIMIT 1');$q->execute([(int)$outlet]);}else{$q=$pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND active=1 LIMIT 1');$q->execute([$outlet]);}$id=(int)($q->fetchColumn()?:0);if(!$id)throw new RuntimeException('Outlet not found: '.$outlet);return$id;}
function columns(PDO $pdo,string $table):array{
 $q=$pdo->prepare('SELECT column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=?');$q->execute([$table]);
 return array_fill_keys(array_map('strval',$q->fetchAll(PDO::FETCH_COLUMN)),true);
}
function sync(PDO $pdo,int $oid):array{
 $hasCustomers=(bool)$pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='customers'")->fetchColumn();
 $hasSales=(bool)$pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='sales'")->fetchColumn();
 if(!$hasCustomers||!$hasSales)return [];
 $customerCols=columns($pdo,'customers');$salesCols=columns($pdo,'sales');
 foreach(['outlet_id','customer_id','total','payment_status','status'] as $required)if(!isset($salesCols[$required]))throw new RuntimeException('Sales table is missing required loyalty column: '.$required);
 $sales=$pdo->prepare("SELECT customer_id, COUNT(*) visits, COALESCE(SUM(total),0) spend FROM sales WHERE outlet_id=? AND customer_id IS NOT NULL AND UPPER(COALESCE(payment_status,''))='PAID' AND UPPER(COALESCE(status,'')) NOT IN ('VOID','VOIDED','REFUND','REFUNDED') GROUP BY customer_id");
 $sales->execute([$oid]);$rows=$sales->fetchAll();$summary=[];
 $masterMetrics=[];foreach(['visits','spend','loyalty_points'] as $col)if(isset($customerCols[$col]))$masterMetrics[]=$col;
 if(isset($customerCols['outlet_id'])&&$masterMetrics){$sets=array_map(fn($c)=>'`'.$c.'`=0',$masterMetrics);$pdo->prepare('UPDATE customers SET '.implode(',',$sets).' WHERE outlet_id=?')->execute([$oid]);}
 $hasAccounts=(bool)$pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='loyalty_accounts'")->fetchColumn();
 $accountCols=$hasAccounts?columns($pdo,'loyalty_accounts'):[];
 if(isset($accountCols['outlet_id'])){$sets=[];foreach(['points_balance','visits','total_spend'] as $col)if(isset($accountCols[$col]))$sets[]='`'.$col.'`=0';if($sets)$pdo->prepare('UPDATE loyalty_accounts SET '.implode(',',$sets).' WHERE outlet_id=?')->execute([$oid]);}
 foreach($rows as $r){
  $cid=(int)$r['customer_id'];$visits=(int)$r['visits'];$spend=(float)$r['spend'];$points=(float)floor(max(0,$spend));
  $summary[$cid]=['visits'=>$visits,'spend'=>$spend,'points'=>$points];
  // A customer shared across outlets has a single master row. Keep its loyalty
  // totals in the outlet-keyed account table instead of overwriting them.
  if(isset($customerCols['outlet_id'])&&$masterMetrics){$set=[];$args=[];foreach(['visits'=>$visits,'spend'=>$spend,'loyalty_points'=>$points] as $col=>$value)if(isset($customerCols[$col])){$set[]='`'.$col.'`=?';$args[]=$value;}if($set){$args[]=$cid;$args[]=$oid;$pdo->prepare('UPDATE customers SET '.implode(',',$set).' WHERE id=? AND outlet_id=? LIMIT 1')->execute($args);}}
  if(isset($accountCols['outlet_id'],$accountCols['customer_id'])){
   $values=['outlet_id'=>$oid,'customer_id'=>$cid,'points_balance'=>$points,'visits'=>$visits,'total_spend'=>$spend,'active'=>1];$fields=[];$args=[];$updates=[];
   foreach($values as $field=>$value)if(isset($accountCols[$field])){$fields[]='`'.$field.'`';$args[]=$value;if(!in_array($field,['outlet_id','customer_id'],true))$updates[]='`'.$field.'`=VALUES(`'.$field.'`)';}
   if(count($fields)>=2){$sql='INSERT INTO loyalty_accounts ('.implode(',',$fields).') VALUES ('.implode(',',array_fill(0,count($fields),'?')).')';if($updates)$sql.=' ON DUPLICATE KEY UPDATE '.implode(',',$updates);$pdo->prepare($sql)->execute($args);}
  }
 }
 if(isset($customerCols['outlet_id'])){$all=$pdo->prepare('SELECT * FROM customers WHERE outlet_id=? OR outlet_id IS NULL ORDER BY id ASC');$all->execute([$oid]);$customers=$all->fetchAll();}
 else{$customers=$pdo->query('SELECT * FROM customers ORDER BY id ASC')->fetchAll();}
 foreach($customers as &$customer){$cid=(int)($customer['id']??0);$metric=$summary[$cid]??['visits'=>0,'spend'=>0.0,'points'=>0.0];if(isset($customerCols['visits']))$customer['visits']=$metric['visits'];if(isset($customerCols['spend']))$customer['spend']=$metric['spend'];if(isset($customerCols['loyalty_points']))$customer['loyalty_points']=$metric['points'];}unset($customer);
 return $customers;
}
try{
 $pdo=new PDO("mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
 $oid=outletId($pdo,(string)($_GET['outlet_id']??$_POST['outlet_id']??'SP01')); $action=strtolower(trim((string)($_GET['action']??$_POST['action']??'summary')));
 if($action==='health'){echo json_encode(['ok'=>true,'api_version'=>'V10','service'=>'SP-Manager loyalty API','outlet_id'=>$oid]);exit;}
 if($action==='sync'||$action==='summary'){$pdo->beginTransaction();$rows=sync($pdo,$oid);$pdo->commit();echo json_encode(['ok'=>true,'api_version'=>'V10','outlet_id'=>$oid,'count'=>count($rows),'customers'=>$rows],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);exit;}
 throw new InvalidArgumentException('Unknown loyalty action.');
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();http_response_code(500);echo json_encode(['ok'=>false,'api_version'=>'V10','error'=>$e->getMessage()],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);}
