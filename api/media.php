<?php
declare(strict_types=1);
// Serves one product, group or category picture for a signed media link (see media-lib.php). Read only, no session:
// the link is signed by the API, and pictures are cached by the browser for a year (the link changes with the picture).
require_once __DIR__ . '/security.php';
require_once __DIR__ . '/media-lib.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') { http_response_code(405); exit; }
$type = (string)($_GET['t'] ?? ''); $id = (int)($_GET['id'] ?? 0); $v = (string)($_GET['v'] ?? ''); $s = (string)($_GET['s'] ?? '');
if (!isset(SP_MEDIA_TYPES[$type]) || $id <= 0 || !preg_match('/^[a-f0-9]{12}$/', $v) || !hash_equals(spMediaSign($type, $id, $v), $s)) { http_response_code(404); exit; }
try {
    $data = spMediaStored(spApiDatabase(), $type, $id);
} catch (Throwable $e) { http_response_code(503); exit; }
if (!preg_match('#^data:(image/(?:png|jpeg|jpg|webp|gif|svg\+xml))(?:;charset=[^;,]+)?(;base64)?,(.*)$#is', $data, $m)) { http_response_code(404); exit; }
$body = $m[2] !== '' ? base64_decode($m[3], true) : rawurldecode($m[3]);
if ($body === false || $body === '') { http_response_code(404); exit; }
$mime = strtolower($m[1]) === 'image/jpg' ? 'image/jpeg' : strtolower($m[1]);
$current = substr(sha1($data), 0, 12);
header_remove('Pragma');
header('Content-Type: ' . $mime);
header('Content-Length: ' . strlen($body));
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox");
header('Cross-Origin-Resource-Policy: cross-origin');
header('Access-Control-Allow-Origin: *');
// The picture changed since this link was made: serve the new one but do not let it be cached under the old link.
header($current === $v ? 'Cache-Control: public, max-age=31536000, immutable' : 'Cache-Control: no-cache');
header('ETag: "' . $current . '"');
if (trim((string)($_SERVER['HTTP_IF_NONE_MATCH'] ?? ''), '" ') === $current) { http_response_code(304); exit; }
echo $body;
