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

if ($name === '' || $user === '') throw new RuntimeException('Database configuration is incomplete.');

function body_json(): array {
  $raw = file_get_contents('php://input');
  $v = json_decode($raw ?: '', true);
  return is_array($v) ? $v : [];
}
function outlet_id(PDO $pdo, $outlet): int {
  $value = trim((string)$outlet);
  if ($value === '') $value = 'SP01';
  if (ctype_digit($value)) return (int)$value;
  $q = $pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND active=1 LIMIT 1');
  $q->execute([$value]);
  $id = (int)($q->fetchColumn() ?: 0);
  if ($id <= 0) throw new InvalidArgumentException('Outlet not found: '.$value);
  return $id;
}
function customer_payload(array $c, int $outletId): array {
  return [
    'outlet_id'=>$outletId,
    'code'=>trim((string)($c['code'] ?? '')) ?: null,
    'name'=>trim((string)($c['name'] ?? '')),
    'tax_number'=>trim((string)($c['taxNumber'] ?? $c['tax_number'] ?? '')) ?: null,
    'country'=>trim((string)($c['country'] ?? 'Malaysia')) ?: 'Malaysia',
    'street_name'=>trim((string)($c['streetName'] ?? $c['street_name'] ?? '')) ?: null,
    'building_number'=>trim((string)($c['buildingNumber'] ?? $c['building_number'] ?? '')) ?: null,
    'additional_street_name'=>trim((string)($c['additionalStreetName'] ?? $c['additional_street_name'] ?? '')) ?: null,
    'plot_identification'=>trim((string)($c['plotIdentification'] ?? $c['plot_identification'] ?? '')) ?: null,
    'district'=>trim((string)($c['district'] ?? '')) ?: null,
    'postal_code'=>trim((string)($c['postalCode'] ?? $c['postal_code'] ?? '')) ?: null,
    'city'=>trim((string)($c['city'] ?? '')) ?: null,
    'state'=>trim((string)($c['state'] ?? '')) ?: null,
    'phone'=>trim((string)($c['phone'] ?? '')) ?: null,
    'email'=>trim((string)($c['email'] ?? '')) ?: null,
    'vehicle_number'=>trim((string)($c['vehicleNumber'] ?? $c['vehicle_number'] ?? '')) ?: null,
    'enabled'=>!empty($c['enabled']) ? 1 : 0,
    'is_customer'=>($c['isCustomer'] ?? $c['is_customer'] ?? true) ? 1 : 0,
    'is_supplier'=>!empty($c['isSupplier'] ?? $c['is_supplier']) ? 1 : 0,
    'tax_exempt'=>!empty($c['taxExempt'] ?? $c['tax_exempt']) ? 1 : 0,
    'discount_percent'=>(float)($c['discount'] ?? $c['discount_percent'] ?? 0),
    'due_date_period'=>(int)($c['dueDatePeriod'] ?? $c['due_date_period'] ?? 0),
    'loyalty_card'=>trim((string)($c['loyaltyCard'] ?? $c['loyalty_card'] ?? '')) ?: null,
    'loyalty_points'=>(float)($c['loyaltyPoints'] ?? $c['loyalty_points'] ?? 0),
    'visits'=>(int)($c['visits'] ?? 0),
    'spend'=>(float)($c['spend'] ?? 0),
  ];
}

function supplier_address(array $p): ?string {
  $parts=[];
  foreach (['building_number','street_name','additional_street_name','district','postal_code','city','state','country'] as $k) {
    $v=trim((string)($p[$k] ?? ''));
    if ($v !== '') $parts[]=$v;
  }
  $value=implode(', ', $parts);
  return $value !== '' ? $value : null;
}
function sync_supplier_role(PDO $pdo, int $customerId, int $outletId, array $p): void {
  $code=trim((string)($p['code'] ?? ''));
  if ($code === '') $code='CUST-'.$customerId;
  $needle='%\"customerId\":'.$customerId.'%';
  $q=$pdo->prepare('SELECT id FROM suppliers WHERE outlet_id=? AND (supplier_code=? OR metadata_json LIKE ?) ORDER BY id ASC LIMIT 1');
  $q->execute([$outletId,$code,$needle]);
  $supplierId=(int)($q->fetchColumn() ?: 0);

  $meta=json_encode(['customerId'=>$customerId,'source'=>'Customer Master'], JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
  $active=((int)($p['enabled'] ?? 1) !== 0 && (int)($p['is_supplier'] ?? 0) === 1) ? 1 : 0;
  if ((int)($p['is_supplier'] ?? 0) === 1) {
    $values=[
      $code,
      (string)($p['name'] ?? ''),
      $p['phone'] ?? null,
      $p['email'] ?? null,
      supplier_address($p),
      $active,
      $meta,
    ];
    if ($supplierId > 0) {
      $values[]=$supplierId;
      $pdo->prepare('UPDATE suppliers SET supplier_code=?,supplier_name=?,phone=?,email=?,address=?,active=?,metadata_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')->execute($values);
    } else {
      array_unshift($values,$outletId);
      $pdo->prepare('INSERT INTO suppliers (outlet_id,supplier_code,supplier_name,phone,email,address,active,metadata_json) VALUES (?,?,?,?,?,?,?,?)')->execute($values);
    }
  } elseif ($supplierId > 0) {
    $pdo->prepare('UPDATE suppliers SET active=0,metadata_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')->execute([$meta,$supplierId]);
  }
}

function save_one(PDO $pdo, array $c, int $outletId): int {
  $p = customer_payload($c,$outletId);
  if ($p['name'] === '') throw new InvalidArgumentException('Customer name is required.');
  $id = isset($c['dbId']) && ctype_digit((string)$c['dbId']) ? (int)$c['dbId'] : 0;
  if (!$id && isset($c['id']) && ctype_digit((string)$c['id'])) $id = (int)$c['id'];
  $existing = 0;
  if ($id > 0) {
    $q=$pdo->prepare('SELECT id FROM customers WHERE id=? AND (outlet_id=? OR outlet_id IS NULL) LIMIT 1');
    $q->execute([$id,$outletId]); $existing=(int)($q->fetchColumn() ?: 0);
  }
  if (!$existing && !empty($p['code'])) {
    $q=$pdo->prepare('SELECT id FROM customers WHERE outlet_id=? AND code=? LIMIT 1');
    $q->execute([$outletId,$p['code']]); $existing=(int)($q->fetchColumn() ?: 0);
  }
  $cols=array_keys($p); $vals=array_values($p);
  if ($existing) {
    $sets=[]; foreach($cols as $col){$sets[]="`$col`=?";}
    $vals[]=$existing;
    $pdo->prepare('UPDATE customers SET '.implode(',',$sets).' WHERE id=?')->execute($vals);
    sync_supplier_role($pdo,$existing,$outletId,$p);
    return $existing;
  }
  $marks=implode(',',array_fill(0,count($cols),'?'));
  $pdo->prepare('INSERT INTO customers (`'.implode('`,`',$cols).'`) VALUES ('.$marks.')')->execute($vals);
  $newId=(int)$pdo->lastInsertId();
  sync_supplier_role($pdo,$newId,$outletId,$p);
  return $newId;
}

try {
  $pdo=spApiDatabase();
  $outletId=outlet_id($pdo,$_GET['outlet_id'] ?? $_POST['outlet_id'] ?? 'SP01');
  $action=strtolower(trim((string)($_GET['action'] ?? $_POST['action'] ?? '')));

  if($action==='health'){
    echo json_encode(['ok'=>true,'service'=>'SP-Manager customers API','outletId'=>$outletId]); exit;
  }
  if($action==='list' && $_SERVER['REQUEST_METHOD']==='GET'){
    $q=$pdo->prepare('SELECT * FROM customers WHERE outlet_id=? OR outlet_id IS NULL ORDER BY id ASC');
    $q->execute([$outletId]); $rows=$q->fetchAll();
    echo json_encode(['ok'=>true,'outletId'=>$outletId,'count'=>count($rows),'customers'=>$rows],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE); exit;
  }
  if($action==='save' && $_SERVER['REQUEST_METHOD']==='POST'){
    $b=body_json(); $c=is_array($b['customer']??null)?$b['customer']:[];
    $id=save_one($pdo,$c,$outletId);
    echo json_encode(['ok'=>true,'id'=>$id,'outletId'=>$outletId]); exit;
  }
  if($action==='save-batch' && $_SERVER['REQUEST_METHOD']==='POST'){
    $b=body_json(); $customers=$b['customers']??null;
    if(!is_array($customers)) throw new InvalidArgumentException('customers must be an array.');
    $pdo->beginTransaction(); $saved=0; $ids=[];
    foreach($customers as $c){if(!is_array($c))continue; $id=save_one($pdo,$c,$outletId); $ids[]=$id; $saved++;}
    $pdo->commit();
    echo json_encode(['ok'=>true,'outletId'=>$outletId,'count'=>$saved,'ids'=>$ids]); exit;
  }
  if($action==='delete' && $_SERVER['REQUEST_METHOD']==='POST'){
    $b=body_json(); $id=(int)($b['id']??0); $code=trim((string)($b['code']??''));
    if($id>0){$metaNeedle='%\"customerId\":'.$id.'%';$pdo->prepare('UPDATE suppliers SET active=0 WHERE outlet_id=? AND metadata_json LIKE ?')->execute([$outletId,$metaNeedle]);$q=$pdo->prepare('DELETE FROM customers WHERE id=? AND outlet_id=?');$q->execute([$id,$outletId]);}
    elseif($code!==''){$q=$pdo->prepare('DELETE FROM customers WHERE code=? AND outlet_id=?');$q->execute([$code,$outletId]);}
    else throw new InvalidArgumentException('id or code is required.');
    echo json_encode(['ok'=>true,'deleted'=>$q->rowCount()]); exit;
  }
  throw new InvalidArgumentException('Unknown action.');
} catch(Throwable $e) {
  if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();
  http_response_code(500); echo json_encode(['ok'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_SLASHES);
}
