<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
function syncParent(PDO $pdo, string $table, array $schema, array $aliases, array $item, int $outletId, string $stateKey, string $localId, array $naturalKeys = []): int {
  $row = writableRow($schema, $aliases, $item, $outletId);
  validateRequired($schema, $row, $table);
  $dbId = syncLookup($pdo, $outletId, $stateKey, $localId, $stateKey);
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

function scopedFindId(PDO $pdo, string $table, int $candidateId, int $outletId): int {
  if ($candidateId <= 0 || !tableExists($pdo, $table)) return 0;
  $schema = cols($pdo, $table);
  $sql = 'SELECT id FROM `'.$table.'` WHERE id=?'; $args = [$candidateId];
  if (isset($schema['outlet_id'])) { $sql .= ' AND outlet_id=?'; $args[] = $outletId; }
  $sql .= ' LIMIT 1'; $q=$pdo->prepare($sql); $q->execute($args);
  return (int)($q->fetchColumn() ?: 0);
}
function findSupplierDbId(PDO $pdo, int $outletId, array $item): int {
  if (!tableExists($pdo, 'suppliers')) throw new RuntimeException('Suppliers table is missing.');
  $local = pick($item, ['supplierDbId','supplier_id','supplierId'], null);
  if ($local !== null && $local !== '') {
    $mapId = syncLookup($pdo, $outletId, 'suppliers', (string)$local, 'suppliers');
    if ($mapId > 0) return $mapId;
  }
  $supplier = $item['supplier'] ?? []; if (!is_array($supplier)) $supplier=[];
  $code = trim((string)pick($supplier, ['code','supplierCode','supplier_code'], pick($item,['supplierCode','supplier_code'],'')));
  $name = trim((string)pick($supplier, ['name','supplierName','supplier_name'], pick($item,['supplierName','supplier_name'],'')));
  $schema=cols($pdo,'suppliers'); $hasOutlet=isset($schema['outlet_id']);
  if ($code!=='' && isset($schema['code'])) {
    $sql='SELECT id FROM suppliers WHERE code=?'; $args=[$code]; if($hasOutlet){$sql.=' AND outlet_id=?';$args[]=$outletId;} $sql.=' LIMIT 1';
    $q=$pdo->prepare($sql);$q->execute($args);$id=(int)($q->fetchColumn()?:0); if($id>0){if($local!==null&&$local!=='')saveSyncMap($pdo,$outletId,'suppliers',(string)$local,'suppliers',$id);return $id;}
  }
  if ($name!=='') {
    $sql='SELECT id FROM suppliers WHERE name=?'; $args=[$name]; if($hasOutlet){$sql.=' AND outlet_id=?';$args[]=$outletId;} $sql.=' ORDER BY id ASC LIMIT 1';
    $q=$pdo->prepare($sql);$q->execute($args);$id=(int)($q->fetchColumn()?:0); if($id>0){if($local!==null&&$local!=='')saveSyncMap($pdo,$outletId,'suppliers',(string)$local,'suppliers',$id);return $id;}
  }
  if ($name==='') throw new RuntimeException('Purchase supplier was not found in database. Please save/select a valid supplier first.');
  $data=[]; if(isset($schema['outlet_id']))$data['outlet_id']=$outletId; if(isset($schema['code']))$data['code']=$code!==''?$code:'SUP-'.strtoupper(substr(sha1($outletId.'|'.$name),0,8)); if(isset($schema['name']))$data['name']=$name;
  if(isset($schema['phone']))$data['phone']=(string)pick($supplier,['phone','phoneNumber'],''); if(isset($schema['email']))$data['email']=(string)pick($supplier,['email'],''); if(isset($schema['address']))$data['address']=(string)pick($supplier,['address'],''); if(isset($schema['tax_number']))$data['tax_number']=(string)pick($supplier,['taxNumber','tax_number'],''); if(isset($schema['active']))$data['active']=1; if(isset($schema['enabled']))$data['enabled']=1; if(isset($schema['balance']))$data['balance']=0;
  validateRequired($schema,$data,'suppliers'); $id=insertRow($pdo,'suppliers',$data); if($local!==null&&$local!=='')saveSyncMap($pdo,$outletId,'suppliers',(string)$local,'suppliers',$id); return $id;
}
function findProductDbId(PDO $pdo, int $outletId, array $item): int {
  if(!tableExists($pdo,'products')) return 0;
  $candidate=(int)pick($item,['productDbId','product_id','productId'],0); $direct=scopedFindId($pdo,'products',$candidate,$outletId); if($direct>0)return $direct;
  $schema=cols($pdo,'products'); $code=trim((string)pick($item,['productCode','code','sku'],''));
  if($code!==''){foreach(['product_code','sku','code'] as $field){if(!isset($schema[$field]))continue;$sql='SELECT id FROM products WHERE `'.$field.'`=?';$args=[$code];if(isset($schema['outlet_id'])){$sql.=' AND outlet_id=?';$args[]=$outletId;}$sql.=' LIMIT 1';$q=$pdo->prepare($sql);$q->execute($args);$id=(int)($q->fetchColumn()?:0);if($id>0)return $id;}}
  $name=trim((string)pick($item,['productName','name'],'')); if($name!=='' && isset($schema['name'])){$sql='SELECT id FROM products WHERE name=?';$args=[$name];if(isset($schema['outlet_id'])){$sql.=' AND outlet_id=?';$args[]=$outletId;}$sql.=' ORDER BY id ASC LIMIT 1';$q=$pdo->prepare($sql);$q->execute($args);$id=(int)($q->fetchColumn()?:0);if($id>0)return $id;}
  return 0;
}

function reconcileDeletes(PDO $pdo, int $outletId, string $stateKey, string $table, string $parentKey, array $keepLocalIds, bool $allowDelete): void {
  if (!$allowDelete) return;
  $q = $pdo->prepare('SELECT local_id,db_id FROM sp_relational_sync WHERE outlet_id=? AND state_key=? AND entity=?');
  $q->execute([$outletId, $stateKey, $stateKey]);
  foreach ($q->fetchAll() as $row) {
    if (in_array((string)$row['local_id'], $keepLocalIds, true)) continue;
    $dbId = (int)$row['db_id'];
    if ($dbId > 0) {
      if ($stateKey === 'purchases') deleteChildren($pdo, 'purchase_items', 'purchase_id', $dbId);
      if ($stateKey === 'orders') deleteChildren($pdo, 'open_order_items', 'open_order_id', $dbId);
      if ($stateKey === 'sales') { deleteChildren($pdo, 'sale_items', 'sale_id', $dbId); deleteChildren($pdo, 'sale_payments', 'sale_id', $dbId); }
      if (tableExists($pdo, $table)) $pdo->prepare('DELETE FROM `'.$table.'` WHERE id=? LIMIT 1')->execute([$dbId]);
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
      'map'=>['outlet_id'=>['outlet_id'],'sale_no'=>['no','saleNo','invoiceNo','invoice_number'],'sale_date'=>['date','saleDate'],'customer_id'=>['customerId','customer_id'],'order_name'=>['orderName','name'],'service_type'=>['serviceType'],'subtotal'=>['subtotal'],'discount'=>['discount'],'tax'=>['tax'],'total'=>['total'],'payment_status'=>['paymentStatus','paid'],'status'=>['status'],'created_by'=>['createdBy','created_by','userId'],'notes'=>['internalNote','note']]
    ],
    'purchases' => [
      'table'=>'purchases','natural'=>['outlet_id','purchase_no'],'delete'=>true,
      'map'=>['outlet_id'=>['outlet_id'],'supplier_id'=>['supplierDbId','supplier_id','supplierId'],'purchase_no'=>['no','number','purchaseNo','purchase_no'],'purchase_date'=>['date','purchaseDate','purchase_date'],'subtotal'=>['subtotal'],'discount'=>['discount'],'tax'=>['tax'],'total'=>['total'],'status'=>['status'],'notes'=>['internalNote','note','notes'],'created_by'=>['createdBy','created_by','userId']]
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
      'map'=>['outlet_id'=>['outlet_id'],'product_id'=>['productId','product_id'],'movement_type'=>['type','movementType'],'type'=>['type','movementType'],'quantity'=>['change','quantity','qty'],'quantity_change'=>['change','quantityChange','quantity','qty'],'quantity_after'=>['quantityAfter','quantity_after'],'reference_no'=>['reference','referenceNo'],'reference'=>['reference','referenceNo'],'movement_date'=>['date','movementDate'],'notes'=>['reason','notes'],'created_by'=>['createdBy','created_by','userId','user']]
    ],
    'paymentTypes' => [
      'table'=>'payment_types','natural'=>['outlet_id','name'],'delete'=>true,
      'map'=>['outlet_id'=>['outlet_id'],'name'=>['name'],'code'=>['code'],'enabled'=>['enabled','active'],'active'=>['active','enabled'],'mark_paid'=>['markPaid','mark_paid'],'customer_required'=>['customerRequired','customer_required'],'position'=>['position','sortOrder'],'quick_payment'=>['quickPayment','quick_payment'],'change_allowed'=>['changeAllowed','change_allowed'],'print_receipt'=>['printReceipt','print_receipt'],'shortcut_key'=>['shortcutKey','shortcut_key'],'open_cash_drawer'=>['openCashDrawer','open_cash_drawer']]
    ],
    'promos' => [
      'table'=>'promotions','natural'=>['outlet_id','name'],'delete'=>true,
      'map'=>['outlet_id'=>['outlet_id'],'name'=>['name','title'],'title'=>['title','name'],'description'=>['description'],'active'=>['active','enabled'],'enabled'=>['enabled','active'],'start_date'=>['startDate','start_date'],'end_date'=>['endDate','end_date'],'discount_type'=>['discountType','type'],'type'=>['type','discountType'],'discount_value'=>['value','discountValue','discount_value'],'value'=>['value','discountValue','discount_value'],'days_of_week'=>['daysOfWeek','days_of_week'],'notes'=>['notes']]
    ],
    'suppliers' => [
      'table'=>'suppliers','natural'=>['outlet_id','name'],'delete'=>true,
      'map'=>['outlet_id'=>['outlet_id'],'code'=>['code','supplierCode','supplier_code'],'name'=>['name','supplierName','supplier_name'],'phone'=>['phone','phoneNumber'],'email'=>['email'],'address'=>['address'],'tax_number'=>['taxNumber','tax_number'],'active'=>['active','enabled'],'enabled'=>['enabled','active'],'balance'=>['balance'],'notes'=>['notes','note']]
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

  foreach ($items as $item) {
    if (!is_array($item)) continue;
    $localId = (string)($item['id'] ?? $item['no'] ?? $item['number'] ?? $item['name'] ?? uniqid('', true));
    $keep[] = $localId;
    if ($stateKey === 'suppliers') {
      $supplierName = trim((string)pick($item, ['name','supplierName','supplier_name'], ''));
      if ($supplierName !== '' && trim((string)pick($item, ['code','supplierCode','supplier_code'], '')) === '') $item['code'] = 'SUP-'.strtoupper(substr(sha1($outletId.'|'.$supplierName),0,8));
    }
    if ($stateKey === 'purchases') $item['supplierDbId'] = findSupplierDbId($pdo, $outletId, $item);
    $dbId = syncParent($pdo, $spec['table'], $schema, $spec['map'], $item, $outletId, $stateKey, $localId, $spec['natural']);
    $count++;

    if ($stateKey === 'sales' && tableExists($pdo, 'sale_items')) {
      deleteChildren($pdo, 'sale_items', 'sale_id', $dbId);
      $cs = cols($pdo, 'sale_items');
      foreach (($item['items'] ?? []) as $it) {
        if (!is_array($it)) continue;
        insertChild($pdo, 'sale_items', $cs, ['sale_id'=>['sale_id'],'product_id'=>['productId','product_id','id'],'product_name'=>['name','productName'],'barcode'=>['barcode'],'quantity'=>['qty','quantity'],'qty'=>['qty','quantity'],'unit_price'=>['price','unitPrice'],'price'=>['price','unitPrice'],'discount'=>['discount'],'tax'=>['tax'],'line_total'=>['lineTotal','total']], ['sale_id'=>$dbId]+$it, $outletId);
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
  echo json_encode(['ok'=>true,'state_key'=>$stateKey,'count'=>$count,'child_count'=>$childCount,'outlet_id'=>$outletId]);
} catch (Throwable $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['ok'=>false,'state_key'=>$stateKey ?? null,'error'=>$e->getMessage()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}
