<?php
declare(strict_types=1);
require_once __DIR__ . '/security.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-SP-Manager-Payment-Types-Version: V1');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

function ptBody(): array {
    $v = json_decode(file_get_contents('php://input') ?: '', true);
    return is_array($v) ? $v : [];
}
function ptOut(array $payload, int $status = 200): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
function ptTableExists(PDO $pdo, string $table): bool {
    $q = $pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?');
    $q->execute([$table]);
    return (int)$q->fetchColumn() > 0;
}
function ptResolveOutlet(PDO $pdo, mixed $value): int {
    $value = trim((string)($value ?? 'SP01'));
    if ($value === '') $value = 'SP01';
    if (ctype_digit($value)) {
        $q = $pdo->prepare('SELECT id FROM outlets WHERE id=? AND active=1 LIMIT 1');
        $q->execute([(int)$value]);
    } else {
        $q = $pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND active=1 LIMIT 1');
        $q->execute([$value]);
    }
    $id = (int)($q->fetchColumn() ?: 0);
    if ($id <= 0) throw new RuntimeException('Outlet not found.');
    return $id;
}
function ptMasterOutlet(PDO $pdo): int {
    $q = $pdo->query("SELECT id FROM outlets WHERE outlet_code='SP01' AND active=1 LIMIT 1");
    $id = (int)($q->fetchColumn() ?: 0);
    if ($id > 0) return $id;
    $q = $pdo->query('SELECT id FROM outlets WHERE active=1 ORDER BY id ASC LIMIT 1');
    $id = (int)($q->fetchColumn() ?: 0);
    if ($id <= 0) throw new RuntimeException('No active outlet exists for Central Master Data.');
    return $id;
}
function ptMap(array $r): array {
    return [
        'id' => (int)$r['id'],
        'dbId' => (int)$r['id'],
        'name' => (string)($r['payment_name'] ?? ''),
        'code' => (string)($r['payment_code'] ?? ''),
        'enabled' => (bool)($r['enabled'] ?? 1),
        'active' => (bool)($r['enabled'] ?? 1),
        'quickPayment' => (bool)($r['quick_payment'] ?? 0),
        'customerRequired' => (bool)($r['customer_required'] ?? 0),
        'changeAllowed' => (bool)($r['change_allowed'] ?? 1),
        'markPaid' => (bool)($r['mark_paid'] ?? 1),
        'printReceipt' => (bool)($r['print_receipt'] ?? 1),
        'openCashDrawer' => (bool)($r['open_cash_drawer'] ?? 0),
        'shortcutKey' => (string)($r['shortcut_key'] ?? ''),
        'position' => (int)($r['sort_order'] ?? 0),
    ];
}
function ptList(PDO $pdo, int $masterOutletId): array {
    $q = $pdo->prepare('SELECT * FROM payment_types WHERE outlet_id=? ORDER BY sort_order ASC,id ASC');
    $q->execute([$masterOutletId]);
    return array_map('ptMap', $q->fetchAll());
}
function ptGenerateCode(PDO $pdo, int $masterOutletId, string $name, ?int $exceptId = null): string {
    $base = strtoupper(trim(preg_replace('/[^A-Za-z0-9]+/', '_', $name) ?? '', '_'));
    if ($base === '') $base = 'PAYMENT';
    $base = substr($base, 0, 40);
    $candidate = $base;
    $n = 2;
    while (true) {
        $sql = 'SELECT id FROM payment_types WHERE outlet_id=? AND payment_code=?';
        $args = [$masterOutletId, $candidate];
        if ($exceptId !== null && $exceptId > 0) { $sql .= ' AND id<>?'; $args[] = $exceptId; }
        $sql .= ' LIMIT 1';
        $q = $pdo->prepare($sql); $q->execute($args);
        if (!$q->fetchColumn()) return $candidate;
        $candidate = substr($base, 0, 36) . '_' . $n++;
    }
}

try {
    $pdo = spApiDatabase();
    if (!ptTableExists($pdo, 'payment_types')) throw new RuntimeException('Required database table is missing: payment_types.');
    $requestedOutletId = ptResolveOutlet($pdo, $_REQUEST['outlet_id'] ?? ($_SERVER['SP_AUTH_OUTLET_ID'] ?? 'SP01'));
    $masterOutletId = ptMasterOutlet($pdo);
    $action = strtolower(trim((string)($_REQUEST['action'] ?? 'list')));

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'list') {
        $rows = ptList($pdo, $masterOutletId);
        ptOut(['ok'=>true,'api_version'=>'V1','outlet_id'=>$requestedOutletId,'master_scope_outlet_id'=>$masterOutletId,'count'=>count($rows),'data'=>$rows]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') ptOut(['ok'=>false,'error'=>'Unsupported request.'],405);
    $body = ptBody();

    if ($action === 'save') {
        $pt = is_array($body['paymentType'] ?? null) ? $body['paymentType'] : [];
        $name = trim((string)($pt['name'] ?? $pt['paymentName'] ?? ''));
        if ($name === '') throw new InvalidArgumentException('Payment type name is required.');
        $id = (int)($pt['id'] ?? 0);
        if ($id > 0) {
            $q = $pdo->prepare('SELECT id FROM payment_types WHERE id=? AND outlet_id=? LIMIT 1');
            $q->execute([$id,$masterOutletId]);
            if (!$q->fetchColumn()) $id = 0;
        }
        $code = strtoupper(trim((string)($pt['code'] ?? $pt['paymentCode'] ?? '')));
        if ($code === '') $code = ptGenerateCode($pdo,$masterOutletId,$name,$id ?: null);
        $dup = $pdo->prepare('SELECT id FROM payment_types WHERE outlet_id=? AND payment_code=?'.($id>0?' AND id<>?':'').' LIMIT 1');
        $args = [$masterOutletId,$code]; if($id>0)$args[]=$id; $dup->execute($args);
        if ($dup->fetchColumn()) throw new InvalidArgumentException('Payment type code already exists.');

        $vals = [
            $code,$name,
            !empty($pt['enabled'])?1:0,
            !empty($pt['quickPayment'])?1:0,
            !empty($pt['customerRequired'])?1:0,
            !empty($pt['changeAllowed'])?1:0,
            array_key_exists('markPaid',$pt)?(!empty($pt['markPaid'])?1:0):1,
            array_key_exists('printReceipt',$pt)?(!empty($pt['printReceipt'])?1:0):1,
            !empty($pt['openCashDrawer'])?1:0,
            trim((string)($pt['shortcutKey'] ?? '')) ?: null,
            max(1,(int)($pt['position'] ?? 1)),
        ];
        $pdo->beginTransaction();
        if ($id > 0) {
            $q=$pdo->prepare('UPDATE payment_types SET payment_code=?,payment_name=?,enabled=?,quick_payment=?,customer_required=?,change_allowed=?,mark_paid=?,print_receipt=?,open_cash_drawer=?,shortcut_key=?,sort_order=? WHERE id=? AND outlet_id=?');
            $q->execute([...$vals,$id,$masterOutletId]);
        } else {
            $q=$pdo->prepare('INSERT INTO payment_types(outlet_id,payment_code,payment_name,enabled,quick_payment,customer_required,change_allowed,mark_paid,print_receipt,open_cash_drawer,shortcut_key,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)');
            $q->execute([$masterOutletId,...$vals]);
            $id=(int)$pdo->lastInsertId();
        }
        // Remove stale sync aliases for this DB row; this endpoint is now authoritative for Payment Types.
        if (ptTableExists($pdo,'sp_relational_sync')) {
            $q=$pdo->prepare("DELETE FROM sp_relational_sync WHERE state_key='paymentTypes' AND entity='paymentTypes' AND db_id=? AND outlet_id=?");
            $q->execute([$id,$masterOutletId]);
            $q=$pdo->prepare("INSERT INTO sp_relational_sync(outlet_id,state_key,local_id,entity,db_id,updated_at) VALUES(?, 'paymentTypes', ?, 'paymentTypes', ?, NOW()) ON DUPLICATE KEY UPDATE db_id=VALUES(db_id),updated_at=NOW()");
            $q->execute([$masterOutletId,(string)$id,$id]);
        }
        spAdvanceStateRevision($pdo,$masterOutletId,'paymentTypes');$pdo->commit();
        $q=$pdo->prepare('SELECT * FROM payment_types WHERE id=? AND outlet_id=? LIMIT 1');$q->execute([$id,$masterOutletId]);$row=$q->fetch();
        if(!$row)throw new RuntimeException('Payment type was saved but could not be read back from database.');
        ptOut(['ok'=>true,'api_version'=>'V1','paymentType'=>ptMap($row),'data'=>ptList($pdo,$masterOutletId)]);
    }

    if ($action === 'delete') {
        $id=(int)($body['id'] ?? 0);
        if($id<=0)throw new InvalidArgumentException('Payment type id is required.');
        $q=$pdo->prepare('SELECT * FROM payment_types WHERE id=? AND outlet_id=? LIMIT 1');$q->execute([$id,$masterOutletId]);$row=$q->fetch();
        if(!$row)throw new RuntimeException('Payment type not found.');
        $inUse=false;
        foreach ([['sale_payments','payment_type_id'],['document_payments','payment_type_id']] as [$table,$field]) {
            if(!ptTableExists($pdo,$table))continue;
            $x=$pdo->prepare("SELECT COUNT(*) FROM `$table` WHERE `$field`=?");$x->execute([$id]);if((int)$x->fetchColumn()>0){$inUse=true;break;}
        }
        if($inUse){
            $q=$pdo->prepare('UPDATE payment_types SET enabled=0 WHERE id=? AND outlet_id=?');$q->execute([$id,$masterOutletId]);
        } else {
            $q=$pdo->prepare('DELETE FROM payment_types WHERE id=? AND outlet_id=?');$q->execute([$id,$masterOutletId]);
        }
        if(ptTableExists($pdo,'sp_relational_sync')){$q=$pdo->prepare("DELETE FROM sp_relational_sync WHERE state_key='paymentTypes' AND entity='paymentTypes' AND db_id=? AND outlet_id=?");$q->execute([$id,$masterOutletId]);}
        spAdvanceStateRevision($pdo,$masterOutletId,'paymentTypes');ptOut(['ok'=>true,'api_version'=>'V1','disabled_instead_of_deleted'=>$inUse,'data'=>ptList($pdo,$masterOutletId)]);
    }

    ptOut(['ok'=>false,'error'=>'Unsupported action.'],400);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    ptOut(['ok'=>false,'api_version'=>'V1','error'=>$e->getMessage()],500);
}
