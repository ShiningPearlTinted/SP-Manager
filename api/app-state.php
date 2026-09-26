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

try {
  $pdo = new PDO("mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4", $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);

  $pdo->exec("CREATE TABLE IF NOT EXISTS sp_app_state (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    outlet_id BIGINT UNSIGNED NOT NULL,
    state_key VARCHAR(120) NOT NULL,
    state_json LONGTEXT NOT NULL,
    updated_by VARCHAR(120) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_sp_app_state_outlet_key (outlet_id, state_key),
    KEY idx_sp_app_state_outlet_updated (outlet_id, updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

  $outlet = trim((string)($_GET['outlet_id'] ?? $_POST['outlet_id'] ?? ''));
  if ($outlet === '') $outlet = 'SP01';
  if (ctype_digit($outlet)) {
    $outletId = (int)$outlet;
  } else {
    $q = $pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND active=1 LIMIT 1');
    $q->execute([$outlet]);
    $outletId = (int)($q->fetchColumn() ?: 0);
  }
  if ($outletId <= 0) throw new InvalidArgumentException('Outlet not found: '.$outlet);

  $action = strtolower(trim((string)($_GET['action'] ?? $_POST['action'] ?? '')));
  $body = static function(): array {
    $raw = file_get_contents('php://input');
    $v = json_decode($raw ?: '', true);
    return is_array($v) ? $v : [];
  };

  if ($action === 'health') {
    $q = $pdo->query('SELECT DATABASE() db');
    echo json_encode(['ok'=>true,'service'=>'SP-Manager central state API','database'=>$q->fetchColumn(),'outletId'=>$outletId]);
    exit;
  }

  if ($action === 'all' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $q = $pdo->prepare('SELECT state_key,state_json,updated_at FROM sp_app_state WHERE outlet_id=? ORDER BY state_key');
    $q->execute([$outletId]);
    $data = [];
    foreach ($q->fetchAll() as $row) {
      $decoded = json_decode((string)$row['state_json'], true);
      $data[(string)$row['state_key']] = is_array($decoded) || is_object($decoded) ? $decoded : $decoded;
    }
    echo json_encode(['ok'=>true,'outletId'=>$outletId,'data'=>$data], JSON_UNESCAPED_SLASHES);
    exit;
  }

  if ($action === 'save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $b = $body();
    $key = trim((string)($b['state_key'] ?? ''));
    if ($key === '' || !preg_match('/^[A-Za-z0-9_.-]{1,120}$/', $key)) throw new InvalidArgumentException('Invalid state_key.');
    if (!array_key_exists('state', $b)) throw new InvalidArgumentException('state is required.');
    $json = json_encode($b['state'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($json === false) throw new RuntimeException('Unable to encode state.');
    $updatedBy = trim((string)($b['updated_by'] ?? '')) ?: null;
    $q = $pdo->prepare('INSERT INTO sp_app_state(outlet_id,state_key,state_json,updated_by) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE state_json=VALUES(state_json),updated_by=VALUES(updated_by),updated_at=NOW()');
    $q->execute([$outletId,$key,$json,$updatedBy]);
    echo json_encode(['ok'=>true,'outletId'=>$outletId,'state_key'=>$key]);
    exit;
  }

  if ($action === 'save-batch' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $b = $body();
    $states = $b['states'] ?? null;
    if (!is_array($states)) throw new InvalidArgumentException('states must be an object.');
    $pdo->beginTransaction();
    $q = $pdo->prepare('INSERT INTO sp_app_state(outlet_id,state_key,state_json,updated_by) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE state_json=VALUES(state_json),updated_by=VALUES(updated_by),updated_at=NOW()');
    $count = 0;
    foreach ($states as $key=>$state) {
      $key = trim((string)$key);
      if ($key === '' || !preg_match('/^[A-Za-z0-9_.-]{1,120}$/', $key)) continue;
      $json = json_encode($state, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
      if ($json === false) continue;
      $q->execute([$outletId,$key,$json,trim((string)($b['updated_by'] ?? '')) ?: null]);
      $count++;
    }
    $pdo->commit();
    echo json_encode(['ok'=>true,'outletId'=>$outletId,'count'=>$count]);
    exit;
  }

  throw new InvalidArgumentException('Unknown action.');
} catch (Throwable $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()], JSON_UNESCAPED_SLASHES);
}
