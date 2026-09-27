<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
$config = require __DIR__ . '/config.php';
$db = $config['db'] ?? null;
$host=(string)($db['host']??$config['db_host']??'localhost'); $port=(string)($db['port']??$config['db_port']??'3306');
$name=(string)($db['name']??$config['db_name']??''); $user=(string)($db['user']??$config['db_user']??''); $pass=(string)($db['pass']??$config['db_pass']??'');
if($name===''||$user==='') throw new RuntimeException('Database configuration is incomplete.');
function body():array{ $v=json_decode(file_get_contents('php://input')?:'',true); return is_array($v)?$v:[]; }
function tableExists(PDO $pdo,string $table):bool{ $q=$pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?');$q->execute([$table]);return (int)$q->fetchColumn()>0; }
function cols(PDO $pdo,string $table):array{ static $cache=[]; if(isset($cache[$table]))return $cache[$table]; $q=$pdo->query('DESCRIBE `'.str_replace('`','``',$table).'`');$out=[];foreach($q->fetchAll() as $r)$out[$r['Field']]=$r;return $cache[$table]=$out; }
function pick(array $a,array $names,$default=null){ foreach($names as $n){ if(array_key_exists($n,$a)&&$a[$n]!==null&&$a[$n]!=='') return $a[$n]; } return $default; }
function rowFor(array $schema,array $data,array $map,int $outletId):array{
  $row=[];
  foreach($map as $field=>$names){ if(isset($schema[$field])){ $v=pick($data,(array)$names,null); if($v!==null)$row[$field]=$v; } }
  if(isset($schema['outlet_id']) && !array_key_exists('outlet_id',$row))$row['outlet_id']=$outletId;
  if(isset($schema['active']) && !array_key_exists('active',$row))$row['active']=1;
  if(isset($schema['enabled']) && !array_key_exists('enabled',$row))$row['enabled']=1;
  foreach($schema as $f=>$c){ if($f==='id'||array_key_exists($f,$row))continue; if($c['Null']==='NO' && $c['Default']===null && stripos((string)$c['Extra'],'auto_increment')===false){
      $type=strtolower((string)$c['Type']); $row[$f]=str_contains($type,'int')||str_contains($type,'decimal')||str_contains($type,'double')||str_contains($type,'float')?'0':(str_contains($type,'date')?'': '');
  }}
  return $row;
}
function upsertByMap(PDO $pdo,string $table,array $schema,array $data,array $map,int $outletId,string $localId,string $entity):int{
  $row=rowFor($schema,$data,$map,$outletId);
  $syncTable='sp_relational_sync';
  $q=$pdo->prepare("SELECT db_id FROM {$syncTable} WHERE outlet_id=? AND state_key=? AND local_id=? AND entity=? LIMIT 1");
  $q->execute([$outletId,$GLOBALS['stateKey'],$localId,$entity]); $dbId=(int)($q->fetchColumn()?:0);
  if($dbId && isset($schema['id'])){ $u=$row; unset($u['id']); if($u){$set=implode(',',array_map(fn($k)=>"`$k`=?",array_keys($u)));$st=$pdo->prepare("UPDATE `$table` SET $set WHERE id=?");$st->execute([...array_values($u),$dbId]);} }
  else{
    $fields=array_keys($row); if(!$fields)throw new RuntimeException("No writable columns for $table"); $sql="INSERT INTO `$table` (`".implode('`,`',$fields)."`) VALUES (".implode(',',array_fill(0,count($fields),'?')).")"; $st=$pdo->prepare($sql);$st->execute(array_values($row));$dbId=(int)$pdo->lastInsertId();
  }
  $m=$pdo->prepare("INSERT INTO {$syncTable}(outlet_id,state_key,local_id,entity,db_id,updated_at) VALUES(?,?,?,?,?,NOW()) ON DUPLICATE KEY UPDATE db_id=VALUES(db_id),updated_at=NOW()");$m->execute([$outletId,$GLOBALS['stateKey'],$localId,$entity,$dbId]);
  return $dbId;
}
try{
 $pdo=new PDO("mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
 $pdo->exec("CREATE TABLE IF NOT EXISTS sp_relational_sync (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,outlet_id BIGINT UNSIGNED NOT NULL,state_key VARCHAR(120) NOT NULL,local_id VARCHAR(190) NOT NULL,entity VARCHAR(80) NOT NULL,db_id BIGINT UNSIGNED NOT NULL,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY(id),UNIQUE KEY uq_rel_sync(outlet_id,state_key,local_id,entity),KEY idx_rel_sync_db(outlet_id,entity,db_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 $b=body(); $outlet=trim((string)($b['outlet_id']??'SP01')); if(ctype_digit($outlet))$outletId=(int)$outlet;else{$q=$pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? LIMIT 1');$q->execute([$outlet]);$outletId=(int)($q->fetchColumn()?:0);} if(!$outletId)throw new RuntimeException('Outlet not found: '.$outlet);
 $stateKey=trim((string)($b['state_key']??'')); $GLOBALS['stateKey']=$stateKey; $state=$b['state']??[]; if(!is_array($state))throw new InvalidArgumentException('state must be an array/object.');
 $maps=[
  'sales'=>['table'=>'sales','children'=>['sale_items','sale_payments'],'map'=>['outlet_id'=>['outlet_id'],'sale_no'=>['no','saleNo','invoiceNo','invoice_number'],'sale_date'=>['date','saleDate'],'customer_id'=>['customerId','customer_id'],'order_name'=>['orderName','name'],'service_type'=>['serviceType'],'subtotal'=>['subtotal'],'discount'=>['discount'],'tax'=>['tax'],'total'=>['total'],'payment_status'=>['paymentStatus','paid'],'status'=>['status'],'created_by'=>['userId','created_by','createdBy']]],
  'purchases'=>['table'=>'purchases','children'=>['purchase_items'],'map'=>['outlet_id'=>['outlet_id'],'supplier_id'=>['supplierId'],'document_no'=>['no','number'],'external_document'=>['externalDocument'],'document_type'=>['documentType'],'purchase_date'=>['date'],'stock_date'=>['stockDate'],'discount'=>['discount'],'tax'=>['tax'],'total'=>['total'],'paid'=>['paid'],'status'=>['status'],'internal_note'=>['internalNote']]],
  'orders'=>['table'=>'open_orders','children'=>['open_order_items'],'map'=>['outlet_id'=>['outlet_id'],'order_name'=>['name'],'order_number'=>['no','number'],'order_date'=>['date'],'customer_id'=>['customerId'],'discount'=>['discount'],'tax_rate'=>['taxRate'],'status'=>['status'],'comment'=>['comment'],'service_type'=>['serviceType'],'table_name'=>['table']]],
  'cashMovements'=>['table'=>'cash_movements','children'=>[],'map'=>['outlet_id'=>['outlet_id'],'movement_type'=>['type'],'type'=>['type'],'amount'=>['amount'],'reason'=>['reason'],'user_name'=>['user'],'movement_date'=>['date'],'created_at'=>['date']]],
  'stockHistory'=>['table'=>'stock_movements','children'=>[],'map'=>['outlet_id'=>['outlet_id'],'product_id'=>['productId'],'movement_type'=>['type'],'quantity'=>['change','quantity'],'quantity_change'=>['change','quantity'],'quantity_after'=>['quantityAfter'],'reference_no'=>['reference'],'reference'=>['reference'],'movement_date'=>['date'],'notes'=>['reason']]],
  'paymentTypes'=>['table'=>'payment_types','children'=>[],'map'=>['outlet_id'=>['outlet_id'],'name'=>['name'],'code'=>['code'],'enabled'=>['enabled'],'mark_paid'=>['markPaid'],'customer_required'=>['customerRequired'],'position'=>['position'],'active'=>['active']]],
  'promos'=>['table'=>'promotions','children'=>[],'map'=>['outlet_id'=>['outlet_id'],'name'=>['name','title'],'description'=>['description'],'active'=>['active'],'start_date'=>['startDate'],'end_date'=>['endDate'],'discount_type'=>['discountType'],'discount_value'=>['value'],'days_of_week'=>['daysOfWeek'],'notes'=>['notes']]],
  'suppliers'=>['table'=>'suppliers','children'=>[],'map'=>['outlet_id'=>['outlet_id'],'code'=>['code'],'name'=>['name'],'phone'=>['phone'],'email'=>['email'],'address'=>['address'],'active'=>['active']]],
  'zReports'=>['table'=>'end_of_day','children'=>[],'map'=>['outlet_id'=>['outlet_id'],'business_date'=>['date','businessDate'],'report_json'=>['report_json','data_json','notes'],'total_sales'=>['totalSales'],'total_cash'=>['totalCash'],'total_transactions'=>['totalTransactions'],'closed_at'=>['closedAt','date']]],
 ];
 if(!isset($maps[$stateKey])){ echo json_encode(['ok'=>true,'skipped'=>true,'reason'=>'No relational mapping for state key','state_key'=>$stateKey]);exit; }
 $spec=$maps[$stateKey]; if(!tableExists($pdo,$spec['table'])){echo json_encode(['ok'=>true,'skipped'=>true,'reason'=>'Table not present','table'=>$spec['table']]);exit;}
 $schema=cols($pdo,$spec['table']); $items=array_is_list($state)?$state:[$state]; $pdo->beginTransaction();$count=0;$childCount=0;
 foreach($items as $item){if(!is_array($item))continue;$localId=(string)($item['id']??$item['no']??$item['name']??uniqid());$dbId=upsertByMap($pdo,$spec['table'],$schema,$item,$spec['map'],$outletId,$localId,$stateKey);$count++;
   if($stateKey==='sales' && tableExists($pdo,'sale_items')){ $cs=cols($pdo,'sale_items'); foreach(($item['items']??[]) as $idx=>$it){$child=['sale_id'=>$dbId,'product_id'=>pick($it,['productId','id']), 'product_name'=>pick($it,['name','productName'],''), 'barcode'=>pick($it,['barcode']), 'quantity'=>pick($it,['qty','quantity'],0), 'unit_price'=>pick($it,['price','unitPrice'],0), 'discount'=>pick($it,['discount'],0), 'tax'=>pick($it,['tax'],0), 'line_total'=>((float)pick($it,['price','unitPrice'],0))*((float)pick($it,['qty','quantity'],0))]; $childMap=[]; foreach($child as $k=>$v)$childMap[$k]=[$k]; upsertChild($pdo,'sale_items',$cs,$child,$childMap,$outletId,$localId.'-'.$idx,$stateKey,$dbId);$childCount++; } }
   if($stateKey==='sales' && tableExists($pdo,'sale_payments')){ $cs=cols($pdo,'sale_payments'); foreach(($item['payments']??[]) as $idx=>$it){$child=['sale_id'=>$dbId,'payment_type_id'=>pick($it,['paymentTypeId']), 'payment_type_name'=>pick($it,['payment','name'],'Payment'), 'amount'=>pick($it,['amount'],0), 'tendered'=>pick($it,['tendered']), 'change_amount'=>pick($it,['change','changeAmount'],0), 'reference_no'=>pick($it,['referenceNo','reference']), 'created_at'=>pick($it,['date','paidAt'],date('Y-m-d H:i:s'))];$cm=[];foreach($child as $k=>$v)$cm[$k]=[$k];upsertChild($pdo,'sale_payments',$cs,$child,$cm,$outletId,$localId.'-'.$idx,$stateKey,$dbId);$childCount++;}}
   if($stateKey==='purchases' && tableExists($pdo,'purchase_items')){ $cs=cols($pdo,'purchase_items'); foreach(($item['items']??[]) as $idx=>$it){$child=['purchase_id'=>$dbId,'product_id'=>pick($it,['productId']), 'quantity'=>pick($it,['qty','quantity'],0),'qty'=>pick($it,['qty','quantity'],0),'cost'=>pick($it,['cost','price'],0),'cost_price'=>pick($it,['cost','price'],0),'tax_rate'=>pick($it,['taxRate'],0),'discount'=>pick($it,['discount'],0),'total'=>Number($it['qty']??0)*Number($it['cost']??0)];$cm=[];foreach($child as $k=>$v)$cm[$k]=[$k];upsertChild($pdo,'purchase_items',$cs,$child,$cm,$outletId,$localId.'-'.$idx,$stateKey,$dbId);$childCount++;}}
   if($stateKey==='orders' && tableExists($pdo,'open_order_items')){ $cs=cols($pdo,'open_order_items'); foreach(($item['items']??[]) as $idx=>$it){$child=['open_order_id'=>$dbId,'order_id'=>$dbId,'product_id'=>pick($it,['productId','id']),'product_name'=>pick($it,['name','productName']),'qty'=>pick($it,['qty','quantity'],0),'quantity'=>pick($it,['qty','quantity'],0),'unit_price'=>pick($it,['price','unitPrice'],0),'price'=>pick($it,['price','unitPrice'],0)];$cm=[];foreach($child as $k=>$v)$cm[$k]=[$k];upsertChild($pdo,'open_order_items',$cs,$child,$cm,$outletId,$localId.'-'.$idx,$stateKey,$dbId);$childCount++;}}
 }
 $pdo->commit(); echo json_encode(['ok'=>true,'state_key'=>$stateKey,'count'=>$count,'child_count'=>$childCount]);
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();http_response_code(500);echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);}
function Number($v):float{return (float)$v;}
function upsertChild(PDO $pdo,string $table,array $schema,array $data,array $map,int $outletId,string $localId,string $entity,int $parentDbId):int{
 $row=[]; foreach($map as $field=>$names){if(isset($schema[$field])){$v=pick($data,(array)$names,null);if($v!==null)$row[$field]=$v;}}
 if(isset($schema['outlet_id'])&&!isset($row['outlet_id']))$row['outlet_id']=$outletId;
 foreach($schema as $f=>$c){if($f==='id'||isset($row[$f]))continue;if($c['Null']==='NO'&&$c['Default']===null&&stripos((string)$c['Extra'],'auto_increment')===false){$type=strtolower((string)$c['Type']);$row[$f]=str_contains($type,'int')||str_contains($type,'decimal')||str_contains($type,'double')||str_contains($type,'float')?'0':'';}}
 $q=$pdo->prepare("SELECT db_id FROM sp_relational_sync WHERE outlet_id=? AND state_key=? AND local_id=? AND entity=? LIMIT 1");$q->execute([$outletId,$GLOBALS['stateKey'],$localId,$entity]);$id=(int)($q->fetchColumn()?:0);
 if($id){$u=$row;unset($u['id']);if($u){$set=implode(',',array_map(fn($k)=>"`$k`=?",array_keys($u)));$st=$pdo->prepare("UPDATE `$table` SET $set WHERE id=?");$st->execute([...array_values($u),$id]);}}
 else{$fields=array_keys($row);$st=$pdo->prepare("INSERT INTO `$table` (`".implode('`,`',$fields)."`) VALUES (".implode(',',array_fill(0,count($fields),'?')).")");$st->execute(array_values($row));$id=(int)$pdo->lastInsertId();}
 $m=$pdo->prepare("INSERT INTO sp_relational_sync(outlet_id,state_key,local_id,entity,db_id,updated_at) VALUES(?,?,?,?,?,NOW()) ON DUPLICATE KEY UPDATE db_id=VALUES(db_id),updated_at=NOW()");$m->execute([$outletId,$GLOBALS['stateKey'],$localId,$entity,$id]);return $id;
}
