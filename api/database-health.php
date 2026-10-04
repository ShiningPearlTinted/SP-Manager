<?php
declare(strict_types=1);
require_once __DIR__ . '/security.php';
header('Content-Type: application/json; charset=utf-8');
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
  $pdo=spApiDatabase();
  $required = [
    'outlets'=>['id'=>['id'],'outlet_code'=>['outlet_code'],'active'=>['active']],
    'products'=>['id'=>['id'],'product name'=>['product_name','name']],
    'product_outlets'=>['id'=>['id'],'product_id'=>['product_id'],'outlet_id'=>['outlet_id'],'active'=>['active'],'selling_price'=>['selling_price'],'cost_price'=>['cost_price'],'stock_qty'=>['stock_qty']],
    'product_categories'=>['id'=>['id'],'category name'=>['category_name','name']],
    'product_groups'=>['id'=>['id'],'group name'=>['group_name','name']],
    'customers'=>['id'=>['id'],'customer name'=>['name','customer_name']],
    'suppliers'=>['id'=>['id'],'supplier name'=>['name','supplier_name']],
    'sales'=>['id'=>['id'],'outlet_id'=>['outlet_id'],'sale number'=>['sale_no','invoice_no','number']],
    'sale_items'=>['id'=>['id'],'sale_id'=>['sale_id'],'product_id'=>['product_id'],'quantity'=>['quantity','qty']],
    'sale_payments'=>['id'=>['id'],'sale_id'=>['sale_id'],'amount'=>['amount']],
    'purchases'=>['id'=>['id'],'outlet_id'=>['outlet_id'],'purchase number'=>['purchase_no','number'],'supplier_id'=>['supplier_id']],
    'quotations'=>['id'=>['id'],'outlet_id'=>['outlet_id'],'quotation_no'=>['quotation_no'],'quotation_date'=>['quotation_date'],'valid_until'=>['valid_until'],'customer_id'=>['customer_id'],'status'=>['status'],'data_json'=>['data_json']],
    'quotation_items'=>['id'=>['id'],'quotation_id'=>['quotation_id'],'product_id'=>['product_id'],'product_name'=>['product_name'],'quantity'=>['quantity'],'unit_price'=>['unit_price']],
    'invoices'=>['id'=>['id'],'outlet_id'=>['outlet_id'],'invoice_no'=>['invoice_no'],'invoice_date'=>['invoice_date'],'customer_id'=>['customer_id'],'quotation_id'=>['quotation_id'],'payment_status'=>['payment_status'],'status'=>['status'],'data_json'=>['data_json']],
    'invoice_items'=>['id'=>['id'],'invoice_id'=>['invoice_id'],'product_id'=>['product_id'],'product_name'=>['product_name'],'quantity'=>['quantity'],'unit_price'=>['unit_price']],
    'document_counters'=>['id'=>['id'],'outlet_id'=>['outlet_id'],'document_type'=>['document_type'],'next_number'=>['next_number']],
    'purchase_items'=>['id'=>['id'],'purchase_id'=>['purchase_id'],'product_id'=>['product_id'],'unit_cost'=>['unit_cost','cost_price','cost']],
    'open_orders'=>['id'=>['id'],'outlet_id'=>['outlet_id']],
    'open_order_items'=>['id'=>['id'],'open_order_id'=>['open_order_id'],'product_id'=>['product_id']],
    'cash_movements'=>['id'=>['id'],'outlet_id'=>['outlet_id'],'movement_type'=>['movement_type','type'],'amount'=>['amount'],'created_by'=>['created_by']],
    'stock_movements'=>['id'=>['id'],'outlet_id'=>['outlet_id'],'product_id'=>['product_id'],'movement_type'=>['movement_type','type'],'quantity'=>['quantity','quantity_change'],'stock_before'=>['stock_before'],'stock_after'=>['stock_after','quantity_after'],'unit_cost'=>['unit_cost']],
    'payment_types'=>['id'=>['id'],'payment name'=>['payment_name','name']],
    'promotions'=>['id'=>['id'],'promotion name'=>['promotion_name','name']],
    'end_of_day'=>['id'=>['id'],'outlet_id'=>['outlet_id']],
    'users'=>['id'=>['id'],'username'=>['username'],'password hash'=>['password_hash'],'enabled'=>['enabled'],'role_id'=>['role_id'],'outlet_id'=>['outlet_id'],'permissions_json'=>['permissions_json']],
    'roles'=>['id'=>['id'],'role_name'=>['role_name']],
    'permissions'=>['id'=>['id'],'permission_key'=>['permission_key']],
    'role_permissions'=>['role_id'=>['role_id'],'permission_id'=>['permission_id']],
    'user_outlets'=>['user_id'=>['user_id'],'outlet_id'=>['outlet_id'],'active'=>['active']],
    'app_settings'=>['setting_group'=>['setting_group'],'setting_key'=>['setting_key'],'setting_value'=>['setting_value']],
    'outlet_settings'=>['outlet_id'=>['outlet_id'],'setting_group'=>['setting_group'],'setting_key'=>['setting_key'],'setting_value'=>['setting_value']],
    'email_settings'=>['outlet_id'=>['outlet_id'],'smtp_host'=>['smtp_host'],'smtp_port'=>['smtp_port'],'username'=>['username']],
    'printers'=>['outlet_id'=>['outlet_id'],'printer_name'=>['printer_name'],'settings_json'=>['settings_json']],
    'hardware_devices'=>['outlet_id'=>['outlet_id'],'device_type'=>['device_type'],'device_name'=>['device_name'],'enabled'=>['enabled'],'settings_json'=>['settings_json']],
    'backup_records'=>['outlet_id'=>['outlet_id'],'backup_type'=>['backup_type'],'status'=>['status'],'metadata_json'=>['metadata_json']],
    'company_settings'=>['outlet_id'=>['outlet_id'],'company_name'=>['company_name']],
    'customer_displays'=>['display id'=>['display_id'],'outlet_id'=>['outlet_id'],'terminal_id'=>['terminal_id'],'state'=>['state'],'state_json'=>['state_json'],'enabled'=>['enabled']],
    'terminals'=>['id'=>['id'],'outlet_id'=>['outlet_id'],'terminal_id'=>['terminal_id'],'terminal_name'=>['terminal_name'],'terminal_type'=>['terminal_type'],'customer_display_id'=>['customer_display_id']],
    'sp_document_counters'=>['outlet_id'=>['outlet_id'],'document type'=>['doc_type','document_type'],'counter'=>['current_number','counter_value']],
    'sp_relational_sync'=>['outlet_id'=>['outlet_id'],'state_key'=>['state_key'],'local_id'=>['local_id'],'db_id'=>['db_id']],
  ];
  $tables=[]; $allOk=true;
  foreach ($required as $table=>$expected) {
    $schema=cols($pdo,$table); $missing=[]; $resolved=[];
    foreach($expected as $label=>$aliases){$hit=null;foreach($aliases as $candidate)if(isset($schema[$candidate])){$hit=$candidate;break;}if($hit===null)$missing[]=$label;else$resolved[$label]=$hit;}
    $ok=tableExists($pdo,$table)&&!$missing; if(!$ok)$allOk=false;
    $tables[$table]=['present'=>tableExists($pdo,$table),'missing_columns'=>$missing,'resolved_columns'=>$resolved];
  }
  $oid=0; $outlet=(string)($_GET['outlet_id'] ?? 'SP01');
  if(ctype_digit($outlet)){ $q=$pdo->prepare('SELECT id FROM outlets WHERE id=? AND active=1 LIMIT 1'); $q->execute([(int)$outlet]); }
  else { $q=$pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND active=1 LIMIT 1'); $q->execute([$outlet]); }
  $oid=(int)($q->fetchColumn()?:0); if(!$oid)$allOk=false;
  echo json_encode(['ok'=>$allOk,'api_version'=>'V10','settings_version'=>'V3','outlet_id'=>$oid,'tables'=>$tables,'sql_first'=>true],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'api_version'=>'V10','settings_version'=>'V3','sql_first'=>true,'error'=>'Database health check failed.'],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
}
