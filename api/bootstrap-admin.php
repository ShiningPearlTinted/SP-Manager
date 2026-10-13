<?php
declare(strict_types=1);

// Run once from a trusted terminal after importing the empty schema and setting
// the API configuration. This script is deliberately unavailable over HTTP.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
define('SP_MANAGER_CLI', true);
require_once __DIR__ . '/security.php';

function ask(string $label): string {
    fwrite(STDOUT, $label);
    return trim((string)fgets(STDIN));
}

function askSecret(string $label): string {
    if (PHP_OS_FAMILY === 'Windows') {
        $script = '$s=Read-Host -AsSecureString; $p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); try {[Runtime.InteropServices.Marshal]::PtrToStringBSTR($p)} finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p)}';
        $pipes = [];
        $process = proc_open(['powershell.exe', '-NoProfile', '-Command', $script], [0 => STDIN, 1 => ['pipe', 'w'], 2 => STDERR], $pipes);
        if (!is_resource($process)) throw new RuntimeException('Could not start the secure password prompt.');
        $value = trim((string)stream_get_contents($pipes[1]));
        fclose($pipes[1]);
        if (proc_close($process) !== 0) throw new RuntimeException('Secure password prompt failed.');
        return $value;
    }
    fwrite(STDOUT, $label);
    if (!function_exists('shell_exec')) throw new RuntimeException('Secure password input is unavailable in this PHP CLI environment.');
    $hidden = shell_exec('stty -echo 2>/dev/null && printf ok');
    if ($hidden !== 'ok') throw new RuntimeException('Run the bootstrap from an interactive terminal that supports hidden password input.');
    try { $value = trim((string)fgets(STDIN)); }
    finally { if ($hidden === 'ok') shell_exec('stty echo 2>/dev/null'); fwrite(STDOUT, PHP_EOL); }
    return $value;
}

try {
    $pdo = spApiDatabase();
    foreach (['outlets', 'roles', 'users', 'user_outlets'] as $table) spRequireTable($pdo, $table);
    try { spAuthSecret(); }
    catch (Throwable $error) { throw new RuntimeException('Set SP_MANAGER_AUTH_SECRET to a random value of at least 64 characters before bootstrapping.', 0, $error); }
    $count = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    if ($count !== 0) throw new RuntimeException('Bootstrap stopped: this database already has a user.');

    $name = ask('Administrator name: ');
    $username = strtolower(ask('Administrator username: '));
    if ($name === '' || !preg_match('/^[a-z0-9._-]{3,100}$/', $username)) {
        throw new InvalidArgumentException('Enter a name and a username with 3–100 letters, numbers, dots, underscores, or hyphens.');
    }
    $password = askSecret('Administrator password (minimum 12 characters): ');
    $confirm = askSecret('Confirm password: ');
    if (strlen($password) < 12 || !hash_equals($password, $confirm)) {
        throw new InvalidArgumentException('Password must be at least 12 characters and both entries must match.');
    }

    $pdo->beginTransaction();
    $outletQuery = $pdo->prepare("SELECT id FROM outlets WHERE outlet_code='SP01' LIMIT 1 FOR UPDATE");
    $outletQuery->execute();
    $outletId = (int)($outletQuery->fetchColumn() ?: 0);
    if (!$outletId) {
        $pdo->prepare("INSERT INTO outlets(outlet_code,outlet_name,active) VALUES('SP01','Main Outlet',1)")->execute();
        $outletId = (int)$pdo->lastInsertId();
    } else {
        $pdo->prepare('UPDATE outlets SET active=1 WHERE id=?')->execute([$outletId]);
    }
    $roleQuery = $pdo->prepare("SELECT id FROM roles WHERE role_name='Administrator' LIMIT 1");
    $roleQuery->execute();
    $roleId = (int)($roleQuery->fetchColumn() ?: 0);
    if (!$roleId) {
        $pdo->prepare("INSERT INTO roles(role_code,role_name,description,active) VALUES('ADMINISTRATOR','Administrator','System administrator',1)")->execute();
        $roleId = (int)$pdo->lastInsertId();
    }
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $pdo->prepare('INSERT INTO users(outlet_id,name,username,password_hash,role_id,enabled,permissions_json,session_version) VALUES(?,?,?,?,?,1,?,1)')
        ->execute([$outletId, $name, $username, $hash, $roleId, '{}']);
    $userId = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO user_outlets(user_id,outlet_id,is_default,active) VALUES(?,?,1,1)')->execute([$userId, $outletId]);
    $pdo->commit();
    fwrite(STDOUT, "Administrator created for outlet SP01. Remove any temporary setup access and sign in through the app.\n");
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    fwrite(STDERR, 'Bootstrap failed: ' . $error->getMessage() . PHP_EOL);
    exit(1);
}
