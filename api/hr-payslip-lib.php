<?php
declare(strict_types=1);

function hrPayslipCents(string $amount): int {
    [$whole,$fraction]=array_pad(explode('.',$amount,2),2,'00');
    return ((int)$whole*100)+(int)str_pad($fraction,2,'0');
}
function hrPayslipFlexibleMoney(mixed $value,string $label): string {
    if($value===null)$value='0';
    if(is_scalar($value)){
        $text=trim((string)$value);
        if($text==='')$text='0';
        if(preg_match('/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/',$text))$text=str_replace(',','',$text);
        if(preg_match('/^\.\d{1,2}$/',$text))$text='0'.$text;
        $value=$text;
    }
    return hrMoney($value,$label);
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
    $rows=hrQuery($pdo,'SELECT id,payslip_no,outlet_id,employee_id,staff_code_snapshot,full_name_snapshot,department_snapshot,position_snapshot,period_start,period_end,pay_date,currency_code,basic_pay,fixed_allowance,salary_advance_id,salary_advance_repayment,earnings_json,deductions_json,gross_pay,total_deductions,net_pay,status,notes,created_at,issued_at FROM hr_payslips WHERE outlet_id=? AND period_start=? ORDER BY full_name_snapshot,id LIMIT 500',[$outlet,$start])->fetchAll();
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
function hrPayslipAdvance(PDO $pdo,array $body,int $employeeId,int $outlet): array {
    $advanceId=hrId($body['advance_id']??null,'Salary advance',true);
    $repayment=hrPayslipFlexibleMoney($body['advance_repayment']??'0','Salary advance repayment');
    if(!$advanceId){if((float)$repayment>0)throw new HrError('Choose a salary advance before entering a repayment.');return [null,'0.00'];}
    $advance=hrQuery($pdo,'SELECT id,balance FROM hr_salary_advances WHERE id=? AND employee_id=? AND outlet_id=? AND status=\'OPEN\' FOR UPDATE',[$advanceId,$employeeId,$outlet])->fetch();
    if(!$advance)throw new HrError('Open salary advance not found for this employee.',404);
    if(hrPayslipCents($repayment)<=0)throw new HrError('Enter the salary advance repayment amount.');
    if(hrPayslipCents($repayment)>hrPayslipCents((string)$advance['balance']))throw new HrError('Repayment cannot exceed the outstanding salary advance balance.');
    return [$advanceId,$repayment];
}
function hrPayslipWithAdvance(array $body,string $repayment): array {
    $deductions=$body['deductions']??[];
    if((float)$repayment>0)$deductions[]=['label'=>'Salary advance repayment','amount'=>$repayment];
    $body['deductions']=$deductions;return $body;
}
function hrPayslipCreate(PDO $pdo,array $body,int $outlet): array {
    hrRequire('manageHrSalary');hrRequire('viewHrSalary');spRequireTable($pdo,'hr_payslips');
    $employeeId=hrId($body['employee_id']??null,'Employee');[$start,$end,$payDate]=hrPayslipPeriod($body);
    [$employee,$salary,$details]=hrPayslipSnapshot($pdo,$employeeId,$outlet,$end);
    [$advanceId,$repayment]=hrPayslipAdvance($pdo,$body,$employeeId,$outlet);
    $finance=hrPayslipFinancials(hrPayslipWithAdvance($body,$repayment));$notes=hrText($body['notes']??null,'Notes',1000);
    $duplicate=hrQuery($pdo,'SELECT id FROM hr_payslips WHERE outlet_id=? AND employee_id=? AND period_start=? AND period_end=? AND status<>\'VOID\' FOR UPDATE',[$outlet,$employeeId,$start,$end])->fetchColumn();
    if($duplicate)throw new HrError('A payslip already exists for this employee and month.',409);
    $values=['outlet_id'=>$outlet,'employee_id'=>$employeeId,'salary_history_id'=>(int)$salary['id'],
        'staff_code_snapshot'=>$employee['staff_code'],'full_name_snapshot'=>$employee['full_name'],
        'department_snapshot'=>$details['department_snapshot']??null,'position_snapshot'=>$details['position_snapshot']??null,
        'period_start'=>$start,'period_end'=>$end,'pay_date'=>$payDate,'salary_type'=>$salary['salary_type'],
        'currency_code'=>$salary['currency_code'],'basic_pay'=>$finance['basic_pay'],'fixed_allowance'=>$finance['fixed_allowance'],
        'salary_advance_id'=>$advanceId,'salary_advance_repayment'=>$repayment,
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
    [$advanceId,$repayment]=hrPayslipAdvance($pdo,$body,(int)$old['employee_id'],$outlet);
    $finance=hrPayslipFinancials(hrPayslipWithAdvance($body,$repayment));$notes=hrText($body['notes']??null,'Notes',1000);
    hrQuery($pdo,'UPDATE hr_payslips SET salary_advance_id=?,salary_advance_repayment=?,basic_pay=?,fixed_allowance=?,earnings_json=?,deductions_json=?,gross_pay=?,total_deductions=?,net_pay=?,notes=? WHERE id=? AND outlet_id=? AND status=\'DRAFT\'',[
        $advanceId,$repayment,
        $finance['basic_pay'],$finance['fixed_allowance'],json_encode($finance['earnings'],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE),
        json_encode($finance['deductions'],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE),$finance['gross_pay'],$finance['total_deductions'],$finance['net_pay'],$notes,$id,$outlet]);
    spAudit($pdo,'HR_PAYSLIP_UPDATE','hr_payslips',$id,null,['status'=>'DRAFT']);return ['ok'=>true,'id'=>$id];
}
function hrPayslipIssue(PDO $pdo,array $body,int $outlet): array {
    hrRequire('manageHrSalary');hrRequire('viewHrSalary');spRequireTable($pdo,'hr_payslips');
    $id=hrId($body['id']??null,'Payslip');$row=hrQuery($pdo,'SELECT * FROM hr_payslips WHERE id=? AND outlet_id=? FOR UPDATE',[$id,$outlet])->fetch();
    if(!$row)throw new HrError('Payslip not found.',404);if($row['status']==='ISSUED')return ['ok'=>true,'id'=>$id,'status'=>'ISSUED'];
    if($row['status']!=='DRAFT')throw new HrError('This payslip cannot be issued.',409);
    if(!empty($row['salary_advance_id'])&&hrPayslipCents((string)$row['salary_advance_repayment'])>0){
        $advance=hrQuery($pdo,'SELECT balance FROM hr_salary_advances WHERE id=? AND employee_id=? AND outlet_id=? AND status=\'OPEN\' FOR UPDATE',[(int)$row['salary_advance_id'],(int)$row['employee_id'],$outlet])->fetch();
        if(!$advance||hrPayslipCents((string)$row['salary_advance_repayment'])>hrPayslipCents((string)$advance['balance']))throw new HrError('Outstanding advance changed; edit this draft and review its repayment amount.',409);
        $balance=hrPayslipCents((string)$advance['balance'])-hrPayslipCents((string)$row['salary_advance_repayment']);
        hrQuery($pdo,'UPDATE hr_salary_advances SET balance=?,status=? WHERE id=?',[hrPayslipAmount($balance),$balance===0?'SETTLED':'OPEN',(int)$row['salary_advance_id']]);
    }
    hrQuery($pdo,'UPDATE hr_payslips SET status=\'ISSUED\',issued_by=?,issued_at=NOW() WHERE id=? AND outlet_id=? AND status=\'DRAFT\'',[(int)$_SERVER['SP_AUTH_USER_ID'],$id,$outlet]);
    spAudit($pdo,'HR_PAYSLIP_ISSUE','hr_payslips',$id,null,['status'=>'ISSUED']);return ['ok'=>true,'id'=>$id,'status'=>'ISSUED'];
}
function hrPayslipVoid(PDO $pdo,array $body,int $outlet): array {
    hrRequire('manageHrSalary');hrRequire('viewHrSalary');spRequireTable($pdo,'hr_payslips');
    $id=hrId($body['id']??null,'Payslip');$reason=hrText($body['reason']??null,'Void reason',500,true);
    $row=hrQuery($pdo,'SELECT * FROM hr_payslips WHERE id=? AND outlet_id=? FOR UPDATE',[$id,$outlet])->fetch();
    if(!$row)throw new HrError('Payslip not found.',404);
    if($row['status']==='VOID')return ['ok'=>true,'id'=>$id,'status'=>'VOID'];
    if($row['status']==='ISSUED'&&!empty($row['salary_advance_id'])&&hrPayslipCents((string)$row['salary_advance_repayment'])>0){
        $later=hrQuery($pdo,'SELECT id FROM hr_payslips WHERE salary_advance_id=? AND status=\'ISSUED\' AND period_start>? LIMIT 1 FOR UPDATE',[(int)$row['salary_advance_id'],$row['period_start']])->fetchColumn();
        if($later)throw new HrError('Void later issued payslips first to reverse this advance repayment safely.',409);
        $advance=hrQuery($pdo,'SELECT amount,balance FROM hr_salary_advances WHERE id=? AND employee_id=? AND outlet_id=? FOR UPDATE',[(int)$row['salary_advance_id'],(int)$row['employee_id'],$outlet])->fetch();
        if(!$advance)throw new HrError('Linked salary advance was not found.',409);
        $balance=hrPayslipCents((string)$advance['balance'])+hrPayslipCents((string)$row['salary_advance_repayment']);
        if($balance>hrPayslipCents((string)$advance['amount']))throw new HrError('Advance repayment cannot be reversed safely.',409);
        hrQuery($pdo,'UPDATE hr_salary_advances SET balance=?,status=\'OPEN\' WHERE id=?',[hrPayslipAmount($balance),(int)$row['salary_advance_id']]);
    }
    hrQuery($pdo,'UPDATE hr_payslips SET status=\'VOID\',voided_by=?,voided_at=NOW(),void_reason=? WHERE id=? AND outlet_id=? AND status IN (\'DRAFT\',\'ISSUED\')',[(int)$_SERVER['SP_AUTH_USER_ID'],$reason,$id,$outlet]);
    spAudit($pdo,'HR_PAYSLIP_VOID','hr_payslips',$id,null,['status'=>'VOID']);return ['ok'=>true,'id'=>$id,'status'=>'VOID'];
}

/** Generate a self-contained, text-based PDF payslip from the issued database snapshot. */
function hrPayslipPdfDocument(array $slip,string $outletName): string {
    $pages=[];$stream='';$page=0;$y=0;
    $text=static function(float $x,float $top,string $value,float $size=9,bool $bold=false,bool $right=false,array $color=[0.09,0.13,0.20])use(&$stream):void{
        $encoded=@iconv('UTF-8','Windows-1252//TRANSLIT',(string)$value);if($encoded===false)$encoded='';
        if($right)$x-=strlen($encoded)*$size*0.51;
        $encoded=str_replace(['\\','(',')',"\r","\n"],['\\\\','\\(','\\)',' ',' '],$encoded);
        $stream.=sprintf("%.3f %.3f %.3f rg\nBT /%s %.1f Tf 1 0 0 1 %.2f %.2f Tm (%s) Tj ET\n0 0 0 rg\n",$color[0],$color[1],$color[2],$bold?'F2':'F1',$size,$x,842-$top,$encoded);
    };
    $rule=static function(float $x,float $top,float $width)use(&$stream):void{$stream.='0.86 G 0.5 w '.sprintf('%.2f %.2f m %.2f %.2f l S', $x,842-$top,$x+$width,842-$top)."\n0 G\n";};
    $fill=static function(float $x,float $top,float $width,float $height,array $color)use(&$stream):void{$stream.=sprintf("q %.3f %.3f %.3f rg %.2f %.2f %.2f %.2f re f Q\n",$color[0],$color[1],$color[2],$x,842-$top-$height,$width,$height);};
    $startPage=static function()use(&$page,&$stream,&$y,&$pages,$text,$rule,$fill,$slip,$outletName):void{
        if($page>0){$rule(24,807,547);$text(30,825,'Confidential salary information · Generated by SP-Manager',7,false,false,[0.38,0.44,0.52]);$text(565,825,'Page '.$page,7,false,true,[0.38,0.44,0.52]);$pages[]=$stream;}
        $page++;$stream='';$fill(24,24,547,120,[0.04,0.34,0.52]);
        $text(42,50,'PAY STATEMENT',9,true,false,[0.78,0.91,0.98]);
        $text(42,82,'PAYSLIP',27,true,false,[1,1,1]);
        $text(42,104,$outletName,10,false,false,[0.91,0.96,1]);
        $text(42,126,'Reference: '.(string)($slip['payslip_no']??''),9,true,false,[0.91,0.96,1]);
        $text(555,50,strtoupper((string)($slip['status']??'')),8,true,true,[1,1,1]);
        $y=166;
        if($page>1){$text(30,$y,'PAYSLIP DETAILS (CONTINUED)',9,true);$y+=22;}
    };
    $finish=static function()use(&$pages,&$stream,&$page,$text,$rule):void{
        $rule(24,807,547);$text(30,825,'Confidential salary information · Generated by SP-Manager',7,false,false,[0.38,0.44,0.52]);
        $text(565,825,'Page '.$page,7,false,true,[0.38,0.44,0.52]);$pages[]=$stream;
    };
    $startPage();
    $fill(24,$y,547,132,[0.97,0.98,0.99]);
    $facts=[['Employee',(string)($slip['full_name_snapshot']??'')],['Staff code',(string)($slip['staff_code_snapshot']??'')],['Department',(string)($slip['department_snapshot']??'—')],['Position',(string)($slip['position_snapshot']??'—')],['Pay period',(string)($slip['period_start']??'').' – '.(string)($slip['period_end']??'')],['Pay date',(string)($slip['pay_date']??'')]];
    foreach($facts as $index=>[$label,$value]){
        $row=intdiv($index,2);$column=$index%2;$x=38+$column*270;$top=$y+22+$row*40;
        $text($x,$top,$label,7,true,false,[0.38,0.44,0.52]);
        $valueCharacters=preg_split('//u',$value,-1,PREG_SPLIT_NO_EMPTY)?:str_split($value);$valueLines=array_map(static fn($chunk)=>implode('',$chunk),array_chunk($valueCharacters,42));
        $text($x,$top+14,$valueLines[0]??'',8,true);
        if(isset($valueLines[1]))$text($x,$top+25,$valueLines[1],7.5);
    }
    $y+=151;
    $currency=strtoupper((string)($slip['currency_code']??'MYR'));
    $money=static fn($value)=>($currency==='MYR'?'RM':$currency).' '.number_format((float)$value,2,'.',',');
    $section=static function(string $title)use(&$y,$startPage,$text):void{
        if($y>760){$startPage();$title.=' (continued)';}
        $text(30,$y,$title,12,true);$y+=22;
    };
    $row=static function(string $label,string $value,bool $bold=false)use(&$y,$startPage,$text,$rule):void{
        if($y>770){$startPage();$text(30,$y,'PAYSLIP ITEMS (CONTINUED)',9,true);$y+=22;}
        $text(38,$y,$label,9,$bold);$text(555,$y,$value,9,$bold,true);$y+=22;$rule(30,$y-8,535);
    };
    $section('Earnings');
    $row('Basic pay',$money($slip['basic_pay']??0));$row('Fixed allowance',$money($slip['fixed_allowance']??0));
    foreach(($slip['earnings']??[]) as $line)$row((string)($line['label']??''),$money($line['amount']??0));
    $row('Gross pay',$money($slip['gross_pay']??0),true);$y+=10;
    $section('Deductions');
    if(empty($slip['deductions']))$row('No deductions','—');
    else foreach(($slip['deductions']??[]) as $line)$row((string)($line['label']??''),$money($line['amount']??0));
    $row('Total deductions',$money($slip['total_deductions']??0),true);$y+=8;
    if($y>760){$startPage();}
    $fill(24,$y,547,42,[0.88,0.95,0.98]);$text(40,$y+26,'NET PAY',12,true);$text(555,$y+27,$money($slip['net_pay']??0),14,true,true);$y+=60;
    foreach([['Notes',(string)($slip['notes']??'')],['Void reason',(string)($slip['void_reason']??'')]] as [$label,$value]){
        if($value==='')continue;
        $section($label);$characters=preg_split('//u',$value,-1,PREG_SPLIT_NO_EMPTY)?:str_split($value);$lines=array_chunk($characters,88);
        foreach($lines as $charactersInLine){if($y>775){$startPage();}$text(38,$y,implode('',$charactersInLine),8);$y+=13;}
    }
    $finish();
    $objects=[1=>'<< /Type /Catalog /Pages 2 0 R >>',3=>'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',4=>'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];$next=5;$kids=[];
    foreach($pages as $content){$pageId=$next++;$streamId=$next++;$kids[]=$pageId.' 0 R';$objects[$pageId]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '.$streamId.' 0 R >>';$objects[$streamId]='<< /Length '.strlen($content).">>\nstream\n".$content.'endstream';}
    $objects[2]='<< /Type /Pages /Kids ['.implode(' ',$kids).'] /Count '.count($pages).' >>';ksort($objects);$pdf="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";$offsets=[];
    foreach($objects as $id=>$object){$offsets[$id]=strlen($pdf);$pdf.="$id 0 obj\n$object\nendobj\n";}
    $xref=strlen($pdf);$pdf.="xref\n0 $next\n0000000000 65535 f \n";for($i=1;$i<$next;$i++)$pdf.=sprintf("%010d 00000 n \n",$offsets[$i]);
    return $pdf."trailer << /Size $next /Root 1 0 R >>\nstartxref\n$xref\n%%EOF\n";
}
