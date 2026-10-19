<?php
declare(strict_types=1);
require_once __DIR__.'/security.php';
require_once __DIR__.'/hr-lib.php';
require_once __DIR__.'/hr-payslip-lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$pdo=null;
try {
    $method=strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $action=strtolower(trim((string)($_GET['action'] ?? '')));
    $read=['masters','options','summary','list-employees','employee','outlet-history','salary-history','salary-advances','list-payslips','payslip-employees','payslip'];
    $write=['save-master','save-employee','transfer','temporary-assignment','revise-salary','create-salary-advance','create-payslip','update-payslip','issue-payslip','void-payslip'];
    if (!in_array($action,[...$read,...$write],true)) throw new HrError('Unknown HR action.');
    if (($method==='GET' && !in_array($action,$read,true)) || ($method==='POST' && !in_array($action,$write,true)) || !in_array($method,['GET','POST'],true)) throw new HrError('Method not allowed.',405);
    // Every action is independently authorized, including actions added later.
    $permission=match($action) {
        'save-master'=>'manageHrSettings','save-employee'=>'manageHrEmployees',
        'transfer','temporary-assignment'=>'transferHrEmployees',
        'revise-salary','create-salary-advance'=>'manageHrSalary','salary-history','salary-advances'=>'viewHrSalary',
        'list-payslips','payslip-employees','payslip'=>'viewHrSalary',
        'create-payslip','update-payslip','issue-payslip','void-payslip'=>'manageHrSalary',
        default=>'viewHrEmployees'
    };
    hrRequire($permission);
    $pdo=spApiDatabase(); $outlet=(int)$_SERVER['SP_AUTH_OUTLET_ID'];
    // Request/DB dates use Malaysian HR calendar, not the deployment host timezone.
    date_default_timezone_set('Asia/Kuala_Lumpur');
    $pdo->exec("SET time_zone = '+08:00'");
    foreach (['hr_employees','hr_departments','hr_positions','hr_employment_types','hr_employment_statuses','hr_outlet_history','hr_salary_history'] as $table) spRequireTable($pdo,$table);
    if ($method==='GET') {
        if ($action==='list-payslips') {
            hrRequire('viewHrSalary');spRequireTable($pdo,'hr_payslips');
            $period=(string)($_GET['period_start']??'');
            spApiRespond(['ok'=>true,'payslips'=>hrPayslipList($pdo,$outlet,$period)],200);
        }
        if ($action==='payslip') {
            hrRequire('viewHrSalary');spRequireTable($pdo,'hr_payslips');
            $id=hrId($_GET['id']??null,'Payslip');
            spApiRespond(['ok'=>true,'payslip'=>hrPayslipRead($pdo,$id,$outlet)],200);
        }
        if ($action==='payslip-employees') {
            hrRequire('viewHrSalary');
            $period=hrDate($_GET['period_start']??null,'Pay period',true);
            if((new DateTimeImmutable($period))->format('Y-m-01')!==$period)throw new HrError('Choose a valid pay month.');
            $periodEnd=(new DateTimeImmutable($period))->modify('last day of this month')->format('Y-m-d');
            $rows=hrQuery($pdo,'SELECT e.id,e.staff_code,e.full_name,d.name AS department_name,p.name AS position_name,s.id AS salary_history_id,s.salary_type,s.basic_rate,s.fixed_allowance,s.currency_code FROM hr_employees e LEFT JOIN hr_departments d ON d.id=e.department_id LEFT JOIN hr_positions p ON p.id=e.position_id LEFT JOIN hr_salary_history s ON s.id=(SELECT sh.id FROM hr_salary_history sh WHERE sh.employee_id=e.id AND sh.effective_from<=? ORDER BY sh.effective_from DESC,sh.id DESC LIMIT 1) WHERE '.hrOutletExpression().'=? AND e.join_date<=? ORDER BY e.full_name,e.id LIMIT 1000',[$periodEnd,$outlet,$periodEnd])->fetchAll();
            spApiRespond(['ok'=>true,'employees'=>$rows],200);
        }
        if ($action==='masters') spApiRespond(['ok'=>true,'masters'=>hrMasters($pdo),'can_manage_settings'=>spHasPermission('manageHrSettings') && hrHq()],200);
        if ($action==='options') {
            $users=[];
            if (spHasPermission('manageHrEmployees')) $users=hrQuery($pdo,'SELECT id,name,username FROM users WHERE enabled=1 AND (outlet_id=? OR EXISTS(SELECT 1 FROM user_outlets uo WHERE uo.user_id=users.id AND uo.outlet_id=? AND uo.active=1)) ORDER BY name',[$outlet,$outlet])->fetchAll();
            $managers=hrQuery($pdo,'SELECT e.id,e.full_name,e.staff_code FROM hr_employees e WHERE '.hrOutletExpression().'=? ORDER BY e.full_name',[$outlet])->fetchAll();
            spApiRespond(['ok'=>true,'outlet_id'=>$outlet,'outlets'=>hrAllowedOutlets($pdo),'users'=>$users,'managers'=>$managers],200);
        }
        if ($action==='summary') {
            $rows=hrQuery($pdo,'SELECT s.name,s.is_active_employment,COUNT(*) AS total FROM hr_employees e JOIN hr_employment_statuses s ON s.id=e.employment_status_id WHERE '.hrOutletExpression().'=? GROUP BY s.id,s.name,s.is_active_employment',[$outlet])->fetchAll();
            $expiring=hrQuery($pdo,'SELECT e.id,e.staff_code,e.full_name,e.contract_end FROM hr_employees e JOIN hr_employment_statuses s ON s.id=e.employment_status_id WHERE '.hrOutletExpression().'=? AND s.is_active_employment=1 AND e.contract_end BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(),INTERVAL 30 DAY) ORDER BY e.contract_end',[$outlet])->fetchAll();
            spApiRespond(['ok'=>true,'statuses'=>$rows,'contract_expiry'=>$expiring],200);
        }
        if ($action==='list-employees') {
            $where=[hrOutletExpression().'=?']; $params=[$outlet];
            $search=hrText($_GET['q'] ?? null,'Search',150);
            if ($search) {
                // Escape wildcard characters so user input means a literal search.
                $needle='%'.strtr($search,['!'=>'!!','%'=>'!%','_'=>'!_']).'%';
                $where[]="(e.full_name LIKE ? ESCAPE '!' OR e.staff_code LIKE ? ESCAPE '!')"; $params[]=$needle; $params[]=$needle;
            }
            foreach (['department_id','employment_status_id'] as $filter) if (!empty($_GET[$filter])) { $where[]='e.'.$filter.'=?'; $params[]=hrId($_GET[$filter],$filter); }
            $page=max(1,min(100000,(int)($_GET['page'] ?? 1))); $size=25; $offset=($page-1)*$size;
            $predicate=implode(' AND ',$where);
            $total=(int)hrQuery($pdo,'SELECT COUNT(*) FROM hr_employees e WHERE '.$predicate,$params)->fetchColumn();
            $rows=hrQuery($pdo,'SELECT e.id,e.employee_uid,e.staff_code,e.full_name,e.department_id,e.position_id,e.employment_type_id,e.employment_status_id,e.join_date,e.contract_end,e.revision,'.hrOutletExpression().' AS primary_outlet_id,d.name AS department_name,p.name AS position_name,t.name AS employment_type_name,s.name AS employment_status_name,s.is_active_employment FROM hr_employees e LEFT JOIN hr_departments d ON d.id=e.department_id LEFT JOIN hr_positions p ON p.id=e.position_id JOIN hr_employment_types t ON t.id=e.employment_type_id JOIN hr_employment_statuses s ON s.id=e.employment_status_id WHERE '.$predicate.' ORDER BY e.full_name,e.id LIMIT '.$size.' OFFSET '.$offset,$params)->fetchAll();
            spApiRespond(['ok'=>true,'employees'=>$rows,'total'=>$total,'page'=>$page,'page_size'=>$size],200);
        }
        $id=hrId($_GET['employee_id'] ?? null,'Employee'); $employee=hrEmployee($pdo,$id,$outlet);
        if ($action==='employee') spApiRespond(['ok'=>true,'employee'=>hrPublicEmployee($employee,spHasPermission('viewHrSensitive'))],200);
        if ($action==='outlet-history') {
            $rows=hrQuery($pdo,'SELECT h.id,h.assignment_kind,h.effective_from,h.effective_to,h.approval_status,h.reason,h.approved_at,a.outlet_code AS previous_outlet,b.outlet_code AS new_outlet FROM hr_outlet_history h JOIN outlets a ON a.id=h.previous_outlet_id JOIN outlets b ON b.id=h.new_outlet_id WHERE h.employee_id=? ORDER BY h.effective_from DESC,h.id DESC',[$id])->fetchAll();
            spApiRespond(['ok'=>true,'history'=>$rows],200);
        }
        if ($action==='salary-history') {
            $rows=hrQuery($pdo,'SELECT * FROM hr_salary_history WHERE employee_id=? ORDER BY effective_from DESC,id DESC',[$id])->fetchAll();
            foreach ($rows as &$row) {
                foreach (['bank_account'=>'bank_account_ciphertext','epf_number'=>'epf_ciphertext','socso_number'=>'socso_ciphertext','tax_number'=>'tax_ciphertext'] as $plain=>$cipher) {
                    $row[$plain]=empty($row[$cipher])?null:hrCrypt($row[$cipher],true); unset($row[$cipher]);
                }
                unset($row['request_key']);
            }
            unset($row);
            spApiRespond(['ok'=>true,'history'=>$rows],200);
        }
        if ($action==='salary-advances') {
            hrRequire('viewHrSalary');spRequireTable($pdo,'hr_salary_advances');
            $id=hrId($_GET['employee_id']??null,'Employee');hrEmployee($pdo,$id,$outlet);
            $rows=hrQuery($pdo,'SELECT id,employee_id,advance_date,amount,balance,reason,status,created_at FROM hr_salary_advances WHERE employee_id=? AND outlet_id=? ORDER BY advance_date DESC,id DESC LIMIT 200',[$id,$outlet])->fetchAll();
            spApiRespond(['ok'=>true,'advances'=>$rows],200);
        }
    }
    $body=spReadRequestBody();
    $key=spRequestKey($body,'hr:'.$action);
    $pdo->beginTransaction();
    spLockOutlet($pdo,$outlet);
    $replay=spRequestReplay($pdo,$key,$body);
    if ($replay) { $pdo->commit(); spApiRespond($replay,200); }
    $response=match($action) {
        'save-master'=>hrSaveMaster($pdo,$body),
        'save-employee'=>hrSaveEmployee($pdo,$body,$outlet),
        'transfer'=>hrAssignment($pdo,$body,$outlet,'transfer',$key),
        'temporary-assignment'=>hrAssignment($pdo,$body,$outlet,'temporary',$key),
        'revise-salary'=>hrSalary($pdo,$body,$outlet,$key),
        'create-salary-advance'=>hrSalaryAdvanceCreate($pdo,$body,$outlet),
        'create-payslip'=>hrPayslipCreate($pdo,$body,$outlet),
        'update-payslip'=>hrPayslipUpdate($pdo,$body,$outlet),
        'issue-payslip'=>hrPayslipIssue($pdo,$body,$outlet),
        'void-payslip'=>hrPayslipVoid($pdo,$body,$outlet),
        default=>throw new HrError('Unknown HR action.')
    };
    spRequestComplete($pdo,$key,$response); $pdo->commit(); spApiRespond($response,200);
} catch (Throwable $e) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    if ($e instanceof HrError) spApiRespond(['ok'=>false,'error'=>$e->getMessage()],$e->status);
    if ($e instanceof InvalidArgumentException) spApiRespond(['ok'=>false,'error'=>$e->getMessage()],400);
    if ($e instanceof RuntimeException && $e->getMessage()==='request_id was already used with a different request.') spApiRespond(['ok'=>false,'error'=>'This request identifier was already used. Refresh before submitting a different change.'],409);
    if ($e instanceof PDOException && $e->getCode()==='23000') spApiRespond(['ok'=>false,'error'=>in_array($action,['create-payslip'],true)?'A payslip already exists for this employee and month or a referenced record is invalid.':'Staff code, linked user, master code or salary date already exists, or a referenced record is invalid.'],409);
    // No payload, SQL or sensitive value is written to server logs or sent to clients.
    error_log('SP HR operation failed: '.get_class($e));
    spApiRespond(['ok'=>false,'error'=>'HR operation failed. Verify the migration/configuration or refresh and retry.'],503);
}
