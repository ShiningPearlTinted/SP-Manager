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
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
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
    $hosts = [$host];
    $normalized = strtolower(trim($host));
    if ($normalized === 'localhost') $hosts[] = '127.0.0.1';
    elseif ($normalized === '127.0.0.1') $hosts[] = 'localhost';
    $last = null;
    foreach (array_values(array_unique($hosts)) as $candidate) {
        try {
            $pdo = new PDO("mysql:host={$candidate};port={$port};dbname={$name};charset=utf8mb4", $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_TIMEOUT => 5,
            ]);
            return $pdo;
        } catch (Throwable $e) { $last = $e; }
    }
    throw $last ?? new RuntimeException('Database connection failed.');
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
 $q=spApiDatabase()->prepare('SELECT session_version FROM users WHERE id=?');$q->execute([$userId]);$version=(int)$q->fetchColumn();
 $now=time();$payload=spBase64UrlEncode(json_encode(['sub'=>$userId,'ver'=>$version,'iat'=>$now,'exp'=>$now+7200],JSON_THROW_ON_ERROR));
 return $payload.'.'.spBase64UrlEncode(hash_hmac('sha256',$payload,spAuthSecret(),true));
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
    $q=spApiDatabase()->prepare('SELECT session_version FROM users WHERE id=?');$q->execute([(int)($data['sub']??0)]);$version=$q->fetchColumn();
    if($version===false || !isset($data['ver']) || (int)$data['ver']!==(int)$version)return 0;
    return max(0, (int)($data['sub'] ?? 0));
}

function spTableExists(PDO $pdo, string $table): bool {
    $q = $pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?');
    $q->execute([$table]);
    return (int)$q->fetchColumn() > 0;
}

function spEnsureEndOfDayMetadata(PDO $pdo): void { spRequireColumns($pdo,'end_of_day',['report_number', 'total_transactions', 'report_json']); }

function spEnsurePurchaseMetadata(PDO $pdo): void { spRequireColumns($pdo,'purchases',['data_json']);spRequireColumns($pdo,'purchase_items',['data_json']); }

function spEnsureSupplierMetadata(PDO $pdo): void { spRequireColumns($pdo,'suppliers',['metadata_json']); }

function spEnsureProductMetadata(PDO $pdo): void { spRequireColumns($pdo,'products',['metadata_json']); }

function spEnsureStockMovementMetadata(PDO $pdo): void { spRequireColumns($pdo,'stock_movements',['reference_no']); }

function spEnsureProductOutletTable(PDO $pdo): void { spRequireColumns($pdo,'product_outlets',['active', 'selling_price', 'cost_price', 'stock_qty', 'allow_price_change']); }

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
    if ($file === 'car-batteries.php') return $method==='GET' && $action==='list' ? '' : 'manageProducts';
    if ($file === 'users.php') return $action==='logout'?'':'manageUsers';
    if ($file === 'orders.php') return $method==='GET'?'viewOpenSales':'managePayments';
    if ($file === 'payment-types.php') return 'managePayments';
    if ($file === 'email.php') return 'managePayments';
    if ($file === 'document-counter.php')return match(strtolower((string)(spReadRequestBody()['document_type']??$_GET['document_type']??''))){'purchase'=>'managePurchases','quotation'=>'manageQuotation','customer'=>'manageCustomers',default=>'managePayments'};
    if ($file === 'outlets.php' || $file === 'outlet-provision.php') return 'manageManagement';
    if ($file === 'reports.php') return 'manageReports';
    if ($file === 'loyalty.php') return 'manageLoyalty';
    if ($file === 'settings.php') return $method === 'GET' ? '' : 'manageSettings';
    if ($file === 'database.php') return in_array($action, ['restore','backup'], true) ? 'administrator' : '';
    if ($file === 'sales.php') return 'managePayments';
    if ($file === 'documents.php' && $action==='record-payment') return (spReadRequestBody()['document_type']??'')==='quotation'?'manageQuotation':'manageInvoice';
    if ($file === 'documents.php') return in_array($action, ['list-quotations','save-quotation','delete-quotation','convert'], true) ? 'manageQuotation' : 'manageInvoice';
    if ($file === 'customers.php') return in_array($action, ['save','save-batch','delete'], true) ? 'manageCustomers' : '';
    if ($file === 'products.php' && $action==='stock-adjust') return 'manageInventory';
    if ($file === 'products.php') return in_array($action, ['save','assign','unassign','delete','save-category','delete-category','save-group','delete-group'], true) ? 'manageProducts' : '';
    if ($file === 'sales-delete.php') return 'managePayments';
    if ($file === 'promotions.php') return in_array($action, ['save','delete'], true) ? 'manageDiscount' : '';
    if ($file === 'relational-data.php') return match ($stateKey) {
        'sales' => 'viewSalesHistory',
        'orders' => 'viewOpenSales',
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
        'orders' => 'managePayments',
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
    header('Access-Control-Allow-Headers: Content-Type, Authorization, Idempotency-Key');
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
        $_SERVER['SP_AUTH_USER_ID'] = (string)$userId;

        $GLOBALS['spActor']=$user;
        $body = spReadRequestBody();
        foreach(['state_key','action'] as $canonical){$values=[];foreach([$_GET[$canonical]??null,$_POST[$canonical]??null,$body[$canonical]??null] as $v){if($v===null)continue;if(!is_string($v))spApiRespond(['ok'=>false,'error'=>'Invalid request selector.'],400);$values[]=trim($v);}if(count(array_unique($values))>1)spApiRespond(['ok'=>false,'error'=>'Conflicting request selectors.'],400);}
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
        $_SERVER['SP_AUTH_OUTLET_ID'] = (string)$outletId;
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

        if(strtoupper((string)($_SERVER['REQUEST_METHOD']??'GET'))==='POST'){$lock='spm:'.substr(hash('sha256',(string)$pdo->query('SELECT DATABASE()')->fetchColumn()),0,40);$l=$pdo->prepare('SELECT GET_LOCK(?,10)');$l->execute([$lock]);if((int)$l->fetchColumn()!==1)spApiRespond(['ok'=>false,'error'=>'Database busy. Retry the same request.'],409);register_shutdown_function(static function()use($pdo,$lock){if($pdo->inTransaction())$pdo->rollBack();try{$pdo->prepare('SELECT RELEASE_LOCK(?)')->execute([$lock]);}catch(Throwable $e){}});}
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
        error_log('SP boundary: '.$e->getMessage());spApiRespond(['ok'=>false,'error'=>'API configuration or migration is incomplete.'], 503);
    }
}

require_once __DIR__.'/hardening.php';
if (!(PHP_SAPI === 'cli' && defined('SP_MANAGER_CLI') && SP_MANAGER_CLI)) spInstallCorsAndGuard();
