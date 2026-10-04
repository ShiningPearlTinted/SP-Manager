<?php
declare(strict_types=1);

function spm_json(mixed $data, int $status=200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function spm_request_json(): array {
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) spm_json(['ok'=>false,'error'=>'Invalid JSON body.'], 400);
    return $data;
}

function spm_auth():void {spm_json(['ok'=>false,'error'=>'Legacy API retired. Use authenticated named endpoints.'],410);}

function spm_cors(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = spm_config()['api']['allowed_origins'] ?? [];
    if ($origin !== '' && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: '.$origin);
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Headers: Content-Type, X-SPM-API-Key');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
}

function spm_allowed_table(string $name): bool {
    return (bool)preg_match('/^[a-zA-Z0-9_]+$/', $name);
}

function spm_table_columns(PDO $pdo, string $table): array {
    if (!spm_allowed_table($table)) spm_json(['ok'=>false,'error'=>'Invalid table.'],400);
    $stmt = $pdo->prepare(
        'SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION'
    );
    $stmt->execute([$table]);
    return array_map(fn($r)=>(string)$r['COLUMN_NAME'], $stmt->fetchAll());
}

function spm_pick_columns(array $payload, array $columns, array $allowed): array {
    $out = [];
    foreach ($allowed as $key) {
        if (array_key_exists($key, $payload) && in_array($key, $columns, true)) {
            $out[$key] = $payload[$key];
        }
    }
    return $out;
}

function spm_list(string $table, array $where=[], int $limit=100, int $offset=0): array {
    $pdo = spm_db();
    $columns = spm_table_columns($pdo, $table);
    if (!$columns) spm_json(['ok'=>false,'error'=>"Table '$table' not found."],404);
    $sql = 'SELECT * FROM `'.$table.'`';
    $params=[];
    if ($where) {
        $parts=[];
        foreach ($where as $k=>$v) {
            if (!in_array($k,$columns,true)) continue;
            $parts[]='`'.$k.'` = ?';
            $params[]=$v;
        }
        if ($parts) $sql .= ' WHERE '.implode(' AND ',$parts);
    }
    $sql .= ' LIMIT '.max(1,min(500,$limit)).' OFFSET '.max(0,$offset);
    $stmt=$pdo->prepare($sql); $stmt->execute($params);
    return $stmt->fetchAll();
}
