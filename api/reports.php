<?php
declare(strict_types=1);
require_once __DIR__ . '/security.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-SP-Manager-DB-Version: V10');
header('X-SP-Manager-Reports-Version: V1');
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
function outletId(PDO $pdo, mixed $value): int {
    $v = trim((string)($value ?? 'SP01')); if ($v === '') $v = 'SP01';
    if (ctype_digit($v)) { $q=$pdo->prepare('SELECT id FROM outlets WHERE id=? AND active=1 LIMIT 1'); $q->execute([(int)$v]); }
    else { $q=$pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND active=1 LIMIT 1'); $q->execute([$v]); }
    $id=(int)($q->fetchColumn()?:0); if($id<=0) throw new InvalidArgumentException('Outlet not found.'); return $id;
}
function scalar(PDO $pdo, string $sql, array $args=[]): float { $q=$pdo->prepare($sql); $q->execute($args); return (float)($q->fetchColumn()?:0); }
function intScalar(PDO $pdo, string $sql, array $args=[]): int { return (int)scalar($pdo,$sql,$args); }

try {
    $pdo = new PDO("mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4", $user, $pass, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    $action = strtolower(trim((string)($_GET['action'] ?? 'summary')));
    $oid = outletId($pdo, $_GET['outlet_id'] ?? 'SP01');
    if ($action !== 'summary') throw new InvalidArgumentException('Unknown reports action.');

    $activeSalesWhere = "outlet_id=? AND UPPER(COALESCE(status,'COMPLETED')) NOT IN ('VOID','VOIDED','REFUND','REFUNDED')";
    $salesTotal = tableExists($pdo,'sales') ? scalar($pdo,"SELECT COALESCE(SUM(total),0) FROM sales WHERE {$activeSalesWhere}",[$oid]) : 0;
    $transactions = tableExists($pdo,'sales') ? intScalar($pdo,"SELECT COUNT(*) FROM sales WHERE {$activeSalesWhere}",[$oid]) : 0;
    $unpaid = tableExists($pdo,'sales') ? scalar($pdo,"SELECT COALESCE(SUM(total),0) FROM sales WHERE outlet_id=? AND UPPER(COALESCE(status,'COMPLETED')) NOT IN ('VOID','VOIDED','REFUND','REFUNDED') AND UPPER(COALESCE(payment_status,'PAID')) <> 'PAID'",[$oid]) : 0;
    $grossMargin = 0;
    if (tableExists($pdo,'sale_items') && tableExists($pdo,'sales') && tableExists($pdo,'product_outlets')) {
        $grossMargin = scalar($pdo,
            "SELECT COALESCE(SUM(((si.unit_price * si.quantity) - COALESCE(si.discount,0)) - (COALESCE(po.cost_price,0) * si.quantity)),0)
             FROM sale_items si
             INNER JOIN sales s ON s.id=si.sale_id
             LEFT JOIN product_outlets po ON po.product_id=si.product_id AND po.outlet_id=s.outlet_id AND po.active=1
             WHERE s.outlet_id=? AND UPPER(COALESCE(s.status,'COMPLETED')) NOT IN ('VOID','VOIDED','REFUND','REFUNDED')",
            [$oid]
        );
    }
    $products = tableExists($pdo,'product_outlets') ? intScalar($pdo,'SELECT COUNT(*) FROM product_outlets WHERE outlet_id=? AND active=1',[$oid]) : 0;
    $customers = tableExists($pdo,'customers') ? intScalar($pdo,'SELECT COUNT(*) FROM customers WHERE outlet_id=?',[$oid]) : 0;
    $purchases = tableExists($pdo,'purchases') ? intScalar($pdo,'SELECT COUNT(*) FROM purchases WHERE outlet_id=?',[$oid]) : 0;
    $users = 0;
    if (tableExists($pdo,'users')) {
        if (tableExists($pdo,'user_outlets')) $users=intScalar($pdo,'SELECT COUNT(DISTINCT u.id) FROM users u LEFT JOIN user_outlets uo ON uo.user_id=u.id AND uo.active=1 WHERE u.enabled=1 AND (u.outlet_id=? OR uo.outlet_id=?)',[$oid,$oid]);
        else $users=intScalar($pdo,'SELECT COUNT(*) FROM users WHERE enabled=1 AND (outlet_id=? OR outlet_id IS NULL)',[$oid]);
    }
    $suppliers = tableExists($pdo,'suppliers') ? intScalar($pdo,'SELECT COUNT(*) FROM suppliers WHERE outlet_id=?',[$oid]) : 0;
    $paymentTypes = tableExists($pdo,'payment_types') ? intScalar($pdo,'SELECT COUNT(*) FROM payment_types WHERE outlet_id=?',[$oid]) : 0;
    $stockValue = tableExists($pdo,'product_outlets') ? scalar($pdo,'SELECT COALESCE(SUM(stock_qty*COALESCE(cost_price,0)),0) FROM product_outlets WHERE outlet_id=? AND active=1',[$oid]) : 0;
    echo json_encode([
        'ok'=>true,
        'api_version'=>'V10',
        'reports_version'=>'V1',
        'outlet_id'=>$oid,
        'summary'=>[
            'sales_total'=>$salesTotal,
            'transactions'=>$transactions,
            'unpaid'=>$unpaid,
            'gross_margin'=>$grossMargin,
            'products'=>$products,
            'customers'=>$customers,
            'purchases'=>$purchases,
            'users'=>$users,
            'suppliers'=>$suppliers,
            'payment_types'=>$paymentTypes,
            'stock_value'=>$stockValue,
        ],
        'sql_source'=>true,
    ],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'api_version'=>'V10','reports_version'=>'V1','error'=>'The report database query could not be completed.'],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
}
