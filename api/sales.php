<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
$config=require __DIR__.'/config.php';
$db=$config['db']??null;
$host=(string)($db['host']??$config['db_host']??'localhost');
$port=(string)($db['port']??$config['db_port']??'3306');
$name=(string)($db['name']??$config['db_name']??'');
$user=(string)($db['user']??$config['db_user']??'');
$pass=(string)($db['pass']??$config['db_pass']??'');
function body():array{ $v=json_decode(file_get_contents('php://input')?:'',true); return is_array($v)?$v:[]; }
function cols(PDO $pdo,string $table):array{ $q=$pdo->query('DESCRIBE `'.str_replace('`','``',$table).'`');$o=[];foreach($q->fetchAll() as $r)$o[$r['Field']]=$r;return $o; }
function pick(array $a,array $keys,$default=null){foreach($keys as $k){if(array_key_exists($k,$a)&&$a[$k]!==null&&$a[$k]!=='')return $a[$k];}return $default;}
function dt($v):?string{if($v===null||$v==='')return null;$s=str_replace('T',' ',(string)$v);$s=preg_replace('/\.\d+(Z)?$/','',$s);$s=str_replace('Z','',$s);$t=strtotime($s);return $t===false?null:date('Y-m-d H:i:s',$t);}
function writableRow(array $schema,array $map,array $data,int $outletId):array{
 $row=[];foreach($map as $f=>$keys){if(isset($schema[$f])){$v=pick($data,(array)$keys,null);if($v!==null)$row[$f]=$v;}}
 if(isset($schema['outlet_id']))$row['outlet_id']=$outletId;
 foreach(['sale_date','created_at','updated_at','payment_date','paid_at'] as $f){if(isset($row[$f]))$row[$f]=dt($row[$f]);}
 foreach($schema as $f=>$c){if($f==='id'||array_key_exists($f,$row))continue;if($c['Null']==='NO'&&$c['Default']===null&&stripos((string)$c['Extra'],'auto_increment')===false){$type=strtolower((string)$c['Type']);$row[$f]=str_contains($type,'int')||str_contains($type,'decimal')||str_contains($type,'double')||str_contains($type,'float')?'0':'';}}
 return $row;
}
function insertRow(PDO $pdo,string $table,array $row):int{$fields=array_keys($row);if(!$fields)throw new RuntimeException("No writable columns for $table");$sql="INSERT INTO `$table` (`".implode('`,`',$fields)."`) VALUES (".implode(',',array_fill(0,count($fields),'?')).")";$st=$pdo->prepare($sql);$st->execute(array_values($row));return (int)$pdo->lastInsertId();}
function updateRow(PDO $pdo,string $table,array $row,int $id):void{$u=$row;unset($u['id']);if(!$u)return;$set=implode(',',array_map(fn($k)=>"`$k`=?",array_keys($u)));$st=$pdo->prepare("UPDATE `$table` SET $set WHERE id=?");$st->execute([...array_values($u),$id]);}
try{
 if($name===''||$user==='')throw new RuntimeException('Database configuration is incomplete.');
 $pdo=new PDO("mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
 $b=body();$sale=$b['sale']??null;if(!is_array($sale))throw new InvalidArgumentException('sale is required.');
 $outlet=trim((string)($b['outlet_id']??'SP01'));if(ctype_digit($outlet))$outletId=(int)$outlet;else{$q=$pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? LIMIT 1');$q->execute([$outlet]);$outletId=(int)($q->fetchColumn()?:0);}if(!$outletId)throw new RuntimeException('Outlet not found: '.$outlet);
 $ss=cols($pdo,'sales');
 $map=['outlet_id'=>['outlet_id'],'sale_no'=>['no','saleNo','invoiceNo','invoice_number'],'sale_date'=>['date','saleDate'],'customer_id'=>['customerId','customer_id'],'order_name'=>['orderName','name'],'service_type'=>['serviceType'],'subtotal'=>['subtotal'],'discount'=>['discount'],'tax'=>['tax'],'total'=>['total'],'payment_status'=>['paymentStatus'],'status'=>['status'],'created_by'=>['createdBy','created_by','userId']];
 $row=writableRow($ss,$map,$sale,$outletId);
 $saleNo=(string)($row['sale_no']??'');if($saleNo==='')throw new RuntimeException('Sale number is required.');
 $q=$pdo->prepare('SELECT id FROM sales WHERE outlet_id=? AND sale_no=? LIMIT 1');$q->execute([$outletId,$saleNo]);$dbId=(int)($q->fetchColumn()?:0);
 $pdo->beginTransaction();
 if($dbId){updateRow($pdo,'sales',$row,$dbId);}else{$dbId=insertRow($pdo,'sales',$row);}
 if(isset($ss['payment_status'])){$st=$pdo->prepare('UPDATE sales SET payment_status=? WHERE id=?');$st->execute([(string)($sale['paymentStatus']??(isset($sale['paid'])&&$sale['paid']?'PAID':'UNPAID')),$dbId]);}
 if($pdo->query("SHOW TABLES LIKE 'sale_items'")->fetchColumn()){
   $is=cols($pdo,'sale_items');$del=$pdo->prepare('DELETE FROM sale_items WHERE sale_id=?');$del->execute([$dbId]);
   foreach($sale['items'] as $it){if(!is_array($it))continue;$cm=['sale_id'=>['sale_id'],'product_id'=>['productId','product_id','id'],'product_name'=>['name','productName'],'barcode'=>['barcode'],'quantity'=>['qty','quantity'],'qty'=>['qty','quantity'],'unit_price'=>['price','unitPrice'],'price'=>['price','unitPrice'],'discount'=>['discount'],'tax'=>['tax'],'line_total'=>['lineTotal','total']];$child=['sale_id'=>$dbId,'product_id'=>pick($it,['productId','product_id','id']), 'product_name'=>pick($it,['name','productName'],''),'barcode'=>pick($it,['barcode']), 'quantity'=>pick($it,['qty','quantity'],0),'qty'=>pick($it,['qty','quantity'],0),'unit_price'=>pick($it,['price','unitPrice'],0),'price'=>pick($it,['price','unitPrice'],0),'discount'=>pick($it,['discount'],0),'tax'=>pick($it,['tax'],0),'line_total'=>pick($it,['lineTotal','total'],((float)pick($it,['price','unitPrice'],0))*((float)pick($it,['qty','quantity'],0)))];$cr=writableRow($is,$cm,$child,$outletId);insertRow($pdo,'sale_items',$cr);}
 }
 if($pdo->query("SHOW TABLES LIKE 'sale_payments'")->fetchColumn()){
   $ps=cols($pdo,'sale_payments');$del=$pdo->prepare('DELETE FROM sale_payments WHERE sale_id=?');$del->execute([$dbId]);
   foreach(($sale['payments']??[]) as $pay){if(!is_array($pay))continue;$pm=['sale_id'=>['sale_id'],'payment_type_id'=>['paymentTypeId','payment_type_id'],'payment_type_name'=>['payment','name','paymentTypeName'],'amount'=>['amount'],'tendered'=>['tendered'],'change_amount'=>['change','changeAmount'],'reference_no'=>['referenceNo','reference'],'paid_at'=>['date','paidAt'],'created_at'=>['date','paidAt']];$child=['sale_id'=>$dbId,'payment_type_id'=>pick($pay,['paymentTypeId','payment_type_id']),'payment_type_name'=>pick($pay,['payment','name','paymentTypeName'],'Payment'),'amount'=>pick($pay,['amount'],0),'tendered'=>pick($pay,['tendered']), 'change_amount'=>pick($pay,['change','changeAmount'],0),'reference_no'=>pick($pay,['referenceNo','reference']),'paid_at'=>pick($pay,['date','paidAt'],date('Y-m-d H:i:s')),'created_at'=>pick($pay,['date','paidAt'],date('Y-m-d H:i:s'))];$cr=writableRow($ps,$pm,$child,$outletId);insertRow($pdo,'sale_payments',$cr);}
 }
 $pdo->commit();echo json_encode(['ok'=>true,'sale_id'=>$dbId,'sale_no'=>$saleNo]);
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();http_response_code(500);echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);}
