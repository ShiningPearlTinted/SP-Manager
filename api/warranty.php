<?php
declare(strict_types=1);
// Warranty check by vehicle plate. Finds every sale for the vehicle (all outlets) and lists the items that carry
// a warranty (tint, battery, coating, PPF and any other product with one), with the expiry date and status.
require_once __DIR__.'/security.php';
require_once __DIR__.'/invoice-pdf.php';

const SP_WARRANTY_SOON_DAYS = 30;

// A receipt can be opened only from a warranty search result: the search hands out a signed key per sale.
function spWarrantyReceiptKey(int $saleId): string { return substr(hash_hmac('sha256', 'warranty-receipt|'.$saleId, spAuthSecret()), 0, 24); }

function spPlateKey(string $v): string { return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $v) ?? ''); }
// Same normalisation in SQL: upper case, no spaces, dashes or dots.
function spPlateSql(string $col): string { return "UPPER(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE($col,''),' ',''),'-',''),'.',''),'/',''))"; }

/** Warranty length of a sold line: the line itself, then the product, then "(Warranty 8 Year)" in the name. */
function spWarrantyTerm(array $r): ?array {
    if ((int)($r['warranty_enabled'] ?? 0) === 1 && (float)($r['warranty_years'] ?? 0) > 0)
        return ['n' => (int)$r['warranty_years'], 'unit' => strtoupper((string)($r['warranty_unit'] ?? 'YEAR')) === 'MONTH' ? 'MONTH' : 'YEAR'];
    $app = [];
    $meta = json_decode((string)($r['product_meta'] ?? ''), true);
    if (is_array($meta) && is_array($meta['app_fields'] ?? null)) $app = $meta['app_fields'];
    $enabled = $app['warrantyEnabled'] ?? null;
    $years = (float)($r['product_warranty_years'] ?? 0) ?: (float)($app['warrantyYears'] ?? 0);
    if ($enabled !== false && $years > 0)
        return ['n' => (int)round($years), 'unit' => strtoupper((string)($app['warrantyUnit'] ?? 'YEAR')) === 'MONTH' ? 'MONTH' : 'YEAR'];
    $name = (string)($r['product_name'] ?? '');
    if (preg_match('/no\s+warranty/i', $name)) return null;
    if (preg_match('/warranty\s*(\d{1,2})\s*(years?|yrs?|tahun|months?|bulan)/i', $name, $m))
        return ['n' => (int)$m[1], 'unit' => preg_match('/^(m|b)/i', $m[2]) ? 'MONTH' : 'YEAR'];
    return null;
}

try {
    $pdo = spApiDatabase();
    $action = strtolower(trim((string)($_GET['action'] ?? 'search')));
    if ($action === 'receipt' && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
        $saleId = (int)($_GET['sale_id'] ?? 0); $key = (string)($_GET['key'] ?? '');
        if ($saleId <= 0 || !hash_equals(spWarrantyReceiptKey($saleId), $key)) spApiRespond(['ok' => false, 'error' => 'Receipt link is not valid. Search the plate again.'], 403);
        $q = $pdo->prepare('SELECT outlet_id FROM sales WHERE id=? LIMIT 1'); $q->execute([$saleId]); $saleOutlet = (int)($q->fetchColumn() ?: 0);
        if ($saleOutlet <= 0) spApiRespond(['ok' => false, 'error' => 'Sale not found.'], 404);
        $file = spSaleReceiptPdf($pdo, $saleOutlet, $saleId);
        spAudit($pdo, 'RECEIPT_VIEW_WARRANTY', 'sales', $saleId);
        spApiRespond(['ok' => true, 'filename' => $file['filename'], 'pdf' => base64_encode($file['pdf'])], 200);
    }
    if ($action !== 'search' || ($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') spApiRespond(['ok' => false, 'error' => 'Unknown action.'], 400);
    $raw = trim((string)($_GET['plate'] ?? $_GET['q'] ?? ''));
    $key = spPlateKey($raw);
    if (strlen($key) < 2 || strlen($key) > 15) spApiRespond(['ok' => false, 'error' => 'Enter a vehicle plate number.'], 422);

    // Customers for this vehicle: plate field, a registered vehicle, or the plate used as the customer name (imported data).
    $ids = [];
    $q = $pdo->prepare('SELECT id FROM customers WHERE '.spPlateSql('vehicle_number').'=? OR '.spPlateSql('name').'=?');
    $q->execute([$key, $key]); foreach ($q->fetchAll(PDO::FETCH_COLUMN) as $id) $ids[(int)$id] = true;
    if (spTableExists($pdo, 'customer_vehicles')) {
        $q = $pdo->prepare('SELECT customer_id FROM customer_vehicles WHERE '.spPlateSql('vehicle_number').'=?');
        $q->execute([$key]); foreach ($q->fetchAll(PDO::FETCH_COLUMN) as $id) $ids[(int)$id] = true;
    }
    $ids = array_keys($ids);

    $where = [spPlateSql('s.order_name').'=?']; $args = [$key];
    if ($ids) { $where[] = 's.customer_id IN ('.implode(',', array_fill(0, count($ids), '?')).')'; array_push($args, ...$ids); }
    $sql = "SELECT s.id sale_id,s.sale_no,s.sale_date,s.outlet_id,o.outlet_code,o.outlet_name,s.customer_id,
                   si.id line_id,si.product_id,si.product_name,si.quantity,si.warranty_enabled,si.warranty_years,si.warranty_unit,si.maintenance_enabled,si.maintenance_count,
                   p.warranty_years product_warranty_years,p.metadata_json product_meta,c.category_name,g.group_name
            FROM sales s JOIN sale_items si ON si.sale_id=s.id
            LEFT JOIN outlets o ON o.id=s.outlet_id LEFT JOIN products p ON p.id=si.product_id
            LEFT JOIN product_categories c ON c.id=p.category_id LEFT JOIN product_groups g ON g.id=p.group_id
            WHERE (".implode(' OR ', $where).") AND UPPER(COALESCE(s.status,'COMPLETED')) NOT IN ('VOID','VOIDED','CANCELLED','CANCELED','REFUNDED','DELETED')
            ORDER BY s.sale_date DESC, si.id ASC LIMIT 500";
    $q = $pdo->prepare($sql); $q->execute($args); $lines = $q->fetchAll();

    $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $items = []; $saleCount = [];
    foreach ($lines as $r) {
        $saleCount[(int)$r['sale_id']] = true;
        $term = spWarrantyTerm($r);
        if (!$term) continue;
        $start = new DateTimeImmutable((string)$r['sale_date'], new DateTimeZone('UTC'));
        $expiry = $start->modify('+'.$term['n'].' '.($term['unit'] === 'MONTH' ? 'months' : 'years'));
        $daysLeft = (int)floor(($expiry->getTimestamp() - $now->getTimestamp()) / 86400);
        $total = max(1, (int)floor(($expiry->getTimestamp() - $start->getTimestamp()) / 86400));
        $items[] = [
            'line_id' => (int)$r['line_id'], 'sale_id' => (int)$r['sale_id'], 'sale_no' => (string)$r['sale_no'], 'receipt_key' => spWarrantyReceiptKey((int)$r['sale_id']),
            'installed_at' => $start->format('c'), 'expires_at' => $expiry->format('c'),
            'outlet_code' => (string)($r['outlet_code'] ?? ''), 'outlet_name' => (string)($r['outlet_name'] ?? ''),
            'product' => (string)$r['product_name'], 'quantity' => (float)$r['quantity'],
            'category' => (string)($r['category_name'] ?? ''), 'group' => (string)($r['group_name'] ?? ''),
            'term' => $term['n'].' '.($term['unit'] === 'MONTH' ? ($term['n'] === 1 ? 'month' : 'months') : ($term['n'] === 1 ? 'year' : 'years')),
            'days_left' => $daysLeft, 'used_percent' => max(0, min(100, (int)round(100 - $daysLeft * 100 / $total))),
            'status' => $daysLeft < 0 ? 'EXPIRED' : ($daysLeft <= SP_WARRANTY_SOON_DAYS ? 'EXPIRING' : 'ACTIVE'),
            'maintenance' => (int)($r['maintenance_enabled'] ?? 0) === 1 ? (int)$r['maintenance_count'] : 0,
        ];
    }

    $customer = null;
    $cid = $ids[0] ?? (int)($lines[0]['customer_id'] ?? 0);
    if ($cid > 0) {
        $q = $pdo->prepare('SELECT id,code,name,phone,vehicle_number,car_brand FROM customers WHERE id=? LIMIT 1'); $q->execute([$cid]);
        if ($c = $q->fetch()) $customer = ['id' => (int)$c['id'], 'code' => (string)$c['code'], 'name' => (string)$c['name'], 'phone' => (string)($c['phone'] ?? ''), 'car_brand' => (string)($c['car_brand'] ?? '')];
    }
    spApiRespond(['ok' => true, 'plate' => $key, 'customer' => $customer, 'sales' => count($saleCount), 'items' => $items,
        'summary' => ['active' => count(array_filter($items, fn($i) => $i['status'] === 'ACTIVE')), 'expiring' => count(array_filter($items, fn($i) => $i['status'] === 'EXPIRING')), 'expired' => count(array_filter($items, fn($i) => $i['status'] === 'EXPIRED'))],
        'checked_at' => $now->format('c')], 200);
} catch (Throwable $e) {
    error_log('SP Warranty: '.$e->getMessage());
    spApiRespond(['ok' => false, 'error' => 'Warranty check could not be completed.'], 500);
}
