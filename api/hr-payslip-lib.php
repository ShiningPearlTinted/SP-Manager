<?php
declare(strict_types=1);

function hrPayslipCents(string $amount): int {
    [$whole,$fraction]=array_pad(explode('.',$amount,2),2,'00');
    return ((int)$whole*100)+(int)str_pad($fraction,2,'0');
}
function hrPayslipAmount(int $cents): string { return number_format($cents/100,2,'.',''); }
function hrPayslipLines(mixed $input,string $label): array {
    if (!is_array($input) || count($input)>50) throw new HrError($label.' must contain no more than 50 lines.');
    $lines=[];
    foreach ($input as $item) {
        if (!is_array($item)) throw new HrError('Invalid '.$label.' line.');
        $name=hrText($item['label']??null,$label.' description',100,true);
        $amount=hrMoney($item['amount']??null,$label.' amount');
        $lines[]=['label'=>$name,'amount'=>$amount];
    }
    return $lines;
}
function hrPayslipFinancials(array $body): array {
    $basic=hrMoney($body['basic_pay']??null,'Basic pay');
    $fixed=hrMoney($body['fixed_allowance']??'0','Fixed allowance');
    $earnings=hrPayslipLines($body['earnings']??[],'Earnings');
    $deductions=hrPayslipLines($body['deductions']??[],'Deductions');
    $gross=hrPayslipCents($basic)+hrPayslipCents($fixed);
    foreach($earnings as $line)$gross+=hrPayslipCents($line['amount']);
    $deduct=0;foreach($deductions as $line)$deduct+=hrPayslipCents($line['amount']);
    if($deduct>$gross)throw new HrError('Total deductions cannot exceed gross pay.');
    return ['basic_pay'=>$basic,'fixed_allowance'=>$fixed,'earnings'=>$earnings,'deductions'=>$deductions,
        'gross_pay'=>hrPayslipAmount($gross),'total_deductions'=>hrPayslipAmount($deduct),'net_pay'=>hrPayslipAmount($gross-$deduct)];
}
function hrPayslipPeriod(array $body): array {
    $start=hrDate($body['period_start']??null,'Pay period start',true);
    $end=hrDate($body['period_end']??null,'Pay period end',true);
    $from=new DateTimeImmutable($start);$to=new DateTimeImmutable($end);
    if($from->format('Y-m-01')!==$start||$to->format('Y-m-t')!==$end||$from->format('Y-m')!==$to->format('Y-m'))
        throw new HrError('Payslips must cover one complete calendar month.');
    return [$start,$end,hrDate($body['pay_date']??null,'Pay date',true)];
}
function hrPayslipDecode(array $row): array {
    foreach(['earnings_json'=>'earnings','deductions_json'=>'deductions'] as $json=>$key){
        $value=json_decode((string)$row[$json],true);$row[$key]=is_array($value)?$value:[];unset($row[$json]);
    }
    return $row;
}
function hrPayslipList(PDO $pdo,int $outlet,string $periodStart): array {
    $start=hrDate($periodStart,'Pay period',true);
    if((new DateTimeImmutable($start))->format('Y-m-01')!==$start)throw new HrError('Choose a valid pay month.');
    $rows=hrQuery($pdo,'SELECT id,payslip_no,outlet_id,employee_id,staff_code_snapshot,full_name_snapshot,department_snapshot,position_snapshot,period_start,period_end,pay_date,currency_code,basic_pay,fixed_allowance,earnings_json,deductions_json,gross_pay,total_deductions,net_pay,status,notes,created_at,issued_at FROM hr_payslips WHERE outlet_id=? AND period_start=? ORDER BY full_name_snapshot,id LIMIT 500',[$outlet,$start])->fetchAll();
    return array_map('hrPayslipDecode',$rows);
}
function hrPayslipRead(PDO $pdo,int $id,int $outlet): array {
    $row=hrQuery($pdo,'SELECT * FROM hr_payslips WHERE id=? AND outlet_id=?',[$id,$outlet])->fetch();
    if(!$row)throw new HrError('Payslip not found.',404);
    unset($row['created_by'],$row['issued_by'],$row['salary_history_id']);
    return hrPayslipDecode($row);
}
function hrPayslipSnapshot(PDO $pdo,int $employeeId,int $outlet,string $profileDate): array {
    $employee=hrEmployee($pdo,$employeeId,$outlet,true);
    $salary=hrQuery($pdo,'SELECT id,salary_type,basic_rate,fixed_allowance,currency_code FROM hr_salary_history WHERE employee_id=? AND effective_from<=? ORDER BY effective_from DESC,id DESC LIMIT 1',[$employeeId,$profileDate])->fetch();
    if(!$salary)throw new HrError('Employee has no salary profile effective during this pay period.');
    $details=hrQuery($pdo,'SELECT d.name AS department_snapshot,p.name AS position_snapshot FROM hr_employees e LEFT JOIN hr_departments d ON d.id=e.department_id LEFT JOIN hr_positions p ON p.id=e.position_id WHERE e.id=?',[$employeeId])->fetch()?:[];
    return [$employee,$salary,$details];
}
function hrPayslipCreate(PDO $pdo,array $body,int $outlet): array {
    hrRequire('manageHrSalary');hrRequire('viewHrSalary');spRequireTable($pdo,'hr_payslips');
    $employeeId=hrId($body['employee_id']??null,'Employee');[$start,$end,$payDate]=hrPayslipPeriod($body);
    [$employee,$salary,$details]=hrPayslipSnapshot($pdo,$employeeId,$outlet,$end);
    $finance=hrPayslipFinancials($body);$notes=hrText($body['notes']??null,'Notes',1000);
    $duplicate=hrQuery($pdo,'SELECT id FROM hr_payslips WHERE outlet_id=? AND employee_id=? AND period_start=? AND period_end=? AND status<>\'VOID\' FOR UPDATE',[$outlet,$employeeId,$start,$end])->fetchColumn();
    if($duplicate)throw new HrError('A payslip already exists for this employee and month.',409);
    $values=['outlet_id'=>$outlet,'employee_id'=>$employeeId,'salary_history_id'=>(int)$salary['id'],
        'staff_code_snapshot'=>$employee['staff_code'],'full_name_snapshot'=>$employee['full_name'],
        'department_snapshot'=>$details['department_snapshot']??null,'position_snapshot'=>$details['position_snapshot']??null,
        'period_start'=>$start,'period_end'=>$end,'pay_date'=>$payDate,'salary_type'=>$salary['salary_type'],
        'currency_code'=>$salary['currency_code'],'basic_pay'=>$finance['basic_pay'],'fixed_allowance'=>$finance['fixed_allowance'],
        'earnings_json'=>json_encode($finance['earnings'],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE),
        'deductions_json'=>json_encode($finance['deductions'],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE),
        'gross_pay'=>$finance['gross_pay'],'total_deductions'=>$finance['total_deductions'],'net_pay'=>$finance['net_pay'],
        'status'=>'DRAFT','notes'=>$notes,'created_by'=>(int)$_SERVER['SP_AUTH_USER_ID']];
    hrWrite($pdo,'hr_payslips',$values,null);$id=(int)$pdo->lastInsertId();
    $number='PS-'.(new DateTimeImmutable($start))->format('Ym').'-'.str_pad((string)$id,6,'0',STR_PAD_LEFT);
    hrQuery($pdo,'UPDATE hr_payslips SET payslip_no=? WHERE id=?',[$number,$id]);
    spAudit($pdo,'HR_PAYSLIP_CREATE','hr_payslips',$id,null,['outlet_id'=>$outlet,'period_start'=>$start,'status'=>'DRAFT']);
    return ['ok'=>true,'id'=>$id,'payslip_no'=>$number];
}
function hrPayslipUpdate(PDO $pdo,array $body,int $outlet): array {
    hrRequire('manageHrSalary');hrRequire('viewHrSalary');spRequireTable($pdo,'hr_payslips');
    $id=hrId($body['id']??null,'Payslip');$old=hrQuery($pdo,'SELECT * FROM hr_payslips WHERE id=? AND outlet_id=? FOR UPDATE',[$id,$outlet])->fetch();
    if(!$old)throw new HrError('Payslip not found.',404);if($old['status']!=='DRAFT')throw new HrError('Only draft payslips can be edited.',409);
    $finance=hrPayslipFinancials($body);$notes=hrText($body['notes']??null,'Notes',1000);
    hrQuery($pdo,'UPDATE hr_payslips SET basic_pay=?,fixed_allowance=?,earnings_json=?,deductions_json=?,gross_pay=?,total_deductions=?,net_pay=?,notes=? WHERE id=? AND outlet_id=? AND status=\'DRAFT\'',[
        $finance['basic_pay'],$finance['fixed_allowance'],json_encode($finance['earnings'],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE),
        json_encode($finance['deductions'],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE),$finance['gross_pay'],$finance['total_deductions'],$finance['net_pay'],$notes,$id,$outlet]);
    spAudit($pdo,'HR_PAYSLIP_UPDATE','hr_payslips',$id,null,['status'=>'DRAFT']);return ['ok'=>true,'id'=>$id];
}
function hrPayslipIssue(PDO $pdo,array $body,int $outlet): array {
    hrRequire('manageHrSalary');hrRequire('viewHrSalary');spRequireTable($pdo,'hr_payslips');
    $id=hrId($body['id']??null,'Payslip');$row=hrQuery($pdo,'SELECT * FROM hr_payslips WHERE id=? AND outlet_id=? FOR UPDATE',[$id,$outlet])->fetch();
    if(!$row)throw new HrError('Payslip not found.',404);if($row['status']==='ISSUED')return ['ok'=>true,'id'=>$id,'status'=>'ISSUED'];
    if($row['status']!=='DRAFT')throw new HrError('This payslip cannot be issued.',409);
    hrQuery($pdo,'UPDATE hr_payslips SET status=\'ISSUED\',issued_by=?,issued_at=NOW() WHERE id=? AND outlet_id=? AND status=\'DRAFT\'',[(int)$_SERVER['SP_AUTH_USER_ID'],$id,$outlet]);
    spAudit($pdo,'HR_PAYSLIP_ISSUE','hr_payslips',$id,null,['status'=>'ISSUED']);return ['ok'=>true,'id'=>$id,'status'=>'ISSUED'];
}
function hrPayslipVoid(PDO $pdo,array $body,int $outlet): array {
    hrRequire('manageHrSalary');hrRequire('viewHrSalary');spRequireTable($pdo,'hr_payslips');
    $id=hrId($body['id']??null,'Payslip');$reason=hrText($body['reason']??null,'Void reason',500,true);
    $row=hrQuery($pdo,'SELECT * FROM hr_payslips WHERE id=? AND outlet_id=? FOR UPDATE',[$id,$outlet])->fetch();
    if(!$row)throw new HrError('Payslip not found.',404);
    if($row['status']==='VOID')return ['ok'=>true,'id'=>$id,'status'=>'VOID'];
    hrQuery($pdo,'UPDATE hr_payslips SET status=\'VOID\',voided_by=?,voided_at=NOW(),void_reason=? WHERE id=? AND outlet_id=? AND status IN (\'DRAFT\',\'ISSUED\')',[(int)$_SERVER['SP_AUTH_USER_ID'],$reason,$id,$outlet]);
    spAudit($pdo,'HR_PAYSLIP_VOID','hr_payslips',$id,null,['status'=>'VOID']);return ['ok'=>true,'id'=>$id,'status'=>'VOID'];
}
