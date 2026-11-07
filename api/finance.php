<?php
declare(strict_types=1);
require_once __DIR__.'/security.php';
require_once __DIR__.'/hardening.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Finance: Profit & Loss (monthly / yearly) and Tax & Zakat estimation for the signed-in outlet.
// Sales, cost of goods sold, payroll and staff claims come from the system; other income and expenses are
// recorded as Income & Expenses entries, grouped the same way as the CmPro Profit & Loss workbook.

const SP_FINANCE_CATEGORIES = [
    // IN
    ['Sales (other)', 'IN', 'sales'],
    ['Other Income', 'IN', 'other_income'],
    ['Loan', 'IN', 'excluded'],
    ['Modal', 'IN', 'excluded'],
    // OUT: direct costs
    ['Stok / Bahan Mentah', 'OUT', 'direct'],
    ['Cost of Sales - Contractor', 'OUT', 'direct'],
    ['Cost of Sales - Freelance', 'OUT', 'direct'],
    ['Cost of Sales - Travelling Expenses', 'OUT', 'direct'],
    ['Clearing & Forwarding', 'OUT', 'direct'],
    // OUT: administrative expenses
    ['Accounting Fee', 'OUT', 'admin'], ['Alat Tulis & Percetakan', 'OUT', 'admin'], ['Audit', 'OUT', 'admin'],
    ['Bil Air & Elektrik', 'OUT', 'admin'], ['Bil Telefon', 'OUT', 'admin'], ['Bonus', 'OUT', 'admin'],
    ['Caj Kerajaan', 'OUT', 'admin'], ['Consultancy Fee', 'OUT', 'admin'], ['Entertainment / Hiburan', 'OUT', 'admin'],
    ['Gaji Director', 'OUT', 'admin'], ['Gaji Staff', 'OUT', 'admin'], ['Insurance', 'OUT', 'admin'],
    ['Komisyen', 'OUT', 'admin'], ['KWSP / EPF', 'OUT', 'admin'], ['Lain-lain Perbelanjaan', 'OUT', 'admin'],
    ['Legal Fee', 'OUT', 'admin'], ['Lesen', 'OUT', 'admin'], ['Medical Fee', 'OUT', 'admin'],
    ['Perbelanjaan IT', 'OUT', 'admin'], ['Postage', 'OUT', 'admin'], ['Professional Service Taxation', 'OUT', 'admin'],
    ['Rental / Sewaan', 'OUT', 'admin'], ['Repair & Maintenance Kenderaan', 'OUT', 'admin'],
    ['Repair & Maintenance Peralatan', 'OUT', 'admin'], ['Repair & Maintenance Umum', 'OUT', 'admin'],
    ['Secretarial Fee', 'OUT', 'admin'], ['SOCSO / PERKESO', 'OUT', 'admin'], ['Staff Welfare', 'OUT', 'admin'],
    ['Training & Seminar', 'OUT', 'admin'], ['Transportation / Pengangkutan', 'OUT', 'admin'],
    // OUT: selling and forwarding expenses
    ['Hotel', 'OUT', 'selling'], ['Marketing', 'OUT', 'selling'], ['Petrol, Parking & Tol', 'OUT', 'selling'],
    // OUT: financial charges
    ['Bank Charges', 'OUT', 'financial'], ['Loan Interest', 'OUT', 'financial'],
    // OUT: zakat paid is used by Tax & Zakat, not deducted as an expense
    ['Zakat Perniagaan', 'OUT', 'zakat'],
    // OUT: capital, drawings and prepayments are not part of profit & loss
    ['Ambilan', 'OUT', 'excluded'], ['Intangible Assets', 'OUT', 'excluded'], ['Perabot & Kelengkapan', 'OUT', 'excluded'],
    ['Peralatan Pejabat', 'OUT', 'excluded'], ['Kelengkapan Komputer', 'OUT', 'excluded'], ['Kenderaan', 'OUT', 'excluded'],
    ['Land & Building', 'OUT', 'excluded'], ['Machine', 'OUT', 'excluded'], ['Prepaid Insurance', 'OUT', 'excluded'],
    ['Prepaid Office Rent', 'OUT', 'excluded'], ['Prepaid Other Expenses', 'OUT', 'excluded'], ['Prepaid Tax', 'OUT', 'excluded'],
    ['Security Deposits', 'OUT', 'excluded'], ['Loan Repayment', 'OUT', 'excluded'],
];

function finCategory(string $name): ?array {
    foreach (SP_FINANCE_CATEGORIES as [$n, $dir, $group]) if ($n === $name) return ['name' => $n, 'direction' => $dir, 'group' => $group];
    return null;
}
function finYear(mixed $value): int {
    $y = filter_var($value, FILTER_VALIDATE_INT);
    if ($y === false || $y < 2000 || $y > 2100) throw new InvalidArgumentException('Select a valid year.');
    return (int)$y;
}
function finMonths(): array { return array_fill(1, 12, 0.0); }
// Runs a "month, amount" query and returns twelve monthly totals.
function finMonthly(PDO $pdo, string $sql, array $args): array {
    $out = finMonths();
    $q = $pdo->prepare($sql); $q->execute($args);
    foreach ($q->fetchAll(PDO::FETCH_NUM) as [$m, $v]) { $m = (int)$m; if ($m >= 1 && $m <= 12) $out[$m] += round((float)$v, 2); }
    return array_values($out);
}

// Everything the statements need for one year, as twelve monthly figures per line.
function finYearData(PDO $pdo, int $outlet, int $year): array {
    $from = sprintf('%04d-01-01 00:00:00', $year); $to = sprintf('%04d-01-01 00:00:00', $year + 1);
    $range = [$outlet, $from, $to];
    $voided = "UPPER(COALESCE(s.status,'COMPLETED')) NOT IN ('VOID','VOIDED','CANCELLED','CANCELED','DRAFT','OPEN','HOLD','HELD')";
    $d = ['pos_sales' => array_fill(0, 12, 0.0), 'invoice_sales' => array_fill(0, 12, 0.0), 'refunds' => array_fill(0, 12, 0.0),
          'cogs' => array_fill(0, 12, 0.0), 'refund_cogs' => array_fill(0, 12, 0.0), 'invoice_cogs' => array_fill(0, 12, 0.0),
          'payroll' => array_fill(0, 12, 0.0), 'claims' => array_fill(0, 12, 0.0), 'purchases' => array_fill(0, 12, 0.0), 'entries' => []];

    if (spTableExists($pdo, 'sales')) {
        // Sales excluding tax collected (SST is not income).
        $d['pos_sales'] = finMonthly($pdo, "SELECT MONTH(s.sale_date), SUM(COALESCE(s.total,0)-COALESCE(s.tax,0)) FROM sales s WHERE s.outlet_id=? AND s.sale_date>=? AND s.sale_date<? AND {$voided} GROUP BY MONTH(s.sale_date)", $range);
        if (spTableExists($pdo, 'sale_items'))
            $d['cogs'] = finMonthly($pdo, "SELECT MONTH(s.sale_date), SUM(COALESCE(si.cost_snapshot,0)*COALESCE(si.quantity,0)) FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.outlet_id=? AND s.sale_date>=? AND s.sale_date<? AND {$voided} GROUP BY MONTH(s.sale_date)", $range);
        if (spTableExists($pdo, 'sale_refunds')) {
            // Refunds count in the month they are made; the tax share of the refund is removed like on the sale.
            $d['refunds'] = finMonthly($pdo, "SELECT MONTH(r.refund_date), SUM(r.amount*CASE WHEN COALESCE(s.total,0)>0 THEN (COALESCE(s.total,0)-COALESCE(s.tax,0))/s.total ELSE 1 END) FROM sale_refunds r JOIN sales s ON s.id=r.original_sale_id WHERE r.outlet_id=? AND r.refund_date>=? AND r.refund_date<? AND UPPER(COALESCE(r.status,'COMPLETED')) NOT IN ('VOID','VOIDED','CANCELLED') GROUP BY MONTH(r.refund_date)", $range);
            if (spTableExists($pdo, 'sale_refund_items') && spTableExists($pdo, 'sale_items'))
                $d['refund_cogs'] = finMonthly($pdo, "SELECT MONTH(r.refund_date), SUM(COALESCE(si.cost_snapshot,0)*COALESCE(ri.quantity,0)) FROM sale_refund_items ri JOIN sale_refunds r ON r.id=ri.refund_id JOIN sale_items si ON si.id=ri.sale_item_id WHERE r.outlet_id=? AND r.refund_date>=? AND r.refund_date<? AND UPPER(COALESCE(r.status,'COMPLETED')) NOT IN ('VOID','VOIDED','CANCELLED') GROUP BY MONTH(r.refund_date)", $range);
        }
    }
    if (spTableExists($pdo, 'invoices')) {
        // Invoices not created from a POS sale (those are already in POS sales).
        $inv = "i.outlet_id=? AND i.invoice_date>=? AND i.invoice_date<? AND COALESCE(i.sale_id,0)=0 AND UPPER(COALESCE(i.status,'ISSUED')) NOT IN ('VOID','VOIDED','CANCELLED','CANCELED','DRAFT')";
        $d['invoice_sales'] = finMonthly($pdo, "SELECT MONTH(i.invoice_date), SUM(COALESCE(i.total,0)-COALESCE(i.tax,0)) FROM invoices i WHERE {$inv} GROUP BY MONTH(i.invoice_date)", $range);
        if (spTableExists($pdo, 'invoice_items') && spTableExists($pdo, 'products')) {
            $cost = spTableExists($pdo, 'product_outlets') ? 'COALESCE(po.cost_price,p.cost_price,0)' : 'COALESCE(p.cost_price,0)';
            $join = spTableExists($pdo, 'product_outlets') ? 'LEFT JOIN product_outlets po ON po.product_id=ii.product_id AND po.outlet_id=i.outlet_id' : '';
            $d['invoice_cogs'] = finMonthly($pdo, "SELECT MONTH(i.invoice_date), SUM({$cost}*COALESCE(ii.quantity,0)) FROM invoice_items ii JOIN invoices i ON i.id=ii.invoice_id LEFT JOIN products p ON p.id=ii.product_id {$join} WHERE {$inv} GROUP BY MONTH(i.invoice_date)", $range);
        }
    }
    if (spTableExists($pdo, 'hr_payslips'))
        $d['payroll'] = finMonthly($pdo, "SELECT MONTH(pay_date), SUM(COALESCE(gross_pay,0)) FROM hr_payslips WHERE outlet_id=? AND pay_date>=? AND pay_date<? AND UPPER(status)='ISSUED' GROUP BY MONTH(pay_date)", $range);
    if (spTableExists($pdo, 'hr_claims'))
        $d['claims'] = finMonthly($pdo, "SELECT MONTH(claim_date), SUM(COALESCE(amount,0)) FROM hr_claims WHERE outlet_id=? AND claim_date>=? AND claim_date<? AND UPPER(status) IN ('APPROVED','PAID') GROUP BY MONTH(claim_date)", $range);
    if (spTableExists($pdo, 'purchases'))
        $d['purchases'] = finMonthly($pdo, "SELECT MONTH(purchase_date), SUM(COALESCE(total,0)-COALESCE(tax,0)) FROM purchases WHERE outlet_id=? AND purchase_date>=? AND purchase_date<? AND UPPER(COALESCE(status,'RECEIVED')) NOT IN ('VOID','VOIDED','CANCELLED','DRAFT') GROUP BY MONTH(purchase_date)", $range);
    if (spTableExists($pdo, 'sp_finance_entries')) {
        $q = $pdo->prepare('SELECT category, MONTH(entry_date) m, SUM(amount) total FROM sp_finance_entries WHERE outlet_id=? AND entry_date>=? AND entry_date<? GROUP BY category, MONTH(entry_date)');
        $q->execute([$outlet, substr($from, 0, 10), substr($to, 0, 10)]);
        foreach ($q->fetchAll() as $r) {
            $name = (string)$r['category'];
            if (!isset($d['entries'][$name])) $d['entries'][$name] = array_fill(0, 12, 0.0);
            $d['entries'][$name][(int)$r['m'] - 1] += round((float)$r['total'], 2);
        }
    }
    return $d;
}

$pdo = null;
try {
    $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $action = strtolower(trim((string)($_GET['action'] ?? '')));
    $pdo = spApiDatabase();
    $outlet = (int)($_SERVER['SP_AUTH_OUTLET_ID'] ?? 0);
    if ($outlet <= 0) spApiRespond(['ok' => false, 'error' => 'An assigned outlet is required.'], 403);
    $ready = spTableExists($pdo, 'sp_finance_entries') && spTableExists($pdo, 'sp_finance_tax_settings');

    if ($method === 'GET') {
        if ($action === 'catalog') {
            spApiRespond(['ok' => true, 'ready' => $ready, 'categories' => array_map(fn($c) => ['name' => $c[0], 'direction' => $c[1], 'group' => $c[2]], SP_FINANCE_CATEGORIES)], 200);
        }
        if ($action === 'summary') {
            $year = finYear($_GET['year'] ?? date('Y'));
            spApiRespond(['ok' => true, 'ready' => $ready, 'year' => $year, 'current' => finYearData($pdo, $outlet, $year), 'previous' => finYearData($pdo, $outlet, $year - 1)], 200);
        }
        if ($action === 'entries') {
            if (!$ready) spApiRespond(['ok' => true, 'ready' => false, 'entries' => []], 200);
            $year = finYear($_GET['year'] ?? date('Y'));
            $month = filter_var($_GET['month'] ?? 0, FILTER_VALIDATE_INT);
            if ($month === false || $month < 0 || $month > 12) throw new InvalidArgumentException('Select a valid month.');
            $from = $month ? sprintf('%04d-%02d-01', $year, $month) : sprintf('%04d-01-01', $year);
            $to = $month ? date('Y-m-d', strtotime($from.' +1 month')) : sprintf('%04d-01-01', $year + 1);
            $q = $pdo->prepare('SELECT id, entry_date, direction, category, details, amount, created_at FROM sp_finance_entries WHERE outlet_id=? AND entry_date>=? AND entry_date<? ORDER BY entry_date DESC, id DESC');
            $q->execute([$outlet, $from, $to]);
            $rows = $q->fetchAll();
            foreach ($rows as &$r) { $r['id'] = (int)$r['id']; $r['amount'] = (float)$r['amount']; } unset($r);
            spApiRespond(['ok' => true, 'ready' => true, 'entries' => $rows], 200);
        }
        if ($action === 'tax-settings') {
            $year = finYear($_GET['year'] ?? date('Y'));
            $data = null;
            if ($ready) { $q = $pdo->prepare('SELECT data_json FROM sp_finance_tax_settings WHERE outlet_id=? AND tax_year=?'); $q->execute([$outlet, $year]); $raw = $q->fetchColumn(); $data = $raw ? json_decode((string)$raw, true) : null; }
            spApiRespond(['ok' => true, 'ready' => $ready, 'year' => $year, 'settings' => is_array($data) ? $data : null], 200);
        }
        spApiRespond(['ok' => false, 'error' => 'Unknown Finance action.'], 404);
    }

    if ($method !== 'POST') spApiRespond(['ok' => false, 'error' => 'Method not allowed.'], 405);
    if (!$ready) throw new RuntimeException('Run database/migrations/finance-v1.sql before saving Finance data.');
    $body = spReadRequestBody();
    $action = strtolower(trim((string)($body['action'] ?? '')));
    $user = (int)($_SERVER['SP_AUTH_USER_ID'] ?? 0);
    $pdo->beginTransaction(); spLockOutlet($pdo, $outlet);

    if ($action === 'delete-entry') {
        $id = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
        if ($id === false || $id <= 0) throw new InvalidArgumentException('Select a valid entry.');
        $q = $pdo->prepare('SELECT * FROM sp_finance_entries WHERE id=? AND outlet_id=? FOR UPDATE'); $q->execute([$id, $outlet]); $old = $q->fetch();
        if (!$old) throw new InvalidArgumentException('Entry was not found.');
        $pdo->prepare('DELETE FROM sp_finance_entries WHERE id=? AND outlet_id=?')->execute([$id, $outlet]);
        spAudit($pdo, 'FINANCE_ENTRY_DELETE', 'finance_entry', (int)$id, $old, null);
        $pdo->commit(); spApiRespond(['ok' => true, 'deleted' => (int)$id], 200);
    }
    if ($action === 'save-entry') {
        $id = empty($body['id']) ? 0 : filter_var($body['id'], FILTER_VALIDATE_INT);
        if ($id === false || $id < 0) throw new InvalidArgumentException('Entry id is invalid.');
        $date = (string)($body['entry_date'] ?? '');
        $dt = DateTime::createFromFormat('!Y-m-d', $date);
        if (!$dt || $dt->format('Y-m-d') !== $date) throw new InvalidArgumentException('Enter a valid date.');
        $cat = finCategory(trim((string)($body['category'] ?? '')));
        if (!$cat) throw new InvalidArgumentException('Select a valid category.');
        $details = trim((string)($body['details'] ?? ''));
        if (mb_strlen($details) > 255) throw new InvalidArgumentException('Details must be 255 characters or fewer.');
        $amount = spMoney($body['amount'] ?? null, 'Amount');
        if ($amount <= 0) throw new InvalidArgumentException('Amount must be more than zero.');
        $new = ['entry_date' => $date, 'direction' => $cat['direction'], 'category' => $cat['name'], 'details' => $details ?: null, 'amount' => $amount];
        if ($id > 0) {
            $q = $pdo->prepare('SELECT * FROM sp_finance_entries WHERE id=? AND outlet_id=? FOR UPDATE'); $q->execute([$id, $outlet]); $old = $q->fetch();
            if (!$old) throw new InvalidArgumentException('Entry was not found.');
            $pdo->prepare('UPDATE sp_finance_entries SET entry_date=?, direction=?, category=?, details=?, amount=? WHERE id=? AND outlet_id=?')
                ->execute([$date, $cat['direction'], $cat['name'], $new['details'], $amount, $id, $outlet]);
            spAudit($pdo, 'FINANCE_ENTRY_UPDATE', 'finance_entry', (int)$id, $old, $new);
        } else {
            $pdo->prepare('INSERT INTO sp_finance_entries(outlet_id, entry_date, direction, category, details, amount, created_by) VALUES(?,?,?,?,?,?,?)')
                ->execute([$outlet, $date, $cat['direction'], $cat['name'], $new['details'], $amount, $user ?: null]);
            $id = (int)$pdo->lastInsertId();
            spAudit($pdo, 'FINANCE_ENTRY_CREATE', 'finance_entry', $id, null, $new);
        }
        $pdo->commit();
        spApiRespond(['ok' => true, 'entry' => ['id' => $id] + $new], 200);
    }
    if ($action === 'save-tax-settings') {
        $year = finYear($body['year'] ?? null);
        $settings = $body['settings'] ?? null;
        if (!is_array($settings)) throw new InvalidArgumentException('Tax settings are invalid.');
        $json = json_encode($settings, JSON_UNESCAPED_UNICODE);
        if ($json === false || strlen($json) > 20000) throw new InvalidArgumentException('Tax settings are too large.');
        $pdo->prepare('INSERT INTO sp_finance_tax_settings(outlet_id, tax_year, data_json, updated_by) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE data_json=VALUES(data_json), updated_by=VALUES(updated_by)')
            ->execute([$outlet, $year, $json, $user ?: null]);
        spAudit($pdo, 'FINANCE_TAX_SETTINGS', 'finance_tax_settings', $year, null, ['year' => $year]);
        $pdo->commit();
        spApiRespond(['ok' => true, 'year' => $year], 200);
    }
    throw new InvalidArgumentException('Unknown Finance action.');
} catch (InvalidArgumentException $e) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    spApiRespond(['ok' => false, 'error' => $e->getMessage()], 422);
} catch (Throwable $e) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    error_log('finance.php: '.$e->getMessage());
    spApiRespond(['ok' => false, 'error' => $e instanceof RuntimeException ? spSafeErrorMessage($e) : 'Finance request failed.'], 500);
}
