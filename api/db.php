<?php
declare(strict_types=1);

function spm_config(): array {
    static $config;
    if ($config === null) {
        $path = __DIR__ . '/config.php';
        if (!is_file($path)) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['ok'=>false,'error'=>'API is not configured. Copy config.example.php to config.php.']);
            exit;
        }
        $config = require $path;
    }
    return $config;
}

function spm_db(): PDO {
    static $pdo;
    if ($pdo instanceof PDO) return $pdo;
    $c = spm_config()['db'];
    $hosts = [(string)$c['host']];
    $normalized = strtolower(trim((string)$c['host']));
    if ($normalized === 'localhost') $hosts[] = '127.0.0.1';
    elseif ($normalized === '127.0.0.1') $hosts[] = 'localhost';
    $last = null;
    foreach (array_values(array_unique($hosts)) as $host) {
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $host, (int)$c['port'], $c['name'], $c['charset']);
        try {
            $pdo = new PDO($dsn, $c['user'], $c['pass'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_TIMEOUT => 5,
            ]);
            return $pdo;
        } catch (Throwable $e) { $last = $e; }
    }
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok'=>false,'error'=>'Database connection failed.','detail'=>$last?->getMessage()]);
    exit;
}
