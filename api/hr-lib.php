<?php
declare(strict_types=1);

// HR-only helpers. Existing authentication, outlet guard and audit helpers are reused.
final class HrError extends RuntimeException {
    public function __construct(string $message, public readonly int $status = 400) { parent::__construct($message); }
}
function hrRequire(string $permission): void {
    if (!spHasPermission($permission)) throw new HrError('HR permission required.', 403);
}
function hrText(mixed $value, string $label, int $max = 150, bool $required = false): ?string {
    if ($value !== null && !is_scalar($value)) throw new HrError($label.' must be text.');
    $text = trim((string)($value ?? ''));
    if ($required && $text === '') throw new HrError($label.' is required.');
    if (strlen($text) > $max || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $text)) throw new HrError($label.' is invalid or too long.');
    return $text === '' ? null : $text;
}
function hrId(mixed $value, string $label = 'Identifier', bool $nullable = false): ?int {
    if ($nullable && ($value === null || $value === '')) return null;
    if (!is_scalar($value) || !preg_match('/^[1-9][0-9]{0,17}$/', (string)$value)) throw new HrError($label.' is invalid.');
    return (int)$value;
}
function hrDate(mixed $value, string $label, bool $required = false): ?string {
    $text = hrText($value, $label, 10, $required);
    if ($text === null) return null;
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $text);
    if (!$date || $date->format('Y-m-d') !== $text) throw new HrError($label.' must be a valid date.');
    return $text;
}
function hrMoney(mixed $value, string $label): string {
    if (!is_scalar($value) || !preg_match('/^\d{1,10}(\.\d{1,2})?$/', (string)$value)) throw new HrError($label.' must be a non-negative amount with at most two decimals.');
    [$whole, $fraction] = array_pad(explode('.', (string)$value), 2, '');
    return (ltrim($whole, '0') ?: '0').'.'.str_pad($fraction, 2, '0');
}
function hrBool(mixed $value): int {
    if (!in_array($value, [true,false,0,1,'0','1'], true)) throw new HrError('Invalid boolean value.');
    return in_array($value, [true,1,'1'], true) ? 1 : 0;
}
function hrUuid(): string {
    $bytes = random_bytes(16); $bytes[6] = chr((ord($bytes[6]) & 15) | 64); $bytes[8] = chr((ord($bytes[8]) & 63) | 128);
    $hex = bin2hex($bytes); return substr($hex,0,8).'-'.substr($hex,8,4).'-'.substr($hex,12,4).'-'.substr($hex,16,4).'-'.substr($hex,20);
}
function hrCrypt(string $value, bool $decrypt = false): string {
    if ($value === '') return '';
    $secret = (string)(spApiConfig()['hr_encryption_key'] ?? '');
    if (strlen($secret) < 64) throw new HrError('HR encryption key is not configured. Ask the system administrator.', 503);
    $key = hash('sha256', $secret, true);
    if ($decrypt) {
        if (!str_starts_with($value, 'hr1:')) throw new HrError('Invalid protected HR field.', 503);
        $raw = base64_decode(substr($value,4),true);
        if ($raw === false || strlen($raw) < 28) throw new HrError('Invalid protected HR field.', 503);
        $plain = openssl_decrypt(substr($raw,28),'aes-256-gcm',$key,OPENSSL_RAW_DATA,substr($raw,0,12),substr($raw,12,16),'SP-Manager:HR:v1');
        if ($plain === false) throw new HrError('Protected HR field could not be read.',503);
        return $plain;
    }
    $iv = random_bytes(12); $tag = '';
    $cipher = openssl_encrypt($value,'aes-256-gcm',$key,OPENSSL_RAW_DATA,$iv,$tag,'SP-Manager:HR:v1');
    if ($cipher === false) throw new HrError('HR encryption failed.',503);
    return 'hr1:'.base64_encode($iv.$tag.$cipher);
}
function hrQuery(PDO $pdo, string $sql, array $params = []): PDOStatement {
    $q = $pdo->prepare($sql); $q->execute($params); return $q;
}
function hrAllowedOutlets(PDO $pdo): array {
    $actor = (int)($_SERVER['SP_AUTH_USER_ID'] ?? 0);
    return hrQuery($pdo,'SELECT DISTINCT o.id,o.outlet_code,o.outlet_name FROM outlets o WHERE o.active=1 AND (o.id=(SELECT outlet_id FROM users WHERE id=?) OR EXISTS(SELECT 1 FROM user_outlets uo WHERE uo.user_id=? AND uo.outlet_id=o.id AND uo.active=1)) ORDER BY o.outlet_code',[$actor,$actor])->fetchAll();
}
function hrOutletAllowed(PDO $pdo, int $id): void {
    foreach (hrAllowedOutlets($pdo) as $outlet) if ((int)$outlet['id'] === $id) return;
    throw new HrError('This outlet is outside your assigned access.',403);
}
function hrHq(): bool {
    $actor = $GLOBALS['spActor'] ?? [];
    $ids = array_map('intval',(array)(spApiConfig()['hr_hq_user_ids'] ?? []));
    return ($actor['role_name'] ?? '') === 'Administrator' || in_array((int)($_SERVER['SP_AUTH_USER_ID'] ?? 0),$ids,true);
}
function hrMasterTable(string $kind): string {
    return match($kind) { 'departments'=>'hr_departments','positions'=>'hr_positions','employment_types'=>'hr_employment_types','employment_statuses'=>'hr_employment_statuses',default=>throw new HrError('Unknown HR master.') };
}
function hrMasters(PDO $pdo): array {
    $result = [];
    foreach (['departments','positions','employment_types','employment_statuses'] as $kind) $result[$kind] = hrQuery($pdo,'SELECT * FROM '.hrMasterTable($kind).' ORDER BY name')->fetchAll();
    return $result;
}
function hrMasterRef(PDO $pdo, string $table, ?int $id, ?int $old = null): void {
    if ($id === null) return;
    $row = hrQuery($pdo,'SELECT active FROM '.$table.' WHERE id=?',[$id])->fetch();
    if (!$row || (!(int)$row['active'] && $id !== $old)) throw new HrError('Select an active HR master record.');
}
// A future approved transfer becomes effective on its date without a cron or GET mutation.
// The stored primary outlet is the initial/immediate outlet; this expression resolves current ownership.
function hrOutletExpression(string $date = 'CURRENT_DATE()'): string {
    return "COALESCE((SELECT h.new_outlet_id FROM hr_outlet_history h WHERE h.employee_id=e.id AND h.assignment_kind='transfer' AND h.approval_status='approved' AND h.effective_from<=$date ORDER BY h.effective_from DESC,h.id DESC LIMIT 1),e.primary_outlet_id)";
}
function hrEmployee(PDO $pdo, int $id, int $outlet, bool $lock = false): array {
    if ($lock) hrQuery($pdo,'SELECT id FROM hr_employees WHERE id=? FOR UPDATE',[$id]);
    $row = hrQuery($pdo,'SELECT e.*,'.hrOutletExpression().' AS current_outlet_id FROM hr_employees e WHERE e.id=?',[$id])->fetch();
    if (!$row || (int)$row['current_outlet_id'] !== $outlet) throw new HrError('Employee not found in this outlet.',404);
    return $row;
}
function hrPublicEmployee(array $row, bool $sensitive = false): array {
    $has = !empty($row['identity_ciphertext']);
    $identity = $sensitive && $has ? hrCrypt($row['identity_ciphertext'],true) : null;
    unset($row['identity_ciphertext']);
    $row['identity_present'] = $has;
    $row['identity_number'] = $identity;
    $row['stored_primary_outlet_id'] = $row['primary_outlet_id'];
    $row['primary_outlet_id'] = $row['current_outlet_id'];
    return $row;
}
function hrSaveMaster(PDO $pdo, array $body): array {
    hrRequire('manageHrSettings');
    if (!hrHq()) throw new HrError('Global HR settings require HQ access.',403);
    $kind = (string)($body['kind'] ?? ''); $table = hrMasterTable($kind);
    $id = hrId($body['id'] ?? null,'Master id',true);
    $old = $id ? hrQuery($pdo,'SELECT * FROM '.$table.' WHERE id=? FOR UPDATE',[$id])->fetch() : null;
    if ($id && !$old) throw new HrError('Master record not found.',404);
    $code = strtoupper(hrText($body['code'] ?? null,'Code',50,true));
    if (!preg_match('/^[A-Z0-9_-]+$/',$code)) throw new HrError('Code may contain letters, numbers, underscores and hyphens.');
    $values = ['code'=>$code,'name'=>hrText($body['name'] ?? null,'Name',150,true),'active'=>hrBool($body['active'] ?? true)];
    if ($kind === 'positions') {
        $values['department_id'] = hrId($body['department_id'] ?? null,'Department',true);
        hrMasterRef($pdo,'hr_departments',$values['department_id'],isset($old['department_id'])?(int)$old['department_id']:null);
    }
    if ($kind === 'employment_statuses') $values['is_active_employment'] = hrBool($body['is_active_employment'] ?? true);
    hrWrite($pdo,$table,$values,$id);
    $id = $id ?: (int)$pdo->lastInsertId();
    spAudit($pdo,'HR_MASTER_SAVE',$table,$id,null,['code'=>$code,'active'=>$values['active']]);
    return ['ok'=>true,'id'=>$id];
}
function hrWrite(PDO $pdo, string $table, array $values, ?int $id): void {
    $columns = array_keys($values);
    if ($id) hrQuery($pdo,'UPDATE '.$table.' SET '.implode(',',array_map(fn($c)=>'`'.$c.'`=?',$columns)).' WHERE id=?',[...array_values($values),$id]);
    else hrQuery($pdo,'INSERT INTO '.$table.' (`'.implode('`,`',$columns).'`) VALUES('.implode(',',array_fill(0,count($columns),'?')).')',array_values($values));
}
function hrRevision(array $row, array $body): void {
    $revision=hrId($body['revision'] ?? null,'Revision');
    if ($revision !== (int)$row['revision']) throw new HrError('Employee changed. Refresh and try again.',409);
}
function hrSaveEmployee(PDO $pdo, array $body, int $outlet): array {
    hrRequire('manageHrEmployees');
    $id = hrId($body['id'] ?? null,'Employee id',true);
    $old = $id ? hrEmployee($pdo,$id,$outlet,true) : null;
    if ($old) hrRevision($old,$body);
    $values = [];
    foreach (['staff_code'=>50,'full_name'=>150,'gender'=>50,'nationality'=>100,'marital_status'=>50,'phone'=>50,'email'=>150,'address'=>2000,'emergency_contact_name'=>150,'emergency_contact_phone'=>50,'emergency_contact_relationship'=>80] as $key=>$max) {
        $values[$key] = hrText($body[$key] ?? null,str_replace('_',' ',$key),$max,in_array($key,['staff_code','full_name'],true));
    }
    $values['staff_code'] = strtoupper($values['staff_code']);
    if (!preg_match('/^[A-Z0-9_-]+$/',$values['staff_code'])) throw new HrError('Staff code may contain letters, numbers, underscores and hyphens.');
    if ($values['email'] && !filter_var($values['email'],FILTER_VALIDATE_EMAIL)) throw new HrError('Email is invalid.');
    foreach (['date_of_birth','join_date','confirmation_date','contract_start','contract_end','resignation_date','termination_date'] as $key) $values[$key] = hrDate($body[$key] ?? null,str_replace('_',' ',$key),$key==='join_date');
    if ($values['date_of_birth'] && $values['date_of_birth'] >= $values['join_date']) throw new HrError('Date of birth must precede join date.');
    foreach (['confirmation_date','resignation_date','termination_date'] as $key) if ($values[$key] && $values[$key] < $values['join_date']) throw new HrError('Employment dates cannot precede join date.');
    if ($values['contract_start'] && $values['contract_end'] && $values['contract_end'] < $values['contract_start']) throw new HrError('Contract end must follow contract start.');
    if ($id) {
        $earliestSalary=hrQuery($pdo,'SELECT MIN(effective_from) FROM hr_salary_history WHERE employee_id=?',[$id])->fetchColumn();
        $earliestAssignment=hrQuery($pdo,'SELECT MIN(effective_from) FROM hr_outlet_history WHERE employee_id=?',[$id])->fetchColumn();
        foreach ([$earliestSalary,$earliestAssignment] as $earliest) if ($earliest && $values['join_date']>$earliest) throw new HrError('Join date cannot move past existing salary or assignment history.');
    }
    foreach (['department_id'=>'hr_departments','position_id'=>'hr_positions','employment_type_id'=>'hr_employment_types','employment_status_id'=>'hr_employment_statuses'] as $key=>$table) {
        $values[$key] = hrId($body[$key] ?? null,str_replace('_',' ',$key),in_array($key,['department_id','position_id'],true));
        hrMasterRef($pdo,$table,$values[$key],isset($old[$key])?(int)$old[$key]:null);
    }
    if ($values['position_id']) {
        $department = hrQuery($pdo,'SELECT department_id FROM hr_positions WHERE id=?',[$values['position_id']])->fetchColumn();
        if ($department && (int)$department !== $values['department_id']) throw new HrError('Position belongs to another department.');
    }
    $values['reporting_manager_id'] = hrId($body['reporting_manager_id'] ?? null,'Reporting manager',true);
    if ($values['reporting_manager_id']) {
        $seen = [$id ?: 0]; $manager = $values['reporting_manager_id'];
        while ($manager) {
            if (in_array($manager,$seen,true)) throw new HrError('Reporting manager creates a cycle.');
            $seen[] = $manager; $mgr = hrEmployee($pdo,$manager,$outlet);
            $manager = (int)($mgr['reporting_manager_id'] ?? 0);
        }
    }
    // A linked login is optional and must have access to the employee's outlet.
    $values['user_id'] = hrId($body['user_id'] ?? null,'Linked user',true);
    if ($values['user_id']) {
        $user = hrQuery($pdo,'SELECT id FROM users WHERE id=? AND enabled=1 AND (outlet_id=? OR EXISTS(SELECT 1 FROM user_outlets WHERE user_id=users.id AND outlet_id=? AND active=1))',[$values['user_id'],$outlet,$outlet])->fetchColumn();
        if (!$user) throw new HrError('Linked user is not assigned to this outlet.');
    }
    if (array_key_exists('identity_number',$body)) {
        // Sensitive edits need a separate permission; omitted fields retain ciphertext.
        hrRequire('viewHrSensitive');
        $identity = hrText($body['identity_number'],'IC / Passport',100);
        $values['identity_ciphertext'] = $identity ? hrCrypt($identity) : null;
    }
    if ($id) {
        if (isset($body['primary_outlet_id']) && hrId($body['primary_outlet_id'],'Primary outlet') !== $outlet) throw new HrError('Use Employee Transfer to change outlet.');
        $values['revision'] = (int)$old['revision']+1;
    } else {
        if (isset($body['primary_outlet_id']) && hrId($body['primary_outlet_id'],'Primary outlet') !== $outlet) throw new HrError('Primary outlet must match the selected outlet.');
        $values['primary_outlet_id']=$outlet; $values['employee_uid']=hrUuid();
        $values['created_by']=(int)$_SERVER['SP_AUTH_USER_ID'];
    }
    $values['updated_by']=(int)$_SERVER['SP_AUTH_USER_ID'];
    hrWrite($pdo,'hr_employees',$values,$id); $id = $id ?: (int)$pdo->lastInsertId();
    spAudit($pdo,'HR_EMPLOYEE_SAVE','hr_employees',$id,null,['revision'=>$values['revision'] ?? 1,'outlet_id'=>$outlet]);
    return ['ok'=>true,'id'=>$id];
}
function hrAssignment(PDO $pdo, array $body, int $outlet, string $kind, string $key): array {
    hrRequire('transferHrEmployees');
    $id=hrId($body['employee_id'] ?? null,'Employee'); $row=hrEmployee($pdo,$id,$outlet,true); hrRevision($row,$body);
    $destination=hrId($body['new_outlet_id'] ?? null,'Destination outlet'); hrOutletAllowed($pdo,$destination);
    if ($destination===$outlet) throw new HrError('Choose a different destination outlet.');
    $from=hrDate($body['effective_from'] ?? null,'Effective date',true);
    $today=(string)$pdo->query('SELECT CURRENT_DATE()')->fetchColumn();
    if ($from<$today || $from<$row['join_date']) throw new HrError('Assignment cannot precede today or the employee join date.');
    $to=$kind==='temporary'?hrDate($body['effective_to'] ?? null,'End date',true):null;
    if ($to && $to<$from) throw new HrError('End date must follow effective date.');
    // Conservatively reject pending future transfers/overlaps; no silent rewrite of history.
    $overlap=hrQuery($pdo,"SELECT id FROM hr_outlet_history WHERE employee_id=? AND approval_status='approved' AND ((assignment_kind='transfer' AND effective_from>=?) OR (assignment_kind='temporary' AND effective_to>=? AND effective_from<=?)) LIMIT 1",[$id,$today,$from,$to ?? '9999-12-31'])->fetchColumn();
    if ($overlap) throw new HrError('An approved assignment overlaps or a future transfer already exists.',409);
    hrWrite($pdo,'hr_outlet_history',[
        'employee_id'=>$id,'assignment_kind'=>$kind,'previous_outlet_id'=>$outlet,'new_outlet_id'=>$destination,
        'effective_from'=>$from,'effective_to'=>$to,'approval_status'=>'approved',
        'reason'=>hrText($body['reason'] ?? null,'Reason',500,true),'approved_by'=>(int)$_SERVER['SP_AUTH_USER_ID'],
        'approved_at'=>date('Y-m-d H:i:s'),'applied_at'=>$kind==='transfer' && $from===$today?date('Y-m-d H:i:s'):null,
        'request_key'=>$key,'created_by'=>(int)$_SERVER['SP_AUTH_USER_ID']
    ],null);
    $historyId=(int)$pdo->lastInsertId();
    $values=['revision'=>(int)$row['revision']+1,'updated_by'=>(int)$_SERVER['SP_AUTH_USER_ID']];
    if ($kind==='transfer' && $from===$today) $values['primary_outlet_id']=$destination;
    hrWrite($pdo,'hr_employees',$values,$id);
    spAudit($pdo,'HR_OUTLET_ASSIGNMENT','hr_employees',$id,null,['history_id'=>$historyId,'kind'=>$kind,'source'=>$outlet,'destination'=>$destination,'effective_from'=>$from]);
    return ['ok'=>true,'id'=>$historyId];
}
function hrSalary(PDO $pdo, array $body, int $outlet, string $key): array {
    hrRequire('manageHrSalary');
    $id=hrId($body['employee_id'] ?? null,'Employee'); $row=hrEmployee($pdo,$id,$outlet,true); hrRevision($row,$body);
    $from=hrDate($body['effective_from'] ?? null,'Salary effective date',true);
    if ($from<$row['join_date']) throw new HrError('Salary cannot precede join date.');
    $latest=hrQuery($pdo,'SELECT MAX(effective_from) FROM hr_salary_history WHERE employee_id=?',[$id])->fetchColumn();
    if ($latest && $from<=$latest) throw new HrError('Add a later salary revision; existing history is immutable.',409);
    $type=hrText($body['salary_type'] ?? null,'Salary type',20,true);
    if (!in_array($type,['monthly','daily','hourly'],true)) throw new HrError('Invalid salary type.');
    $values=['employee_id'=>$id,'effective_from'=>$from,'salary_type'=>$type,
        'basic_rate'=>hrMoney($body['basic_rate'] ?? null,'Basic rate'),
        'fixed_allowance'=>hrMoney($body['fixed_allowance'] ?? '0','Fixed allowance'),
        'overtime_eligible'=>hrBool($body['overtime_eligible'] ?? false),
        'commission_eligible'=>hrBool($body['commission_eligible'] ?? false),
        'statutory_category'=>hrText($body['statutory_category'] ?? null,'Statutory category',100),
        'bank_name'=>hrText($body['bank_name'] ?? null,'Bank name',150),
        'reason'=>hrText($body['reason'] ?? null,'Revision reason',500,true),
        'request_key'=>$key,'created_by'=>(int)$_SERVER['SP_AUTH_USER_ID']];
    // Carry protected identifiers from the latest revision unless explicitly supplied.
    $previous=hrQuery($pdo,'SELECT * FROM hr_salary_history WHERE employee_id=? ORDER BY effective_from DESC LIMIT 1',[$id])->fetch();
    foreach (['bank_name','statutory_category'] as $field) if (!array_key_exists($field,$body)) $values[$field]=$previous[$field] ?? null;
    foreach (['bank_account'=>'bank_account_ciphertext','epf_number'=>'epf_ciphertext','socso_number'=>'socso_ciphertext','tax_number'=>'tax_ciphertext'] as $plain=>$cipher) {
        $values[$cipher]=$previous[$cipher] ?? null;
        if (array_key_exists($plain,$body)) { $value=hrText($body[$plain],str_replace('_',' ',$plain),100); $values[$cipher]=$value?hrCrypt($value):null; }
    }
    hrWrite($pdo,'hr_salary_history',$values,null); $salaryId=(int)$pdo->lastInsertId();
    hrWrite($pdo,'hr_employees',['revision'=>(int)$row['revision']+1,'updated_by'=>(int)$_SERVER['SP_AUTH_USER_ID']],$id);
    spAudit($pdo,'HR_SALARY_REVISION','hr_employees',$id,null,['salary_history_id'=>$salaryId,'effective_from'=>$from]);
    return ['ok'=>true,'id'=>$salaryId];
}
