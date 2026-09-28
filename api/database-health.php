<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-SP-Manager-DB-Version: V10');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
$config = require __DIR__ . '/config.php';
$db = $config['db'] ?? null;
$host = (string)($db['host'] ?? $config['db_host'] ?? 'localhost');
$port = (string)($db['port'] ?? $config['db_port'] ?? '3306');
$name = (string)($db['name'] ?? $config['db_name'] ?? '');
$user = (string)($db['user'] ?? $config['db_user'] ?? '');
$pass = (string)($db['pass'] ?? $config['db_pass'] ?? '');
function tableExists(PDO $pdo, string $table): bool {
  $q = $pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?');
  $q->execute([$table]);
  return (int)$q->fetchColumn() > 0;
}
function cols(PDO $pdo, string $table): array {
  if (!tableExists($pdo, $table)) return [];
  $q = $pdo->query('DESCRIBE `'.str_replace('`','``',$table).'`');
  $o=[]; foreach ($q->fetchAll() as $r) $o[(string)$r['Field']]=$r; return $o;
}
try {
  $pdo = new PDO("mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4", $user, $pass, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
  $required = [
    'outlets'=>['id','outlet_code','active'],
    'products'=>['id','name'],
    'product_categories'=>['id','category_name'],
    'product_groups'=>['id','group_name'],
    'customers'=>['id','name'],
    'suppliers'=>['id'],
    'sales'=>['id','sale_no'],
    'sale_items'=>['id','sale_id','product_id'],
    'sale_payments'=>['id','sale_id'],
    'purchases'=>['id','purchase_no','supplier_id'],
    'purchase_items'=>['id','purchase_id','product_id'],
    'open_orders'=>['id'],
    'open_order_items'=>['id','open_order_id','product_id'],
    'cash_movements'=>['id'],
    'stock_movements'=>['id','product_id'],
    'payment_types'=>['id','name'],
    'promotions'=>['id','name'],
    'end_of_day'=>['id'],
    'users'=>['id','username'],
    'app_settings'=>['setting_group','setting_key','setting_value'],
    'outlet_settings'=>['outlet_id','setting_group','setting_key','setting_value'],
    'email_settings'=>['outlet_id','smtp_host','smtp_port','encryption','username','password_encrypted'],
    'printers'=>['outlet_id','printer_name','printer_type','paper_size','settings_json'],
    'hardware_devices'=>['outlet_id','device_type','device_name','enabled','settings_json'],
    'backup_records'=>['outlet_id','backup_type','status','metadata_json'],
    'company_settings'=>['outlet_id','company_name'],
    'sp_document_counters'=>['outlet_id','doc_type','current_number'],
  ];
  $tables=[]; $allOk=true;
  foreach ($required as $table=>$expected) {
    $schema=cols($pdo,$table); $missing=[]; foreach($expected as $c) if(!isset($schema[$c])) $missing[]=$c;
    $ok=tableExists($pdo,$table)&&!$missing; if(!$ok)$allOk=false;
    $tables[$table]=['present'=>tableExists($pdo,$table),'missing_columns'=>$missing];
  }
  $supplierCols=cols($pdo,'suppliers');
  $tables['suppliers']['supported_name_column']=isset($supplierCols['supplier_name'])?'supplier_name':(isset($supplierCols['name'])?'name':null);
  $productCols=cols($pdo,'products');
  $tables['products']['supported_stock_column']=isset($productCols['stock'])?'stock':(isset($productCols['stock_qty'])?'stock_qty':(isset($productCols['quantity'])?'quantity':null));
  $purchaseCols=cols($pdo,'purchases');
  $tables['purchases']['unique_number_column']=isset($purchaseCols['purchase_no']);
  $oid=0; $outlet=(string)($_GET['outlet_id'] ?? 'SP01');
  if(ctype_digit($outlet)){ $q=$pdo->prepare('SELECT id FROM outlets WHERE id=? AND active=1 LIMIT 1'); $q->execute([(int)$outlet]); }
  else { $q=$pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND active=1 LIMIT 1'); $q->execute([$outlet]); }
  $oid=(int)($q->fetchColumn()?:0); if(!$oid)$allOk=false;
  echo json_encode(['ok'=>$allOk,'api_version'=>'V10','settings_version'=>'V3','database'=>$name,'outlet_id'=>$oid,'tables'=>$tables,'sql_first'=>true],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'api_version'=>'V10','settings_version'=>'V3','sql_first'=>true,'error'=>'Database health check failed.'],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
}
