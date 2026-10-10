<?php
declare(strict_types=1);
require_once __DIR__ . '/security.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-SP-Manager-DB-Version: V10');
echo json_encode([
  'ok' => true,
  'release'=>'1.0.50',
  'required_php'=>'>=8.1',
  'api_version' => 'V10',
  'service' => 'SP-Manager Database API',
  'relational_sync' => 'V10',
  'relational_data' => 'V10',
  'database_service' => 'SQL-100',
  'database_backup' => 'V1',
  'reports_version' => 'V1',
  'settings_version' => 'V3'
], JSON_UNESCAPED_SLASHES);
