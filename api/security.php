<?php
declare(strict_types=1);

/** Shared API boundary. Included by every PHP endpoint before its own handler. */
function spApiConfig(): array {
    static $config = null;
    if ($config === null) $config = require __DIR__.'/config.php';
    return is_array($config) ? $config : [];
}

function spApiRespond(array $payload, int $status): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function spApiDatabase(): PDO {
    $config = spApiConfig();
    $db = $config['db'] ?? null;
    $host = (string)($db['host'] ?? $config['db_host'] ?? 'localhost');
    $port = (string)($db['port'] ?? $config['db_port'] ?? '3306');
    $name = (string)($db['name'] ?? $config['db_name'] ?? '');
    $user = (string)($db['user'] ?? $config['db_user'] ?? '');
    $pass = (string)($db['pass'] ?? $config['db_pass'] ?? '');
    if ($name === '' || $user === '' || str_starts_with($name, 'CHANGE_ME') || str_starts_with($user, 'CHANGE_ME')) {
        throw new RuntimeException('Database configuration is incomplete.');
    }
    return new PDO("mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

function spAuthSecret(): string {
    $config = spApiConfig();
    $secret = (string)($config['auth_secret'] ?? '');
    if (strlen($secret) < 64 || str_starts_with($secret, 'CHANGE_ME')) $secret = (string)(getenv('SP_MANAGER_AUTH_SECRET') ?: '');
    if (strlen($secret) < 64 || str_starts_with($secret, 'CHANGE_ME')) {
        throw new RuntimeException('API security is not configured. Set auth_secret to a random value of at least 64 characters.');
    }
    return $secret;
}

function spBase64UrlEncode(string $value): string {
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function spBase64UrlDecode(string $value): string|false {
    return base64_decode(strtr($value, '-_', '+/'), true);
}

function spIssueApiToken(int $userId): string {
    $now = time();
    $payload = spBase64UrlEncode(json_encode(['sub'=>$userId, 'iat'=>$now, 'exp'=>$now + 7200], JSON_UNESCAPED_SLASHES));
    $signature = spBase64UrlEncode(hash_hmac('sha256', $payload, spAuthSecret(), true));
    return $payload.'.'.$signature;
}

function spReadRequestBody(): array {
    static $body = null;
    if ($body !== null) return $body;
    $decoded = json_decode(file_get_contents('php://input') ?: '', true);
    $body = is_array($decoded) ? $decoded : $_POST;
    return $body;
}

function spCurrentToken(): string {
    $header = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if ($header === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $key=>$value) if (strtolower((string)$key) === 'authorization') $header = (string)$value;
    }
    return preg_match('/^Bearer\s+(.+)$/i', trim($header), $m) ? trim($m[1]) : '';
}

function spDecodeApiToken(string $token): int {
    $parts = explode('.', $token);
    if (count($parts) !== 2) return 0;
    [$payload, $signature] = $parts;
    $expected = spBase64UrlEncode(hash_hmac('sha256', $payload, spAuthSecret(), true));
    if (!hash_equals($expected, $signature)) return 0;
    $json = spBase64UrlDecode($payload);
    $data = is_string($json) ? json_decode($json, true) : null;
    if (!is_array($data) || (int)($data['exp'] ?? 0) < time()) return 0;
    return max(0, (int)($data['sub'] ?? 0));
}

function spTableExists(PDO $pdo, string $table): bool {
    $q = $pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?');
    $q->execute([$table]);
    return (int)$q->fetchColumn() > 0;
}

function spEnsureProductOutletTable(PDO $pdo): void {
    static $done = false;
    if ($done) return;
    $pdo->exec("CREATE TABLE IF NOT EXISTS product_outlets (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      product_id BIGINT UNSIGNED NOT NULL,
      outlet_id BIGINT UNSIGNED NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      selling_price DECIMAL(15,2) NULL,
      cost_price DECIMAL(15,2) NULL,
      stock_qty DECIMAL(15,3) NOT NULL DEFAULT 0.000,
      min_stock DECIMAL(15,3) NOT NULL DEFAULT 0.000,
      preferred_quantity DECIMAL(15,3) NOT NULL DEFAULT 0.000,
      allow_price_change TINYINT(1) NULL,
      last_purchase_price DECIMAL(15,2) NULL,
      rank INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_product_outlet (product_id,outlet_id),
      INDEX idx_product_outlets_outlet (outlet_id),
      INDEX idx_product_outlets_product (product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $q = $pdo->prepare('SELECT column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=?');
    $q->execute(['product_outlets']);
    $columns = array_fill_keys(array_map('strval', $q->fetchAll(PDO::FETCH_COLUMN)), true);
    foreach (['id','product_id','outlet_id'] as $required) {
        if (!isset($columns[$required])) throw new RuntimeException('product_outlets is missing required column '.$required.'. Restore the table schema before using inventory.');
    }
    $additions = [
      'active'=>'TINYINT(1) NOT NULL DEFAULT 1',
      'selling_price'=>'DECIMAL(15,2) NULL',
      'cost_price'=>'DECIMAL(15,2) NULL',
      'stock_qty'=>'DECIMAL(15,3) NOT NULL DEFAULT 0.000',
      'min_stock'=>'DECIMAL(15,3) NOT NULL DEFAULT 0.000',
      'preferred_quantity'=>'DECIMAL(15,3) NOT NULL DEFAULT 0.000',
      'allow_price_change'=>'TINYINT(1) NULL',
      'last_purchase_price'=>'DECIMAL(15,2) NULL',
      'rank'=>'INT NOT NULL DEFAULT 0',
      'created_at'=>'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
      'updated_at'=>'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    ];
    foreach ($additions as $column=>$definition) {
        if (!isset($columns[$column])) $pdo->exec('ALTER TABLE product_outlets ADD COLUMN `'.$column.'` '.$definition);
    }
    $index = $pdo->query("SELECT index_name FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='product_outlets' AND non_unique=0 GROUP BY index_name HAVING GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',')='product_id,outlet_id' LIMIT 1")->fetchColumn();
    if (!$index) {
        $duplicate = $pdo->query('SELECT 1 FROM product_outlets GROUP BY product_id,outlet_id HAVING COUNT(*)>1 LIMIT 1')->fetchColumn();
        if ($duplicate) throw new RuntimeException('product_outlets contains duplicate product/outlet assignments. Resolve duplicate rows before inventory updates.');
        $pdo->exec('ALTER TABLE product_outlets ADD UNIQUE KEY uq_sp_product_outlet(product_id,outlet_id)');
    }

    if (spTableExists($pdo, 'products') && spTableExists($pdo, 'outlets')) {
        $q->execute(['products']);
        $productColumns = array_fill_keys(array_map('strval', $q->fetchAll(PDO::FETCH_COLUMN)), true);
        if (isset($productColumns['id'], $productColumns['outlet_id'])) {
            $legacy = [
              'active'=>isset($productColumns['active'])?'COALESCE(p.active,1)':'1',
              'selling_price'=>isset($productColumns['selling_price'])?'COALESCE(p.selling_price,0)':'0',
              'cost_price'=>isset($productColumns['cost_price'])?'COALESCE(p.cost_price,0)':'0',
              'stock_qty'=>isset($productColumns['stock_qty'])?'COALESCE(p.stock_qty,0)':'0',
              'min_stock'=>isset($productColumns['min_stock'])?'COALESCE(p.min_stock,0)':'0',
              'allow_price_change'=>isset($productColumns['allow_price_change'])?'COALESCE(p.allow_price_change,0)':'0',
            ];
            $pdo->exec('INSERT IGNORE INTO product_outlets (product_id,outlet_id,active,selling_price,cost_price,stock_qty,min_stock,allow_price_change) SELECT p.id,p.outlet_id,'.$legacy['active'].','.$legacy['selling_price'].','.$legacy['cost_price'].','.$legacy['stock_qty'].','.$legacy['min_stock'].','.$legacy['allow_price_change'].' FROM products p WHERE p.outlet_id IS NOT NULL AND EXISTS (SELECT 1 FROM outlets o WHERE o.id=p.outlet_id)');
        }
    }
    $done = true;
}

function spResolveOutlet(PDO $pdo, string $value): int {
    $value = trim($value);
    if ($value === '') return 0;
    if (ctype_digit($value)) {
        $q = $pdo->prepare('SELECT id FROM outlets WHERE id=? AND active=1 LIMIT 1');
        $q->execute([(int)$value]);
    } else {
        $q = $pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND active=1 LIMIT 1');
        $q->execute([$value]);
    }
    return (int)($q->fetchColumn() ?: 0);
}

function spPermissionForRequest(string $file, string $action, string $stateKey, string $method): string {
    if ($file === 'customer-display.php' && in_array($action, ['terminals','terminal','image'], true)) return 'manageSettings';
    if ($file === 'users.php') return 'manageUsers';
    if ($file === 'outlets.php' || $file === 'outlet-provision.php') return 'manageManagement';
    if ($file === 'reports.php') return 'manageReports';
    if ($file === 'loyalty.php') return 'manageLoyalty';
    if ($file === 'settings.php') return $method === 'GET' ? '' : 'manageSettings';
    if ($file === 'database.php') return in_array($action, ['restore','backup'], true) ? 'administrator' : '';
    if ($file === 'sales.php') return 'managePayments';
    if ($file === 'customers.php') return in_array($action, ['save','save-batch','delete'], true) ? 'manageCustomers' : '';
    if ($file === 'products.php') return in_array($action, ['save','assign','unassign','delete','save-category','delete-category','save-group','delete-group'], true) ? 'manageProducts' : '';
    if ($file === 'sales-delete.php') return 'managePayments';
    if ($file === 'promotions.php') return in_array($action, ['save','delete'], true) ? 'manageDiscount' : '';
    if ($file === 'relational-data.php') return match ($stateKey) {
        'sales' => 'viewSalesHistory',
        'purchases','suppliers' => 'managePurchases',
        'cashMovements' => 'cashInOut',
        'stockHistory' => 'manageInventory',
        'paymentTypes' => 'managePayments',
        'promos' => 'manageDiscount',
        'zReports' => 'endOfDay',
        default => '',
    };
    if ($file === 'relational-sync.php') return match ($stateKey) {
        'purchases','suppliers' => 'managePurchases',
        'cashMovements' => 'cashInOut',
        'stockHistory' => 'manageInventory',
        'paymentTypes' => 'managePayments',
        'promos' => 'manageDiscount',
        'zReports' => 'endOfDay',
        'sales' => 'managePayments',
        default => '',
    };
    if ($file === 'app-state.php' && $action !== 'all' && $action !== 'health') return 'manageSettings';
    return '';
}

function spIsPublicHealth(string $file, string $action): bool {
    return $file === 'version.php'
        || ($action === 'auth' && $file === 'users.php');
}

function spInstallCorsAndGuard(): void {
    $config = spApiConfig();
    $allowed = array_values(array_filter(array_map('trim', (array)($config['allowed_origins'] ?? []))));
    $origin = trim((string)($_SERVER['HTTP_ORIGIN'] ?? ''));
    if ($origin !== '' && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: '.$origin);
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('X-Content-Type-Options: nosniff');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        if ($origin !== '' && !in_array($origin, $allowed, true)) {
            http_response_code(403);
            exit;
        }
        http_response_code(204);
        exit;
    }

    $file = basename((string)($_SERVER['SCRIPT_NAME'] ?? ''));
    $action = strtolower(trim((string)($_GET['action'] ?? $_POST['action'] ?? '')));
    if (spIsPublicHealth($file, $action)) return;

    // The customer-facing display is a read-only capability URL. Its HMAC key is
    // issued only when an authenticated manager saves the terminal pairing.
    if ($file === 'customer-display.php' && $action === 'state' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
        try {
            $display = trim((string)($_GET['display'] ?? ''));
            $key = trim((string)($_GET['key'] ?? ''));
            $expected = hash_hmac('sha256', 'customer-display:'.$display, spAuthSecret());
            if ($display !== '' && $key !== '' && hash_equals($expected, $key)) return;
        } catch (Throwable $e) { }
        spApiRespond(['ok'=>false,'error'=>'This Customer Display link is invalid. Reopen it from Settings > Customer display.'], 401);
    }

    try {
        $userId = spDecodeApiToken(spCurrentToken());
        if ($userId <= 0) spApiRespond(['ok'=>false,'error'=>'A valid signed-in session is required.'], 401);
        $pdo = spApiDatabase();
        $q = $pdo->prepare('SELECT u.id,u.outlet_id,u.enabled,u.permissions_json,r.role_name FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=? LIMIT 1');
        $q->execute([$userId]);
        $user = $q->fetch();
        if (!$user || !(int)$user['enabled']) spApiRespond(['ok'=>false,'error'=>'This user account is disabled. Sign in again.'], 401);

        $body = spReadRequestBody();
        if ($action === '') $action = strtolower(trim((string)($body['action'] ?? '')));
        $defaultOutlet = (string)($user['outlet_id'] ?? '');
        $outletId = 0;
        $outletInputs = [
            $_GET['outlet_id'] ?? null,
            $_POST['outlet_id'] ?? null,
            $body['outlet_id'] ?? null,
            $body['outletId'] ?? null,
        ];
        foreach ($outletInputs as $outletInput) {
            if ($outletInput === null) continue;
            if (!is_scalar($outletInput)) spApiRespond(['ok'=>false,'error'=>'Invalid outlet identifier.'], 400);
            $outletValue = trim((string)$outletInput);
            if ($outletValue === '') spApiRespond(['ok'=>false,'error'=>'Outlet identifier cannot be empty.'], 400);
            $candidateOutletId = spResolveOutlet($pdo, $outletValue);
            if ($candidateOutletId <= 0) spApiRespond(['ok'=>false,'error'=>'Outlet not found or inactive.'], 403);
            if ($outletId > 0 && $outletId !== $candidateOutletId) {
                spApiRespond(['ok'=>false,'error'=>'Outlet identifiers do not match across request parameters.'], 400);
            }
            $outletId = $candidateOutletId;
        }
        if ($outletId <= 0) $outletId = spResolveOutlet($pdo, $defaultOutlet);
        if ($outletId <= 0) spApiRespond(['ok'=>false,'error'=>'An active outlet is required.'], 403);
        // Normalize legacy handlers to the outlet that was authenticated above.
        $_GET['outlet_id'] = (string)$outletId;
        $_POST['outlet_id'] = (string)$outletId;

        $hasAssignment = false;
        if (spTableExists($pdo,'user_outlets')) {
            $aq = $pdo->prepare('SELECT 1 FROM user_outlets WHERE user_id=? AND outlet_id=? AND active=1 LIMIT 1');
            $aq->execute([$userId,$outletId]);
            $hasAssignment = (bool)$aq->fetchColumn();
        }
        if (!$hasAssignment && (int)($user['outlet_id'] ?? 0) === $outletId) $hasAssignment = true;
        $globalManagement = ($user['role_name'] ?? '') === 'Administrator' && in_array($file, ['outlets.php','outlet-provision.php'], true);
        if (!$hasAssignment && !$globalManagement) spApiRespond(['ok'=>false,'error'=>'This user is not assigned to the requested outlet.'], 403);

        $permission = spPermissionForRequest($file, $action, trim((string)($_GET['state_key'] ?? $body['state_key'] ?? '')), strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')));
        $permissions = json_decode((string)($user['permissions_json'] ?? ''), true);
        $isAdmin = ($user['role_name'] ?? '') === 'Administrator';
        if ($permission !== '' && !$isAdmin && empty($permissions[$permission])) {
            spApiRespond(['ok'=>false,'error'=>'This user does not have permission for this database operation.'], 403);
        }
        if ($file === 'database.php' && $action === 'restore' && !$isAdmin) {
            spApiRespond(['ok'=>false,'error'=>'Only an Administrator may restore a database backup.'], 403);
        }
    } catch (Throwable $e) {
        spApiRespond(['ok'=>false,'error'=>$e->getMessage()], 503);
    }
}

spInstallCorsAndGuard();
