<?php
declare(strict_types=1);
require_once __DIR__ . '/security.php';
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$config = require __DIR__ . '/config.php';
$db = $config['db'] ?? null;
$host = (string)($db['host'] ?? $config['db_host'] ?? 'localhost');
$port = (string)($db['port'] ?? $config['db_port'] ?? '3306');
$name = (string)($db['name'] ?? $config['db_name'] ?? '');
$user = (string)($db['user'] ?? $config['db_user'] ?? '');
$pass = (string)($db['pass'] ?? $config['db_pass'] ?? '');

function body(): array { $v=json_decode(file_get_contents('php://input') ?: '', true); return is_array($v) ? $v : []; }
function cols(PDO $pdo, string $table): array { $q=$pdo->query('DESCRIBE `'.str_replace('`','``',$table).'`'); $o=[]; foreach($q->fetchAll() as $r)$o[$r['Field']]=$r; return $o; }
function tableExists(PDO $pdo,string $table): bool { $q=$pdo->prepare('SHOW TABLES LIKE ?'); $q->execute([$table]); return (bool)$q->fetchColumn(); }
function pick(array $a,array $keys,$default=null){ foreach($keys as $k){ if(array_key_exists($k,$a)&&$a[$k]!==null&&$a[$k]!=='') return $a[$k]; } return $default; }
function dt($v): ?string { if($v===null||$v==='')return null; $s=str_replace('T',' ',(string)$v); $s=preg_replace('/\.\d+(Z)?$/','',$s); $s=str_replace('Z','',$s); $t=strtotime($s); return $t===false?null:date('Y-m-d H:i:s',$t); }
function scopedId(PDO $pdo,string $table,int $candidate,int $outletId): int {
  if($candidate<=0||!tableExists($pdo,$table))return 0; $schema=cols($pdo,$table); $sql='SELECT id FROM `'.$table.'` WHERE id=?'; $args=[$candidate];
  if(isset($schema['outlet_id'])){$sql.=' AND outlet_id=?';$args[]=$outletId;} $sql.=' LIMIT 1'; $q=$pdo->prepare($sql);$q->execute($args);return (int)($q->fetchColumn()?:0);
}
function insertRow(PDO $pdo,string $table,array $row): int { $fields=array_keys($row); if(!$fields)throw new RuntimeException("No writable columns for $table"); $sql="INSERT INTO `$table` (`".implode('`,`',$fields)."`) VALUES (".implode(',',array_fill(0,count($fields),'?')).")"; $st=$pdo->prepare($sql);$st->execute(array_values($row));return(int)$pdo->lastInsertId(); }
function updateRow(PDO $pdo,string $table,array $row,int $id): void { $u=$row;unset($u['id']);if(!$u)return;$set=implode(',',array_map(fn($k)=>"`$k`=?",array_keys($u)));$st=$pdo->prepare("UPDATE `$table` SET $set WHERE id=?");$st->execute([...array_values($u),$id]); }
function writeRow(array $schema,array $map,array $data,int $outletId): array {
  $row=[]; foreach($map as $field=>$keys){ if(isset($schema[$field])){$v=pick($data,(array)$keys,null);$type=strtolower((string)($schema[$field]['Type']??''));if($field==='created_by'&&preg_match('/^(tinyint|smallint|mediumint|int|bigint)/',$type)){$actorId=(int)($_SERVER['SP_AUTH_USER_ID']??0);if($actorId>0)$v=$actorId;elseif($v!==null&&preg_match('/^\d+$/',trim((string)$v)))$v=(int)$v;elseif($v!==null&&($schema[$field]['Null']??'YES')!=='YES')continue;else$v=null;}if($v!==null)$row[$field]=$v;elseif($field==='created_by'&&($schema[$field]['Null']??'YES')==='YES')$row[$field]=null;} }
  if(isset($schema['outlet_id']))$row['outlet_id']=$outletId;
  foreach(['sale_date','created_at','updated_at','paid_at'] as $f) if(array_key_exists($f,$row)) $row[$f]=dt($row[$f]);
  foreach($schema as $f=>$c){
    if($f==='id'||array_key_exists($f,$row))continue;
    if($c['Null']==='NO'&&$c['Default']===null&&stripos((string)$c['Extra'],'auto_increment')===false){
      $type=strtolower((string)$c['Type']);
      $row[$f]=(str_contains($type,'int')||str_contains($type,'decimal')||str_contains($type,'double')||str_contains($type,'float'))?0:'';
    }
  }
  return $row;
}
function resolveOutlet(PDO $pdo,string $outlet): int { if(ctype_digit($outlet))return(int)$outlet;$q=$pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? LIMIT 1');$q->execute([$outlet]);return(int)($q->fetchColumn()?:0); }
function resolveCustomer(PDO $pdo,int $outletId,array $sale): int {
  if(!tableExists($pdo,'customers')) return 0; $schema=cols($pdo,'customers');
  foreach(['customerDbId','customer_id','customerId'] as $k){$c=(int)($sale[$k]??0);if($c>0){$id=scopedId($pdo,'customers',$c,$outletId);if($id)return$id;}}
  $customer=is_array($sale['customer']??null)?$sale['customer']:[];
  $code=trim((string)pick($customer,['code','customerCode','customer_code'],pick($sale,['customerCode','customer_code'],'')));
  $phone=trim((string)pick($customer,['phone','phoneNumber','phone_number'],pick($sale,['phone','phoneNumber','phone_number'],'')));
  $name=trim((string)pick($customer,['name','customerName','customer_name'],pick($sale,['customerName','customer_name'],'')));
  foreach([['code',$code],['phone',$phone],['name',$name]] as [$field,$value]){
    if($value!==''&&isset($schema[$field])){ $sql='SELECT id FROM customers WHERE `'.$field.'`=?';$args=[$value];if(isset($schema['outlet_id'])){$sql.=' AND (outlet_id=? OR outlet_id IS NULL)';$args[]=$outletId;}$sql.=' ORDER BY id ASC LIMIT 1';$q=$pdo->prepare($sql);$q->execute($args);$id=(int)($q->fetchColumn()?:0);if($id)return$id; }
  }
  return 0;
}

function ensureProductOutletTableSales(PDO $pdo): void { spEnsureProductOutletTable($pdo); }
function ensureSaleItemMetadataColumns(PDO $pdo):void{if(!tableExists($pdo,'sale_items'))return;$schema=cols($pdo,'sale_items');foreach(['warranty_enabled'=>'TINYINT(1) NOT NULL DEFAULT 0','warranty_years'=>'INT NOT NULL DEFAULT 0','maintenance_enabled'=>'TINYINT(1) NOT NULL DEFAULT 0','maintenance_count'=>'INT NOT NULL DEFAULT 0'] as $field=>$definition)if(!isset($schema[$field]))$pdo->exec('ALTER TABLE sale_items ADD COLUMN `'.$field.'` '.$definition);}
function ensureSalesProductOutlet(PDO $pdo,int $productId,int $outletId): void {ensureProductOutletTableSales($pdo);$q=$pdo->prepare('SELECT id FROM product_outlets WHERE product_id=? AND outlet_id=? LIMIT 1');$q->execute([$productId,$outletId]);if($q->fetchColumn())return;$q=$pdo->prepare('SELECT selling_price,cost_price,min_stock,allow_price_change FROM products WHERE id=? LIMIT 1');$q->execute([$productId]);$p=$q->fetch()?:[];$st=$pdo->prepare('INSERT INTO product_outlets(product_id,outlet_id,active,selling_price,cost_price,stock_qty,min_stock,allow_price_change) VALUES(?,?,?,?,?,?,?,?)');$st->execute([$productId,$outletId,1,$p['selling_price']??0,$p['cost_price']??0,0,$p['min_stock']??0,$p['allow_price_change']??0]);}
function isServiceProductSales(PDO $pdo,int $productId):bool{if(!tableExists($pdo,'products'))return false;$schema=cols($pdo,'products');if(!isset($schema['is_service']))return false;$q=$pdo->prepare('SELECT is_service FROM products WHERE id=? LIMIT 1');$q->execute([$productId]);return(bool)$q->fetchColumn();}
function adjustStock(PDO $pdo,int $outletId,int $productId,float $delta,string $saleNo,int $saleId):void{
  if($productId<=0||abs($delta)<0.0000001||isServiceProductSales($pdo,$productId))return;
  ensureProductOutletTableSales($pdo);ensureSalesProductOutlet($pdo,$productId,$outletId);
  $before=currentStock($pdo,$outletId,$productId);
  $q=$pdo->prepare('UPDATE product_outlets SET stock_qty=stock_qty+?,updated_at=NOW() WHERE product_id=? AND outlet_id=? LIMIT 1');
  $q->execute([$delta,$productId,$outletId]);
  if($q->rowCount()!==1)throw new RuntimeException('Outlet stock could not be updated for this sale.');
  $after=currentStock($pdo,$outletId,$productId);
  if(!tableExists($pdo,'stock_movements'))return;
  $schema=cols($pdo,'stock_movements');
  $price=$pdo->prepare('SELECT cost_price FROM product_outlets WHERE product_id=? AND outlet_id=? LIMIT 1');$price->execute([$productId,$outletId]);
  $data=['outlet_id'=>$outletId,'product_id'=>$productId,'movement_type'=>$delta<0?'SALE':'SALE_REVERSAL','reference_type'=>'SALE','reference_id'=>$saleId,'reference_no'=>$saleNo,'quantity'=>$delta,'stock_before'=>$before,'stock_after'=>$after,'unit_cost'=>(float)($price->fetchColumn()?:0),'notes'=>'Sale '.$saleNo,'created_by'=>(int)($_SERVER['SP_AUTH_USER_ID']??0)?:null,'created_at'=>date('Y-m-d H:i:s')];
  $row=[];foreach($data as $field=>$value)if(isset($schema[$field]))$row[$field]=$value;
  foreach($schema as $field=>$meta){if($field==='id'||array_key_exists($field,$row))continue;if(($meta['Null']??'YES')==='NO'&&($meta['Default']??null)===null&&stripos((string)($meta['Extra']??''),'auto_increment')===false)throw new RuntimeException('Required database column missing for stock_movements: '.$field);}
  if($row){$fields=array_keys($row);$sql='INSERT INTO stock_movements (`'.implode('`,`',$fields).'`) VALUES ('.implode(',',array_fill(0,count($fields),'?')).')';$pdo->prepare($sql)->execute(array_values($row));}
}

function resolveProduct(PDO $pdo,int $outletId,array $item): int {
  if(!tableExists($pdo,'products')) throw new RuntimeException('Products table is missing.'); ensureProductOutletTableSales($pdo);
  foreach(['productDbId','product_id','productId','id'] as $k){$c=(int)($item[$k]??0);if($c>0){$q=$pdo->prepare('SELECT p.id FROM products p INNER JOIN product_outlets po ON po.product_id=p.id AND po.outlet_id=? AND po.active=1 WHERE p.id=? LIMIT 1');$q->execute([$outletId,$c]);$id=(int)($q->fetchColumn()?:0);if($id)return$id;}}
  $schema=cols($pdo,'products');$code=trim((string)pick($item,['productCode','code','sku'],''));foreach(['product_code','sku','code'] as $field){if($code!==''&&isset($schema[$field])){$q=$pdo->prepare('SELECT p.id FROM products p INNER JOIN product_outlets po ON po.product_id=p.id AND po.outlet_id=? AND po.active=1 WHERE p.`'.$field.'`=? LIMIT 1');$q->execute([$outletId,$code]);$id=(int)($q->fetchColumn()?:0);if($id)return$id;}}
  $barcode=trim((string)pick($item,['barcode'],''));if($barcode!==''&&isset($schema['barcode'])){$q=$pdo->prepare('SELECT p.id FROM products p INNER JOIN product_outlets po ON po.product_id=p.id AND po.outlet_id=? AND po.active=1 WHERE p.barcode=? LIMIT 1');$q->execute([$outletId,$barcode]);$id=(int)($q->fetchColumn()?:0);if($id)return$id;}
  $name=trim((string)pick($item,['productName','name'],''));foreach(['product_name','name'] as $field){if($name!==''&&isset($schema[$field])){$q=$pdo->prepare('SELECT p.id FROM products p INNER JOIN product_outlets po ON po.product_id=p.id AND po.outlet_id=? AND po.active=1 WHERE p.`'.$field.'`=? ORDER BY p.id ASC LIMIT 1');$q->execute([$outletId,$name]);$id=(int)($q->fetchColumn()?:0);if($id)return$id;}}
  throw new RuntimeException('Sale item product was not found in the current outlet: '.($name!==''?$name:$code));
}
function resolvePaymentType(PDO $pdo,int $outletId,array $pay): int {
  if(!tableExists($pdo,'payment_types'))return 0;$schema=cols($pdo,'payment_types');
  foreach(['paymentTypeDbId','payment_type_db_id','paymentTypeId','payment_type_id'] as $k){$c=(int)($pay[$k]??0);if($c>0){$id=scopedId($pdo,'payment_types',$c,$outletId);if($id)return$id;}}
  $code=trim((string)pick($pay,['paymentCode','payment_code','code'],''));$name=trim((string)pick($pay,['payment','name','paymentTypeName','payment_name'],''));
  foreach([['payment_code',$code],['code',$code],['payment_name',$name],['name',$name]] as [$field,$value]){if($value!==''&&isset($schema[$field])){ $sql='SELECT id FROM payment_types WHERE `'.$field.'`=?';$args=[$value];if(isset($schema['outlet_id'])){$sql.=' AND outlet_id=?';$args[]=$outletId;}$sql.=' ORDER BY id ASC LIMIT 1';$q=$pdo->prepare($sql);$q->execute($args);$id=(int)($q->fetchColumn()?:0);if($id)return$id; }}

  // Multi-outlet safeguard: if the payment type exists in another outlet but is
  // missing from the current outlet, provision a copy automatically. This keeps
  // sale_payments.payment_type_id valid without ever attaching a payment row from
  // another outlet. Existing target-outlet settings are never overwritten.
  if($code!==''||$name!==''){
    $sourceSql='SELECT * FROM payment_types WHERE 1=1';$args=[];
    if($code!==''&&isset($schema['payment_code'])){$sourceSql.=' AND payment_code=?';$args[]=$code;}
    elseif($name!==''&&isset($schema['payment_name'])){$sourceSql.=' AND payment_name=?';$args[]=$name;}
    if(isset($schema['outlet_id']))$sourceSql.=' AND outlet_id<>?';
    if(isset($schema['outlet_id']))$args[]=$outletId;
    $sourceSql.=' ORDER BY id ASC LIMIT 1';
    $q=$pdo->prepare($sourceSql);$q->execute($args);$src=$q->fetch();
    if($src){
      $fields=[];$vals=[];
      foreach($schema as $f=>$c){
        if($f==='id')continue;
        if($f==='outlet_id'){$fields[]='`outlet_id`';$vals[]=$outletId;continue;}
        if(array_key_exists($f,$src)){$fields[]='`'.$f.'`';$vals[]=$src[$f];}
      }
      if($fields){
        $ins=$pdo->prepare('INSERT INTO payment_types ('.implode(',',$fields).') VALUES ('.implode(',',array_fill(0,count($fields),'?')).')');
        try{$ins->execute($vals);return(int)$pdo->lastInsertId();}catch(Throwable $e){
          // Another request may have created it concurrently; resolve it once more.
          foreach([['payment_code',$code],['payment_name',$name]] as [$field,$value]){
            if($value!==''&&isset($schema[$field])){
              $qq=$pdo->prepare('SELECT id FROM payment_types WHERE `'.$field.'`=?'.(isset($schema['outlet_id'])?' AND outlet_id=?':'').' ORDER BY id ASC LIMIT 1');
              $qa=isset($schema['outlet_id'])?[$value,$outletId]:[$value];$qq->execute($qa);$rid=(int)($qq->fetchColumn()?:0);if($rid)return$rid;
            }
          }
        }
      }
    }
  }
  return 0;
}
function ensureCounterTable(PDO $pdo): void { if(!tableExists($pdo,'sp_document_counters'))$pdo->exec("CREATE TABLE sp_document_counters(outlet_id BIGINT UNSIGNED NOT NULL,doc_type VARCHAR(40) NOT NULL,current_number BIGINT UNSIGNED NOT NULL DEFAULT 0,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY(outlet_id,doc_type)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); }
function nextCounter(PDO $pdo,int $outletId,string $type): int { ensureCounterTable($pdo);$q=$pdo->prepare('SELECT current_number FROM sp_document_counters WHERE outlet_id=? AND doc_type=? FOR UPDATE');$q->execute([$outletId,$type]);$r=$q->fetch();if($r){$n=(int)$r['current_number']+1;$pdo->prepare('UPDATE sp_document_counters SET current_number=?,updated_at=NOW() WHERE outlet_id=? AND doc_type=?')->execute([$n,$outletId,$type]);return$n;} $pdo->prepare('INSERT INTO sp_document_counters(outlet_id,doc_type,current_number,updated_at) VALUES(?,?,1,NOW())')->execute([$outletId,$type]);return 1; }
function generateSaleNo(PDO $pdo,int $outletId,?int $exceptId=null): string { for($i=0;$i<100;$i++){ $candidate='INV-'.str_pad((string)nextCounter($pdo,$outletId,'Invoice'),8,'0',STR_PAD_LEFT);$sql='SELECT id FROM sales WHERE outlet_id=? AND sale_no=?';$args=[$outletId,$candidate];if($exceptId){$sql.=' AND id<>?';$args[]=$exceptId;} $sql.=' LIMIT 1';$q=$pdo->prepare($sql);$q->execute($args);if(!$q->fetchColumn())return$candidate; }throw new RuntimeException('Unable to generate a unique sale number.'); }
function stockCol(array $schema): ?string { foreach(['stock_qty','stock','quantity','current_stock'] as $f)if(isset($schema[$f]))return$f;return null; }
function currentStock(PDO $pdo,int $outletId,int $productId):float{ensureProductOutletTableSales($pdo);ensureSalesProductOutlet($pdo,$productId,$outletId);$q=$pdo->prepare('SELECT stock_qty FROM product_outlets WHERE product_id=? AND outlet_id=? LIMIT 1');$q->execute([$productId,$outletId]);return(float)($q->fetchColumn()??0);}
function refreshLoyalty(PDO $pdo,int $outletId,int $customerId):void{if($customerId<=0||!tableExists($pdo,'customers')||!tableExists($pdo,'sales'))return;$sql="SELECT COUNT(*) visits,COALESCE(SUM(total),0) spend FROM sales WHERE outlet_id=? AND customer_id=? AND UPPER(COALESCE(status,'')) NOT IN ('VOID','VOIDED','REFUND','REFUNDED') AND UPPER(COALESCE(payment_status,''))='PAID'";$q=$pdo->prepare($sql);$q->execute([$outletId,$customerId]);$a=$q->fetch()?:['visits'=>0,'spend'=>0];$vis=(int)$a['visits'];$sp=(float)$a['spend'];$pts=floor(max(0,$sp));$cs=cols($pdo,'customers');$set=[];$args=[];foreach([['visits',$vis],['spend',$sp],['loyalty_points',$pts]] as [$c,$v])if(isset($cs[$c])){$set[]='`'.$c.'`=?';$args[]=$v;}if($set){$args[]=$customerId;$args[]=$outletId;$where='id=?'.(isset($cs['outlet_id'])?' AND (outlet_id=? OR outlet_id IS NULL)':'');$pdo->prepare('UPDATE customers SET '.implode(',',$set).' WHERE '.$where.' LIMIT 1')->execute($args);}
  if(tableExists($pdo,'loyalty_accounts')){$la=cols($pdo,'loyalty_accounts');$fields=[];$vals=[];foreach([['outlet_id',$outletId],['customer_id',$customerId],['points_balance',$pts],['visits',$vis],['total_spend',$sp],['active',1]] as [$f,$v])if(isset($la[$f])){$fields[]='`'.$f.'`';$vals[]=$v;}$upd=[];foreach(['points_balance','visits','total_spend','active'] as $f)if(isset($la[$f]))$upd[]='`'.$f.'`=VALUES(`'.$f.'`)';if($fields){$sql='INSERT INTO loyalty_accounts ('.implode(',',$fields).') VALUES ('.implode(',',array_fill(0,count($fields),'?')).')';if($upd)$sql.=' ON DUPLICATE KEY UPDATE '.implode(',',$upd);$pdo->prepare($sql)->execute($vals);}}
}

try{
  if($name===''||$user==='')throw new RuntimeException('Database configuration is incomplete.');
  $pdo=new PDO("mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
  $b=body();$sale=$b['sale']??null;if(!is_array($sale))throw new InvalidArgumentException('Sale data is required.');
  foreach(['sales','sale_items'] as $requiredTable)if(!tableExists($pdo,$requiredTable))throw new RuntimeException('Required database table is missing: '.$requiredTable.'. The sale cannot be saved safely.');
  if(!empty($sale['payments'])&&!tableExists($pdo,'sale_payments'))throw new RuntimeException('Required database table is missing: sale_payments. Payment details cannot be saved safely.');
  $outlet=trim((string)($b['outlet_id']??($_SERVER['SP_AUTH_OUTLET_ID']??'')));$outletId=resolveOutlet($pdo,$outlet);if(!$outletId)throw new RuntimeException('Outlet not found: '.$outlet);
  if(!tableExists($pdo,'sales'))throw new RuntimeException('Sales table is missing from the database.');
  spEnsureStockMovementMetadata($pdo);
  spEnsureProductOutletTable($pdo);
  ensureSaleItemMetadataColumns($pdo);
  ensureCounterTable($pdo);
  $pdo->beginTransaction();
  $saleIdCandidate=(int)($sale['dbId']??$sale['saleDbId']??0);$dbId=$saleIdCandidate>0?scopedId($pdo,'sales',$saleIdCandidate,$outletId):0;
  $saleNo=trim((string)pick($sale,['no','saleNo','invoiceNo','invoice_number'],''));
  if($saleNo===''||in_array(strtolower($saleNo),['auto generated','auto-generated','automatic','auto'],true))$saleNo=generateSaleNo($pdo,$outletId,$dbId?:null);
  if(!$dbId){$q=$pdo->prepare('SELECT id FROM sales WHERE outlet_id=? AND sale_no=? LIMIT 1');$q->execute([$outletId,$saleNo]);$dbId=(int)($q->fetchColumn()?:0);}
  $customerId=resolveCustomer($pdo,$outletId,$sale); if($customerId>0)$sale['customerId']=$customerId;
  $ss=cols($pdo,'sales');$map=['outlet_id'=>['outlet_id'],'sale_no'=>['no','saleNo','invoiceNo','invoice_number'],'sale_date'=>['date','saleDate'],'customer_id'=>['customerId','customer_id'],'order_name'=>['orderName','name'],'service_type'=>['serviceType'],'subtotal'=>['subtotal'],'discount'=>['discount'],'tax'=>['tax'],'total'=>['total'],'payment_status'=>['paymentStatus'],'status'=>['status'],'created_by'=>['createdBy','created_by','userId'],'notes'=>['internalNote','note','notes']];
  $row=writeRow($ss,$map,[...$sale,'no'=>$saleNo,'saleNo'=>$saleNo,'invoiceNo'=>$saleNo],$outletId);if(isset($ss['payment_status'])&&!isset($row['payment_status']))$row['payment_status']=!empty($sale['paid'])?'PAID':'UNPAID';if(isset($ss['status'])&&!isset($row['status']))$row['status']='COMPLETED';
  // Capture old stock before replacing children when updating an existing sale.
  $oldQty=[];$oldActive=false;if($dbId>0&&tableExists($pdo,'sale_items')){$q=$pdo->prepare('SELECT product_id,quantity FROM sale_items WHERE sale_id=?');$q->execute([$dbId]);foreach($q->fetchAll() as $r){$p=(int)$r['product_id'];$oldQty[$p]=($oldQty[$p]??0)+(float)$r['quantity'];}$q2=$pdo->prepare('SELECT * FROM sales WHERE id=? LIMIT 1');$q2->execute([$dbId]);$oldRow=$q2->fetch()?:[];$st=strtolower((string)($oldRow['status']??''));$oldActive=empty($oldRow['voided'])&&empty($oldRow['refunded'])&&!in_array($st,['void','voided','refund','refunded','cancelled','canceled'],true);}
  if($dbId)updateRow($pdo,'sales',$row,$dbId);else$dbId=insertRow($pdo,'sales',$row);
  $newQty=[];$items=$sale['items']??[];if(!is_array($items))$items=[];foreach($items as $it){if(!is_array($it))continue;$pid=resolveProduct($pdo,$outletId,$it);$qty=(float)pick($it,['qty','quantity'],0);$newQty[$pid]=($newQty[$pid]??0)+$qty;}
  $newStatus=strtolower((string)pick($sale,['status'],'COMPLETED'));$newActive=!in_array($newStatus,['void','voided','refund','refunded','cancelled','canceled'],true)&&empty($sale['voided'])&&empty($sale['refunded']);
  foreach(array_unique(array_merge(array_keys($oldQty),array_keys($newQty))) as $pid){$oldConsumed=$oldActive?(float)($oldQty[$pid]??0):0.0;$newConsumed=$newActive?(float)($newQty[$pid]??0):0.0;$delta=$oldConsumed-$newConsumed;if(abs($delta)>1e-9)adjustStock($pdo,$outletId,(int)$pid,$delta,$saleNo,$dbId);}
  if(tableExists($pdo,'sale_items')){$is=cols($pdo,'sale_items');$pdo->prepare('DELETE FROM sale_items WHERE sale_id=?')->execute([$dbId]);$mapI=['sale_id'=>['sale_id'],'product_id'=>['productDbId','product_id','productId','id'],'product_name'=>['name','productName'],'barcode'=>['barcode'],'quantity'=>['qty','quantity'],'unit_price'=>['price','unitPrice'],'discount'=>['discount'],'tax'=>['tax'],'line_total'=>['lineTotal','total'],'warranty_enabled'=>['warrantyEnabled','warranty_enabled'],'warranty_years'=>['warrantyYears','warranty_years'],'maintenance_enabled'=>['maintenanceEnabled','maintenance_enabled'],'maintenance_count'=>['maintenanceCount','maintenance_count']];foreach($items as $it){if(!is_array($it))continue;$pid=resolveProduct($pdo,$outletId,$it);$child=[...$it,'sale_id'=>$dbId,'productDbId'=>$pid,'product_id'=>$pid,'productId'=>$pid];insertRow($pdo,'sale_items',writeRow($is,$mapI,$child,$outletId));}}
  if(tableExists($pdo,'sale_payments')){$ps=cols($pdo,'sale_payments');$pdo->prepare('DELETE FROM sale_payments WHERE sale_id=?')->execute([$dbId]);$pays=$sale['payments']??[];if(!is_array($pays))$pays=[];$mapP=['sale_id'=>['sale_id'],'payment_type_id'=>['paymentTypeDbId','payment_type_id','paymentTypeId'],'payment_type_name'=>['payment','name','paymentTypeName','payment_name'],'amount'=>['amount'],'tendered'=>['tendered'],'change_amount'=>['change','changeAmount'],'reference_no'=>['referenceNo','reference'],'paid_at'=>['paidAt','date'],'created_at'=>['paidAt','date']];foreach($pays as $pay){if(!is_array($pay))continue;$ptid=resolvePaymentType($pdo,$outletId,$pay);if(isset($ps['payment_type_id'])&&$ps['payment_type_id']['Null']==='NO'&&$ptid<=0)throw new RuntimeException('Payment type is not available for the current outlet. Please refresh Payment Types and try again.');$child=[...$pay,'sale_id'=>$dbId,'paymentTypeDbId'=>$ptid?:null,'payment_type_id'=>$ptid?:null,'payment_type_name'=>pick($pay,['payment','name','paymentTypeName','payment_name'],'Payment'),'paidAt'=>pick($pay,['paidAt','date'],date('Y-m-d H:i:s'))];insertRow($pdo,'sale_payments',writeRow($ps,$mapP,$child,$outletId));}}
  if($customerId>0)refreshLoyalty($pdo,$outletId,$customerId);
  $pdo->commit();
  echo json_encode(['ok'=>true,'api_version'=>'V11','sale_id'=>$dbId,'sale_no'=>$saleNo,'outlet_id'=>$outletId],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();http_response_code(500);echo json_encode(['ok'=>false,'api_version'=>'V11','error'=>$e->getMessage()],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);}
