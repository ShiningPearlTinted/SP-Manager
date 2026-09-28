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
function ensureCategory(PDO $pdo, int $outletId, mixed $categoryId, mixed $categoryName): ?int {
  $name=trim((string)($categoryName ?? ''));
  $id=(int)($categoryId ?? 0);
  $hasOutlet=hasColumnCached($pdo,'product_categories','outlet_id');
  if($id>0){
    $sql='SELECT id FROM product_categories WHERE id=?'; $args=[$id];
    if($hasOutlet){$sql.=' AND (outlet_id=? OR outlet_id IS NULL)';$args[]=$outletId;}
    $sql.=' LIMIT 1'; $q=$pdo->prepare($sql);$q->execute($args);$found=$q->fetchColumn();
    if($found!==false)return(int)$found;
  }
  if($name==='') return null;
  $resolved=resolveCategoryId($pdo,$outletId,0,$name);
  if($resolved!==null)return $resolved;
  $cols=tableColumns($pdo,'product_categories');
  $data=[];
  if(isset($cols['outlet_id']))$data['outlet_id']=$outletId;
  if(isset($cols['category_name']))$data['category_name']=$name;
  if(isset($cols['category_code']))$data['category_code']='';
  if(isset($cols['image_url']))$data['image_url']='';
  if(isset($cols['sort_order']))$data['sort_order']=0;
  if(isset($cols['active']))$data['active']=1;
  if(!$data)throw new RuntimeException('Product category table has no writable columns.');
  $q=$pdo->prepare('INSERT INTO product_categories (`'.implode('`,`',array_keys($data)).'`) VALUES ('.implode(',',array_fill(0,count($data),'?')).')');
  $q->execute(array_values($data));
  return (int)$pdo->lastInsertId();
}

function resolveCategoryId(PDO $pdo, int $outletId, mixed $categoryId, mixed $categoryName): ?int {
  $id=(int)($categoryId ?? 0);
  if($id>0){
    $q=$pdo->prepare('SELECT id FROM product_categories WHERE id=?'.(hasColumnCached($pdo,'product_categories','outlet_id')?' AND (outlet_id=? OR outlet_id IS NULL)':'').' LIMIT 1');
    $q->execute(hasColumnCached($pdo,'product_categories','outlet_id')?[$id,$outletId]:[$id]);
    $found=$q->fetchColumn(); if($found!==false) return (int)$found;
  }
  $name=trim((string)($categoryName ?? ''));
  if($name==='') return null;
  $q=$pdo->prepare('SELECT id FROM product_categories WHERE category_name=?'.(hasColumnCached($pdo,'product_categories','outlet_id')?' AND (outlet_id=? OR outlet_id IS NULL)':'').' ORDER BY CASE WHEN outlet_id=? THEN 0 ELSE 1 END, id ASC LIMIT 1');
  $args=hasColumnCached($pdo,'product_categories','outlet_id')?[$name,$outletId,$outletId]:[$name];
  if(!hasColumnCached($pdo,'product_categories','outlet_id')) $q=$pdo->prepare('SELECT id FROM product_categories WHERE category_name=? ORDER BY id ASC LIMIT 1');
  $q->execute($args); $found=$q->fetchColumn();
  return $found===false?null:(int)$found;
}
function resolveGroupId(PDO $pdo, int $outletId, mixed $groupId, mixed $groupName, ?int $categoryId=null): ?int {
  $id=(int)($groupId ?? 0);
  $hasOutlet=hasColumnCached($pdo,'product_groups','outlet_id');
  if($id>0){
    $sql='SELECT id FROM product_groups WHERE id=?'; $args=[$id];
    if($hasOutlet){$sql.=' AND (outlet_id=? OR outlet_id IS NULL)';$args[]=$outletId;}
    if($categoryId!==null){$sql.=' AND (category_id=? OR category_id IS NULL)';$args[]=$categoryId;}
    $sql.=' LIMIT 1'; $q=$pdo->prepare($sql);$q->execute($args);$found=$q->fetchColumn(); if($found!==false)return(int)$found;
  }
  $name=trim((string)($groupName ?? ''));
  if($name==='') return null;
  $sql='SELECT id FROM product_groups WHERE group_name=?';$args=[$name];
  if($hasOutlet){$sql.=' AND (outlet_id=? OR outlet_id IS NULL)';$args[]=$outletId;}
  if($categoryId!==null){$sql.=' AND (category_id=? OR category_id IS NULL)';$args[]=$categoryId;}
  $sql.=' ORDER BY CASE WHEN category_id IS NULL THEN 1 ELSE 0 END, id ASC LIMIT 1';
  $q=$pdo->prepare($sql);$q->execute($args);$found=$q->fetchColumn();
  return $found===false?null:(int)$found;
}
function resolveSupplierForeignKey(PDO $pdo, int $outletId, $candidate, array $product): ?int {
  if (!tableExists($pdo,'suppliers') || ($candidate===null || $candidate==='')) return null;
  $schema=tableColumns($pdo,'suppliers'); $hasOutlet=isset($schema['outlet_id']);
  $candidateText=trim((string)$candidate);
  if (ctype_digit($candidateText)) {
    $sql='SELECT id FROM suppliers WHERE id=?'; $args=[(int)$candidateText]; if($hasOutlet){$sql.=' AND outlet_id=?';$args[]=$outletId;} $sql.=' LIMIT 1'; $q=$pdo->prepare($sql);$q->execute($args);$id=(int)($q->fetchColumn()?:0); if($id>0)return$id;
  }
  foreach (['supplier_code','code'] as $col) if(isset($schema[$col])&&$candidateText!==''){ $sql='SELECT id FROM suppliers WHERE `'.$col.'`=?';$args=[$candidateText];if($hasOutlet){$sql.=' AND outlet_id=?';$args[]=$outletId;}$sql.=' LIMIT 1';$q=$pdo->prepare($sql);$q->execute($args);$id=(int)($q->fetchColumn()?:0);if($id>0)return$id; }
  $name=trim((string)($product['supplierName']??$product['supplier_name']??$product['supplier']['name']??''));
  foreach (['supplier_name','name'] as $col) if(isset($schema[$col])&&$name!==''){ $sql='SELECT id FROM suppliers WHERE `'.$col.'`=?';$args=[$name];if($hasOutlet){$sql.=' AND outlet_id=?';$args[]=$outletId;}$sql.=' LIMIT 1';$q=$pdo->prepare($sql);$q->execute($args);$id=(int)($q->fetchColumn()?:0);if($id>0)return$id; }
  throw new RuntimeException('Selected product supplier was not found in the database.');
}

function hasColumnCached(PDO $pdo, string $table, string $column): bool {
  static $cache=[]; $key=$table.'|'.$column;
  if(array_key_exists($key,$cache)) return $cache[$key];
  $cols=tableColumns($pdo,$table); return $cache[$key]=isset($cols[$column]);
}

function valueFor(string $column, array $p, int $outletId): mixed {
  $map=[
    'id'=>['id'], 'outlet_id'=>['outlet_id'],
    'category_id'=>['category_id'], 'group_id'=>['group_id'],
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


function syncProductRelations(PDO $pdo, int $outletId, int $productId, array $p): void {
  if ($productId <= 0) return;

  // Barcodes: keep the Product Master list authoritative in product_barcodes.
  if (tableExists($pdo, 'product_barcodes')) {
    $bars = [];
    if (isset($p['barcodes']) && is_array($p['barcodes'])) $bars = $p['barcodes'];
    if (!$bars && isset($p['barcode'])) $bars = [$p['barcode']];
    $bars = array_values(array_unique(array_filter(array_map(fn($v)=>trim((string)$v), $bars), fn($v)=>$v!=='')));
    $pdo->prepare('DELETE FROM product_barcodes WHERE product_id=?')->execute([$productId]);
    if ($bars) {
      $cols = tableColumns($pdo, 'product_barcodes');
      foreach ($bars as $i=>$barcode) {
        $data=[];
        if(isset($cols['product_id'])) $data['product_id']=$productId;
        if(isset($cols['barcode'])) $data['barcode']=$barcode;
        if(isset($cols['barcode_type'])) $data['barcode_type']=strlen($barcode)===13?'EAN13':'';
        if(isset($cols['is_primary'])) $data['is_primary']=$i===0?1:0;
        if(isset($cols['active'])) $data['active']=1;
        if($data){
          $q=$pdo->prepare('INSERT INTO product_barcodes (`'.implode('`,`',array_keys($data)).'`) VALUES ('.implode(',',array_fill(0,count($data),'?')).')');
          $q->execute(array_values($data));
        }
      }
    }
  }

  // Retail price: keep the current Product Master selling/cost price in product_prices.
  if (tableExists($pdo, 'product_prices')) {
    $cols=tableColumns($pdo,'product_prices');
    $price=(float)($p['price']??0); $cost=array_key_exists('cost',$p)?(float)$p['cost']:null;
    $q=$pdo->prepare('SELECT id FROM product_prices WHERE outlet_id=? AND product_id=? AND price_type=? LIMIT 1');
    $q->execute([$outletId,$productId,'RETAIL']); $priceId=(int)($q->fetchColumn()?:0);
    $data=[];
    if(isset($cols['outlet_id']))$data['outlet_id']=$outletId;
    if(isset($cols['product_id']))$data['product_id']=$productId;
    if(isset($cols['price_type']))$data['price_type']='RETAIL';
    if(isset($cols['price']))$data['price']=$price;
    if(isset($cols['cost_price']))$data['cost_price']=$cost;
    if(isset($cols['active']))$data['active']=1;
    if($priceId>0){
      $sets=[];$vals=[];foreach($data as $c=>$v){$sets[]='`'.$c.'`=?';$vals[]=$v;}$vals[]=$priceId;
      $pdo->prepare('UPDATE product_prices SET '.implode(',',$sets).' WHERE id=? LIMIT 1')->execute($vals);
    } elseif($data) {
      $q=$pdo->prepare('INSERT INTO product_prices (`'.implode('`,`',array_keys($data)).'`) VALUES ('.implode(',',array_fill(0,count($data),'?')).')');
      $q->execute(array_values($data));
    }
  }

  // Product image: Product Master has one current image; mirror it as the primary image.
  if (tableExists($pdo, 'product_images')) {
    $cols=tableColumns($pdo,'product_images');
    $image=trim((string)($p['image']??$p['image_url']??''));
    $pdo->prepare('DELETE FROM product_images WHERE product_id=?')->execute([$productId]);
    if($image!==''){
      $data=[];
      if(isset($cols['product_id']))$data['product_id']=$productId;
      if(isset($cols['image_url']))$data['image_url']=$image;
      if(isset($cols['image_name']))$data['image_name']=trim((string)($p['name']??'Product Image'));
      if(isset($cols['sort_order']))$data['sort_order']=0;
      if(isset($cols['is_primary']))$data['is_primary']=1;
      if($data){
        $q=$pdo->prepare('INSERT INTO product_images (`'.implode('`,`',array_keys($data)).'`) VALUES ('.implode(',',array_fill(0,count($data),'?')).')');
        $q->execute(array_values($data));
      }
    }
  }
}
function tableExists(PDO $pdo, string $table): bool {
  static $cache=[]; if(isset($cache[$table])) return $cache[$table];
  try { tableColumns($pdo,$table); return $cache[$table]=true; } catch(Throwable $e) { return $cache[$table]=false; }
}
function hydrateProductRelations(PDO $pdo, array &$rows): void {
  if(!$rows) return;
  $ids=array_values(array_unique(array_filter(array_map(fn($r)=>(int)($r['id']??0),$rows))));
  if(!$ids) return;
  $ph=implode(',',array_fill(0,count($ids),'?'));
  if(tableExists($pdo,'product_barcodes')){
    $q=$pdo->prepare('SELECT product_id, barcode FROM product_barcodes WHERE product_id IN ('.$ph.') AND active=1 ORDER BY is_primary DESC,id ASC');
    $q->execute($ids); $map=[];
    foreach($q->fetchAll() as $r)$map[(int)$r['product_id']][]=(string)$r['barcode'];
    foreach($rows as &$r){$b=$map[(int)$r['id']]??[];if($b){$r['barcodes']=$b;$r['barcode']=$b[0];}} unset($r);
  }
  if(tableExists($pdo,'product_prices')){
    $q=$pdo->prepare('SELECT product_id, price, cost_price FROM product_prices WHERE outlet_id=? AND product_id IN ('.$ph.') AND price_type=? AND active=1');
    $q->execute(array_merge([$rows[0]['outlet_id']??0],$ids,['RETAIL'])); $map=[];
    foreach($q->fetchAll() as $r)$map[(int)$r['product_id']]=$r;
    foreach($rows as &$r){$v=$map[(int)$r['id']]??null;if($v){$r['price']=(float)$v['price'];if($v['cost_price']!==null)$r['cost']=(float)$v['cost_price'];}} unset($r);
  }
  if(tableExists($pdo,'product_images')){
    $q=$pdo->prepare('SELECT product_id, image_url FROM product_images WHERE product_id IN ('.$ph.') ORDER BY is_primary DESC,id ASC');
    $q->execute($ids); $map=[];
    foreach($q->fetchAll() as $r){$pid=(int)$r['product_id'];if(!isset($map[$pid]))$map[$pid]=(string)$r['image_url'];}
    foreach($rows as &$r){if(isset($map[(int)$r['id']])){$r['image']=$map[(int)$r['id']];$r['image_url']=$map[(int)$r['id']];}} unset($r);
  }
}

try {
  $pdo=new PDO("mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
  $columns=tableColumns($pdo,'products');
  if (!$columns) throw new RuntimeException('Table products not found.');
  $outletId=resolveOutletId($pdo,$_GET['outlet_id']??$_POST['outlet_id']??'SP01');
  if($outletId<=0) throw new InvalidArgumentException('Outlet not found.');

  $action=strtolower(trim((string)($_GET['action']??$_POST['action']??'')));
  if($action==='health') respond(['ok'=>true,'service'=>'SP-Manager products API','database'=>$pdo->query('SELECT DATABASE()')->fetchColumn(),'outletId'=>$outletId,'columns'=>array_keys($columns)]);

  if($action==='catalog' && $_SERVER['REQUEST_METHOD']==='GET'){
    $cats=[]; $groups=[];
    $q=$pdo->prepare('SELECT c.*, c.category_name AS category_name FROM product_categories c WHERE (c.outlet_id=? OR c.outlet_id IS NULL) ORDER BY c.sort_order ASC,c.id ASC');
    $q->execute([$outletId]); $cats=$q->fetchAll();
    $groupSql='SELECT g.*, c.category_name AS category_name, parent.group_name AS parent_name FROM product_groups g LEFT JOIN product_categories c ON c.id=g.category_id LEFT JOIN product_groups parent ON parent.id=g.parent_id WHERE (g.outlet_id=? OR g.outlet_id IS NULL) ORDER BY g.sort_order ASC,g.id ASC';
    $q=$pdo->prepare($groupSql); $q->execute([$outletId]); $groups=$q->fetchAll();
    respond(['ok'=>true,'outletId'=>$outletId,'categories'=>$cats,'groups'=>$groups]);
  }

  if($action==='save-category' && $_SERVER['REQUEST_METHOD']==='POST'){
    $b=jsonBody(); $c=$b['category']??$b;
    if(!is_array($c)) throw new InvalidArgumentException('category is required.');
    $name=trim((string)($c['category_name']??$c['name']??'')); if($name==='') throw new InvalidArgumentException('Category name is required.');
    $id=(int)($c['id']??0);
    $q=$pdo->prepare('SELECT id FROM product_categories WHERE category_name=? AND (outlet_id=? OR outlet_id IS NULL) ORDER BY CASE WHEN outlet_id=? THEN 0 ELSE 1 END,id ASC LIMIT 1');
    $q->execute([$name,$outletId,$outletId]); $existing=(int)($q->fetchColumn()?:0); if($existing>0)$id=$existing;
    $data=['outlet_id'=>$outletId,'category_name'=>$name,'category_code'=>trim((string)($c['category_code']??$c['code']??'')),'image_url'=>(string)($c['image_url']??$c['image']??''),'sort_order'=>(int)($c['sort_order']??$c['rank']??0),'active'=>($c['active']??true)?1:0];
    if($id>0){$sets=[];$vals=[];foreach($data as $col=>$v){$sets[]='`'.$col.'`=?';$vals[]=$v;}$vals[]=$id;$vals[]=$outletId;$q=$pdo->prepare('UPDATE product_categories SET '.implode(',',$sets).' WHERE id=? AND (outlet_id=? OR outlet_id IS NULL) LIMIT 1');$q->execute($vals);}else{$q=$pdo->prepare('INSERT INTO product_categories (`'.implode('`,`',array_keys($data)).'`) VALUES ('.implode(',',array_fill(0,count($data),'?')).')');$q->execute(array_values($data));$id=(int)$pdo->lastInsertId();}
    respond(['ok'=>true,'id'=>$id,'category_name'=>$name]);
  }

  if($action==='save-group' && $_SERVER['REQUEST_METHOD']==='POST'){
    $b=jsonBody(); $g=$b['group']??$b;
    if(!is_array($g)) throw new InvalidArgumentException('group is required.');
    $name=trim((string)($g['group_name']??$g['name']??'')); if($name==='') throw new InvalidArgumentException('Product group name is required.');
    $categoryId=ensureCategory($pdo,$outletId,$g['category_id']??null,$g['category']??$g['category_name']??null);
    $parentName=trim((string)($g['parent']??$g['parent_name']??'')); $parentId=(int)($g['parent_id']??0);
    if($parentId<=0 && $parentName!==''){$q=$pdo->prepare('SELECT id FROM product_groups WHERE group_name=? AND (outlet_id=? OR outlet_id IS NULL) ORDER BY CASE WHEN outlet_id=? THEN 0 ELSE 1 END,id ASC LIMIT 1');$q->execute([$parentName,$outletId,$outletId]);$parentId=(int)($q->fetchColumn()?:0);}
    $id=(int)($g['id']??0);
    $q=$pdo->prepare('SELECT id FROM product_groups WHERE group_name=? AND (outlet_id=? OR outlet_id IS NULL) ORDER BY CASE WHEN outlet_id=? THEN 0 ELSE 1 END,id ASC LIMIT 1');$q->execute([$name,$outletId,$outletId]);$existing=(int)($q->fetchColumn()?:0);if($existing>0)$id=$existing;
    if($id<=0){
      $oldName=trim((string)($g['old_name']??''));
      if($oldName!=='' && strcasecmp($oldName,$name)!==0){$q=$pdo->prepare('SELECT id FROM product_groups WHERE group_name=? AND (outlet_id=? OR outlet_id IS NULL) ORDER BY CASE WHEN outlet_id=? THEN 0 ELSE 1 END,id ASC LIMIT 1');$q->execute([$oldName,$outletId,$outletId]);$id=(int)($q->fetchColumn()?:0);}
    }
    $data=['outlet_id'=>$outletId,'category_id'=>$categoryId?:null,'parent_id'=>$parentId?:null,'group_name'=>$name,'group_code'=>trim((string)($g['group_code']??$g['code']??'')),'image_url'=>(string)($g['image_url']??$g['image']??''),'sort_order'=>(int)($g['sort_order']??$g['rank']??0),'active'=>($g['active']??true)?1:0];
    if($id>0){$sets=[];$vals=[];foreach($data as $col=>$v){$sets[]='`'.$col.'`=?';$vals[]=$v;}$vals[]=$id;$vals[]=$outletId;$q=$pdo->prepare('UPDATE product_groups SET '.implode(',',$sets).' WHERE id=? AND (outlet_id=? OR outlet_id IS NULL) LIMIT 1');$q->execute($vals);}else{$q=$pdo->prepare('INSERT INTO product_groups (`'.implode('`,`',array_keys($data)).'`) VALUES ('.implode(',',array_fill(0,count($data),'?')).')');$q->execute(array_values($data));$id=(int)$pdo->lastInsertId();}
    respond(['ok'=>true,'id'=>$id,'group_name'=>$name,'category_id'=>$categoryId,'parent_id'=>$parentId?:null]);
  }

  if($action==='list' && $_SERVER['REQUEST_METHOD']==='GET'){
    $outletCol=isset($columns['outlet_id']);
    $hasCategoryId=isset($columns['category_id']); $hasGroupId=isset($columns['group_id']);
    $select='p.*';
    if($hasCategoryId) $select.=', c.category_name AS category_name';
    if($hasGroupId) $select.=', g.group_name AS group_name';
    $sql='SELECT '.$select.' FROM `products` p';
    if($hasCategoryId) $sql.=' LEFT JOIN product_categories c ON c.id=p.category_id';
    if($hasGroupId) $sql.=' LEFT JOIN product_groups g ON g.id=p.group_id';
    if($outletCol) $sql.=' WHERE p.outlet_id=?';
    $sql.=' ORDER BY p.id ASC';
    $q=$pdo->prepare($sql);$q->execute($outletCol?[$outletId]:[]);$rows=$q->fetchAll();
    hydrateProductRelations($pdo,$rows);
    respond(['ok'=>true,'outletId'=>$outletId,'count'=>count($rows),'products'=>$rows]);
  }

  if($action==='delete-group' && $_SERVER['REQUEST_METHOD']==='POST'){
    $b=jsonBody(); $id=(int)($b['id']??0); $name=trim((string)($b['name']??''));
    if($id<=0 && $name==='') throw new InvalidArgumentException('Product group id or name is required.');
    if($id>0){$q=$pdo->prepare('SELECT id FROM product_groups WHERE id=? AND (outlet_id=? OR outlet_id IS NULL) LIMIT 1');$q->execute([$id,$outletId]);$id=(int)($q->fetchColumn()?:0);}
    if($id<=0){$q=$pdo->prepare('SELECT id FROM product_groups WHERE group_name=? AND (outlet_id=? OR outlet_id IS NULL) ORDER BY CASE WHEN outlet_id=? THEN 0 ELSE 1 END,id ASC LIMIT 1');$q->execute([$name,$outletId,$outletId]);$id=(int)($q->fetchColumn()?:0);}
    if($id<=0) respond(['ok'=>true,'deleted'=>false,'id'=>0]);
    $q=$pdo->prepare('SELECT COUNT(*) FROM product_groups WHERE parent_id=? AND (outlet_id=? OR outlet_id IS NULL)');$q->execute([$id,$outletId]);if((int)$q->fetchColumn()>0)throw new RuntimeException('Cannot delete group because it still has child groups.');
    $colsNow=tableColumns($pdo,'products');if(isset($colsNow['group_id'])){$q=$pdo->prepare('SELECT COUNT(*) FROM products WHERE group_id=?'.(isset($colsNow['outlet_id'])?' AND outlet_id=?':''));$q->execute(isset($colsNow['outlet_id'])?[$id,$outletId]:[$id]);if((int)$q->fetchColumn()>0)throw new RuntimeException('Cannot delete group because products are still assigned to it.');}
    $q=$pdo->prepare('DELETE FROM product_groups WHERE id=? AND (outlet_id=? OR outlet_id IS NULL) LIMIT 1');$q->execute([$id,$outletId]);respond(['ok'=>true,'deleted'=>$q->rowCount()>0,'id'=>$id]);
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

    // Resolve Product Master names to relational foreign keys. The UI may send
    // category/group names, while MySQL products stores category_id/group_id.
    if(isset($columns['category_id'])){
      $resolvedCategoryId=ensureCategory($pdo,$outletId,$p['category_id']??null,$p['category']??$p['category_name']??null);
      if($resolvedCategoryId!==null) $p['category_id']=$resolvedCategoryId;
      else if(array_key_exists('category_id',$p) && $p['category_id']!==null && (int)$p['category_id']>0) throw new InvalidArgumentException('Selected product category was not found.');
    }
    if(isset($columns['group_id'])){
      $groupName=$p['group']??$p['group_name']??null;
      $resolvedGroupId=resolveGroupId($pdo,$outletId,$p['group_id']??null,$groupName,isset($p['category_id'])?(int)$p['category_id']:null);
      if($resolvedGroupId===null && trim((string)$groupName)!==''){
        // Product Groups must also exist relationally. Create the selected group when it is missing.
        $groupCategoryId=isset($p['category_id'])?(int)$p['category_id']:null;
        $parentId=(int)($p['parent_id']??0);
        $groupData=[];
        $groupCols=tableColumns($pdo,'product_groups');
        if(isset($groupCols['outlet_id']))$groupData['outlet_id']=$outletId;
        if(isset($groupCols['category_id']))$groupData['category_id']=$groupCategoryId?:null;
        if(isset($groupCols['parent_id']))$groupData['parent_id']=$parentId?:null;
        if(isset($groupCols['group_name']))$groupData['group_name']=trim((string)$groupName);
        if(isset($groupCols['group_code']))$groupData['group_code']='';
        if(isset($groupCols['image_url']))$groupData['image_url']='';
        if(isset($groupCols['sort_order']))$groupData['sort_order']=0;
        if(isset($groupCols['active']))$groupData['active']=1;
        if(!$groupData)throw new RuntimeException('Product group table has no writable columns.');
        $q=$pdo->prepare('INSERT INTO product_groups (`'.implode('`,`',array_keys($groupData)).'`) VALUES ('.implode(',',array_fill(0,count($groupData),'?')).')');
        $q->execute(array_values($groupData));
        $resolvedGroupId=(int)$pdo->lastInsertId();
      }
      if($resolvedGroupId!==null) $p['group_id']=$resolvedGroupId;
      else if(array_key_exists('group_id',$p) && $p['group_id']!==null && (int)$p['group_id']>0) throw new InvalidArgumentException('Selected product group was not found.');
    }

    if(isset($columns['supplier_id']) && array_key_exists('supplierId',$p) && $p['supplierId']!=='') $p['supplierId']=resolveSupplierForeignKey($pdo,$outletId,$p['supplierId'],$p);

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
    // Product code/SKU is the stable identity used by the Product Master.
    // If an earlier sync created a duplicate row with the same code, keep the
    // row that was just saved and remove only the other exact-code duplicates
    // for this outlet. This prevents Edit + Save from creating/retaining twins.
    if($code!=='' && ($codeCol=firstColumn($columns,['sku','product_code','code']))){
      $sql='DELETE FROM `products` WHERE `'.$codeCol.'`=? AND id<>?'.(isset($columns['outlet_id'])?' AND outlet_id=?':'');
      $q=$pdo->prepare($sql);
      $q->execute(isset($columns['outlet_id'])?[$code,$savedId,$outletId]:[$code,$savedId]);
    }
    syncProductRelations($pdo,$outletId,$savedId,$p);
    respond(['ok'=>true,'id'=>$savedId,'outletId'=>$outletId,'category_id'=>isset($p['category_id'])?(int)$p['category_id']:null,'group_id'=>isset($p['group_id'])?(int)$p['group_id']:null,'selling_price'=>isset($p['price'])?(float)$p['price']:null]);
  }
  respond(['ok'=>false,'error'=>'Unknown action.'],404);
}catch(Throwable $e){respond(['ok'=>false,'error'=>$e->getMessage()],500);}
