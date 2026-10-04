<?php
declare(strict_types=1);
require_once __DIR__ . '/security.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-SP-Manager-Promotions-Version: V1');
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
function out(array $v, int $status = 200): never {
    http_response_code($status);
    echo json_encode($v, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
function tableExists(PDO $pdo, string $table): bool {
    $q = $pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?');
    $q->execute([$table]);
    return (int)$q->fetchColumn() > 0;
}
function outletId(PDO $pdo, mixed $value): int {
    $value = trim((string)($value ?? 'SP01'));
    if ($value === '') $value = 'SP01';
    if (ctype_digit($value)) {
        $q = $pdo->prepare('SELECT id FROM outlets WHERE id=? AND active=1 LIMIT 1');
        $q->execute([(int)$value]);
    } else {
        $q = $pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND active=1 LIMIT 1');
        $q->execute([$value]);
    }
    $id = (int)($q->fetchColumn() ?: 0);
    if ($id <= 0) throw new RuntimeException('Outlet not found.');
    return $id;
}
function ensurePromotionsTable(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS promotions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        outlet_id BIGINT UNSIGNED NULL,
        product_id BIGINT UNSIGNED NULL,
        promotion_name VARCHAR(255) NOT NULL,
        price DECIMAL(15,2) NULL,
        discount_percent DECIMAL(8,2) NULL,
        start_at DATETIME NULL,
        end_at DATETIME NULL,
        active TINYINT(1) NOT NULL DEFAULT 1,
        data_json LONGTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_promotions_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
        CONSTRAINT fk_promotions_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}
function jsonArray(mixed $v): array {
    if (is_array($v)) return $v;
    if (is_string($v) && $v !== '') {
        $x = json_decode($v, true);
        if (is_array($x)) return $x;
    }
    return [];
}
function mapPromotion(array $row): array {
    $payload = jsonArray($row['data_json'] ?? null);
    $days = $payload['daysOfWeek'] ?? $payload['days_of_week'] ?? [];
    $items = $payload['items'] ?? $payload['promotion_items'] ?? [];
    $days = jsonArray($days);
    $items = jsonArray($items);
    $startAt = (string)($row['start_at'] ?? ($payload['startAt'] ?? ''));
    $endAt = (string)($row['end_at'] ?? ($payload['endAt'] ?? ''));
    $startDate = $startAt !== '' ? substr($startAt, 0, 10) : (string)($payload['startDate'] ?? '');
    $endDate = $endAt !== '' ? substr($endAt, 0, 10) : (string)($payload['endDate'] ?? '');
    $startTime = strlen($startAt) >= 16 ? substr($startAt, 11, 5) : (string)($payload['startTime'] ?? '');
    $endTime = strlen($endAt) >= 16 ? substr($endAt, 11, 5) : (string)($payload['endTime'] ?? '');
    $value = isset($payload['value']) ? (float)$payload['value'] : (float)($row['discount_percent'] ?? 0);
    return [
        'id' => (int)$row['id'],
        'dbId' => (int)$row['id'],
        'name' => (string)($row['promotion_name'] ?? ($payload['name'] ?? '')),
        'title' => (string)($payload['title'] ?? ($row['promotion_name'] ?? '')),
        'description' => (string)($payload['description'] ?? ''),
        'active' => (bool)($row['active'] ?? 1),
        'enabled' => (bool)($row['active'] ?? 1),
        'startDate' => $startDate,
        'startTime' => $startTime,
        'endDate' => $endDate,
        'endTime' => $endTime,
        'discountType' => (string)($payload['discountType'] ?? ($payload['type'] ?? '')),
        'type' => (string)($payload['type'] ?? ($payload['discountType'] ?? '')),
        'value' => $value,
        'discountValue' => $value,
        'daysOfWeek' => array_values($days),
        'items' => array_values($items),
        'notes' => (string)($payload['notes'] ?? ''),
        'price' => (float)($row['price'] ?? 0),
    ];
}
function promotionDates(array $promotion): array {
    $startDate = trim((string)($promotion['startDate'] ?? $promotion['start_date'] ?? ''));
    $startTime = trim((string)($promotion['startTime'] ?? $promotion['start_time'] ?? ''));
    $endDate = trim((string)($promotion['endDate'] ?? $promotion['end_date'] ?? ''));
    $endTime = trim((string)($promotion['endTime'] ?? $promotion['end_time'] ?? ''));
    return [
        'start_at' => $startDate !== '' ? $startDate . ' ' . ($startTime !== '' ? (strlen($startTime) === 5 ? $startTime . ':00' : $startTime) : '00:00:00') : null,
        'end_at' => $endDate !== '' ? $endDate . ' ' . ($endTime !== '' ? (strlen($endTime) === 5 ? $endTime . ':00' : $endTime) : '23:59:59') : null,
    ];
}
function savePromotion(PDO $pdo, int $outletId, array $promotion): array {
    $name = trim((string)($promotion['name'] ?? $promotion['promotionName'] ?? ''));
    if ($name === '') throw new InvalidArgumentException('Promotion name is required.');
    $items = is_array($promotion['items'] ?? null) ? array_values($promotion['items']) : [];
    if (!$items) throw new InvalidArgumentException('At least one product is required for a promotion.');

    $value = 0.0;
    $price = null;
    $discountPercent = null;
    $firstProductId = null;
    if (isset($items[0]) && is_array($items[0])) {
        $firstProductId = (int)($items[0]['productId'] ?? $items[0]['product_id'] ?? 0);
        $value = (float)($items[0]['value'] ?? 0);
        $ptype = (string)($items[0]['priceType'] ?? 'discount');
        if ($ptype === 'fixed') $price = $value; else $discountPercent = $value;
    }
    if ($firstProductId !== null && $firstProductId > 0) {
        $q = $pdo->prepare('SELECT id FROM products WHERE id=?' . (tableExists($pdo, 'products') ? ' AND outlet_id=?' : '') . ' LIMIT 1');
        $args = [$firstProductId];
        if (tableExists($pdo, 'products')) $args[] = $outletId;
        $q->execute($args);
        if (!$q->fetchColumn()) $firstProductId = null;
    }

    $dates = promotionDates($promotion);
    $payload = $promotion;
    $payload['name'] = $name;
    $payload['promotionName'] = $name;
    $payload['items'] = $items;
    $payload['daysOfWeek'] = array_values(is_array($promotion['daysOfWeek'] ?? null) ? $promotion['daysOfWeek'] : []);
    $payload['startDate'] = trim((string)($promotion['startDate'] ?? ''));
    $payload['startTime'] = trim((string)($promotion['startTime'] ?? ''));
    $payload['endDate'] = trim((string)($promotion['endDate'] ?? ''));
    $payload['endTime'] = trim((string)($promotion['endTime'] ?? ''));

    if (!empty($promotion['id'])) {
        $id = (int)$promotion['id'];
        $q = $pdo->prepare('SELECT id FROM promotions WHERE id=? AND outlet_id=? LIMIT 1');
        $q->execute([$id, $outletId]);
        if (!$q->fetchColumn()) $id = 0;
    } else {
        $id = 0;
    }

    if ($id > 0) {
        $q = $pdo->prepare('UPDATE promotions SET product_id=?, promotion_name=?, price=?, discount_percent=?, start_at=?, end_at=?, active=?, data_json=? WHERE id=? AND outlet_id=?');
        $q->execute([
            $firstProductId,
            $name,
            $price,
            $discountPercent,
            $dates['start_at'],
            $dates['end_at'],
            !empty($promotion['active']) ? 1 : 0,
            json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            $id,
            $outletId,
        ]);
    } else {
        $q = $pdo->prepare('INSERT INTO promotions (outlet_id,product_id,promotion_name,price,discount_percent,start_at,end_at,active,data_json) VALUES (?,?,?,?,?,?,?,?,?)');
        $q->execute([
            $outletId,
            $firstProductId,
            $name,
            $price,
            $discountPercent,
            $dates['start_at'],
            $dates['end_at'],
            !empty($promotion['active']) ? 1 : 0,
            json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ]);
        $id = (int)$pdo->lastInsertId();
    }

    $q = $pdo->prepare('SELECT * FROM promotions WHERE id=? AND outlet_id=? LIMIT 1');
    $q->execute([$id, $outletId]);
    $row = $q->fetch();
    if (!$row) throw new RuntimeException('Promotion could not be retrieved after saving.');
    return mapPromotion($row);
}

try {
    $pdo=spApiDatabase();
    $outletId = outletId($pdo, $_REQUEST['outlet_id'] ?? 'SP01');
    if (!tableExists($pdo, 'promotions')) ensurePromotionsTable($pdo);
    $action = strtolower(trim((string)($_REQUEST['action'] ?? 'list')));

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'list') {
        $q = $pdo->prepare('SELECT * FROM promotions WHERE outlet_id=? ORDER BY id ASC');
        $q->execute([$outletId]);
        $rows = array_map('mapPromotion', $q->fetchAll());
        out(['ok' => true, 'api_version' => 'V1', 'count' => count($rows), 'data' => $rows]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(['ok' => false, 'error' => 'Unsupported request.'], 405);
    $payload = body();
    $pdo->beginTransaction();
    try {
        if ($action === 'save') {
            $promotion = is_array($payload['promotion'] ?? null) ? $payload['promotion'] : $payload;
            $saved = savePromotion($pdo, $outletId, $promotion);
            $pdo->commit();
            out(['ok' => true, 'api_version' => 'V1', 'promotion' => $saved]);
        }
        if ($action === 'delete') {
            $id = (int)($payload['id'] ?? 0);
            if ($id <= 0) throw new InvalidArgumentException('Promotion ID is required.');
            $q = $pdo->prepare('DELETE FROM promotions WHERE id=? AND outlet_id=?');
            $q->execute([$id, $outletId]);
            if ($q->rowCount() < 1) throw new RuntimeException('Promotion was not found.');
            $pdo->commit();
            out(['ok' => true, 'api_version' => 'V1', 'deleted_id' => $id]);
        }
        throw new InvalidArgumentException('Unsupported promotion action.');
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
} catch (Throwable $e) {
    out(['ok' => false, 'api_version' => 'V1', 'error' => $e->getMessage()], 500);
}
