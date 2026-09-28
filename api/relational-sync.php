<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
    if ($v !== null) $row[$field] = valueForColumn($field, $v, $schema[$field]);
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
function ensureSyncTable(PDO $pdo): void {
  $pdo->exec("CREATE TABLE IF NOT EXISTS sp_relational_sync (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    outlet_id BIGINT UNSIGNED NOT NULL,
    state_key VARCHAR(120) NOT NULL,
    local_id VARCHAR(190) NOT NULL,
    entity VARCHAR(80) NOT NULL,
    db_id BIGINT UNSIGNED NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    UNIQUE KEY uq_rel_sync(outlet_id,state_key,local_id,entity),
    KEY idx_rel_sync_db(outlet_id,entity,db_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}
function syncLookup(PDO $pdo, int $outletId, string $stateKey, string $localId, string $entity): int {
  $q = $pdo->prepare('SELECT db_id FROM sp_relational_sync WHERE outlet_id=? AND state_key=? AND local_id=? AND entity=? LIMIT 1');
  $q->execute([$outletId, $stateKey, $localId, $entity]);
  return (int)($q->fetchColumn() ?: 0);
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
function syncParent(PDO $pdo, string $table, array $schema, array $aliases, array $item, int $outletId, string $stateKey, string $localId, array $naturalKeys = []): int {
  $row = writableRow($schema, $aliases, $item, $outletId);
  validateRequired($schema, $row, $table);
  $dbId = syncLookup($pdo, $outletId, $stateKey, $localId, $stateKey);
  // Relational reads intentionally expose the real DB id. Reuse it when the
  // sync map is missing (for example after a fresh deployment or cache clear).
  if (!$dbId && ctype_digit((string)$localId)) $dbId = scopedFindId($pdo, $table, (int)$localId, $outletId);
  if (!$dbId && $naturalKeys) $dbId = naturalId($pdo, $table, $naturalKeys, $row);
  if ($dbId) updateRow($pdo, $table, $row, $dbId); else $dbId = insertRow($pdo, $table, $row);
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
function currentProductStock(PDO $pdo, int $outletId, int $productId): float {
  if ($productId <= 0 || !tableExists($pdo,'products')) return 0.0;
  $schema=cols($pdo,'products'); $stockCol=productColumn($schema,['stock','stock_qty','quantity','current_stock']); if(!$stockCol)return 0.0;
  $sql='SELECT `'.$stockCol.'` FROM products WHERE id=?'; $args=[$productId]; if(isset($schema['outlet_id'])){$sql.=' AND outlet_id=?';$args[]=$outletId;} $sql.=' LIMIT 1';
  $q=$pdo->prepare($sql);$q->execute($args);return (float)($q->fetchColumn()??0);
}
function adjustProductStock(PDO $pdo,int $outletId,int $productId,float $delta,string $movementType,string $reference='',string $createdBy='SP-Manager',array $extra=[]):void{
  if($productId<=0||(!abs($delta)&&!$extra)||!tableExists($pdo,'products'))return;
  $schema=cols($pdo,'products');$stockCol=productColumn($schema,['stock','stock_qty','quantity','current_stock']);if(!$stockCol)return;
  $sql='UPDATE products SET `'.$stockCol.'`=`'.$stockCol.'`+?';$args=[$delta];
  foreach([['cost',['cost','cost_price','purchase_price']],['lastPurchasePrice',['last_purchase_price','lastPurchasePrice']]] as [$k,$cands]){if(array_key_exists($k,$extra)){if($col=productColumn($schema,$cands)){$sql.=', `'.$col.'`=?';$args[]=(float)$extra[$k];}}}
  if(isset($schema['updated_at']))$sql.=', updated_at=NOW()';$sql.=' WHERE id=?';$args[]=$productId;if(isset($schema['outlet_id'])){$sql.=' AND outlet_id=?';$args[]=$outletId;}$sql.=' LIMIT 1';$pdo->prepare($sql)->execute($args);
  if(abs($delta)<0.0000001)return;
  $after=currentProductStock($pdo,$outletId,$productId);
  if(tableExists($pdo,'stock_movements')){
    $ms=cols($pdo,'stock_movements');$child=['product_id'=>$productId,'movement_type'=>$movementType,'type'=>$movementType,'quantity_change'=>$delta,'quantity'=>$delta,'qty'=>$delta,'quantity_after'=>$after,'reference_no'=>$reference,'reference'=>$reference,'movement_date'=>date('Y-m-d H:i:s'),'created_at'=>date('Y-m-d H:i:s'),'created_by'=>$createdBy,'notes'=>''];
    $aliases=['outlet_id'=>['outlet_id'],'product_id'=>['product_id'],'movement_type'=>['movement_type','type'],'type'=>['type','movement_type'],'quantity_change'=>['quantity_change','quantity','change','qty'],'quantity'=>['quantity','change','qty','quantity_change'],'quantity_after'=>['quantity_after'],'reference_no'=>['reference_no','reference'],'reference'=>['reference','reference_no'],'movement_date'=>['movement_date','date'],'created_at'=>['created_at','date'],'created_by'=>['created_by','user','createdBy'],'notes'=>['notes','reason']];
    $row=writableRow($ms,$aliases,$child,$outletId);validateRequired($ms,$row,'stock_movements');insertRow($pdo,'stock_movements',$row);
  }
}
function purchaseItemsByProduct(PDO $pdo,int $purchaseId):array{$out=[];foreach(childRows($pdo,'purchase_items','purchase_id',$purchaseId) as $r){$pid=(int)pick($r,['product_id'],0);$qty=(float)pick($r,['quantity','qty'],0);$out[$pid]=($out[$pid]??0)+$qty;}return$out;}
function saleItemsByProduct(PDO $pdo,int $saleId):array{$out=[];foreach(childRows($pdo,'sale_items','sale_id',$saleId) as $r){$pid=(int)pick($r,['product_id'],0);$qty=(float)pick($r,['quantity','qty'],0);$out[$pid]=($out[$pid]??0)+$qty;}return$out;}
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
  $pdo->exec("CREATE TABLE IF NOT EXISTS sp_document_counters (outlet_id BIGINT UNSIGNED NOT NULL, doc_type VARCHAR(40) NOT NULL, current_number BIGINT UNSIGNED NOT NULL DEFAULT 0, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(outlet_id,doc_type)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $q=$pdo->prepare('SELECT current_number FROM sp_document_counters WHERE outlet_id=? AND doc_type=? FOR UPDATE');$q->execute([$outletId,$type]);$row=$q->fetch();
  if($row){$n=(int)$row['current_number']+1;$u=$pdo->prepare('UPDATE sp_document_counters SET current_number=?,updated_at=NOW() WHERE outlet_id=? AND doc_type=?');$u->execute([$n,$outletId,$type]);return$n;}
  $i=$pdo->prepare('INSERT INTO sp_document_counters(outlet_id,doc_type,current_number,updated_at) VALUES(?,?,1,NOW())');$i->execute([$outletId,$type]);return 1;
}
function generateServerDocumentNumber(PDO $pdo,int $outletId,string $type,string $prefix,?int $exceptId=null):string {
  for($i=0;$i<100;$i++){ $n=nextDocumentCounter($pdo,$outletId,$type); $candidate=$prefix.str_pad((string)$n,8,'0',STR_PAD_LEFT); $table=$type==='Invoice'?'sales':($type==='Order'?'open_orders':null); if(!$table||!tableExists($pdo,$table))return$candidate; $schema=cols($pdo,$table); $col=$type==='Invoice'?'sale_no':'order_number'; if(!isset($schema[$col]))return$candidate; $sql='SELECT id FROM `'.$table.'` WHERE `'.$col.'`=?';$args=[$candidate];if(isset($schema['outlet_id'])){$sql.=' AND outlet_id=?';$args[]=$outletId;}if($exceptId!==null){$sql.=' AND id<>?';$args[]=$exceptId;}$sql.=' LIMIT 1';$q=$pdo->prepare($sql);$q->execute($args);if(!$q->fetchColumn())return$candidate; }
  throw new RuntimeException('Unable to generate a unique document number.');
}
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

function findProductDbId(PDO $pdo, int $outletId, array $item): int {
  if(!tableExists($pdo,'products')) return 0;
  $candidate=(int)pick($item,['productDbId','product_id','productId'],0); $direct=scopedFindId($pdo,'products',$candidate,$outletId); if($direct>0)return $direct;
  $schema=cols($pdo,'products'); $code=trim((string)pick($item,['productCode','code','sku'],''));
  if($code!==''){foreach(['product_code','sku','code'] as $field){if(!isset($schema[$field]))continue;$sql='SELECT id FROM products WHERE `'.$field.'`=?';$args=[$code];if(isset($schema['outlet_id'])){$sql.=' AND outlet_id=?';$args[]=$outletId;}$sql.=' LIMIT 1';$q=$pdo->prepare($sql);$q->execute($args);$id=(int)($q->fetchColumn()?:0);if($id>0)return $id;}}
  $name=trim((string)pick($item,['productName','name'],'')); if($name!=='' && isset($schema['name'])){$sql='SELECT id FROM products WHERE name=?';$args=[$name];if(isset($schema['outlet_id'])){$sql.=' AND outlet_id=?';$args[]=$outletId;}$sql.=' ORDER BY id ASC LIMIT 1';$q=$pdo->prepare($sql);$q->execute($args);$id=(int)($q->fetchColumn()?:0);if($id>0)return $id;}
  return 0;
}

function reconcileDeletes(PDO $pdo,int $outletId,string $stateKey,string $table,string $parentKey,array $keepLocalIds,bool $allowDelete):void{
  if(!$allowDelete)return;
  $q=$pdo->prepare('SELECT local_id,db_id FROM sp_relational_sync WHERE outlet_id=? AND state_key=? AND entity=?');$q->execute([$outletId,$stateKey,$stateKey]);
  foreach($q->fetchAll() as $row){
    if(in_array((string)$row['local_id'],$keepLocalIds,true))continue;$dbId=(int)$row['db_id'];
    if($dbId>0){
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
  $pdo = new PDO("mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4", $user, $pass, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
  ensureSyncTable($pdo);
  $b = body();
  $stateKey = trim((string)($b['state_key'] ?? ''));
  if ($stateKey === '') throw new InvalidArgumentException('state_key is required.');
  $state = $b['state'] ?? [];
  if (!is_array($state)) throw new InvalidArgumentException('state must be an array/object.');
  $outletId = resolveOutletId($pdo, (string)($b['outlet_id'] ?? 'SP01'));

  $maps = [
    'sales' => [
      'table'=>'sales','natural'=>['outlet_id','sale_no'],'delete'=>false,
      'map'=>['outlet_id'=>['outlet_id'],'sale_no'=>['no','saleNo','invoiceNo','invoice_number'],'sale_date'=>['date','saleDate'],'customer_id'=>['customerId','customer_id'],'order_name'=>['orderName','name'],'service_type'=>['serviceType'],'subtotal'=>['subtotal'],'discount'=>['discount'],'tax'=>['tax'],'total'=>['total'],'payment_status'=>['paymentStatus','paid'],'status'=>['status'],'created_by'=>['createdBy','created_by','userId'],'notes'=>['internalNote','note'],'voided'=>['voided'],'refunded'=>['refunded'],'void_reason'=>['voidReason','void_reason'],'voided_by'=>['voidedBy','voided_by'],'voided_at'=>['voidedAt','voided_at']]
    ],
    'purchases' => [
      'table'=>'purchases','natural'=>['outlet_id','purchase_no'],'delete'=>true,
      'map'=>['outlet_id'=>['outlet_id'],'supplier_id'=>['supplierDbId','supplier_id','supplierId'],'purchase_no'=>['no','number','purchaseNo','purchase_no'],'external_document'=>['externalDocument','external_document'],'purchase_date'=>['date','purchaseDate','purchase_date'],'due_date'=>['dueDate','due_date'],'stock_date'=>['stockDate','stock_date'],'paid'=>['paid'],'payment_type'=>['paymentType','payment_type'],'payment_amount'=>['paymentAmount','payment_amount','paidAmount','paid_amount'],'paid_amount'=>['paymentAmount','payment_amount','paidAmount','paid_amount'],'subtotal'=>['subtotal'],'discount'=>['discount'],'tax'=>['tax'],'total'=>['total'],'status'=>['status'],'notes'=>['internalNote','note','notes'],'created_by'=>['createdBy','created_by','userId']]
    ],
    'orders' => [
      'table'=>'open_orders','natural'=>['outlet_id','order_number'],'delete'=>true,
      'map'=>['outlet_id'=>['outlet_id'],'order_name'=>['name','orderName'],'order_number'=>['no','number','orderNumber'],'order_date'=>['date','orderDate'],'customer_id'=>['customerId','customer_id'],'discount'=>['discount'],'tax_rate'=>['taxRate','tax_rate'],'tax'=>['tax','taxAmount'],'status'=>['status'],'comment'=>['comment','notes'],'notes'=>['notes','comment'],'service_type'=>['serviceType'],'table_name'=>['table','tableName'],'total'=>['total'],'created_by'=>['createdBy','created_by','userId']]
    ],
    'cashMovements' => [
      'table'=>'cash_movements','natural'=>[],'delete'=>false,
      'map'=>['outlet_id'=>['outlet_id'],'movement_type'=>['type','movementType'],'type'=>['type','movementType'],'amount'=>['amount'],'reason'=>['reason'],'user_name'=>['user','userName','createdBy','created_by'],'created_by'=>['createdBy','created_by','userId','user'],'movement_date'=>['date','movementDate'],'created_at'=>['date','createdAt']]
    ],
    'stockHistory' => [
      'table'=>'stock_movements','natural'=>[],'delete'=>false,
      'map'=>['outlet_id'=>['outlet_id'],'product_id'=>['productId','product_id'],'product_name'=>['productName','product_name','name'],'code'=>['code','productCode','product_code'],'movement_type'=>['type','movementType'],'type'=>['type','movementType'],'quantity'=>['change','quantity','qty'],'quantity_change'=>['change','quantityChange','quantity','qty'],'quantity_after'=>['quantityAfter','quantity_after'],'reference_no'=>['reference','referenceNo'],'reference'=>['reference','referenceNo'],'product_name'=>['productName','product_name'],'code'=>['code','productCode','product_code'],'movement_date'=>['date','movementDate'],'notes'=>['reason','notes'],'created_by'=>['createdBy','created_by','userId','user']]
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
      'table'=>'promotions','natural'=>['outlet_id','name'],'delete'=>true,
      'map'=>['outlet_id'=>['outlet_id'],'name'=>['name','title'],'title'=>['title','name'],'description'=>['description'],'active'=>['active','enabled'],'enabled'=>['enabled','active'],'start_date'=>['startDate','start_date'],'end_date'=>['endDate','end_date'],'discount_type'=>['discountType','type'],'type'=>['type','discountType'],'discount_value'=>['value','discountValue','discount_value'],'value'=>['value','discountValue','discount_value'],'days_of_week'=>['daysOfWeek','days_of_week'],'items'=>['items','promotion_items','items_json'],'notes'=>['notes']]
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
        'notes'=>['notes','note']
      ]
    ],
    'zReports' => [
      'table'=>'end_of_day','natural'=>['outlet_id','business_date'],'delete'=>false,
      'map'=>['outlet_id'=>['outlet_id'],'business_date'=>['businessDate','date','business_date'],'report_json'=>['report_json','data_json','notes','report','reportData'],'report_data'=>['reportData','report_data','report_json'],'total_sales'=>['totalSales','total_sales'],'total_cash'=>['totalCash','total_cash'],'total_transactions'=>['totalTransactions','total_transactions'],'closed_at'=>['closedAt','closed_at','date']]
    ],
  ];

  if (!isset($maps[$stateKey])) {
    echo json_encode(['ok'=>true,'skipped'=>true,'reason'=>'No relational mapping for state key','state_key'=>$stateKey]);
    exit;
  }
  $spec = $maps[$stateKey];
  if (!tableExists($pdo, $spec['table'])) {
    echo json_encode(['ok'=>true,'skipped'=>true,'reason'=>'Table not present','table'=>$spec['table'],'state_key'=>$stateKey]);
    exit;
  }

  $schema = cols($pdo, $spec['table']);
  $items = array_is_list($state) ? $state : [$state];
  $pdo->beginTransaction();
  $count = 0;
  $childCount = 0;
  $keep = [];
  $purchaseNumbers = [];

  foreach ($items as $item) {
    if (!is_array($item)) continue;
    $localId = (string)($item['id'] ?? $item['no'] ?? $item['number'] ?? $item['name'] ?? uniqid('', true));
    $keep[] = $localId;
    if ($stateKey === 'sales') {
      $candidate=trim((string)pick($item,['no','saleNo','invoiceNo','invoice_number'],''));
      $saleDbId=syncLookup($pdo,$outletId,'sales',$localId,'sales');
      if($candidate===''||in_array(strtolower($candidate),['auto generated','auto-generated','automatic','auto'],true)){$candidate=$saleDbId>0?(string)val((array)($pdo->query('SELECT sale_no FROM sales WHERE id='.(int)$saleDbId.' LIMIT 1')->fetch()?:[]),['sale_no'],''):'';if($candidate==='')$candidate=generateServerDocumentNumber($pdo,$outletId,'Invoice','INV-',$saleDbId>0?$saleDbId:null);}
      $item['no']=$candidate;$item['saleNo']=$candidate;$item['invoiceNo']=$candidate;
    }
    if ($stateKey === 'orders') {
      $candidate=trim((string)pick($item,['no','number','orderNumber','order_number'],''));
      if($candidate===''||in_array(strtolower($candidate),['auto generated','auto-generated','automatic','auto'],true))$item['no']= $item['number']=$item['orderNumber']=generateServerDocumentNumber($pdo,$outletId,'Order','ORD-');
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
    if ($stateKey === 'suppliers') {
      $dbId = syncSupplierParent($pdo, $schema, $spec['map'], $item, $outletId, $localId);
    } else {
      $dbId = syncParent($pdo, $spec['table'], $schema, $spec['map'], $item, $outletId, $stateKey, $localId, $spec['natural']);
    }
    if ($stateKey === 'purchases') {
      foreach ($purchaseNumbers as &$pn) {
        if ((string)$pn['local_id'] === $localId) { $pn['db_id'] = $dbId; break; }
      }
      unset($pn);
    }
    $count++;

    if ($stateKey === 'sales' && tableExists($pdo,'sale_items')) {
      // Sales consume stock only while the sale is active. Work out the previous
      // status BEFORE syncParent updates the parent row so edit/refund/void/reopen
      // operations adjust inventory by the exact difference.
      $oldQty = saleItemsByProduct($pdo,$dbId);
      $oldActive = true;
      if ($dbId > 0) {
        $saleSchema = cols($pdo,'sales');
        $statusParts=[];
        $selectCols=['id'];
        foreach(['status','voided','refunded'] as $f) if(isset($saleSchema[$f])) $selectCols[]=$f;
        $q=$pdo->prepare('SELECT `'.implode('`,`',$selectCols).'` FROM sales WHERE id=? LIMIT 1');
        $q->execute([$dbId]); $old=$q->fetch() ?: [];
        $oldStatus=strtolower((string)($old['status']??''));
        $oldActive=!((bool)($old['voided']??false)||(bool)($old['refunded']??false)||in_array($oldStatus,['voided','refunded'],true));
      }
      $newQty=[];
      foreach(($item['items']??[]) as $it){
        if(!is_array($it))continue;
        $pid=findProductDbId($pdo,$outletId,$it);
        if($pid<=0)throw new RuntimeException('Sale item product was not found in database: '.(string)pick($it,['name','productName','code','productCode','productId'],''));
        $newQty[$pid]=($newQty[$pid]??0)+(float)pick($it,['qty','quantity'],0);
      }
      $newStatus=strtolower((string)pick($item,['status'],'COMPLETED'));
      $newActive=!((bool)pick($item,['voided'],false)||(bool)pick($item,['refunded'],false)||in_array($newStatus,['voided','refunded'],true));
      $all=array_unique(array_merge(array_keys($oldQty),array_keys($newQty)));
      foreach($all as $pid){
        $oldConsumed=$oldActive?(float)($oldQty[$pid]??0):0.0;
        $newConsumed=$newActive?(float)($newQty[$pid]??0):0.0;
        $delta=$oldConsumed-$newConsumed;
        if(abs($delta)>0.0000001)adjustProductStock($pdo,$outletId,(int)$pid,$delta,'Sale',trim((string)pick($item,['no','saleNo','invoiceNo'],'')),(string)pick($item,['createdBy','created_by','userId'],'SP-Manager'));
      }
    }
    if ($stateKey === 'purchases' && tableExists($pdo,'purchase_items')) {
      $oldQty=purchaseItemsByProduct($pdo,$dbId);$newQty=[];
      foreach(($item['items']??[]) as $it){if(!is_array($it))continue;$pid=findProductDbId($pdo,$outletId,$it);if($pid<=0)throw new RuntimeException('Purchase item product was not found in database: '.(string)pick($it,['productName','name','productCode','code','productId'],''));$qty=(float)pick($it,['qty','quantity'],0);$newQty[$pid]=($newQty[$pid]??0)+$qty;$cost=(float)pick($it,['cost','price','costPrice','cost_price'],0);$delta=$qty-($oldQty[$pid]??0);adjustProductStock($pdo,$outletId,$pid,$delta,'Purchase',trim((string)pick($item,['no','number','purchaseNo'],'')),(string)pick($item,['createdBy','created_by','userId'],'SP-Manager'),['cost'=>$cost,'lastPurchasePrice'=>$cost]);}
    }

    if ($stateKey === 'sales' && tableExists($pdo, 'sale_items')) {
      deleteChildren($pdo, 'sale_items', 'sale_id', $dbId);
      $cs = cols($pdo, 'sale_items');
      foreach (($item['items'] ?? []) as $it) {
        if (!is_array($it)) continue;
        $itDbId=findProductDbId($pdo,$outletId,$it); if($itDbId<=0) throw new RuntimeException('Sale item product was not found in database: '.(string)pick($it,['name','productName','code','productCode','productId'],'')); insertChild($pdo, 'sale_items', $cs, ['sale_id'=>['sale_id'],'product_id'=>['productDbId','product_id','productId','id'],'product_name'=>['name','productName'],'barcode'=>['barcode'],'quantity'=>['qty','quantity'],'qty'=>['qty','quantity'],'unit_price'=>['price','unitPrice'],'price'=>['price','unitPrice'],'discount'=>['discount'],'tax'=>['tax'],'line_total'=>['lineTotal','total']], ['sale_id'=>$dbId,'productDbId'=>$itDbId]+$it, $outletId);
        $childCount++;
      }
    }
    if ($stateKey === 'sales' && tableExists($pdo, 'sale_payments')) {
      deleteChildren($pdo, 'sale_payments', 'sale_id', $dbId);
      $ps = cols($pdo, 'sale_payments');
      foreach (($item['payments'] ?? []) as $pay) {
        if (!is_array($pay)) continue;
        insertChild($pdo, 'sale_payments', $ps, ['sale_id'=>['sale_id'],'payment_type_id'=>['paymentTypeId','payment_type_id'],'payment_type_name'=>['payment','name','paymentTypeName'],'amount'=>['amount'],'tendered'=>['tendered'],'change_amount'=>['change','changeAmount'],'reference_no'=>['referenceNo','reference'],'paid_at'=>['date','paidAt'],'created_at'=>['date','paidAt']], ['sale_id'=>$dbId]+$pay, $outletId);
        $childCount++;
      }
    }
    if ($stateKey === 'purchases' && tableExists($pdo, 'purchase_items')) {
      deleteChildren($pdo, 'purchase_items', 'purchase_id', $dbId);
      $cs = cols($pdo, 'purchase_items');
      foreach (($item['items'] ?? []) as $it) {
        if (!is_array($it)) continue;
        $qty=(float)pick($it,['qty','quantity'],0); $cost=(float)pick($it,['cost','price','costPrice'],0); $productDbId=findProductDbId($pdo,$outletId,$it); if($productDbId<=0) throw new RuntimeException('Purchase item product was not found in database: '.(string)pick($it,['productName','name','productCode','code','productId'],''));
        $child=['purchase_id'=>$dbId,'product_id'=>$productDbId,'product_name'=>pick($it,['productName','name'],''),'quantity'=>$qty,'qty'=>$qty,'cost_price'=>$cost,'cost'=>$cost,'unit_price'=>$cost,'tax_rate'=>pick($it,['taxRate','tax_rate'],0),'discount'=>pick($it,['discount'],0),'total'=>$qty*$cost,'line_total'=>$qty*$cost];
        insertChild($pdo, 'purchase_items', $cs, ['purchase_id'=>['purchase_id'],'product_id'=>['productDbId','product_id','productId','id'],'product_name'=>['product_name','productName','name'],'quantity'=>['quantity','qty'],'qty'=>['qty','quantity'],'cost_price'=>['cost_price','cost','price','unit_price'],'cost'=>['cost','cost_price','price','unit_price'],'unit_price'=>['unit_price','cost','cost_price','price'],'tax_rate'=>['tax_rate','taxRate','tax'],'tax'=>['tax','taxRate','tax_amount'],'tax_amount'=>['tax_amount','tax','taxRate'],'discount'=>['discount','discount_amount'],'discount_amount'=>['discount_amount','discount'],'total'=>['total','line_total'],'line_total'=>['line_total','total'],'subtotal'=>['subtotal','line_subtotal']], $child, $outletId);
        $childCount++;
      }
    }
    if ($stateKey === 'orders' && tableExists($pdo, 'open_order_items')) {
      deleteChildren($pdo, 'open_order_items', 'open_order_id', $dbId);
      $cs = cols($pdo, 'open_order_items');
      foreach (($item['items'] ?? []) as $it) {
        if (!is_array($it)) continue;
        insertChild($pdo, 'open_order_items', $cs, ['open_order_id'=>['open_order_id'],'order_id'=>['order_id'],'product_id'=>['productId','product_id','id'],'product_name'=>['name','productName'],'qty'=>['qty','quantity'],'quantity'=>['qty','quantity'],'unit_price'=>['price','unitPrice'],'price'=>['price','unitPrice']], ['open_order_id'=>$dbId,'order_id'=>$dbId]+$it, $outletId);
        $childCount++;
      }
    }
  }

  reconcileDeletes($pdo, $outletId, $stateKey, $spec['table'], '', $keep, (bool)$spec['delete']);
  $pdo->commit();
  $response = ['ok'=>true,'api_version'=>'V10','state_key'=>$stateKey,'count'=>$count,'child_count'=>$childCount,'outlet_id'=>$outletId];
  if ($stateKey === 'purchases') $response['purchase_numbers'] = $purchaseNumbers;
  echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['ok'=>false,'api_version'=>'V10','state_key'=>$stateKey ?? null,'error'=>$e->getMessage()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}
