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

function jsonBody(): array {
  $raw = file_get_contents('php://input');
  $v = json_decode($raw ?: '', true);
  return is_array($v) ? $v : [];
}
function respond(array $data, int $status=200): never {
  http_response_code($status);
  echo json_encode($data, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
  exit;
}
function tableColumns(PDO $pdo, string $table): array {
  $q = $pdo->query('DESCRIBE `'.str_replace('`','``',$table).'`');
  $out=[];
  foreach ($q->fetchAll() as $r) $out[(string)$r['Field']]=$r;
  return $out;
}
function firstColumn(array $columns, array $names): ?string {
  foreach ($names as $n) if (isset($columns[$n])) return $n;
  return null;
}
function resolveOutletId(PDO $pdo, mixed $value): int {
  $v=trim((string)($value ?? 'SP01'));
  if ($v!=='' && ctype_digit($v)) return (int)$v;
  $q=$pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND active=1 LIMIT 1');
  $q->execute([$v ?: 'SP01']);
  return (int)($q->fetchColumn() ?: 0);
}
function valueFor(string $column, array $p, int $outletId): mixed {
  $map=[
    'id'=>['id'], 'outlet_id'=>['outlet_id'],
    'sku'=>['code','sku'], 'product_code'=>['code','sku'], 'code'=>['code','sku'],
    'name'=>['name'], 'product_name'=>['name'], 'description'=>['description'],
    'category'=>['category'], 'group_name'=>['group','category'], 'group'=>['group','category'],
    'price'=>['price'], 'sale_price'=>['price'], 'selling_price'=>['price'], 'unit_price'=>['price'],
    'cost'=>['cost'], 'cost_price'=>['cost'], 'purchase_price'=>['cost'],
    'stock'=>['stock'], 'stock_qty'=>['stock'], 'quantity'=>['stock'], 'current_stock'=>['stock'],
    'reorder'=>['reorder'], 'reorder_point'=>['reorder'], 'min_stock'=>['reorder'],
    'preferred_quantity'=>['preferredQuantity'], 'preferred_qty'=>['preferredQuantity'],
    'unit'=>['unit'], 'unit_name'=>['unit'],
    'active'=>['active'], 'enabled'=>['active'],
    'is_service'=>['isService'], 'service'=>['isService'],
    'tax_inclusive'=>['taxInclusive'],
    'price_change_allowed'=>['priceChangeAllowed'], 'allow_price_change'=>['priceChangeAllowed'],
    'default_quantity'=>['defaultQuantity'],
    'rank'=>['rank'], 'sort_order'=>['rank'],
    'age_restriction'=>['ageRestriction'], 'last_purchase_price'=>['lastPurchasePrice'],
    'comments'=>['comments'], 'notes'=>['comments'],
    'image'=>['image'], 'image_url'=>['image'],
    'warranty_enabled'=>['warrantyEnabled'], 'warranty_years'=>['warrantyYears'],
    'maintenance_enabled'=>['maintenanceEnabled'], 'maintenance_count'=>['maintenanceCount'],
    'supplier_id'=>['supplierId'],
  ];
  if ($column==='outlet_id') return $outletId;
  foreach (($map[$column] ?? []) as $k) if (array_key_exists($k,$p)) return $p[$k];
  return null;
}

try {
  $pdo=new PDO("mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
  $columns=tableColumns($pdo,'products');
  if (!$columns) throw new RuntimeException('Table products not found.');
  $outletId=resolveOutletId($pdo,$_GET['outlet_id']??$_POST['outlet_id']??'SP01');
  if($outletId<=0) throw new InvalidArgumentException('Outlet not found.');

  $action=strtolower(trim((string)($_GET['action']??$_POST['action']??'')));
  if($action==='health') respond(['ok'=>true,'service'=>'SP-Manager products API','database'=>$pdo->query('SELECT DATABASE()')->fetchColumn(),'outletId'=>$outletId,'columns'=>array_keys($columns)]);

  if($action==='list' && $_SERVER['REQUEST_METHOD']==='GET'){
    $outletCol=isset($columns['outlet_id']);
    $sql='SELECT * FROM `products`'.($outletCol?' WHERE outlet_id=?':'').' ORDER BY id ASC';
    $q=$pdo->prepare($sql);$q->execute($outletCol?[$outletId]:[]);$rows=$q->fetchAll();
    respond(['ok'=>true,'outletId'=>$outletId,'count'=>count($rows),'products'=>$rows]);
  }

  if($action==='delete' && $_SERVER['REQUEST_METHOD']==='POST'){
    $b=jsonBody();$id=(int)($b['id']??0);
    if($id<=0) throw new InvalidArgumentException('Product id is required.');
    $sql='DELETE FROM `products` WHERE id=?'.(isset($columns['outlet_id'])?' AND outlet_id=?':'').' LIMIT 1';
    $q=$pdo->prepare($sql);$q->execute(isset($columns['outlet_id'])?[$id,$outletId]:[$id]);
    respond(['ok'=>true,'id'=>$id,'deleted'=>$q->rowCount()>0]);
  }

  if($action==='save' && $_SERVER['REQUEST_METHOD']==='POST'){
    $b=jsonBody();$p=$b['product']??$b;
    if(!is_array($p)) throw new InvalidArgumentException('product is required.');
    $id=isset($p['id'])&&ctype_digit((string)$p['id'])?(int)$p['id']:0;
    $code=trim((string)($p['code']??''));
    $nameValue=trim((string)($p['name']??''));
    if($nameValue==='') throw new InvalidArgumentException('Product name is required.');
    if($outletId<=0) throw new InvalidArgumentException('Outlet not found.');

    $existsId=null;
    if($id>0 && isset($columns['id'])){
      $q=$pdo->prepare('SELECT id FROM `products` WHERE id=?'.(isset($columns['outlet_id'])?' AND outlet_id=?':'').' LIMIT 1');
      $q->execute(isset($columns['outlet_id'])?[$id,$outletId]:[$id]);$existsId=$q->fetchColumn();
    }
    if(!$existsId && $code!==''){
      $codeCol=firstColumn($columns,['sku','product_code','code']);
      if($codeCol){$q=$pdo->prepare('SELECT id FROM `products` WHERE `'.$codeCol.'`=?'.(isset($columns['outlet_id'])?' AND outlet_id=?':'').' LIMIT 1');$q->execute(isset($columns['outlet_id'])?[$code,$outletId]:[$code]);$existsId=$q->fetchColumn();}
    }
    $targetId=(int)($existsId ?: 0);
    $data=[];
    foreach($columns as $col=>$meta){
      if(in_array($col,['id','created_at','updated_at'],true)) continue;
      $v=valueFor($col,$p,$outletId);
      if($v!==null){
        if(is_bool($v)) $v=$v?1:0;
        if(is_array($v) || is_object($v)) $v=json_encode($v,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
        $data[$col]=$v;
      }
    }
    // Satisfy common required columns that have no default.
    foreach($columns as $col=>$meta){
      if($col==='id'||$col==='created_at'||$col==='updated_at'||array_key_exists($col,$data)) continue;
      $nullable=strtoupper((string)$meta['Null'])==='YES';$hasDefault=$meta['Default']!==null;
      if($nullable||$hasDefault) continue;
      if($col==='outlet_id') $data[$col]=$outletId;
      elseif(in_array($col,['name','product_name'],true)) $data[$col]=$nameValue;
      elseif(in_array($col,['sku','product_code','code'],true)) $data[$col]=$code;
      elseif(in_array($col,['price','sale_price','selling_price','unit_price','cost','cost_price','purchase_price'],true)) $data[$col]=0;
      elseif(in_array($col,['active','enabled'],true)) $data[$col]=1;
      else $data[$col]='';
    }
    if(!$data) throw new RuntimeException('No writable product columns were resolved.');
    if($targetId>0){
      $sets=[];$vals=[];foreach($data as $col=>$v){$sets[]='`'.$col.'`=?';$vals[]=$v;}$vals[]=$targetId;if(isset($columns['outlet_id']))$vals[]=$outletId;
      $sql='UPDATE `products` SET '.implode(',',$sets).' WHERE id=?'.(isset($columns['outlet_id'])?' AND outlet_id=?':'').' LIMIT 1';
      $q=$pdo->prepare($sql);$q->execute($vals);$savedId=$targetId;
    }else{
      $cols=array_keys($data);$ph=array_fill(0,count($cols),'?');$vals=array_values($data);
      $q=$pdo->prepare('INSERT INTO `products` (`'.implode('`,`',$cols).'`) VALUES ('.implode(',',$ph).')');$q->execute($vals);$savedId=(int)$pdo->lastInsertId();
    }
    respond(['ok'=>true,'id'=>$savedId,'outletId'=>$outletId]);
  }
  respond(['ok'=>false,'error'=>'Unknown action.'],404);
}catch(Throwable $e){respond(['ok'=>false,'error'=>$e->getMessage()],500);}
