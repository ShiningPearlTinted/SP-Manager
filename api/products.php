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
    $q=$pdo->prepare('SELECT * FROM product_categories WHERE (outlet_id=? OR outlet_id IS NULL) ORDER BY sort_order ASC,id ASC');
    $q->execute([$outletId]); $cats=$q->fetchAll();
    $q=$pdo->prepare('SELECT * FROM product_groups WHERE (outlet_id=? OR outlet_id IS NULL) ORDER BY sort_order ASC,id ASC');
    $q->execute([$outletId]); $groups=$q->fetchAll();
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
    respond(['ok'=>true,'id'=>$savedId,'outletId'=>$outletId,'category_id'=>isset($p['category_id'])?(int)$p['category_id']:null,'group_id'=>isset($p['group_id'])?(int)$p['group_id']:null,'selling_price'=>isset($p['price'])?(float)$p['price']:null]);
  }
  respond(['ok'=>false,'error'=>'Unknown action.'],404);
}catch(Throwable $e){respond(['ok'=>false,'error'=>$e->getMessage()],500);}
