<?php
declare(strict_types=1);
// Product, group and category pictures are stored as data: URIs. Lists send a short signed link to media.php instead,
// so a list is a few kilobytes and every picture is downloaded once and then kept in the browser cache.

const SP_MEDIA_TYPES = ['p' => 'product', 'g' => 'group', 'c' => 'category'];

function spMediaSign(string $type, int $id, string $version): string {
    return substr(hash_hmac('sha256', "media|$type|$id|$version", spAuthSecret()), 0, 20);
}

function spMediaBase(): string {
    $https = (($_SERVER['HTTPS'] ?? '') !== '' && strtolower((string)$_SERVER['HTTPS']) !== 'off') || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
    $host = (string)($_SERVER['HTTP_HOST'] ?? '');
    if ($host === '' || !preg_match('/^[A-Za-z0-9.:-]+$/', $host)) return '';
    $dir = rtrim(str_replace('\\', '/', dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/'))), '/');
    return ($https ? 'https' : 'http') . '://' . $host . $dir . '/media.php';
}

function spMediaUrl(string $type, int $id, string $data): string {
    if ($id <= 0 || !isset(SP_MEDIA_TYPES[$type]) || !str_starts_with($data, 'data:image/')) return $data;
    $base = spMediaBase();
    if ($base === '') return $data;
    $v = substr(sha1($data), 0, 12);
    return $base . '?t=' . $type . '&id=' . $id . '&v=' . $v . '&s=' . spMediaSign($type, $id, $v);
}

/** Replace data: pictures in rows with media links. $keys are the row fields that hold the picture. */
function spMediaRows(array &$rows, string $type, array $keys = ['image_url', 'image']): void {
    foreach ($rows as &$r) {
        $id = (int)($r['id'] ?? 0);
        foreach ($keys as $k) if (isset($r[$k]) && is_string($r[$k]) && str_starts_with($r[$k], 'data:image/')) $r[$k] = spMediaUrl($type, $id, $r[$k]);
    }
    unset($r);
}

/** The stored picture of one row: products use their primary product_images row first, like the lists do. */
function spMediaStored(PDO $pdo, string $type, int $id): string {
    if ($id <= 0) return '';
    if ($type === 'p') {
        if (spTableExists($pdo, 'product_images')) {
            $q = $pdo->prepare('SELECT image_url FROM product_images WHERE product_id=? ORDER BY is_primary DESC,id ASC LIMIT 1');
            $q->execute([$id]); $v = (string)($q->fetchColumn() ?: '');
            if ($v !== '') return $v;
        }
        $q = $pdo->prepare('SELECT image_url FROM products WHERE id=? LIMIT 1');
    } elseif ($type === 'g') $q = $pdo->prepare('SELECT image_url FROM product_groups WHERE id=? LIMIT 1');
    elseif ($type === 'c') $q = $pdo->prepare('SELECT image_url FROM product_categories WHERE id=? LIMIT 1');
    else return '';
    $q->execute([$id]);
    return (string)($q->fetchColumn() ?: '');
}

/** A saved form may send back the media link it was given: store the picture it points to, not the link. */
function spMediaResolveInput(PDO $pdo, mixed $value): mixed {
    if (!is_string($value) || !str_contains($value, 'media.php?')) return $value;
    $query = (string)parse_url($value, PHP_URL_QUERY);
    parse_str($query, $q);
    $type = (string)($q['t'] ?? ''); $id = (int)($q['id'] ?? 0); $v = (string)($q['v'] ?? ''); $s = (string)($q['s'] ?? '');
    if (!isset(SP_MEDIA_TYPES[$type]) || $id <= 0 || !hash_equals(spMediaSign($type, $id, $v), $s)) return $value;
    $stored = spMediaStored($pdo, $type, $id);
    return $stored !== '' ? $stored : $value;
}
