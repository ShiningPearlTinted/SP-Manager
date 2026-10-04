<?php
declare(strict_types=1);
// Retired unscoped legacy router. Use the named, authenticated endpoints.
http_response_code(410);header('Content-Type: application/json');echo json_encode(['ok'=>false,'error'=>'Legacy router retired. Use authenticated named endpoints.']);
