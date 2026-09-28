<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-SP-Manager-DB-Version: V7');
echo json_encode([
  'ok' => true,
  'api_version' => 'V7',
  'service' => 'SP-Manager Database API',
  'relational_sync' => 'V7'
], JSON_UNESCAPED_SLASHES);
