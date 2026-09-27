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

function body(): array {
    $v = json_decode(file_get_contents('php://input') ?: '', true);
    return is_array($v) ? $v : [];
}
function pick(array $a, array $keys, $default = null) {
    foreach ($keys as $k) if (array_key_exists($k, $a) && $a[$k] !== null && $a[$k] !== '') return $a[$k];
    return $default;
}
function cols(PDO $pdo, string $table): array {
    $q = $pdo->query('DESCRIBE `' . str_replace('`', '``', $table) . '`');
    $out = [];
    foreach ($q->fetchAll() as $r) $out[$r['Field']] = $r;
    return $out;
}
function hasTable(PDO $pdo, string $table): bool {
    $q = $pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?');
    $q->execute([$table]);
    return (int)$q->fetchColumn() > 0;
}
function outletId(PDO $pdo, $outlet): int {
    if (ctype_digit((string)$outlet)) return (int)$outlet;
    $q = $pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? LIMIT 1');
    $q->execute([(string)$outlet]);
    return (int)($q->fetchColumn() ?: 0);
}
function optionalOutletFk(PDO $pdo, string $table, $id, int $outletId): ?int {
    if ($id === null || $id === '' || !ctype_digit((string)$id) || !(int)$id) return null;
    if (!hasTable($pdo, $table)) return null;
    $schema = cols($pdo, $table);
    $sql = isset($schema['outlet_id'])
        ? "SELECT id FROM `$table` WHERE id=? AND outlet_id=? LIMIT 1"
        : "SELECT id FROM `$table` WHERE id=? LIMIT 1";
    $q = $pdo->prepare($sql);
    isset($schema['outlet_id']) ? $q->execute([(int)$id, $outletId]) : $q->execute([(int)$id]);
    $v = $q->fetchColumn();
    return $v === false ? null : (int)$v;
}
function productId(PDO $pdo, array $item, int $outletId): ?int {
    $id = pick($item, ['productId', 'id']);
    if ($id !== null && ctype_digit((string)$id) && (int)$id) {
        $q = $pdo->prepare('SELECT id FROM products WHERE id=? AND outlet_id=? LIMIT 1');
        $q->execute([(int)$id, $outletId]);
        $v = $q->fetchColumn();
        if ($v !== false) return (int)$v;
    }
    $code = trim((string)pick($item, ['code', 'sku'], ''));
    if ($code !== '') {
        $q = $pdo->prepare('SELECT id FROM products WHERE outlet_id=? AND sku=? LIMIT 1');
        $q->execute([$outletId, $code]);
        $v = $q->fetchColumn();
        if ($v !== false) return (int)$v;
    }
    return null;
}
function saveSale(PDO $pdo, array $sale, int $outletId): int {
    if (!hasTable($pdo, 'sales')) throw new RuntimeException('Table sales does not exist.');
    $schema = cols($pdo, 'sales');
    $saleNo = trim((string)pick($sale, ['no','saleNo','invoiceNo','invoice_number'], ''));
    if ($saleNo === '') throw new InvalidArgumentException('Sale number is required.');

    $customerId = optionalOutletFk($pdo, 'customers', pick($sale, ['customerId','customer_id']), $outletId);
    $createdBy = optionalOutletFk($pdo, 'users', pick($sale, ['userId','created_by','createdBy']), $outletId);
    $rawDate = (string)pick($sale, ['date','saleDate'], date('Y-m-d H:i:s'));
    $ts = strtotime($rawDate);
    $saleDate = $ts ? date('Y-m-d H:i:s', $ts) : date('Y-m-d H:i:s');

    $row = [
        'outlet_id'=>$outletId,
        'sale_no'=>$saleNo,
        'sale_date'=>$saleDate,
        'customer_id'=>$customerId,
        'order_name'=>(string)pick($sale,['orderName','name'],''),
        'service_type'=>(string)pick($sale,['serviceType'],''),
        'subtotal'=>(float)pick($sale,['subtotal'],0),
        'discount'=>(float)pick($sale,['discount'],0),
        'tax'=>(float)pick($sale,['tax'],0),
        'total'=>(float)pick($sale,['total'],0),
        'payment_status'=>(string)pick($sale,['paymentStatus'],((bool)pick($sale,['paid'],false)?'PAID':'UNPAID')),
        'status'=>(string)pick($sale,['status'],'COMPLETED'),
        'created_by'=>$createdBy,
    ];
    $row = array_filter($row, fn($v,$k)=>isset($schema[$k]), ARRAY_FILTER_USE_BOTH);

    $q = $pdo->prepare('SELECT id FROM sales WHERE outlet_id=? AND sale_no=? LIMIT 1');
    $q->execute([$outletId,$saleNo]);
    $dbId = (int)($q->fetchColumn() ?: 0);
    if ($dbId) {
        $set=[]; $vals=[];
        foreach ($row as $k=>$v) { if ($k==='outlet_id') continue; $set[]="`$k`=?"; $vals[]=$v; }
        $vals[]=$dbId; $vals[]=$outletId;
        $pdo->prepare('UPDATE sales SET '.implode(',',$set).' WHERE id=? AND outlet_id=?')->execute($vals);
    } else {
        $fields=array_keys($row);
        $pdo->prepare('INSERT INTO sales (`'.implode('`,`',$fields).'`) VALUES ('.implode(',',array_fill(0,count($fields),'?')).')')->execute(array_values($row));
        $dbId=(int)$pdo->lastInsertId();
    }

    if (hasTable($pdo,'sale_items')) {
        $pdo->prepare('DELETE FROM sale_items WHERE sale_id=?')->execute([$dbId]);
        $cs=cols($pdo,'sale_items');
        foreach (($sale['items']??[]) as $it) {
            $pid=productId($pdo,is_array($it)?$it:[],$outletId);
            if (!$pid) throw new RuntimeException('Product not found in MySQL for sale item: '.(string)pick((array)$it,['name','productName'],'Unknown product'));
            $qty=(float)pick((array)$it,['qty','quantity'],0);
            $price=(float)pick((array)$it,['price','unitPrice'],0);
            $child=['sale_id'=>$dbId,'product_id'=>$pid,'product_name'=>(string)pick((array)$it,['name','productName'],''),'barcode'=>pick((array)$it,['barcode']),'quantity'=>$qty,'unit_price'=>$price,'discount'=>(float)pick((array)$it,['discount'],0),'tax'=>(float)pick((array)$it,['tax'],0),'line_total'=>(float)($qty*$price)];
            $child=array_filter($child,fn($v,$k)=>isset($cs[$k]),ARRAY_FILTER_USE_BOTH);
            $fields=array_keys($child);
            $pdo->prepare('INSERT INTO sale_items (`'.implode('`,`',$fields).'`) VALUES ('.implode(',',array_fill(0,count($fields),'?')).')')->execute(array_values($child));
        }
    }

    if (hasTable($pdo,'sale_payments')) {
        $pdo->prepare('DELETE FROM sale_payments WHERE sale_id=?')->execute([$dbId]);
        $cs=cols($pdo,'sale_payments');
        $payments=$sale['payments']??[];
        if (!$payments) $payments=[['paymentTypeId'=>pick($sale,['paymentTypeId']),'payment'=>pick($sale,['payment'],'Cash'),'amount'=>pick($sale,['paymentAmount'],0),'change'=>pick($sale,['change'],0)]];
        foreach ($payments as $it) {
            $it=(array)$it;
            $ptid=optionalOutletFk($pdo,'payment_types',pick($it,['paymentTypeId']),$outletId);
            $ptname=(string)pick($it,['payment','name'],'Payment');
            if (!$ptid) {
                $q=$pdo->prepare('SELECT id,payment_name FROM payment_types WHERE outlet_id=? AND payment_name=? LIMIT 1');
                $q->execute([$outletId,$ptname]);
                $x=$q->fetch();
                if ($x) { $ptid=(int)$x['id']; $ptname=(string)$x['payment_name']; }
            }
            $child=['sale_id'=>$dbId,'payment_type_id'=>$ptid,'payment_type_name'=>$ptname,'amount'=>(float)pick($it,['amount'],0),'tendered'=>pick($it,['tendered']),'change_amount'=>(float)pick($it,['change','changeAmount'],0),'reference_no'=>pick($it,['referenceNo','reference']),'created_at'=>date('Y-m-d H:i:s')];
            $child=array_filter($child,fn($v,$k)=>isset($cs[$k]),ARRAY_FILTER_USE_BOTH);
            $fields=array_keys($child);
            $pdo->prepare('INSERT INTO sale_payments (`'.implode('`,`',$fields).'`) VALUES ('.implode(',',array_fill(0,count($fields),'?')).')')->execute(array_values($child));
        }
    }
    return $dbId;
}

try {
    if ($name===''||$user==='') throw new RuntimeException('Database configuration is incomplete.');
    $pdo=new PDO("mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    $b=body(); $action=(string)($b['action']??($_GET['action']??'health')); $outlet=trim((string)($b['outlet_id']??($_GET['outlet_id']??'SP01'))); $oid=outletId($pdo,$outlet); if(!$oid)throw new RuntimeException('Outlet not found: '.$outlet);
    if($action==='health'){echo json_encode(['ok'=>true,'service'=>'SP-Manager Sales API','database'=>$name,'outlet_id'=>$oid]);exit;}
    if($action==='list'){ $q=$pdo->prepare('SELECT * FROM sales WHERE outlet_id=? ORDER BY id DESC');$q->execute([$oid]);echo json_encode(['ok'=>true,'sales'=>$q->fetchAll()]);exit; }
    if($action!=='save'&&$action!=='save-batch')throw new RuntimeException('Unsupported action: '.$action);
    $sales=$action==='save'?[$b['sale']??null]:($b['sales']??[]); if(!is_array($sales))throw new InvalidArgumentException('sales must be an array.');
    $pdo->beginTransaction();$saved=[];foreach($sales as $sale){if(!is_array($sale))continue;$saved[]=saveSale($pdo,$sale,$oid);} $pdo->commit();
    echo json_encode(['ok'=>true,'count'=>count($saved),'sale_ids'=>$saved]);
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();http_response_code(500);echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);}
