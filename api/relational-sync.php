<?php
declare(strict_types=1);
require_once __DIR__ . '/security.php';
header('Content-Type: application/json; charset=utf-8');
header('X-SP-Manager-DB-Version: V10');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$config = require __DIR__ . '/config.php';
$db = $config['db'] ?? null;
$host = (string)($db['host'] ?? $config['db_host'] ?? 'localhost');
$port = (string)($db['port'] ?? $config['db_port'] ?? '3306');
$name = (string)($db['name'] ?? $config['db_name'] ?? '');
$user = (string)($db['user'] ?? $config['db_user'] ?? '');
$pass = (string)($db['pass'] ?? $config['db_pass'] ?? '');
if ($name === '' || $user === '') throw new RuntimeException('Database configuration is incomplete.');

function body(): array {
  $v = json_decode(file_get_contents('php://input') ?: '', true);
  return is_array($v) ? $v : [];
}
function tableExists(PDO $pdo, string $table): bool {
  $q = $pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?');
  $q->execute([$table]);
  return (int)$q->fetchColumn() > 0;
}
function cols(PDO $pdo, string $table): array {
  static $cache = [];
  if (isset($cache[$table])) return $cache[$table];
  $q = $pdo->query('DESCRIBE `'.str_replace('`', '``', $table).'`');
  $out = [];
  foreach ($q->fetchAll() as $r) $out[(string)$r['Field']] = $r;
  return $cache[$table] = $out;
}
function childRows(PDO $pdo, string $table, string $fk, int $id): array {
  if (!tableExists($pdo, $table)) throw new RuntimeException('Required detail table is missing: '.$table);
  $schema = cols($pdo, $table);
  if (!isset($schema[$fk])) throw new RuntimeException('Required detail column is missing: '.$table.'.'.$fk);
  $q = $pdo->prepare('SELECT * FROM `'.str_replace('`','``',$table).'` WHERE `'.str_replace('`','``',$fk).'`=? ORDER BY id ASC');
  $q->execute([$id]);
  return $q->fetchAll();
}

function pick(array $a, array $names, $default = null) {
  foreach ($names as $n) {
    if (array_key_exists($n, $a) && $a[$n] !== null && $a[$n] !== '') return $a[$n];
  }
  return $default;
}
function toDateTime($v): ?string {
  if ($v === null || $v === '') return null;
  $s = trim(str_replace('T', ' ', (string)$v));
  $s = preg_replace('/\.\d+(Z)?$/', '', $s);
  $s = str_replace('Z', '', $s);
  $t = strtotime($s);
  return $t === false ? null : date('Y-m-d H:i:s', $t);
}
function valueForColumn(string $column, $value, array $meta) {
  $type = strtolower((string)($meta['Type'] ?? ''));
  if ($value === null) return null;
  if (preg_match('/json|text/', $type) && is_array($value)) return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  if (str_contains($type, 'date') || str_contains($type, 'timestamp')) {
    return toDateTime($value) ?? (str_contains($type, 'date') && !str_contains($type, 'time') ? null : null);
  }
  return $value;
}
function writableRow(array $schema, array $aliases, array $data, int $outletId): array {
  $row = [];
  foreach ($aliases as $field => $names) {
    if (!isset($schema[$field])) continue;
    $v = pick($data, (array)$names, null);
    $type = strtolower((string)($schema[$field]['Type'] ?? ''));
    if (in_array($field, ['created_by','closed_by'], true) && preg_match('/^(tinyint|smallint|mediumint|int|bigint)/', $type)) {
      $actorId = (int)($_SERVER['SP_AUTH_USER_ID'] ?? 0);
      if ($actorId > 0) $v = $actorId;
      elseif ($v !== null && preg_match('/^\d+$/', trim((string)$v))) $v = (int)$v;
      elseif ($v !== null && ($schema[$field]['Null'] ?? 'YES') !== 'YES') continue;
    }
    if ($v !== null) $row[$field] = valueForColumn($field, $v, $schema[$field]);
    elseif (in_array($field, ['created_by','closed_by'], true) && isset($schema[$field]) && ($schema[$field]['Null'] ?? 'YES') === 'YES') $row[$field] = null;
  }
  if (isset($schema['outlet_id'])) $row['outlet_id'] = $outletId;
  if (isset($schema['active']) && !array_key_exists('active', $row)) $row['active'] = 1;
  if (isset($schema['enabled']) && !array_key_exists('enabled', $row)) $row['enabled'] = 1;
  return $row;
}
function validateRequired(array $schema, array $row, string $table): void {
  foreach ($schema as $field => $meta) {
    if ($field === 'id' || array_key_exists($field, $row)) continue;
    if (($meta['Null'] ?? 'YES') !== 'NO' || ($meta['Default'] ?? null) !== null || stripos((string)($meta['Extra'] ?? ''), 'auto_increment') !== false) continue;
    throw new RuntimeException("Required database column missing for {$table}: {$field}");
  }
}
function insertRow(PDO $pdo, string $table, array $row): int {
  if (!$row) throw new RuntimeException("No writable columns for {$table}");
  $fields = array_keys($row);
  $sql = 'INSERT INTO `'.$table.'` (`'.implode('`,`', $fields).'`) VALUES ('.implode(',', array_fill(0, count($fields), '?')).')';
  $st = $pdo->prepare($sql);
  $st->execute(array_values($row));
  return (int)$pdo->lastInsertId();
}
function updateRow(PDO $pdo, string $table, array $row, int $id): void {
  $u = $row;
  unset($u['id']);
  if (!$u) return;
  $set = implode(',', array_map(fn($k) => '`'.$k.'`=?', array_keys($u)));
  $st = $pdo->prepare('UPDATE `'.$table.'` SET '.$set.' WHERE id=? LIMIT 1');
  $st->execute([...array_values($u), $id]);
}
function resolveOutletId(PDO $pdo, string $outlet): int {
  $outlet = trim($outlet ?: 'SP01');
  if (ctype_digit($outlet)) {
    $q = $pdo->prepare('SELECT id FROM outlets WHERE id=? AND active=1 LIMIT 1');
    $q->execute([(int)$outlet]);
  } else {
    $q = $pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND active=1 LIMIT 1');
    $q->execute([$outlet]);
  }
  $id = (int)($q->fetchColumn() ?: 0);
  if (!$id) throw new RuntimeException('Outlet not found: '.$outlet);
  return $id;
}
function masterOutletId(PDO $pdo): int {
  $q=$pdo->query("SELECT id FROM outlets WHERE outlet_code='SP01' AND active=1 LIMIT 1");
  $id=(int)($q->fetchColumn()?:0);
  if($id>0)return $id;
  $q=$pdo->query('SELECT id FROM outlets WHERE active=1 ORDER BY id ASC LIMIT 1');
  $id=(int)($q->fetchColumn()?:0);
  if(!$id)throw new RuntimeException('No active outlet exists for Central Master Data.');
  return $id;
}
function ensureSyncTable(PDO $pdo):void {spRequireTable($pdo,'sp_relational_sync');}
function syncLookup(PDO $pdo,int $outletId,string $stateKey,string $localId,string $entity):int {
 $q=$pdo->prepare('SELECT db_id FROM sp_relational_sync WHERE outlet_id=? AND state_key=? AND local_id=? AND entity=?');$q->execute([$outletId,$stateKey,$localId,$entity]);$id=(int)$q->fetchColumn();if(!$id)return 0;
 $table=['sales'=>'sales','purchases'=>'purchases','orders'=>'open_orders','suppliers'=>'suppliers','promos'=>'promotions','paymentTypes'=>'payment_types','cashMovements'=>'cash_movements','stockHistory'=>'stock_movements','zReports'=>'end_of_day'][$stateKey]??'';
 if($table==='')return 0;$schema=cols($pdo,$table);$sql='SELECT id FROM `'.$table.'` WHERE id=?';$args=[$id];if(isset($schema['outlet_id'])){$sql.=' AND outlet_id=?';$args[]=$outletId;}$q=$pdo->prepare($sql);$q->execute($args);return(int)($q->fetchColumn()?:0);
}
function saveSyncMap(PDO $pdo, int $outletId, string $stateKey, string $localId, string $entity, int $dbId): void {
  $q = $pdo->prepare('INSERT INTO sp_relational_sync(outlet_id,state_key,local_id,entity,db_id,updated_at) VALUES(?,?,?,?,?,NOW()) ON DUPLICATE KEY UPDATE db_id=VALUES(db_id),updated_at=NOW()');
  $q->execute([$outletId, $stateKey, $localId, $entity, $dbId]);
}
function naturalId(PDO $pdo, string $table, array $keys, array $values): int {
  $usable = [];
  foreach ($keys as $k) if ($values[$k] !== null && $values[$k] !== '') $usable[$k] = $values[$k];
  if (!$usable) return 0;
  $where = implode(' AND ', array_map(fn($k) => '`'.$k.'`=?', array_keys($usable)));
  $q = $pdo->prepare('SELECT id FROM `'.$table.'` WHERE '.$where.' LIMIT 1');
  $q->execute(array_values($usable));
  return (int)($q->fetchColumn() ?: 0);
}
function syncSupplierParent(PDO $pdo, array $schema, array $aliases, array $item, int $outletId, string $localId): int {
  $row = writableRow($schema, $aliases, $item, $outletId);
  // Supplier tables differ across deployed databases. Resolve required supplier name/code
  // fields from the live schema rather than assuming `name`/`code`.
  $name = trim((string)pick($item, ['name','supplierName','supplier_name'], ''));
  $code = trim((string)pick($item, ['code','supplierCode','supplier_code'], ''));
  $nameCol = supplierColumn($schema, ['supplier_name','name','supplierName']);
  $codeCol = supplierColumn($schema, ['supplier_code','code','supplierCode']);
  if ($nameCol && $name !== '') $row[$nameCol] = $name;
  if ($codeCol && $code === '') {
    $code = 'SUP-'.strtoupper(substr(sha1($outletId.'|'.$name),0,8));
    $row[$codeCol] = $code;
  } elseif ($codeCol) {
    $row[$codeCol] = $code;
  }
  if (!$nameCol && $name === '') throw new RuntimeException('Supplier name is required.');
  validateRequired($schema, $row, 'suppliers');

  $dbId = syncLookup($pdo, $outletId, 'suppliers', $localId, 'suppliers');
  $hasOutlet = isset($schema['outlet_id']);
  if (!$dbId && $code !== '' && $codeCol) {
    $sql='SELECT id FROM suppliers WHERE `'.$codeCol.'`=?'; $args=[$code];
    if ($hasOutlet) { $sql.=' AND outlet_id=?'; $args[]=$outletId; }
    $sql.=' LIMIT 1'; $q=$pdo->prepare($sql); $q->execute($args); $dbId=(int)($q->fetchColumn()?:0);
  }
  if (!$dbId && $name !== '' && $nameCol) {
    $sql='SELECT id FROM suppliers WHERE `'.$nameCol.'`=?'; $args=[$name];
    if ($hasOutlet) { $sql.=' AND outlet_id=?'; $args[]=$outletId; }
    $sql.=' ORDER BY id ASC LIMIT 1'; $q=$pdo->prepare($sql); $q->execute($args); $dbId=(int)($q->fetchColumn()?:0);
  }
  if ($dbId) updateRow($pdo,'suppliers',$row,$dbId); else $dbId=insertRow($pdo,'suppliers',$row);
  saveSyncMap($pdo,$outletId,'suppliers',$localId,'suppliers',$dbId);
  return $dbId;
}
function syncParent(PDO $pdo, string $table, array $schema, array $aliases, array $item, int $outletId, string $stateKey, string $localId, array $naturalKeys = [], ?array &$previousRow = null): int {
  $row = writableRow($schema, $aliases, $item, $outletId);
  validateRequired($schema, $row, $table);
  $dbId = syncLookup($pdo, $outletId, $stateKey, $localId, $stateKey);
  // Relational reads intentionally expose the real DB id. Reuse it when the
  // sync map is missing (for example after a fresh deployment or cache clear).
  if (!$dbId && ctype_digit((string)$localId)) $dbId = scopedFindId($pdo, $table, (int)$localId, $outletId);
  if (!$dbId && $naturalKeys) $dbId = naturalId($pdo, $table, $naturalKeys, $row);
  $previousRow = null;
  if ($dbId) {
    $q = $pdo->prepare('SELECT * FROM `'.$table.'` WHERE id=? LIMIT 1');
    $q->execute([$dbId]);
    $previousRow = $q->fetch() ?: null;
    updateRow($pdo, $table, $row, $dbId);
  } else {
    $dbId = insertRow($pdo, $table, $row);
  }
  saveSyncMap($pdo, $outletId, $stateKey, $localId, $stateKey, $dbId);
  return $dbId;
}
function deleteChildren(PDO $pdo, string $table, string $parentField, int $parentId): void {
  if (!tableExists($pdo, $table)) return;
  $schema = cols($pdo, $table);
  if (!isset($schema[$parentField])) return;
  $q = $pdo->prepare('DELETE FROM `'.$table.'` WHERE `'.$parentField.'`=?');
  $q->execute([$parentId]);
}
function insertChild(PDO $pdo, string $table, array $schema, array $aliases, array $data, int $outletId): void {
  $row = writableRow($schema, $aliases, $data, $outletId);
  validateRequired($schema, $row, $table);
  insertRow($pdo, $table, $row);
}


function productColumn(array $schema, array $candidates): ?string {
  foreach ($candidates as $c) if (isset($schema[$c])) return $c;
  return null;
}

function ensureProductOutletTableRS(PDO $pdo): void {
  spEnsureProductOutletTable($pdo);
}
function ensureRSProductOutlet(PDO $pdo,int $productId,int $outletId): void { ensureProductOutletTableRS($pdo); $q=$pdo->prepare('SELECT id FROM product_outlets WHERE product_id=? AND outlet_id=? LIMIT 1');$q->execute([$productId,$outletId]);if($q->fetchColumn())return; $q=$pdo->prepare('SELECT selling_price,cost_price,min_stock,allow_price_change FROM products WHERE id=? LIMIT 1');$q->execute([$productId]);$p=$q->fetch()?:[]; $st=$pdo->prepare('INSERT INTO product_outlets(product_id,outlet_id,active,selling_price,cost_price,stock_qty,min_stock,allow_price_change) VALUES(?,?,?,?,?,?,?,?)');$st->execute([$productId,$outletId,1,$p['selling_price']??0,$p['cost_price']??0,0,$p['min_stock']??0,$p['allow_price_change']??0]);}

function currentProductStock(PDO $pdo, int $outletId, int $productId): float { ensureProductOutletTableRS($pdo); ensureRSProductOutlet($pdo,$productId,$outletId); $q=$pdo->prepare('SELECT stock_qty FROM product_outlets WHERE product_id=? AND outlet_id=? LIMIT 1');$q->execute([$productId,$outletId]);return (float)($q->fetchColumn()??0); }
function isServiceProductRS(PDO $pdo,int $productId):bool{if($productId<=0||!tableExists($pdo,'products'))return false;$schema=cols($pdo,'products');if(!isset($schema['is_service']))return false;$q=$pdo->prepare('SELECT is_service FROM products WHERE id=? LIMIT 1');$q->execute([$productId]);return(bool)$q->fetchColumn();}
function adjustProductStock(PDO $pdo,int $outletId,int $productId,float $delta,string $movementType,string $reference='',string $createdBy='SP-Manager',array $extra=[]):void{
  if($productId<=0||isServiceProductRS($pdo,$productId)||(!abs($delta)&&!$extra))return;
  ensureProductOutletTableRS($pdo); ensureRSProductOutlet($pdo,$productId,$outletId);
  $before=currentProductStock($pdo,$outletId,$productId);
  $sets=['stock_qty=stock_qty+?'];$args=[$delta];
  if(array_key_exists('cost',$extra)){$sets[]='cost_price=?';$args[]=(float)$extra['cost'];}
  if(array_key_exists('lastPurchasePrice',$extra)){$sets[]='last_purchase_price=?';$args[]=(float)$extra['lastPurchasePrice'];}
  $args[]=$productId;$args[]=$outletId; $pdo->prepare('UPDATE product_outlets SET '.implode(',',$sets).',updated_at=NOW() WHERE product_id=? AND outlet_id=? LIMIT 1')->execute($args);
  if(abs($delta)<0.0000001)return;
  $after=currentProductStock($pdo,$outletId,$productId);
  if(tableExists($pdo,'stock_movements')){ $ms=cols($pdo,'stock_movements');$priceQ=$pdo->prepare('SELECT cost_price FROM product_outlets WHERE product_id=? AND outlet_id=? LIMIT 1');$priceQ->execute([$productId,$outletId]);$unitCost=(float)($extra['cost']??$priceQ->fetchColumn()??0);$child=['product_id'=>$productId,'movement_type'=>$movementType,'type'=>$movementType,'quantity_change'=>$delta,'quantity'=>$delta,'qty'=>$delta,'quantity_after'=>$after,'stock_before'=>$before,'stock_after'=>$after,'unit_cost'=>$unitCost,'reference_type'=>$movementType,'reference_id'=>(int)($extra['referenceId']??0)?:null,'reference_no'=>$reference,'reference'=>$reference,'movement_date'=>date('Y-m-d H:i:s'),'created_at'=>date('Y-m-d H:i:s'),'created_by'=>$createdBy,'notes'=>$reference];$aliases=['outlet_id'=>['outlet_id'],'product_id'=>['product_id'],'movement_type'=>['movement_type','type'],'type'=>['type','movement_type'],'quantity_change'=>['quantity_change','quantity','change','qty'],'quantity'=>['quantity','change','qty','quantity_change'],'quantity_after'=>['quantity_after'],'stock_before'=>['stock_before'],'stock_after'=>['stock_after','quantity_after'],'unit_cost'=>['unit_cost'],'reference_type'=>['reference_type'],'reference_id'=>['reference_id'],'reference_no'=>['reference_no','reference'],'reference'=>['reference','reference_no'],'movement_date'=>['movement_date','date'],'created_at'=>['created_at','date'],'created_by'=>['created_by','user','createdBy'],'notes'=>['notes','reason']];$row=writableRow($ms,$aliases,$child,$outletId);validateRequired($ms,$row,'stock_movements');insertRow($pdo,'stock_movements',$row);}
}
function purchaseItemsByProduct(PDO $pdo,int $purchaseId):array{$out=[];foreach(childRows($pdo,'purchase_items','purchase_id',$purchaseId) as $r){$pid=(int)pick($r,['product_id'],0);$qty=(float)pick($r,['quantity','qty'],0);$out[$pid]=($out[$pid]??0)+$qty;}return$out;}
function saleItemsByProduct(PDO $pdo,int $saleId):array{$out=[];foreach(childRows($pdo,'sale_items','sale_id',$saleId) as $r){$pid=(int)pick($r,['product_id'],0);$qty=(float)pick($r,['quantity','qty'],0);$out[$pid]=($out[$pid]??0)+$qty;}return$out;}
function ensureSaleItemMetadataColumns(PDO $pdo):void {spRequireColumns($pdo,'sale_items',['warranty_enabled','warranty_years','maintenance_enabled','maintenance_count','cost_snapshot']);}
function scopedFindId(PDO $pdo, string $table, int $candidateId, int $outletId): int {
  if ($candidateId <= 0 || !tableExists($pdo, $table)) return 0;
  $schema = cols($pdo, $table);
  $sql = 'SELECT id FROM `'.$table.'` WHERE id=?'; $args = [$candidateId];
  if (isset($schema['outlet_id'])) { $sql .= ' AND outlet_id=?'; $args[] = $outletId; }
  $sql .= ' LIMIT 1'; $q=$pdo->prepare($sql); $q->execute($args);
  return (int)($q->fetchColumn() ?: 0);
}
function supplierColumn(array $schema, array $candidates): ?string {
  foreach ($candidates as $candidate) {
    if (isset($schema[$candidate])) return $candidate;
  }
  return null;
}

function findCustomerDbId(PDO $pdo, int $outletId, array $item): int {
  if (!tableExists($pdo,'customers')) return 0;
  $schema = cols($pdo,'customers');
  $candidates = [];
  foreach (['customerDbId','customer_id','customerId'] as $k) {
    if (array_key_exists($k,$item) && $item[$k] !== null && $item[$k] !== '') $candidates[] = (int)$item[$k];
  }
  foreach ($candidates as $candidate) {
    $id = scopedFindId($pdo,'customers',$candidate,$outletId);
    if ($id > 0) return $id;
  }
  $customer = is_array($item['customer'] ?? null) ? $item['customer'] : [];
  $code = trim((string)pick($customer,['code','customerCode','customer_code'],pick($item,['customerCode','customer_code'],'')));
  $phone = trim((string)pick($customer,['phone','phoneNumber','phone_number'],pick($item,['phone','phoneNumber','phone_number'],'')));
  $name = trim((string)pick($customer,['name','customerName','customer_name'],pick($item,['customerName','customer_name'],'')));
  if ($code !== '' && isset($schema['code'])) {
    $q=$pdo->prepare('SELECT id FROM customers WHERE code=? AND (outlet_id=? OR outlet_id IS NULL) ORDER BY id ASC LIMIT 1');
    $q->execute([$code,$outletId]); $id=(int)($q->fetchColumn()?:0); if($id>0)return $id;
  }
  if ($phone !== '' && isset($schema['phone'])) {
    $q=$pdo->prepare('SELECT id FROM customers WHERE phone=? AND (outlet_id=? OR outlet_id IS NULL) ORDER BY id ASC LIMIT 1');
    $q->execute([$phone,$outletId]); $id=(int)($q->fetchColumn()?:0); if($id>0)return $id;
  }
  if ($name !== '' && isset($schema['name'])) {
    $q=$pdo->prepare('SELECT id FROM customers WHERE name=? AND (outlet_id=? OR outlet_id IS NULL) ORDER BY id ASC LIMIT 1');
    $q->execute([$name,$outletId]); $id=(int)($q->fetchColumn()?:0); if($id>0)return $id;
  }
  return 0;
}
function refreshCustomerLoyalty(PDO $pdo, int $outletId, int $customerId): void {
  if ($customerId <= 0 || !tableExists($pdo,'customers') || !tableExists($pdo,'sales')) return;
  $salesSchema = cols($pdo,'sales');
  $statusSql = " AND UPPER(COALESCE(status,'')) NOT IN ('VOID','VOIDED','REFUND','REFUNDED')";
  $paidSql = " AND (UPPER(COALESCE(payment_status,''))='PAID' OR (UPPER(COALESCE(payment_status,''))='' AND total > 0))";
  $sql = 'SELECT COUNT(*) visits, COALESCE(SUM(total),0) spend FROM sales WHERE outlet_id=? AND customer_id=?'.$statusSql.$paidSql;
  $q=$pdo->prepare($sql); $q->execute([$outletId,$customerId]); $agg=$q->fetch() ?: ['visits'=>0,'spend'=>0];
  $visits=(int)$agg['visits']; $spend=(float)$agg['spend']; $points=(float)floor(max(0,$spend));
  $sets=[]; $args=[]; $custSchema=cols($pdo,'customers');
  foreach ([['visits',$visits],['spend',$spend],['loyalty_points',$points]] as [$col,$val]) {
    if(isset($custSchema[$col])){$sets[]='`'.$col.'`=?';$args[]=$val;}
  }
  if($sets){$args[]=$customerId;$args[]=$outletId;$where='id=?';if(isset($custSchema['outlet_id']))$where.=' AND (outlet_id=? OR outlet_id IS NULL)';$pdo->prepare('UPDATE customers SET '.implode(',',$sets).' WHERE '.$where.' LIMIT 1')->execute($args);}
  if(tableExists($pdo,'loyalty_accounts')){
    $la=cols($pdo,'loyalty_accounts');
    $colsOut=['outlet_id','customer_id','points_balance','visits','total_spend','active'];
    $vals=[$outletId,$customerId,$points,$visits,$spend,1];
    $filtered=[];$filteredVals=[];
    foreach($colsOut as $i=>$col) if(isset($la[$col])){$filtered[]='`'.$col.'`';$filteredVals[]=$vals[$i];}
    if($filtered){
      $update=[]; foreach(['points_balance','visits','total_spend','active'] as $col) if(isset($la[$col]))$update[]='`'.$col.'`=VALUES(`'.$col.'`)';
      $sql2='INSERT INTO loyalty_accounts ('.implode(',',$filtered).') VALUES ('.implode(',',array_fill(0,count($filtered),'?')).')';
      if($update)$sql2.=' ON DUPLICATE KEY UPDATE '.implode(',',$update);
      $pdo->prepare($sql2)->execute($filteredVals);
    }
  }
}
function findSupplierDbId(PDO $pdo, int $outletId, array $item): int {
  if (!tableExists($pdo, 'suppliers')) throw new RuntimeException('Suppliers table is missing.');
  $schema = cols($pdo, 'suppliers');
  $local = pick($item, ['supplierDbId','supplier_id','supplierId'], null);
  if ($local !== null && $local !== '') {
    $mapId = syncLookup($pdo, $outletId, 'suppliers', (string)$local, 'suppliers');
    if ($mapId > 0) return $mapId;
    $direct = scopedFindId($pdo, 'suppliers', (int)$local, $outletId);
    if ($direct > 0) {
      saveSyncMap($pdo, $outletId, 'suppliers', (string)$local, 'suppliers', $direct);
      return $direct;
    }
  }
  $supplier = $item['supplier'] ?? []; if (!is_array($supplier)) $supplier=[];
  $code = trim((string)pick($supplier, ['code','supplierCode','supplier_code'], pick($item,['supplierCode','supplier_code'],'')));
  $name = trim((string)pick($supplier, ['name','supplierName','supplier_name'], pick($item,['supplierName','supplier_name'],'')));
  $codeCol = supplierColumn($schema, ['code','supplier_code','supplierCode']);
  $nameCol = supplierColumn($schema, ['name','supplier_name','supplierName']);
  $hasOutlet = isset($schema['outlet_id']);
  if ($code !== '' && $codeCol) {
    $sql='SELECT id FROM suppliers WHERE `'.$codeCol.'`=?'; $args=[$code]; if($hasOutlet){$sql.=' AND outlet_id=?';$args[]=$outletId;} $sql.=' LIMIT 1';
    $q=$pdo->prepare($sql);$q->execute($args);$id=(int)($q->fetchColumn()?:0); if($id>0){if($local!==null&&$local!=='')saveSyncMap($pdo,$outletId,'suppliers',(string)$local,'suppliers',$id);return $id;}
  }
  if ($name !== '' && $nameCol) {
    $sql='SELECT id FROM suppliers WHERE `'.$nameCol.'`=?'; $args=[$name]; if($hasOutlet){$sql.=' AND outlet_id=?';$args[]=$outletId;} $sql.=' ORDER BY id ASC LIMIT 1';
    $q=$pdo->prepare($sql);$q->execute($args);$id=(int)($q->fetchColumn()?:0); if($id>0){if($local!==null&&$local!=='')saveSyncMap($pdo,$outletId,'suppliers',(string)$local,'suppliers',$id);return $id;}
  }
  if ($name==='') throw new RuntimeException('Purchase supplier was not found in database. Please save/select a valid supplier first.');
  if (!$nameCol) throw new RuntimeException('Suppliers table does not contain a supported supplier-name column (expected name or supplier_name).');
  $data=[];
  if(isset($schema['outlet_id']))$data['outlet_id']=$outletId;
  if($codeCol)$data[$codeCol]=$code!==''?$code:'SUP-'.strtoupper(substr(sha1($outletId.'|'.$name),0,8));
  $data[$nameCol]=$name;
  $phoneCol=supplierColumn($schema,['phone','phone_number','phoneNumber']); if($phoneCol)$data[$phoneCol]=(string)pick($supplier,['phone','phoneNumber','phone_number'],'');
  $emailCol=supplierColumn($schema,['email','email_address','emailAddress']); if($emailCol)$data[$emailCol]=(string)pick($supplier,['email','emailAddress','email_address'],'');
  $addressCol=supplierColumn($schema,['address','supplier_address','supplierAddress']); if($addressCol)$data[$addressCol]=(string)pick($supplier,['address','supplierAddress','supplier_address'],'');
  $taxCol=supplierColumn($schema,['tax_number','taxNumber','tax_no','tax_number']); if($taxCol)$data[$taxCol]=(string)pick($supplier,['taxNumber','tax_number','tax_no'],'');
  if(isset($schema['active']))$data['active']=1; if(isset($schema['enabled']))$data['enabled']=1; if(isset($schema['balance']))$data['balance']=0;
  if(isset($schema['created_by']) && !array_key_exists('created_by',$data)) $data['created_by']=(string)pick($item,['createdBy','created_by','userId'],'');
  validateRequired($schema,$data,'suppliers'); $id=insertRow($pdo,'suppliers',$data); if($local!==null&&$local!=='')saveSyncMap($pdo,$outletId,'suppliers',(string)$local,'suppliers',$id); return $id;
}
function generatePaymentCode(PDO $pdo, int $outletId, string $name): string {
  $base = 'PAY-' . strtoupper(substr(sha1($outletId.'|'.trim($name)), 0, 8));
  $candidate = $base; $n = 2;
  if (!tableExists($pdo, 'payment_types')) return $candidate;
  $schema = cols($pdo, 'payment_types');
  $codeCol = isset($schema['payment_code']) ? 'payment_code' : (isset($schema['code']) ? 'code' : null);
  if (!$codeCol) return $candidate;
  while (true) {
    $sql = 'SELECT id FROM payment_types WHERE `'.$codeCol.'`=?'; $args = [$candidate];
    if (isset($schema['outlet_id'])) { $sql .= ' AND outlet_id=?'; $args[] = $outletId; }
    $sql .= ' LIMIT 1';
    $q = $pdo->prepare($sql); $q->execute($args);
    if (!(int)$q->fetchColumn()) return $candidate;
    $candidate = $base . '-' . $n++;
  }
}
function nextDocumentCounter(PDO $pdo, int $outletId, string $type): int {
  if (!tableExists($pdo, 'sp_document_counters')) spRequireTable($pdo,'sp_document_counters');
  $q=$pdo->prepare('SELECT current_number FROM sp_document_counters WHERE outlet_id=? AND doc_type=? FOR UPDATE');$q->execute([$outletId,$type]);$row=$q->fetch();
  if($row){$n=(int)$row['current_number']+1;$u=$pdo->prepare('UPDATE sp_document_counters SET current_number=?,updated_at=NOW() WHERE outlet_id=? AND doc_type=?');$u->execute([$n,$outletId,$type]);return$n;}
  $i=$pdo->prepare('INSERT INTO sp_document_counters(outlet_id,doc_type,current_number,updated_at) VALUES(?,?,1,NOW())');$i->execute([$outletId,$type]);return 1;
}
function generateServerDocumentNumber(PDO $pdo,int $outletId,string $type,string $prefix,?int $exceptId=null):string {return spNextDocumentNumber($pdo,$outletId,$type,$prefix);}
function purchaseNumberExists(PDO $pdo, int $outletId, string $purchaseNo, ?int $exceptId = null): bool {
  $purchaseNo = trim($purchaseNo);
  if ($purchaseNo === '' || !tableExists($pdo, 'purchases')) return false;
  $schema = cols($pdo, 'purchases');
  if (!isset($schema['purchase_no'])) return false;
  $sql = 'SELECT id FROM purchases WHERE purchase_no=?';
  $args = [$purchaseNo];
  if (isset($schema['outlet_id'])) { $sql .= ' AND outlet_id=?'; $args[] = $outletId; }
  if ($exceptId !== null && $exceptId > 0) { $sql .= ' AND id<>?'; $args[] = $exceptId; }
  $sql .= ' LIMIT 1';
  $q = $pdo->prepare($sql);
  $q->execute($args);
  return (bool)$q->fetchColumn();
}
function generatePurchaseNumber(PDO $pdo, int $outletId, ?int $exceptId = null): string {
  for ($i=0; $i<100; $i++) {
    $candidate = 'PUR-'.str_pad((string)random_int(0, 99999999), 8, '0', STR_PAD_LEFT);
    if (!purchaseNumberExists($pdo, $outletId, $candidate, $exceptId)) return $candidate;
  }
  throw new RuntimeException('Unable to generate a unique purchase number.');
}
function existingPurchaseNumber(PDO $pdo, int $purchaseId): string {
  if ($purchaseId <= 0 || !tableExists($pdo, 'purchases')) return '';
  $schema = cols($pdo, 'purchases');
  if (!isset($schema['purchase_no'])) return '';
  $q = $pdo->prepare('SELECT purchase_no FROM purchases WHERE id=? LIMIT 1');
  $q->execute([$purchaseId]);
  return trim((string)($q->fetchColumn() ?: ''));
}

function findPaymentTypeDbId(PDO $pdo, int $outletId, array $pay): int {
  if (!tableExists($pdo, 'payment_types')) return 0;
  $schema = cols($pdo, 'payment_types');
  $candidate = (int)pick($pay, ['paymentTypeDbId','payment_type_db_id','paymentTypeId','payment_type_id'], 0);
  if ($candidate > 0) {$q=$pdo->prepare('SELECT id FROM payment_types WHERE id=? LIMIT 1');$q->execute([$candidate]);$id=(int)($q->fetchColumn()?:0);if($id>0)return$id;}
  $code = trim((string)pick($pay, ['paymentCode','payment_code','code'], ''));
  $name = trim((string)pick($pay, ['payment','name','paymentTypeName','payment_name'], ''));
  $codeCol = isset($schema['payment_code']) ? 'payment_code' : (isset($schema['code']) ? 'code' : null);
  $nameCol = isset($schema['payment_name']) ? 'payment_name' : (isset($schema['name']) ? 'name' : null);
  if ($code !== '' && $codeCol) {$q=$pdo->prepare('SELECT id FROM payment_types WHERE `'.$codeCol.'`=? ORDER BY id ASC LIMIT 1');$q->execute([$code]);$id=(int)($q->fetchColumn()?:0);if($id>0)return$id;}
  if ($name !== '' && $nameCol) {$q=$pdo->prepare('SELECT id FROM payment_types WHERE `'.$nameCol.'`=? ORDER BY id ASC LIMIT 1');$q->execute([$name]);$id=(int)($q->fetchColumn()?:0);if($id>0)return$id;}
  return 0;
}

function findProductDbId(PDO $pdo, int $outletId, array $item): int {
  if(!tableExists($pdo,'products')) return 0;
  $schema=cols($pdo,'products');
  $activeSql=isset($schema['active'])?' AND COALESCE(active,1)=1':'';
  $candidate=(int)pick($item,['productDbId','product_id','productId','id'],0);
  if($candidate>0){$q=$pdo->prepare('SELECT id FROM products WHERE id=?'.$activeSql.' LIMIT 1');$q->execute([$candidate]);$id=(int)($q->fetchColumn()?:0);if($id)return$id;}
  $code=trim((string)pick($item,['productCode','code','sku'],''));
  if($code!==''){foreach(['product_code','sku','code'] as $field){if(!isset($schema[$field]))continue;$q=$pdo->prepare('SELECT id FROM products WHERE `'.$field.'`=?'.$activeSql.' ORDER BY id ASC LIMIT 1');$q->execute([$code]);$id=(int)($q->fetchColumn()?:0);if($id)return$id;}}
  $barcode=trim((string)pick($item,['barcode'],''));
  if($barcode!==''){
    if(isset($schema['barcode'])){$q=$pdo->prepare('SELECT id FROM products WHERE barcode=?'.$activeSql.' ORDER BY id ASC LIMIT 1');$q->execute([$barcode]);$id=(int)($q->fetchColumn()?:0);if($id)return$id;}
    if(tableExists($pdo,'product_barcodes')){$q=$pdo->prepare('SELECT p.id FROM product_barcodes b INNER JOIN products p ON p.id=b.product_id WHERE b.barcode=?'.(isset($schema['active'])?' AND COALESCE(p.active,1)=1':'').' ORDER BY b.is_primary DESC,b.id ASC LIMIT 1');$q->execute([$barcode]);$id=(int)($q->fetchColumn()?:0);if($id)return$id;}
  }
  $name=trim((string)pick($item,['productName','name'],''));
  if($name!==''){foreach(['product_name','name'] as $field){if(!isset($schema[$field]))continue;$q=$pdo->prepare('SELECT id FROM products WHERE `'.$field.'`=?'.$activeSql.' ORDER BY id ASC LIMIT 1');$q->execute([$name]);$id=(int)($q->fetchColumn()?:0);if($id)return$id;}}
  return 0;
}


function paymentTypeAppMap(array $r): array {
  return [
    'id'=>(int)$r['id'],
    'dbId'=>(int)$r['id'],
    'name'=>(string)($r['payment_name']??''),
    'code'=>(string)($r['payment_code']??''),
    'enabled'=>(bool)($r['enabled']??1),
    'active'=>(bool)($r['enabled']??1),
    'quickPayment'=>(bool)($r['quick_payment']??0),
    'customerRequired'=>(bool)($r['customer_required']??0),
    'changeAllowed'=>(bool)($r['change_allowed']??1),
    'markPaid'=>(bool)($r['mark_paid']??1),
    'printReceipt'=>(bool)($r['print_receipt']??1),
    'openCashDrawer'=>(bool)($r['open_cash_drawer']??0),
    'shortcutKey'=>(string)($r['shortcut_key']??''),
    'position'=>(int)($r['sort_order']??0),
    'hasCustomerDisplayImage'=>!empty($r['has_customer_display_image']),
  ];
}
function paymentTypeList(PDO $pdo,int $masterOutletId,int $imageOutletId): array {
  if(!tableExists($pdo,'payment_type_display_images'))throw new RuntimeException('Payment Type outlet image migration is required. Apply PAYMENT-TYPE-OUTLET-IMAGE-MIGRATION.sql.');
  $q=$pdo->prepare('SELECT p.*,CASE WHEN i.customer_display_image IS NOT NULL AND i.customer_display_image<>\'\' THEN 1 ELSE 0 END AS has_customer_display_image FROM payment_types p LEFT JOIN payment_type_display_images i ON i.payment_type_id=p.id AND i.outlet_id=? WHERE p.outlet_id=? ORDER BY p.sort_order ASC,p.id ASC');
  $q->execute([$imageOutletId,$masterOutletId]);
  return array_map('paymentTypeAppMap',$q->fetchAll());
}
function paymentTypeImageOperation(PDO $pdo,int $masterOutletId,int $imageOutletId,array $b):void {
  if(!tableExists($pdo,'payment_type_display_images'))throw new RuntimeException('Payment Type outlet image migration is required. Apply PAYMENT-TYPE-OUTLET-IMAGE-MIGRATION.sql.');
  $id=(int)($b['id']??0);
  if($id<=0)throw new InvalidArgumentException('Payment type id is required.');
  $q=$pdo->prepare('SELECT id FROM payment_types WHERE id=? AND outlet_id=? LIMIT 1');
  $q->execute([$id,$masterOutletId]);
  if(!$q->fetchColumn())throw new RuntimeException('Payment type not found.');
  if(!empty($b['read'])){
    $q=$pdo->prepare('SELECT customer_display_image FROM payment_type_display_images WHERE payment_type_id=? AND outlet_id=? LIMIT 1');
    $q->execute([$id,$imageOutletId]);
    echo json_encode(['ok'=>true,'api_version'=>'V10','operation'=>'payment-types-image-read','id'=>$id,'imageData'=>(string)($q->fetchColumn()?:'')],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);exit;
  }
  if(!empty($b['remove']))$image=null;
  else {
    $image=(string)($b['image_data']??'');
    if(!preg_match('#^data:image/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$#i',$image,$m))throw new InvalidArgumentException('Upload a valid PNG, JPG or WebP image.');
    $raw=base64_decode($m[2],true);
    if($raw===false||strlen($raw)===0)throw new InvalidArgumentException('The image data is invalid.');
    if(strlen($raw)>6*1024*1024)throw new InvalidArgumentException('Image is too large. Maximum 6 MB.');
    $info=@getimagesizefromstring($raw);
    $mime=is_array($info)?strtolower((string)($info['mime']??'')):'';
    if(!in_array($mime,['image/png','image/jpeg','image/webp'],true))throw new InvalidArgumentException('Only PNG, JPG or WebP images are supported.');
    $image='data:'.$mime.';base64,'.base64_encode($raw);
  }
  if($image===null){$q=$pdo->prepare('DELETE FROM payment_type_display_images WHERE payment_type_id=? AND outlet_id=?');$q->execute([$id,$imageOutletId]);}
  else{$q=$pdo->prepare('INSERT INTO payment_type_display_images(outlet_id,payment_type_id,customer_display_image) VALUES(?,?,?) ON DUPLICATE KEY UPDATE customer_display_image=VALUES(customer_display_image)');$q->execute([$imageOutletId,$id,$image]);}
  spAdvanceStateRevision($pdo,$masterOutletId,'paymentTypes');
  echo json_encode(['ok'=>true,'api_version'=>'V10','operation'=>$image===null?'payment-types-image-remove':'payment-types-image-save','id'=>$id,'imageData'=>$image??''],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);exit;
}
function paymentTypeCode(PDO $pdo,int $outletId,string $name,int $exceptId=0): string {
  $base=strtoupper(trim(preg_replace('/[^A-Za-z0-9]+/','_',$name)??'','_'));
  if($base==='')$base='PAYMENT';
  $base=substr($base,0,40);$candidate=$base;$n=2;
  while(true){
    $sql='SELECT id FROM payment_types WHERE outlet_id=? AND payment_code=?';$args=[$outletId,$candidate];
    if($exceptId>0){$sql.=' AND id<>?';$args[]=$exceptId;}
    $sql.=' LIMIT 1';$q=$pdo->prepare($sql);$q->execute($args);
    if(!$q->fetchColumn())return $candidate;
    $candidate=substr($base,0,36).'_'.$n++;
  }
}
function paymentTypeOperation(PDO $pdo,int $masterOutletId,int $imageOutletId,array $b): void {
  $op=strtolower(trim((string)($b['operation']??'')));
  if($op==='list'){
    echo json_encode(['ok'=>true,'api_version'=>'V10','operation'=>'payment-types-list','data'=>paymentTypeList($pdo,$masterOutletId,$imageOutletId)],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);exit;
  }
  if($op==='image')paymentTypeImageOperation($pdo,$masterOutletId,$imageOutletId,$b);
  if($op==='save'){
    $pt=is_array($b['paymentType']??null)?$b['paymentType']:[];
    $name=trim((string)($pt['name']??$pt['paymentName']??''));
    if($name==='')throw new InvalidArgumentException('Payment type name is required.');
    $id=(int)($pt['id']??0);
    if($id>0){$q=$pdo->prepare('SELECT id FROM payment_types WHERE id=? AND outlet_id=? LIMIT 1');$q->execute([$id,$masterOutletId]);if(!$q->fetchColumn())$id=0;}
    $code=strtoupper(trim((string)($pt['code']??$pt['paymentCode']??'')));
    if($code==='')$code=paymentTypeCode($pdo,$masterOutletId,$name,$id);
    $q=$pdo->prepare('SELECT id FROM payment_types WHERE outlet_id=? AND payment_code=?'.($id>0?' AND id<>?':'').' LIMIT 1');
    $args=[$masterOutletId,$code];if($id>0)$args[]=$id;$q->execute($args);if($q->fetchColumn())throw new InvalidArgumentException('Payment type code already exists.');
    $vals=[
      $code,$name,!empty($pt['enabled'])?1:0,!empty($pt['quickPayment'])?1:0,!empty($pt['customerRequired'])?1:0,!empty($pt['changeAllowed'])?1:0,
      array_key_exists('markPaid',$pt)?(!empty($pt['markPaid'])?1:0):1,array_key_exists('printReceipt',$pt)?(!empty($pt['printReceipt'])?1:0):1,
      !empty($pt['openCashDrawer'])?1:0,trim((string)($pt['shortcutKey']??''))?:null,max(1,(int)($pt['position']??1))
    ];
    $pdo->beginTransaction();
    if($id>0){$q=$pdo->prepare('UPDATE payment_types SET payment_code=?,payment_name=?,enabled=?,quick_payment=?,customer_required=?,change_allowed=?,mark_paid=?,print_receipt=?,open_cash_drawer=?,shortcut_key=?,sort_order=? WHERE id=? AND outlet_id=?');$q->execute([...$vals,$id,$masterOutletId]);}
    else{$q=$pdo->prepare('INSERT INTO payment_types(outlet_id,payment_code,payment_name,enabled,quick_payment,customer_required,change_allowed,mark_paid,print_receipt,open_cash_drawer,shortcut_key,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)');$q->execute([$masterOutletId,...$vals]);$id=(int)$pdo->lastInsertId();}
    if(tableExists($pdo,'sp_relational_sync')){
      $q=$pdo->prepare("DELETE FROM sp_relational_sync WHERE state_key='paymentTypes' AND entity='paymentTypes' AND db_id=? AND outlet_id=?");$q->execute([$id,$masterOutletId]);
      $q=$pdo->prepare("INSERT INTO sp_relational_sync(outlet_id,state_key,local_id,entity,db_id,updated_at) VALUES(?, 'paymentTypes', ?, 'paymentTypes', ?, NOW()) ON DUPLICATE KEY UPDATE db_id=VALUES(db_id),updated_at=NOW()");$q->execute([$masterOutletId,(string)$id,$id]);
    }
    spAdvanceStateRevision($pdo,$masterOutletId,'paymentTypes');$pdo->commit();
    $q=$pdo->prepare('SELECT * FROM payment_types WHERE id=? AND outlet_id=? LIMIT 1');$q->execute([$id,$masterOutletId]);$row=$q->fetch();
    if(!$row)throw new RuntimeException('Payment type was saved but could not be read back from database.');
    echo json_encode(['ok'=>true,'api_version'=>'V10','operation'=>'payment-types-save','paymentType'=>paymentTypeAppMap($row),'data'=>paymentTypeList($pdo,$masterOutletId,$imageOutletId)],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);exit;
  }
  if($op==='delete'){
    $id=(int)($b['id']??0);if($id<=0)throw new InvalidArgumentException('Payment type id is required.');
    $q=$pdo->prepare('SELECT id FROM payment_types WHERE id=? AND outlet_id=? LIMIT 1');$q->execute([$id,$masterOutletId]);if(!$q->fetchColumn())throw new RuntimeException('Payment type not found.');
    $inUse=false;foreach([['sale_payments','payment_type_id'],['document_payments','payment_type_id']] as [$table,$field]){if(!tableExists($pdo,$table))continue;$x=$pdo->prepare("SELECT COUNT(*) FROM `$table` WHERE `$field`=?");$x->execute([$id]);if((int)$x->fetchColumn()>0){$inUse=true;break;}}
    if($inUse){$q=$pdo->prepare('UPDATE payment_types SET enabled=0 WHERE id=? AND outlet_id=?');$q->execute([$id,$masterOutletId]);}
    else{$q=$pdo->prepare('DELETE FROM payment_types WHERE id=? AND outlet_id=?');$q->execute([$id,$masterOutletId]);}
    if(tableExists($pdo,'sp_relational_sync')){$q=$pdo->prepare("DELETE FROM sp_relational_sync WHERE state_key='paymentTypes' AND entity='paymentTypes' AND db_id=? AND outlet_id=?");$q->execute([$id,$masterOutletId]);}
    spAdvanceStateRevision($pdo,$masterOutletId,'paymentTypes');echo json_encode(['ok'=>true,'api_version'=>'V10','operation'=>'payment-types-delete','disabled_instead_of_deleted'=>$inUse,'data'=>paymentTypeList($pdo,$masterOutletId,$imageOutletId)],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);exit;
  }
  throw new InvalidArgumentException('Unsupported Payment Types operation.');
}

function reconcileDeletes(PDO $pdo,int $outletId,string $stateKey,string $table,string $parentKey,array $keepLocalIds,bool $allowDelete):void{
  if(!$allowDelete)return;
  $q=$pdo->prepare('SELECT local_id,db_id FROM sp_relational_sync WHERE outlet_id=? AND state_key=? AND entity=?');$q->execute([$outletId,$stateKey,$stateKey]);
  $mappedRows=$q->fetchAll();$retainedDbIds=[];
  foreach($mappedRows as $mapped)if(in_array((string)$mapped['local_id'],$keepLocalIds,true))$retainedDbIds[(int)$mapped['db_id']]=true;
  foreach($mappedRows as $row){
    if(in_array((string)$row['local_id'],$keepLocalIds,true))continue;$dbId=(int)$row['db_id'];
    if($dbId>0&&!isset($retainedDbIds[$dbId])){
      if($stateKey==='purchases'){
        foreach(purchaseItemsByProduct($pdo,$dbId) as $pid=>$qty)adjustProductStock($pdo,$outletId,(int)$pid,-$qty,'Purchase Delete','PUR-DELETE-'.$dbId);
        deleteChildren($pdo,'purchase_items','purchase_id',$dbId);
      }
      if($stateKey==='orders')deleteChildren($pdo,'open_order_items','open_order_id',$dbId);
      if($stateKey==='sales'){deleteChildren($pdo,'sale_items','sale_id',$dbId);deleteChildren($pdo,'sale_payments','sale_id',$dbId);}
      if(tableExists($pdo,$table))$pdo->prepare('DELETE FROM `'.$table.'` WHERE id=? LIMIT 1')->execute([$dbId]);
    }
    $pdo->prepare('DELETE FROM sp_relational_sync WHERE outlet_id=? AND state_key=? AND entity=? AND local_id=?')->execute([$outletId,$stateKey,$stateKey,(string)$row['local_id']]);
  }
}

try {
  $pdo=spApiDatabase();
  ensureSyncTable($pdo);
  $b = body();
  $stateKey = trim((string)($b['state_key'] ?? ''));
  if ($stateKey === '') throw new InvalidArgumentException('state_key is required.');
  if($stateKey==='stockHistory')throw new RuntimeException('Stock ledger is server-managed. Use inventory counts.');
  if($stateKey==='sales')throw new RuntimeException('Use sales.php for validated individual sale changes. Bulk sale replacement is retired.');
  $state = $b['state'] ?? [];
  if (!is_array($state)) throw new InvalidArgumentException('state must be an array/object.');
  $requestedOutletId = resolveOutletId($pdo, (string)($b['outlet_id'] ?? ($_SERVER['SP_AUTH_OUTLET_ID'] ?? '')));
  $outletId = in_array($stateKey,['paymentTypes','promos'],true) ? masterOutletId($pdo) : $requestedOutletId;
  if ($stateKey === 'paymentTypes' && trim((string)($b['operation'] ?? '')) !== '') {
    paymentTypeOperation($pdo,$outletId,$requestedOutletId,$b);
  }

  $maps = [
    'sales' => [
      'table'=>'sales','natural'=>['outlet_id','sale_no'],'delete'=>false,
      'map'=>['outlet_id'=>['outlet_id'],'sale_no'=>['no','saleNo','invoiceNo','invoice_number'],'sale_date'=>['date','saleDate'],'customer_id'=>['customerId','customer_id'],'order_name'=>['orderName','name'],'service_type'=>['serviceType'],'subtotal'=>['subtotal'],'discount'=>['discount'],'tax'=>['tax'],'total'=>['total'],'payment_status'=>['paymentStatus','paid'],'status'=>['status'],'created_by'=>['createdBy','created_by','userId'],'notes'=>['internalNote','note'],'voided'=>['voided'],'refunded'=>['refunded'],'void_reason'=>['voidReason','void_reason'],'voided_by'=>['voidedBy','voided_by'],'voided_at'=>['voidedAt','voided_at']]
    ],
    'purchases' => [
      'table'=>'purchases','natural'=>['outlet_id','purchase_no'],'delete'=>true,
      'map'=>['outlet_id'=>['outlet_id'],'supplier_id'=>['supplierDbId','supplier_id','supplierId'],'purchase_no'=>['no','number','purchaseNo','purchase_no'],'external_document'=>['externalDocument','external_document'],'purchase_date'=>['date','purchaseDate','purchase_date'],'due_date'=>['dueDate','due_date'],'stock_date'=>['stockDate','stock_date'],'paid'=>['paid'],'payment_type'=>['paymentType','payment_type'],'payment_amount'=>['paymentAmount','payment_amount','paidAmount','paid_amount'],'paid_amount'=>['paymentAmount','payment_amount','paidAmount','paid_amount'],'subtotal'=>['subtotal'],'discount'=>['discount'],'tax'=>['tax'],'total'=>['total'],'status'=>['status'],'notes'=>['internalNote','note','notes'],'created_by'=>['createdBy','created_by','userId'],'data_json'=>['data_json']]
    ],
    'orders' => [
      'table'=>'open_orders','natural'=>['outlet_id','order_no'],'delete'=>true,
      'map'=>['outlet_id'=>['outlet_id'],'order_name'=>['name','orderName'],'order_no'=>['no','number','orderNumber','order_no'],'customer_id'=>['customerId','customer_id'],'subtotal'=>['subtotal'],'discount'=>['discount'],'tax'=>['tax','taxAmount'],'status'=>['status'],'total'=>['total'],'data_json'=>['data_json'],'created_by'=>['createdBy','created_by','userId']]
    ],
    'cashMovements' => [
      'table'=>'cash_movements','natural'=>[],'delete'=>false,
      'map'=>['outlet_id'=>['outlet_id'],'terminal_id'=>['terminalId','terminal_id'],'movement_type'=>['type','movementType'],'type'=>['type','movementType'],'amount'=>['amount'],'reason'=>['reason'],'reference_no'=>['referenceNo','reference_no'],'user_name'=>['user','userName','createdBy','created_by'],'created_by'=>['createdBy','created_by','userId','user'],'movement_date'=>['date','movementDate'],'created_at'=>['date','createdAt']]
    ],
    'stockHistory' => [
      'table'=>'stock_movements','natural'=>[],'delete'=>false,
      'map'=>['outlet_id'=>['outlet_id'],'product_id'=>['productId','product_id'],'product_name'=>['productName','product_name','name'],'code'=>['code','productCode','product_code'],'movement_type'=>['type','movementType'],'type'=>['type','movementType'],'quantity'=>['change','quantity','qty'],'quantity_change'=>['change','quantityChange','quantity','qty'],'quantity_after'=>['quantityAfter','quantity_after'],'stock_after'=>['quantityAfter','stock_after'],'stock_before'=>['stockBefore','stock_before'],'unit_cost'=>['unitCost','unit_cost'],'reference_type'=>['referenceType','reference_type'],'reference_id'=>['referenceId','reference_id'],'reference_no'=>['reference','referenceNo'],'reference'=>['reference','referenceNo'],'movement_date'=>['date','movementDate'],'created_at'=>['date','createdAt'],'notes'=>['reason','notes'],'created_by'=>['createdBy','created_by','userId','user']]
    ],
    'paymentTypes' => [
      'table'=>'payment_types','natural'=>['outlet_id','payment_code'],'delete'=>true,
      'map'=>[
        'outlet_id'=>['outlet_id'],
        'payment_code'=>['code','paymentCode','payment_code'],
        'payment_name'=>['name','paymentName','payment_name'],
        'enabled'=>['enabled','active'],
        'quick_payment'=>['quickPayment','quick_payment'],
        'customer_required'=>['customerRequired','customer_required'],
        'change_allowed'=>['changeAllowed','change_allowed'],
        'mark_paid'=>['markPaid','mark_paid'],
        'print_receipt'=>['printReceipt','print_receipt'],
        'open_cash_drawer'=>['openCashDrawer','open_cash_drawer'],
        'shortcut_key'=>['shortcutKey','shortcut_key'],
        'sort_order'=>['position','sortOrder','sort_order']
      ]
    ],
    'promos' => [
      'table'=>'promotions','natural'=>['outlet_id','promotion_name'],'delete'=>true,
      'map'=>[
        'outlet_id'=>['outlet_id'],
        'promotion_name'=>['promotionName','name','title','promotion_name'],
        'price'=>['price'],
        'discount_percent'=>['discountPercent','discount_percent','value'],
        'start_at'=>['startAt','start_at'],
        'end_at'=>['endAt','end_at'],
        'active'=>['active','enabled'],
        'data_json'=>['dataJson','data_json','metadata_json']
      ]
    ],
    'suppliers' => [
      'table'=>'suppliers','natural'=>['outlet_id'],'delete'=>true,
      'map'=>[
        'outlet_id'=>['outlet_id'],
        'code'=>['code','supplierCode','supplier_code'],
        'supplier_code'=>['code','supplierCode','supplier_code'],
        'name'=>['name','supplierName','supplier_name'],
        'supplier_name'=>['name','supplierName','supplier_name'],
        'phone'=>['phone','phoneNumber','phone_number'],
        'email'=>['email','emailAddress','email_address'],
        'address'=>['address','supplierAddress','supplier_address'],
        'tax_number'=>['taxNumber','tax_number','tax_no'],
        'active'=>['active','enabled'],
        'enabled'=>['enabled','active'],
        'balance'=>['balance'],
        'notes'=>['notes','note'],
        'metadata_json'=>['metadata_json']
      ]
    ],
    'zReports' => [
      'table'=>'end_of_day','natural'=>['outlet_id','business_date'],'delete'=>false,
      'map'=>['outlet_id'=>['outlet_id'],'business_date'=>['businessDate','date','business_date'],'report_number'=>['number','report_number','z_number'],'report_json'=>['report_json','data_json','report','reportData','payload'],'report_data'=>['reportData','report_data','report_json'],'total_sales'=>['totalSales','total_sales','total'],'total_tax'=>['totalTax','total_tax'],'total_discount'=>['totalDiscount','total_discount'],'total_cash'=>['totalCash','total_cash','cashTotal'],'total_non_cash'=>['totalNonCash','total_non_cash','nonCashTotal'],'expected_cash'=>['expectedCash','expected_cash'],'total_transactions'=>['totalTransactions','total_transactions','transactions'],'status'=>['status'],'closed_by'=>['closedBy','closed_by','userId','user'],'closed_at'=>['closedAt','closed_at','date']]
    ],
  ];

  if (!isset($maps[$stateKey])) {
    throw new InvalidArgumentException('No relational mapping exists for state key: '.$stateKey);
  }
  $spec = $maps[$stateKey];
  if (!tableExists($pdo, $spec['table'])) {
    throw new RuntimeException('Required database table is missing: '.$spec['table'].'. Apply the SP-Manager database schema before saving this data.');
  }
  if ($stateKey === 'zReports') spEnsureEndOfDayMetadata($pdo);
  if ($stateKey === 'purchases') spEnsurePurchaseMetadata($pdo);
  if ($stateKey === 'suppliers') spEnsureSupplierMetadata($pdo);
  if (in_array($stateKey, ['sales','purchases','stockHistory'], true)) spEnsureStockMovementMetadata($pdo);
  if (in_array($stateKey, ['sales','purchases','stockHistory'], true)) spEnsureProductOutletTable($pdo);
  if ($stateKey === 'sales') ensureSaleItemMetadataColumns($pdo);
  if (in_array($stateKey, ['sales','orders'], true) && !tableExists($pdo, 'sp_document_counters')) {
    spRequireTable($pdo,'sp_document_counters');
  }
  $items = array_is_list($state) ? $state : [$state];
  $requiredChildren = match ($stateKey) {
    'sales' => ['sale_items'],
    'purchases' => ['purchase_items'],
    'orders' => ['open_order_items'],
    default => [],
  };
  foreach ($requiredChildren as $childTable) {
    if (!tableExists($pdo, $childTable)) throw new RuntimeException('Required database table is missing: '.$childTable.'. The parent record cannot be saved safely without its detail rows.');
  }
  if ($stateKey === 'sales' && !tableExists($pdo, 'sale_payments')) {
    foreach ($items as $saleItem) if (is_array($saleItem) && !empty($saleItem['payments'])) throw new RuntimeException('Required database table is missing: sale_payments. Payment details cannot be saved safely.');
  }
  $schema = cols($pdo, $spec['table']);
  if (in_array($stateKey, ['sales','purchases','orders','cashMovements','stockHistory','zReports'], true) && !isset($schema['outlet_id'])) {
    throw new RuntimeException('Required outlet_id column is missing from '.$spec['table'].'. Refusing to write outlet data into an unscoped table.');
  }
  $pdo->beginTransaction();spLockOutlet($pdo,$outletId);spCheckStateRevision($pdo,$outletId,$stateKey,$b['revision']??null);
  $count = 0;
  $childCount = 0;
  $keep = [];
  $purchaseNumbers = [];
  $saleNumbers = [];
  $loyaltyCustomerIds = [];

  foreach ($items as $item) {
    if (!is_array($item)) continue;
    $localId = (string)($item['id'] ?? $item['no'] ?? $item['number'] ?? $item['name'] ?? uniqid('', true));
    $keep[] = $localId;
    if ($stateKey === 'sales') {
      $resolvedCustomerId = findCustomerDbId($pdo,$outletId,$item);
      if ($resolvedCustomerId > 0) $item['customer_id'] = $resolvedCustomerId;
      else $item['customer_id'] = null;
      $candidate=trim((string)pick($item,['no','saleNo','invoiceNo','invoice_number'],''));
      $saleDbId=syncLookup($pdo,$outletId,'sales',$localId,'sales');
      if($candidate===''||in_array(strtolower($candidate),['auto generated','auto-generated','automatic','auto'],true)){$candidate=$saleDbId>0?(string)pick((array)($pdo->query('SELECT sale_no FROM sales WHERE id='.(int)$saleDbId.' LIMIT 1')->fetch()?:[]),['sale_no'],''):'';if($candidate==='')$candidate=generateServerDocumentNumber($pdo,$outletId,'Invoice','INV-',$saleDbId>0?$saleDbId:null);}
      $item['no']=$candidate;$item['saleNo']=$candidate;$item['invoiceNo']=$candidate;
      foreach($item['items'] as &$it){$it['productDbId']=findProductDbId($pdo,$outletId,$it);}unset($it);foreach($item['payments'] as &$pay){$pay['paymentTypeDbId']=findPaymentTypeDbId($pdo,$outletId,$pay);}unset($pay);$item=spNormalizeSale($pdo,$outletId,$item);spAssertOpenDay($pdo,$outletId,$item['date']??null);
      $saleNumbers[]=['local_id'=>$localId,'sale_no'=>$candidate,'db_id'=>$saleDbId];
    }
    if ($stateKey === 'orders') {
      $candidate=trim((string)pick($item,['no','number','orderNumber','order_number'],''));
      if($candidate===''||in_array(strtolower($candidate),['auto generated','auto-generated','automatic','auto'],true))$generatedOrderNo=generateServerDocumentNumber($pdo,$outletId,'Order','ORD-');
      $generatedOrderNo=$generatedOrderNo??$candidate;$item['no']=$item['number']=$item['orderNumber']=$item['order_no']=$generatedOrderNo;unset($generatedOrderNo);
    }
    if ($stateKey === 'suppliers') {
      $supplierName = trim((string)pick($item, ['name','supplierName','supplier_name'], ''));
      if ($supplierName !== '' && trim((string)pick($item, ['code','supplierCode','supplier_code'], '')) === '') {
        $generatedCode = 'SUP-'.strtoupper(substr(sha1($outletId.'|'.$supplierName),0,8));
        $item['code'] = $generatedCode;
        $item['supplierCode'] = $generatedCode;
        $item['supplier_code'] = $generatedCode;
      }
      $item['name'] = $supplierName;
      $item['supplierName'] = $supplierName;
      $item['supplier_name'] = $supplierName;
    }
    $purchaseDbId = 0;
    if ($stateKey === 'promos') {
      $promotionName = trim((string)pick($item, ['name','promotionName','promotion_name','title'], ''));
      if ($promotionName === '') throw new RuntimeException('Promotion name is required.');
      $payload = $item;
      if (!isset($payload['items']) || !is_array($payload['items'])) $payload['items'] = [];
      $payload['name'] = $promotionName;
      $payload['promotionName'] = $promotionName;
      $item['promotion_name'] = $promotionName;
      $item['promotionName'] = $promotionName;
      $startDate = trim((string)pick($item,['startDate','start_date'],''));
      $startTime = trim((string)pick($item,['startTime','start_time'],''));
      $endDate = trim((string)pick($item,['endDate','end_date'],''));
      $endTime = trim((string)pick($item,['endTime','end_time'],''));
      $item['start_at'] = $startDate!=='' ? $startDate.' '.($startTime!==''?$startTime.':00':'00:00:00') : null;
      $item['end_at'] = $endDate!=='' ? $endDate.' '.($endTime!==''?$endTime.':00':'23:59:59') : null;
      $item['data_json'] = json_encode($payload, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
      $items = is_array($item['items'] ?? null) ? $item['items'] : [];
      if (count($items) === 1) {
        $it=$items[0]; $ptype=(string)($it['priceType']??'discount'); $val=(float)($it['value']??0);
        if($ptype==='fixed') $item['price']=$val; else $item['discount_percent']=$val;
      }
    }
    if ($stateKey === 'paymentTypes') {
      $paymentName = trim((string)pick($item, ['name','paymentName','payment_name'], ''));
      if ($paymentName === '') throw new RuntimeException('Payment type name is required.');
      $paymentCode = trim((string)pick($item, ['code','paymentCode','payment_code'], ''));
      if ($paymentCode === '') $paymentCode = generatePaymentCode($pdo, $outletId, $paymentName);
      $item['code'] = $paymentCode;
      $item['paymentCode'] = $paymentCode;
      $item['payment_code'] = $paymentCode;
      $item['name'] = $paymentName;
      $item['paymentName'] = $paymentName;
      $item['payment_name'] = $paymentName;
    }
    if ($stateKey === 'purchases') {
      $item['supplierDbId'] = findSupplierDbId($pdo, $outletId, $item);
      $purchaseCandidate = trim((string)pick($item, ['no','number','purchaseNo','purchase_no'], ''));
      $isAutoPlaceholder = $purchaseCandidate === '' || in_array(strtolower($purchaseCandidate), ['auto generated','auto-generated','automatic','auto'], true);
      $purchaseDbId = syncLookup($pdo, $outletId, 'purchases', $localId, 'purchases');
      if ($purchaseDbId <= 0 && !$isAutoPlaceholder && tableExists($pdo, 'purchases')) {
        $purchaseDbId = naturalId($pdo, 'purchases', ['outlet_id','purchase_no'], ['outlet_id'=>$outletId,'purchase_no'=>$purchaseCandidate]);
      }
      if ($isAutoPlaceholder) {
        $purchaseCandidate = $purchaseDbId > 0 ? existingPurchaseNumber($pdo, $purchaseDbId) : '';
        if ($purchaseCandidate === '') $purchaseCandidate = generatePurchaseNumber($pdo, $outletId, $purchaseDbId > 0 ? $purchaseDbId : null);
      } elseif (purchaseNumberExists($pdo, $outletId, $purchaseCandidate, $purchaseDbId > 0 ? $purchaseDbId : null)) {
        // A stale/duplicate browser number must never break the database unique key.
        $purchaseCandidate = generatePurchaseNumber($pdo, $outletId, $purchaseDbId > 0 ? $purchaseDbId : null);
      }
      $item['no'] = $purchaseCandidate;
      $item['number'] = $purchaseCandidate;
      $item['purchaseNo'] = $purchaseCandidate;
      $purchaseNumbers[] = ['local_id'=>$localId,'purchase_no'=>$purchaseCandidate,'db_id'=>$purchaseDbId];
    }
    $previousRow = null;
    if ($stateKey === 'suppliers') {
      $payload = $item; unset($payload['metadata_json']);
      $item['metadata_json'] = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
      $dbId = syncSupplierParent($pdo, $schema, $spec['map'], $item, $outletId, $localId);
    } else {
      if ($stateKey === 'stockHistory') {
        $productDbId = findProductDbId($pdo, $outletId, $item);
        if ($productDbId <= 0) throw new RuntimeException('Stock history product was not found in the current outlet: '.(string)pick($item, ['productName','name','productId','product_id'], ''));
        $item['productId'] = $item['product_id'] = $productDbId;
        if (!array_key_exists('stockBefore', $item) && !array_key_exists('stock_before', $item)) {
          $item['stockBefore'] = (float)pick($item, ['quantityAfter','quantity_after','stock_after'], 0) - (float)pick($item, ['change','quantity','qty'], 0);
        }
        if (!array_key_exists('unitCost', $item) && !array_key_exists('unit_cost', $item)) {
          $costQ = $pdo->prepare('SELECT cost_price FROM product_outlets WHERE product_id=? AND outlet_id=? LIMIT 1');
          $costQ->execute([$productDbId, $outletId]);
          $item['unitCost'] = (float)($costQ->fetchColumn() ?: 0);
        }
      }
      if ($stateKey === 'zReports') {
        $item['report_json'] = json_encode($item, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
      } elseif ($stateKey === 'purchases' || $stateKey === 'orders') {
        $payload = $item; unset($payload['data_json']);
        $item['data_json'] = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
      }
      $dbId = syncParent($pdo, $spec['table'], $schema, $spec['map'], $item, $outletId, $stateKey, $localId, $spec['natural'], $previousRow);
    }
    if ($stateKey === 'purchases') {
      foreach ($purchaseNumbers as &$pn) {
        if ((string)$pn['local_id'] === $localId) { $pn['db_id'] = $dbId; break; }
      }
      unset($pn);
    }
    if ($stateKey === 'sales') {
      foreach ($saleNumbers as &$sn) {
        if ((string)$sn['local_id'] === $localId) { $sn['db_id'] = $dbId; $sn['sale_no'] = (string)($item['no'] ?? $sn['sale_no']); break; }
      }
      unset($sn);
    }
    $count++;
    if ($stateKey === 'sales') {
      $cid=(int)($item['customer_id']??0);
      if($cid>0)$loyaltyCustomerIds[$cid]=true;
    }

    if ($stateKey === 'sales' && tableExists($pdo,'sale_items')) {
      // Sales consume stock only while the sale is active. Work out the previous
      // status BEFORE syncParent updates the parent row so edit/refund/void/reopen
      // operations adjust inventory by the exact difference.
      $oldQty = saleItemsByProduct($pdo,$dbId);
      $oldActive = true;
      if ($previousRow) {spAssertOpenDay($pdo,$outletId,$previousRow['sale_date']);spSaleTransition($pdo,$outletId,$dbId,$previousRow,$item);
        $saleSchema = cols($pdo,'sales');
        $oldStatus=strtolower((string)($previousRow['status']??''));
        $oldActive=!((bool)($previousRow['voided']??false)||(bool)($previousRow['refunded']??false)||in_array($oldStatus,['void','voided','refund','refunded','cancelled','canceled'],true));
      }
      $newQty=[];
      foreach(($item['items']??[]) as $it){
        if(!is_array($it))continue;
        $pid=findProductDbId($pdo,$outletId,$it);
        if($pid<=0)throw new RuntimeException('Sale item product was not found in database: '.(string)pick($it,['name','productName','code','productCode','productId'],''));
        $newQty[$pid]=($newQty[$pid]??0)+(float)pick($it,['qty','quantity'],0);
      }
      $newStatus=strtolower((string)pick($item,['status'],'COMPLETED'));
      $newActive=!((bool)pick($item,['voided'],false)||(bool)pick($item,['refunded'],false)||in_array($newStatus,['void','voided','refund','refunded','cancelled','canceled'],true));
      $all=array_unique(array_merge(array_keys($oldQty),array_keys($newQty)));
      foreach($all as $pid){
        $oldConsumed=$oldActive?(float)($oldQty[$pid]??0):0.0;
        $newConsumed=$newActive?(float)($newQty[$pid]??0):0.0;
        $delta=$oldConsumed-$newConsumed;
        if(abs($delta)>0.0000001)adjustProductStock($pdo,$outletId,(int)$pid,$delta,'Sale',trim((string)pick($item,['no','saleNo','invoiceNo'],'')),(string)pick($item,['createdBy','created_by','userId'],'SP-Manager'),['referenceId'=>$dbId]);
      }
    }
    if ($stateKey === 'purchases' && tableExists($pdo,'purchase_items')) {
      $oldQty=purchaseItemsByProduct($pdo,$dbId);$newQty=[];$newCost=[];
      foreach(($item['items']??[]) as $it){if(!is_array($it))continue;$pid=findProductDbId($pdo,$outletId,$it);if($pid<=0)throw new RuntimeException('Purchase item product was not found in database: '.(string)pick($it,['productName','name','productCode','code','productId'],''));$qty=(float)pick($it,['qty','quantity'],0);$newQty[$pid]=($newQty[$pid]??0)+$qty;$newCost[$pid]=(float)pick($it,['cost','price','costPrice','cost_price'],0);}
      foreach(array_unique(array_merge(array_keys($oldQty),array_keys($newQty))) as $pid){$delta=(float)($newQty[$pid]??0)-(float)($oldQty[$pid]??0);$cost=(float)($newCost[$pid]??0);if(abs($delta)>0.0000001){$stockExtra=['referenceId'=>$dbId];if(array_key_exists($pid,$newCost)){$stockExtra['cost']=$cost;$stockExtra['lastPurchasePrice']=$cost;}adjustProductStock($pdo,$outletId,(int)$pid,$delta,'Purchase',trim((string)pick($item,['no','number','purchaseNo'],'')),(string)pick($item,['createdBy','created_by','userId'],'SP-Manager'),$stockExtra);}}
    }

    if ($stateKey === 'sales' && tableExists($pdo, 'sale_items')) {
      deleteChildren($pdo, 'sale_items', 'sale_id', $dbId);
      $cs = cols($pdo, 'sale_items');
      foreach (($item['items'] ?? []) as $it) {
        if (!is_array($it)) continue;
        $itDbId=findProductDbId($pdo,$outletId,$it); if($itDbId<=0) throw new RuntimeException('Sale item product was not found in database: '.(string)pick($it,['name','productName','code','productCode','productId'],'')); insertChild($pdo, 'sale_items', $cs, ['sale_id'=>['sale_id'],'product_id'=>['productDbId','product_id','productId','id'],'product_name'=>['name','productName'],'barcode'=>['barcode'],'quantity'=>['qty','quantity'],'qty'=>['qty','quantity'],'unit_price'=>['price','unitPrice'],'price'=>['price','unitPrice'],'discount'=>['discount'],'tax'=>['tax'],'line_total'=>['lineTotal','total'],'cost_snapshot'=>['costSnapshot'],'warranty_enabled'=>['warrantyEnabled','warranty_enabled'],'warranty_years'=>['warrantyYears','warranty_years'],'maintenance_enabled'=>['maintenanceEnabled','maintenance_enabled'],'maintenance_count'=>['maintenanceCount','maintenance_count']], ['sale_id'=>$dbId,'productDbId'=>$itDbId]+$it, $outletId);
        $childCount++;
      }
    }
    if ($stateKey === 'sales' && tableExists($pdo, 'sale_payments')) {
      deleteChildren($pdo, 'sale_payments', 'sale_id', $dbId);
      $ps = cols($pdo, 'sale_payments');
      foreach (($item['payments'] ?? []) as $pay) {
        if (!is_array($pay)) continue;
        $pay['paymentTypeDbId'] = findPaymentTypeDbId($pdo, $outletId, $pay);
        $pay['payment_type_id'] = $pay['paymentTypeDbId'] ?: null;
        $pay['paymentTypeId'] = $pay['paymentTypeDbId'] ?: null;
        insertChild($pdo, 'sale_payments', $ps, ['sale_id'=>['sale_id'],'payment_type_id'=>['paymentTypeDbId','payment_type_id','paymentTypeId'],'payment_type_name'=>['payment','name','paymentTypeName'],'amount'=>['amount'],'tendered'=>['tendered'],'change_amount'=>['change','changeAmount'],'reference_no'=>['referenceNo','reference'],'paid_at'=>['date','paidAt'],'created_at'=>['date','paidAt']], ['sale_id'=>$dbId]+$pay, $outletId);
        $childCount++;
      }
    }
    if ($stateKey === 'purchases' && tableExists($pdo, 'purchase_items')) {
      deleteChildren($pdo, 'purchase_items', 'purchase_id', $dbId);
      $cs = cols($pdo, 'purchase_items');
      foreach (($item['items'] ?? []) as $it) {
        if (!is_array($it)) continue;
        $qty=spQuantity(pick($it,['qty','quantity'],0)); $cost=spMoney(pick($it,['cost','price','costPrice','cost_price','unit_cost'],0),'Purchase cost'); $productDbId=findProductDbId($pdo,$outletId,$it); if($productDbId<=0) throw new RuntimeException('Purchase item product was not found in database: '.(string)pick($it,['productName','name','productCode','code','productId'],''));
        $child=['purchase_id'=>$dbId,'product_id'=>$productDbId,'product_name'=>pick($it,['productName','name'],''),'quantity'=>$qty,'qty'=>$qty,'cost_price'=>$cost,'cost'=>$cost,'unit_price'=>$cost,'unit_cost'=>$cost,'tax_rate'=>pick($it,['taxRate','tax_rate'],0),'discount'=>pick($it,['discount'],0),'total'=>$qty*$cost,'line_total'=>$qty*$cost,'data_json'=>json_encode($it,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE)];
        insertChild($pdo, 'purchase_items', $cs, ['purchase_id'=>['purchase_id'],'product_id'=>['productDbId','product_id','productId','id'],'product_name'=>['product_name','productName','name'],'quantity'=>['quantity','qty'],'qty'=>['qty','quantity'],'unit_cost'=>['unit_cost','cost_price','cost','price','unit_price'],'cost_price'=>['cost_price','cost','price','unit_price','unit_cost'],'cost'=>['cost','cost_price','price','unit_price','unit_cost'],'unit_price'=>['unit_price','cost','cost_price','price','unit_cost'],'tax_rate'=>['tax_rate','taxRate','tax'],'tax'=>['tax','taxRate','tax_amount'],'tax_amount'=>['tax_amount','tax','taxRate'],'discount'=>['discount','discount_amount'],'discount_amount'=>['discount_amount','discount'],'total'=>['total','line_total'],'line_total'=>['line_total','total'],'subtotal'=>['subtotal','line_subtotal'],'data_json'=>['data_json']], $child, $outletId);
        $childCount++;
      }
    }
    if ($stateKey === 'orders' && tableExists($pdo, 'open_order_items')) {
      deleteChildren($pdo, 'open_order_items', 'open_order_id', $dbId);
      $cs = cols($pdo, 'open_order_items');
      foreach (($item['items'] ?? []) as $it) {
        if (!is_array($it)) continue;
        $rawProductId=(int)pick($it,['productDbId','product_id','productId','id'],0);
        $productDbId=findProductDbId($pdo,$outletId,$it);
        if($rawProductId>0&&$productDbId<=0)throw new RuntimeException('Open order product was not found in the current outlet: '.(string)pick($it,['name','productName','code','productCode','productId'],''));
        $orderItem=['open_order_id'=>$dbId,'order_id'=>$dbId,'productDbId'=>$productDbId?:null]+$it;
        if(pick($orderItem,['total','lineTotal','line_total'],null)===null)$orderItem['lineTotal']=(float)pick($it,['qty','quantity'],0)*(float)pick($it,['price','unitPrice'],0);
        insertChild($pdo, 'open_order_items', $cs, ['open_order_id'=>['open_order_id'],'order_id'=>['order_id'],'product_id'=>['productDbId','productId','product_id','id'],'product_name'=>['name','productName'],'qty'=>['qty','quantity'],'quantity'=>['qty','quantity'],'unit_price'=>['price','unitPrice'],'price'=>['price','unitPrice'],'discount'=>['discount'],'tax'=>['tax'],'line_total'=>['total','lineTotal','line_total']], $orderItem, $outletId);
        $childCount++;
      }
    }
  }

  reconcileDeletes($pdo, $outletId, $stateKey, $spec['table'], '', $keep, (bool)$spec['delete']);
  if ($stateKey === 'sales' && $loyaltyCustomerIds) {
    foreach (array_keys($loyaltyCustomerIds) as $cid) refreshCustomerLoyalty($pdo,$outletId,(int)$cid);
  }
  $revision=spAdvanceStateRevision($pdo,$outletId,$stateKey);spAudit($pdo,'LIST_SYNC',$spec['table'],null,null,['count'=>$count,'revision'=>$revision]);$pdo->commit();
  $response = ['ok'=>true,'api_version'=>'V10','state_key'=>$stateKey,'count'=>$count,'child_count'=>$childCount,'outlet_id'=>$requestedOutletId,'master_scope_outlet_id'=>$outletId,'revision'=>$revision];
  if ($stateKey === 'purchases') $response['purchase_numbers'] = $purchaseNumbers;
  if ($stateKey === 'sales') $response['sale_numbers'] = $saleNumbers;
  echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['ok'=>false,'api_version'=>'V10','state_key'=>$stateKey ?? null,'error'=>$e->getMessage()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}
