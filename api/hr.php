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
    $read=['masters','options','summary','list-employees','employee','outlet-history','salary-history','salary-advances','list-payslips','payslip-employees','payslip','payslip-contact','payslip-pdf'];
    $write=['save-master','save-employee','transfer','temporary-assignment','revise-salary','create-salary-advance','create-payslip','update-payslip','issue-payslip','void-payslip','email-payslip'];
    if (!in_array($action,[...$read,...$write],true)) throw new HrError('Unknown HR action.');
    if (($method==='GET' && !in_array($action,$read,true)) || ($method==='POST' && !in_array($action,$write,true)) || !in_array($method,['GET','POST'],true)) throw new HrError('Method not allowed.',405);
    // Every action is independently authorized, including actions added later.
    $permission=match($action) {
        'save-master'=>'manageHrSettings','save-employee'=>'manageHrEmployees',
        'transfer','temporary-assignment'=>'transferHrEmployees',
        'revise-salary','create-salary-advance'=>'manageHrSalary','salary-history','salary-advances'=>'viewHrSalary',
        'list-payslips','payslip-employees','payslip','payslip-pdf'=>'viewHrSalary',
        'create-payslip','update-payslip','issue-payslip','void-payslip','email-payslip','payslip-contact'=>'manageHrSalary',
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
        if ($action==='payslip-contact') {
            spRequireTable($pdo,'hr_payslips');
            $id=hrId($_GET['id']??null,'Payslip');
            $q=$pdo->prepare('SELECT e.email,e.phone FROM hr_payslips p JOIN hr_employees e ON e.id=p.employee_id WHERE p.id=? AND p.outlet_id=? LIMIT 1');
            $q->execute([$id,$outlet]);$contact=$q->fetch();
            if(!$contact)throw new HrError('Payslip not found.',404);
            spApiRespond(['ok'=>true,'contact'=>['email'=>(string)($contact['email']??''),'phone'=>(string)($contact['phone']??'')]],200);
        }
        if ($action==='payslip-pdf') {
            spRequireTable($pdo,'hr_payslips');
            $id=hrId($_GET['id']??null,'Payslip');$slip=hrPayslipRead($pdo,$id,$outlet);
            $q=$pdo->prepare('SELECT outlet_name FROM outlets WHERE id=?');$q->execute([$outlet]);$name=(string)($q->fetchColumn()?:'Company');
            $pdf=hrPayslipPdfDocument($slip,$name);$safeNo=preg_replace('/[^A-Za-z0-9_-]/','_',(string)$slip['payslip_no']);
            header('Content-Type: application/pdf');header('Content-Disposition: attachment; filename="Payslip-'.$safeNo.'.pdf"');
            echo $pdf;exit;
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
    if($action==='email-payslip') {
        spRequireTable($pdo,'hr_payslips');
        require_once __DIR__.'/vendor/PHPMailer/src/Exception.php';
        require_once __DIR__.'/vendor/PHPMailer/src/SMTP.php';
        require_once __DIR__.'/vendor/PHPMailer/src/PHPMailer.php';
        $id=hrId($body['id']??null,'Payslip');
        $slip=hrPayslipRead($pdo,$id,$outlet);
        if(($slip['status']??'')!=='ISSUED')throw new HrError('Only an issued payslip can be emailed.');
        $q=$pdo->prepare('SELECT e.email FROM hr_employees e JOIN hr_payslips p ON p.employee_id=e.id WHERE p.id=? AND p.outlet_id=? LIMIT 1');
        $q->execute([$id,$outlet]);$recipient=trim((string)$q->fetchColumn());
        if(!filter_var($recipient,FILTER_VALIDATE_EMAIL))throw new HrError('The employee does not have a valid email address in their HR record.');
        $q=$pdo->prepare('SELECT * FROM email_settings WHERE outlet_id=? AND enabled=1 LIMIT 1');$q->execute([$outlet]);$smtp=$q->fetch();
        if(!$smtp)throw new HrError('Email settings are not enabled. Configure SMTP in Settings > Email.');
        $q=$pdo->prepare('SELECT outlet_name FROM outlets WHERE id=?');$q->execute([$outlet]);$company=(string)($q->fetchColumn()?:'Company');
        $pdf=hrPayslipPdfDocument($slip,$company);
        $e=static fn($value)=>htmlspecialchars((string)$value,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
        $money=static fn($value)=>'RM '.number_format((float)$value,2,'.',',');
        $earningRows='<tr><td>Basic pay</td><td style="text-align:right">'.$e($money($slip['basic_pay'])).'</td></tr><tr><td>Fixed allowance</td><td style="text-align:right">'.$e($money($slip['fixed_allowance'])).'</td></tr>';
        foreach(($slip['earnings']??[]) as $line)$earningRows.='<tr><td>'.$e($line['label']??'').'</td><td style="text-align:right">'.$e($money($line['amount']??0)).'</td></tr>';
        $deductionRows='';foreach(($slip['deductions']??[]) as $line)$deductionRows.='<tr><td>'.$e($line['label']??'').'</td><td style="text-align:right">'.$e($money($line['amount']??0)).'</td></tr>';
        if($deductionRows==='')$deductionRows='<tr><td colspan="2" style="color:#64748b">No deductions</td></tr>';
        $html='<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#172033"><div style="max-width:680px;margin:24px auto;background:#fff;border:1px solid #dbe3ec;border-radius:14px;overflow:hidden"><div style="padding:26px 30px;background:#075985;color:#fff"><div style="font-size:12px;letter-spacing:2px;font-weight:bold;opacity:.9">PAY STATEMENT</div><h1 style="margin:8px 0 4px;font-size:28px">PAYSLIP</h1><div style="font-size:14px">'.$e($company).' · '.$e($slip['payslip_no']).'</div></div><div style="padding:24px 30px"><p>Hello '.$e($slip['full_name_snapshot']).',</p><p>Please find your payslip for the pay period shown below.</p><table style="width:100%;border-collapse:collapse;margin:20px 0"><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0"><b>Staff code</b></td><td style="padding:8px;border-bottom:1px solid #e2e8f0">'.$e($slip['staff_code_snapshot']).'</td></tr><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0"><b>Pay period</b></td><td style="padding:8px;border-bottom:1px solid #e2e8f0">'.$e($slip['period_start']).' – '.$e($slip['period_end']).'</td></tr><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0"><b>Pay date</b></td><td style="padding:8px;border-bottom:1px solid #e2e8f0">'.$e($slip['pay_date']).'</td></tr></table><h2 style="font-size:17px">Earnings</h2><table style="width:100%;border-collapse:collapse">'.$earningRows.'<tr><td style="padding:9px;border-top:2px solid #cbd5e1"><b>Gross pay</b></td><td style="padding:9px;border-top:2px solid #cbd5e1;text-align:right"><b>'.$e($money($slip['gross_pay'])).'</b></td></tr></table><h2 style="font-size:17px;margin-top:22px">Deductions</h2><table style="width:100%;border-collapse:collapse">'.$deductionRows.'<tr><td style="padding:9px;border-top:2px solid #cbd5e1"><b>Total deductions</b></td><td style="padding:9px;border-top:2px solid #cbd5e1;text-align:right"><b>'.$e($money($slip['total_deductions'])).'</b></td></tr></table><div style="margin-top:22px;padding:16px;background:#e0f2fe;border-radius:10px;display:flex;justify-content:space-between;font-size:19px"><b>NET PAY</b><b>'.$e($money($slip['net_pay'])).'</b></div><p style="margin-top:24px;color:#64748b;font-size:12px">This email contains confidential salary information. Please store it securely.</p></div></div></body></html>';
        try {
            $mail=new \PHPMailer\PHPMailer\PHPMailer(true);$mail->isSMTP();$mail->Host=(string)$smtp['smtp_host'];$mail->Port=(int)$smtp['smtp_port'];$mail->Timeout=15;$mail->getSMTPInstance()->Timelimit=20;$mail->SMTPAuth=true;$mail->Username=(string)$smtp['username'];$mail->Password=decryptSecret((string)$smtp['password_encrypted'],'');
            $mail->SMTPSecure=$mail->Port===465?\PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS:\PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->CharSet='UTF-8';$mail->setFrom((string)$smtp['from_email'],(string)$smtp['from_name']);$mail->addAddress($recipient,(string)$slip['full_name_snapshot']);$mail->Subject='Payslip '.$slip['payslip_no'].' · '.$slip['period_start'];$mail->isHTML(true);$mail->Body=$html;$mail->AltBody='Payslip '.$slip['payslip_no'].' for '.$slip['period_start'].' to '.$slip['period_end'].'. Net pay: '.$money($slip['net_pay']);$mail->addStringAttachment($pdf,'Payslip-'.$slip['payslip_no'].'.pdf','base64','application/pdf');$mail->send();
        } catch(Throwable $mailError) {error_log('SP payslip email failed: '.get_class($mailError));throw new HrError('Email could not be sent. Check the SMTP configuration in Settings > Email.',503);}
        spAudit($pdo,'HR_PAYSLIP_EMAIL','hr_payslips',$id);
        spApiRespond(['ok'=>true],200);
    }
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
    spRequestComplete($pdo,$key,$response); $pdo->commit(); hrReleaseStaffCodeLock($pdo); spApiRespond($response,200);
} catch (Throwable $e) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    if ($pdo instanceof PDO) hrReleaseStaffCodeLock($pdo);
    if ($e instanceof HrError) spApiRespond(['ok'=>false,'error'=>$e->getMessage()],$e->status);
    if ($e instanceof InvalidArgumentException) spApiRespond(['ok'=>false,'error'=>$e->getMessage()],400);
    if ($e instanceof RuntimeException && $e->getMessage()==='request_id was already used with a different request.') spApiRespond(['ok'=>false,'error'=>'This request identifier was already used. Refresh before submitting a different change.'],409);
    if ($e instanceof PDOException && $e->getCode()==='23000') spApiRespond(['ok'=>false,'error'=>in_array($action,['create-payslip'],true)?'A payslip already exists for this employee and month or a referenced record is invalid.':'Staff code, linked user, master code or salary date already exists, or a referenced record is invalid.'],409);
    // No payload, SQL or sensitive value is written to server logs or sent to clients.
    error_log('SP HR operation failed: '.get_class($e));
    spApiRespond(['ok'=>false,'error'=>'HR operation failed. Verify the migration/configuration or refresh and retry.'],503);
}
