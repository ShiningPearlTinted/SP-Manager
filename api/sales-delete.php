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

function body(): array {
    $v = json_decode(file_get_contents('php://input') ?: '', true);
    return is_array($v) ? $v : [];
}
function tableExists(PDO $pdo, string $table): bool {
    $q = $pdo->prepare("SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=? AND table_type='BASE TABLE' LIMIT 1");
    $q->execute([$table]);
    return (bool)$q->fetchColumn();
}
function cols(PDO $pdo, string $table): array {
    $q = $pdo->query('DESCRIBE `'.str_replace('`','``',$table).'`');
    $out = [];
    foreach ($q->fetchAll() as $r) $out[$r['Field']] = $r;
    return $out;
}
function resolveOutlet(PDO $pdo, string $outlet): int {
    if (ctype_digit($outlet)) return (int)$outlet;
    $q = $pdo->prepare('SELECT id FROM outlets WHERE outlet_code = ? LIMIT 1');
    $q->execute([$outlet]);
    return (int)($q->fetchColumn() ?: 0);
}
function normalizeStatus(?string $v): string {
    return strtoupper(trim((string)$v));
}
function stockField(array $schema): ?string {
    foreach (['stock_qty','stock','quantity','current_stock'] as $field) {
        if (isset($schema[$field])) return $field;
    }
    return null;
}
function isServiceProduct(PDO $pdo, int $productId, int $outletId): bool {
    if (!tableExists($pdo, 'products')) return false;
    $schema = cols($pdo, 'products');
    if (!isset($schema['is_service'])) return false;
    // Products are shared master records; scope the inventory operation through
    // product_outlets, but read this global product attribute by its unique ID.
    $q = $pdo->prepare('SELECT is_service FROM products WHERE id = ? LIMIT 1'); $q->execute([$productId]);
    return (bool)$q->fetchColumn();
}
function ensureDeleteProductOutletTable(PDO $pdo): void {
    spEnsureProductOutletTable($pdo);
}
function currentStock(PDO $pdo, int $outletId, int $productId): float {
    ensureDeleteProductOutletTable($pdo);
    $q = $pdo->prepare('SELECT stock_qty FROM product_outlets WHERE product_id=? AND outlet_id=? LIMIT 1');
    $q->execute([$productId,$outletId]);
    $stock = $q->fetchColumn();
    if ($stock === false) throw new RuntimeException('The sale product has no inventory assignment for this outlet.');
    return (float)$stock;
}
function restoreStockForDeletedSale(PDO $pdo, int $outletId, int $saleId, string $saleNo, int $productId, float $quantity): void {
    if ($quantity <= 0 || $productId <= 0 || isServiceProduct($pdo, $productId, $outletId)) return;
    ensureDeleteProductOutletTable($pdo);
    $before = currentStock($pdo, $outletId, $productId);
    $updated = $pdo->prepare('UPDATE product_outlets SET stock_qty=stock_qty+?,updated_at=NOW() WHERE product_id=? AND outlet_id=? LIMIT 1');
    $updated->execute([$quantity,$productId,$outletId]);
    if ($updated->rowCount() !== 1) throw new RuntimeException('Outlet stock could not be restored for the deleted sale.');
    $after = currentStock($pdo, $outletId, $productId);

    if (!tableExists($pdo, 'stock_movements')) return;
    $ms = cols($pdo, 'stock_movements');
    $data = [
        'outlet_id' => $outletId,
        'product_id' => $productId,
        'movement_type' => 'SALE_DELETE',
        'reference_type' => 'SALE_DELETE',
        'reference_id' => $saleId,
        'reference_no' => $saleNo,
        'quantity_change' => $quantity,
        'quantity' => $quantity,
        'qty' => $quantity,
        'quantity_after' => $after,
        'stock_before' => $before,
        'stock_after' => $after,
        'notes' => 'Stock restored after sale deletion: '.$saleNo,
        'created_at' => date('Y-m-d H:i:s'),
        'created_by' => (int)($_SERVER['SP_AUTH_USER_ID'] ?? 0) ?: null
    ];
    $row = [];
    foreach ($data as $fieldName => $value) {
        if (isset($ms[$fieldName])) $row[$fieldName] = $value;
    }
    if (isset($ms['unit_cost']) && !array_key_exists('unit_cost', $row)) $row['unit_cost'] = 0;
    if ($row) {
        $fields = array_keys($row);
        $sql = 'INSERT INTO stock_movements (`'.implode('`,`',$fields).'`) VALUES ('.implode(',', array_fill(0,count($fields),'?')).')';
        $pdo->prepare($sql)->execute(array_values($row));
    }
}
function refreshLoyalty(PDO $pdo, int $outletId, int $customerId): void {
    if ($customerId <= 0 || !tableExists($pdo,'customers') || !tableExists($pdo,'sales')) return;
    $q = $pdo->prepare("SELECT COUNT(*) AS visits, COALESCE(SUM(total),0) AS spend
                        FROM sales
                        WHERE outlet_id=? AND customer_id=?
                          AND UPPER(COALESCE(status,'')) NOT IN ('VOID','VOIDED','REFUND','REFUNDED')
                          AND UPPER(COALESCE(payment_status,''))='PAID'");
    $q->execute([$outletId,$customerId]);
    $a = $q->fetch() ?: ['visits'=>0,'spend'=>0];
    $visits = (int)$a['visits'];
    $spend = (float)$a['spend'];
    $points = floor(max(0,$spend));

    $cs = cols($pdo,'customers'); $set=[]; $args=[];
    foreach ([['visits',$visits],['spend',$spend],['loyalty_points',$points]] as [$field,$value]) {
        if (isset($cs[$field])) { $set[]='`'.$field.'`=?'; $args[]=$value; }
    }
    if ($set) {
        $where = 'id=?'; $args[]=$customerId;
        if (isset($cs['outlet_id'])) { $where .= ' AND (outlet_id=? OR outlet_id IS NULL)'; $args[]=$outletId; }
        $pdo->prepare('UPDATE customers SET '.implode(',',$set).' WHERE '.$where.' LIMIT 1')->execute($args);
    }

    if (tableExists($pdo,'loyalty_accounts')) {
        $la = cols($pdo,'loyalty_accounts');
        $fields=[]; $vals=[];
        foreach ([['outlet_id',$outletId],['customer_id',$customerId],['points_balance',$points],['visits',$visits],['total_spend',$spend],['active',1]] as [$field,$value]) {
            if (isset($la[$field])) { $fields[]='`'.$field.'`'; $vals[]=$value; }
        }
        $updates=[];
        foreach (['points_balance','visits','total_spend','active'] as $field) if (isset($la[$field])) $updates[]='`'.$field.'`=VALUES(`'.$field.'`)';
        if ($fields) {
            $sql='INSERT INTO loyalty_accounts ('.implode(',',$fields).') VALUES ('.implode(',',array_fill(0,count($fields),'?')).')';
            if ($updates) $sql.=' ON DUPLICATE KEY UPDATE '.implode(',',$updates);
            $pdo->prepare($sql)->execute($vals);
        }
    }
}

try {
    if ($name === '' || $user === '') throw new RuntimeException('Database configuration is incomplete.');
    $pdo=spApiDatabase();

    $b = body();
    $outletId = resolveOutlet($pdo, trim((string)($b['outlet_id'] ?? ($_SERVER['SP_AUTH_OUTLET_ID'] ?? ''))));
    if (!$outletId) throw new RuntimeException('Outlet not found.');
    if (!tableExists($pdo,'sales')) throw new RuntimeException('Sales table is missing from the database.');
    foreach (['sale_items','sale_payments'] as $requiredTable) if (!tableExists($pdo,$requiredTable)) throw new RuntimeException('Required database table is missing: '.$requiredTable.'. This sale cannot be deleted safely.');

    $saleId = (int)($b['sale_id'] ?? $b['dbId'] ?? 0);
    $saleNo = trim((string)($b['sale_no'] ?? $b['saleNo'] ?? ''));

    $pdo->beginTransaction();spLockOutlet($pdo,$outletId);
    if ($saleId > 0) {
        $q = $pdo->prepare('SELECT * FROM sales WHERE id=? AND outlet_id=? LIMIT 1');
        $q->execute([$saleId,$outletId]);
    } elseif ($saleNo !== '') {
        $q = $pdo->prepare('SELECT * FROM sales WHERE sale_no=? AND outlet_id=? LIMIT 1');
        $q->execute([$saleNo,$outletId]);
    } else {
        throw new RuntimeException('Sale identifier is required.');
    }
    $sale = $q->fetch();
    if (!$sale) throw new RuntimeException('Sale was not found in the database.');

    $saleId = (int)$sale['id'];
    $saleNo = (string)$sale['sale_no'];
    $status = normalizeStatus($sale['status'] ?? '');
    if (in_array($status, ['VOID','VOIDED','REFUND','REFUNDED'], true)) {
        throw new RuntimeException('This sale cannot be deleted because it has already been voided or refunded. Use the Refund / Void function for transaction changes.');
    }

    if (tableExists($pdo,'sale_refunds')) {
        $q = $pdo->prepare('SELECT id FROM sale_refunds WHERE original_sale_id=? LIMIT 1'); $q->execute([$saleId]);
        if ($q->fetchColumn()) throw new RuntimeException('This sale cannot be deleted because a refund record exists.');
    }
    if (tableExists($pdo,'sale_voids')) {
        $q = $pdo->prepare('SELECT id FROM sale_voids WHERE sale_id=? LIMIT 1'); $q->execute([$saleId]);
        if ($q->fetchColumn()) throw new RuntimeException('This sale cannot be deleted because a void record exists.');
    }

    if (tableExists($pdo,'end_of_day')) {
        $businessDate = substr((string)($sale['sale_date'] ?? $sale['created_at'] ?? ''),0,10);
        if ($businessDate) {
            $q = $pdo->prepare("SELECT status FROM end_of_day WHERE outlet_id=? AND business_date=? AND UPPER(COALESCE(status,''))='CLOSED' LIMIT 1");
            $q->execute([$outletId,$businessDate]);
            if ($q->fetchColumn()) throw new RuntimeException('This sale belongs to a closed business day and cannot be deleted. Use Refund / Void instead.');
        }
    }

    $items = [];
    if (tableExists($pdo,'sale_items')) {
        $q = $pdo->prepare('SELECT product_id, quantity FROM sale_items WHERE sale_id=?');
        $q->execute([$saleId]);
        $items = $q->fetchAll();
    }

    $customerId = (int)($sale['customer_id'] ?? 0);
    spEnsureStockMovementMetadata($pdo);
    spEnsureProductOutletTable($pdo);
    spAssertOpenDay($pdo,$outletId,$sale['sale_date']);

    foreach ($items as $item) {
        restoreStockForDeletedSale($pdo,$outletId,$saleId,$saleNo,(int)$item['product_id'],(float)$item['quantity']);
    }

    foreach (['sale_payments','payments','loyalty_transactions','receipts','sale_status_history','sale_items'] as $table) {
        if (tableExists($pdo,$table)) {
            $pdo->prepare("DELETE FROM `$table` WHERE sale_id=?")->execute([$saleId]);
        }
    }
    // Tables linked to sales with ON DELETE SET NULL are intentionally retained.
    // Invoices, warranties, receipts and display records must not be silently destroyed.
    $pdo->prepare('DELETE FROM sales WHERE id=? AND outlet_id=?')->execute([$saleId,$outletId]);
    if ($pdo->query('SELECT ROW_COUNT()')->fetchColumn() !== 1) throw new RuntimeException('The sale could not be deleted.');

    if ($customerId > 0) refreshLoyalty($pdo,$outletId,$customerId);

    spAudit($pdo,'SALE_DELETE','sales',$saleId,$sale,null);spAdvanceStateRevision($pdo,$outletId,'sales');
    $pdo->commit();
    echo json_encode([
        'ok'=>true,
        'api_version'=>'V1',
        'sale_id'=>$saleId,
        'sale_no'=>$saleNo,
        'stock_restored'=>count($items),
        'outlet_id'=>$outletId
    ], JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['ok'=>false,'api_version'=>'V1','error'=>$e->getMessage()], JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
}
