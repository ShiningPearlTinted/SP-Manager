<?php
declare(strict_types=1);

function hrOpsTable(string $module): string {
    return match($module) {
        'Attendance'=>'hr_attendance','Shift & Schedule'=>'hr_shifts','Leave Management'=>'hr_leave_requests',
        'Overtime'=>'hr_overtime','Claims & Advances'=>'hr_claims','HR Documents'=>'hr_documents',
        default=>throw new HrError('Unknown HR module.')
    };
}
function hrOpsDateRange(mixed $value): array {
    $month=hrText($value,'Month',7,true);
    if(!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/',$month))throw new HrError('Choose a valid month.');
    $start=$month.'-01';return [$start,(new DateTimeImmutable($start))->modify('last day of this month')->format('Y-m-d')];
}
function hrOpsEmployee(PDO $pdo,mixed $value,int $outlet): int {
    $id=(int)hrId($value,'Employee');hrEmployee($pdo,$id,$outlet);return $id;
}
function hrOpsList(PDO $pdo,string $module,int $outlet,string $month): array {
    [$start,$end]=hrOpsDateRange($month);$table=hrOpsTable($module);spRequireTable($pdo,$table);
    if($module==='HR Documents')return hrQuery($pdo,'SELECT d.id,d.employee_id,e.staff_code,e.full_name,d.document_type,d.title,d.file_name,d.mime_type,d.created_at FROM hr_documents d JOIN hr_employees e ON e.id=d.employee_id WHERE d.outlet_id=? AND d.created_at>=? AND d.created_at<DATE_ADD(?,INTERVAL 1 DAY) ORDER BY d.created_at DESC,d.id DESC LIMIT 500',[$outlet,$start,$end])->fetchAll();
    if($module==='Claims & Advances'){
        $claims=hrQuery($pdo,'SELECT c.id,c.employee_id,e.staff_code,e.full_name,c.claim_date AS date,c.category,c.amount,c.description,c.status,c.decision_note,c.receipt_name,c.created_at,\'CLAIM\' AS record_type FROM hr_claims c JOIN hr_employees e ON e.id=c.employee_id WHERE c.outlet_id=? AND c.claim_date BETWEEN ? AND ? ORDER BY c.claim_date DESC,c.id DESC LIMIT 500',[$outlet,$start,$end])->fetchAll();
        $advances=hrQuery($pdo,'SELECT a.id,a.employee_id,a.staff_code_snapshot AS staff_code,a.full_name_snapshot AS full_name,a.advance_date AS date,\'Salary advance\' AS category,a.amount,a.reason AS description,a.status,a.balance,a.created_at,\'ADVANCE\' AS record_type FROM hr_salary_advances a WHERE a.outlet_id=? AND a.advance_date BETWEEN ? AND ? ORDER BY a.advance_date DESC,a.id DESC LIMIT 500',[$outlet,$start,$end])->fetchAll();
        return [...$claims,...$advances];
    }
    $dateColumn=match($module){'Attendance'=>'work_date','Shift & Schedule'=>'shift_date','Leave Management'=>'start_date','Overtime'=>'work_date',default=>'work_date'};
    $sql="SELECT r.*,e.staff_code,e.full_name FROM {$table} r JOIN hr_employees e ON e.id=r.employee_id WHERE r.outlet_id=? AND r.{$dateColumn} BETWEEN ? AND ? ORDER BY r.{$dateColumn} DESC,r.id DESC LIMIT 1000";
    return hrQuery($pdo,$sql,[$outlet,$start,$end])->fetchAll();
}
function hrOpsEmployees(PDO $pdo,int $outlet): array {
    return hrQuery($pdo,'SELECT e.id,e.staff_code,e.full_name FROM hr_employees e JOIN hr_employment_statuses s ON s.id=e.employment_status_id WHERE '.hrOutletExpression().'=? AND s.is_active_employment=1 ORDER BY e.full_name,e.id LIMIT 2000',[$outlet])->fetchAll();
}
function hrOpsTime(mixed $value,string $label,bool $required=false): ?string {
    $text=hrText($value,$label,8,$required);if($text===null)return null;
    if(!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/',$text))throw new HrError($label.' must be a valid time.');
    return strlen($text)===5?$text.':00':$text;
}
function hrOpsNumber(mixed $value,string $label,int $decimals=2): string {
    if(!is_scalar($value)||!preg_match('/^\d{1,6}(?:\.\d{1,'.$decimals.'})?$/',(string)$value))throw new HrError($label.' must be a non-negative number with at most '.$decimals.' decimals.');
    return number_format((float)$value,$decimals,'.','');
}
function hrOpsSave(PDO $pdo,array $body,int $outlet): array {
    $module=hrText($body['module']??null,'Module',40,true);$table=hrOpsTable($module);spRequireTable($pdo,$table);
    if($module==='Claims & Advances')hrRequire('manageHrSalary');else hrRequire('manageHrEmployees');
    $employee=hrOpsEmployee($pdo,$body['employee_id']??null,$outlet);$id=hrId($body['id']??null,'Record',true);$user=(int)$_SERVER['SP_AUTH_USER_ID'];
    if($module==='Attendance'){
        $date=hrDate($body['work_date']??null,'Date',true);$in=hrOpsTime($body['clock_in']??null,'Clock in');$out=hrOpsTime($body['clock_out']??null,'Clock out');$status=strtoupper((string)hrText($body['attendance_status']??'PRESENT','Status',20,true));
        if(!in_array($status,['PRESENT','ABSENT','LATE','OFF','ON LEAVE'],true))throw new HrError('Select a valid attendance status.');if($in&&$out&&$out<=$in)throw new HrError('Clock out must be later than clock in.');$notes=hrText($body['notes']??null,'Notes',500);
        $values=[$outlet,$employee,$date,$in,$out,$status,$notes];$sql='INSERT INTO hr_attendance(outlet_id,employee_id,work_date,clock_in,clock_out,attendance_status,notes,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?)';$update='UPDATE hr_attendance SET employee_id=?,work_date=?,clock_in=?,clock_out=?,attendance_status=?,notes=?,updated_by=? WHERE id=? AND outlet_id=?';
    } elseif($module==='Shift & Schedule'){
        $date=hrDate($body['shift_date']??null,'Shift date',true);$start=hrOpsTime($body['start_time']??null,'Start time',true);$end=hrOpsTime($body['end_time']??null,'End time',true);$breakRaw=$body['break_minutes']??0;if(!is_scalar($breakRaw)||!preg_match('/^\d{1,4}$/',(string)$breakRaw)||(int)$breakRaw>1440)throw new HrError('Break duration must be between 0 and 1440 whole minutes.');$break=(int)$breakRaw;$notes=hrText($body['notes']??null,'Notes',500);
        $values=[$outlet,$employee,$date,$start,$end,$break,$notes];$sql='INSERT INTO hr_shifts(outlet_id,employee_id,shift_date,start_time,end_time,break_minutes,notes,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?)';$update='UPDATE hr_shifts SET employee_id=?,shift_date=?,start_time=?,end_time=?,break_minutes=?,notes=?,updated_by=? WHERE id=? AND outlet_id=?';
    } elseif($module==='Leave Management'){
        if($id)throw new HrError('Submitted leave requests cannot be edited. Create a replacement request.');$type=hrText($body['leave_type']??null,'Leave type',60,true);$start=hrDate($body['start_date']??null,'Start date',true);$end=hrDate($body['end_date']??null,'End date',true);if($end<$start)throw new HrError('End date cannot be before start date.');$days=hrOpsNumber($body['days']??null,'Leave days');if((float)$days<=0)throw new HrError('Leave days must be greater than zero.');$reason=hrText($body['reason']??null,'Reason',1000,true);$key=hrUuid();
        $values=[$outlet,$employee,$type,$start,$end,$days,$reason];$sql='INSERT INTO hr_leave_requests(outlet_id,employee_id,leave_type,start_date,end_date,days,reason,request_key,created_by) VALUES(?,?,?,?,?,?,?,?,?)';$update='';
    } elseif($module==='Overtime'){
        if($id)throw new HrError('Submitted overtime requests cannot be edited. Create a replacement request.');$date=hrDate($body['work_date']??null,'Work date',true);$hours=hrOpsNumber($body['hours']??null,'Hours');if((float)$hours<=0||(float)$hours>24)throw new HrError('Overtime must be more than zero and no more than 24 hours.');$reason=hrText($body['reason']??null,'Reason',1000,true);$key=hrUuid();
        $values=[$outlet,$employee,$date,$hours,$reason];$sql='INSERT INTO hr_overtime(outlet_id,employee_id,work_date,hours,reason,request_key,created_by) VALUES(?,?,?,?,?,?,?)';$update='';
    } elseif($module==='Claims & Advances'){
        if($id)throw new HrError('Submitted claims cannot be edited. Create a replacement claim.');$date=hrDate($body['claim_date']??null,'Claim date',true);$category=hrText($body['category']??null,'Category',100,true);$amount=hrMoney($body['amount']??null,'Claim amount');if((float)$amount<=0)throw new HrError('Claim amount must be greater than zero.');$description=hrText($body['description']??null,'Description',1000,true);$key=hrUuid();$fileName=null;$mime=null;$binary=null;
        if(!empty($body['receipt_data'])){$fileName=hrText($body['receipt_name']??'receipt','Receipt name',255,true);$mime=strtolower((string)hrText($body['receipt_mime']??null,'Receipt type',100,true));if(!in_array($mime,['application/pdf','image/jpeg','image/png','image/webp'],true))throw new HrError('Receipt must be a PDF, JPG, PNG or WebP file.');$raw=base64_decode((string)$body['receipt_data'],true);if($raw===false||strlen($raw)>3*1024*1024)throw new HrError('Receipt file is invalid or exceeds 3 MB.');$binary=$raw;}
        $values=[$outlet,$employee,$date,$category,$amount,$description,$fileName,$mime,$binary];$sql='INSERT INTO hr_claims(outlet_id,employee_id,claim_date,category,amount,description,receipt_name,receipt_mime,receipt_data,request_key,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)';$update='';
    } else throw new HrError('Documents must use the document upload action.');
    if($module==='Leave Management'||$module==='Overtime'||$module==='Claims & Advances'){$values[]=$key;$values[]=$user;hrQuery($pdo,$sql,$values);$id=(int)$pdo->lastInsertId();}
    elseif($id){$row=hrQuery($pdo,"SELECT id FROM {$table} WHERE id=? AND outlet_id=? FOR UPDATE",[$id,$outlet])->fetchColumn();if(!$row)throw new HrError('Record not found in this outlet.',404);hrQuery($pdo,$update,[...array_slice($values,1),$user,$id,$outlet]);}
    else{$values[]=$user;$values[]=$user;hrQuery($pdo,$sql,$values);$id=(int)$pdo->lastInsertId();}
    spAudit($pdo,'HR_'.strtoupper(str_replace([' ','&'],'_',$module)).'_SAVE',$table,$id,null,['employee_id'=>$employee]);return ['ok'=>true,'id'=>$id];
}
function hrOpsDecide(PDO $pdo,array $body,int $outlet): array {
    $module=hrText($body['module']??null,'Module',40,true);$table=match($module){'Leave Management'=>'hr_leave_requests','Overtime'=>'hr_overtime','Claims & Advances'=>'hr_claims',default=>throw new HrError('This record type cannot be approved.')};spRequireTable($pdo,$table);
    if($module==='Claims & Advances')hrRequire('manageHrSalary');else hrRequire('manageHrEmployees');
    $id=(int)hrId($body['id']??null,'Record');$status=strtoupper((string)hrText($body['status']??null,'Decision',20,true));if(!in_array($status,['APPROVED','REJECTED'],true))throw new HrError('Choose approve or reject.');$note=hrText($body['decision_note']??null,'Decision note',500);$user=(int)$_SERVER['SP_AUTH_USER_ID'];
    $old=hrQuery($pdo,"SELECT status FROM {$table} WHERE id=? AND outlet_id=? FOR UPDATE",[$id,$outlet])->fetchColumn();if($old===false)throw new HrError('Record not found in this outlet.',404);if($old!=='PENDING')throw new HrError('Only pending requests can be decided.',409);
    hrQuery($pdo,"UPDATE {$table} SET status=?,decision_note=?,decided_by=?,decided_at=NOW() WHERE id=? AND outlet_id=? AND status='PENDING'",[$status,$note,$user,$id,$outlet]);spAudit($pdo,'HR_'.strtoupper(str_replace([' ','&'],'_',$module)).'_DECIDE',$table,$id,['status'=>'PENDING'],['status'=>$status]);return ['ok'=>true];
}
function hrOpsPayClaim(PDO $pdo,array $body,int $outlet): array {
    hrRequire('manageHrSalary');spRequireTable($pdo,'hr_claims');$id=(int)hrId($body['id']??null,'Claim');$reference=hrText($body['payment_reference']??null,'Payment reference',120);$row=hrQuery($pdo,'SELECT status FROM hr_claims WHERE id=? AND outlet_id=? FOR UPDATE',[$id,$outlet])->fetchColumn();if($row===false)throw new HrError('Claim not found in this outlet.',404);if($row!=='APPROVED')throw new HrError('Only an approved claim can be marked as paid.',409);
    hrQuery($pdo,'UPDATE hr_claims SET status=\'PAID\',paid_by=?,paid_at=NOW(),payment_reference=? WHERE id=? AND outlet_id=? AND status=\'APPROVED\'',[(int)$_SERVER['SP_AUTH_USER_ID'],$reference,$id,$outlet]);spAudit($pdo,'HR_CLAIM_PAID','hr_claims',$id,['status'=>'APPROVED'],['status'=>'PAID']);return ['ok'=>true];
}
function hrOpsDelete(PDO $pdo,array $body,int $outlet): array {
    $module=hrText($body['module']??null,'Module',40,true);$table=hrOpsTable($module);if($module==='HR Documents')throw new HrError('Documents must be removed through the document action.');spRequireTable($pdo,$table);$id=(int)hrId($body['id']??null,'Record');
    if($module==='Claims & Advances')hrRequire('manageHrSalary');else hrRequire('manageHrEmployees');
    if(in_array($module,['Leave Management','Overtime','Claims & Advances'],true))$where=" AND status='PENDING'";else$where='';$q=hrQuery($pdo,"DELETE FROM {$table} WHERE id=? AND outlet_id=?{$where}",[$id,$outlet]);if(!$q->rowCount())throw new HrError('Record not found, or it has already been approved.',409);spAudit($pdo,'HR_RECORD_DELETE',$table,$id);return ['ok'=>true];
}
function hrOpsDeleteDocument(PDO $pdo,array $body,int $outlet): array {
    hrRequire('manageHrEmployees');hrRequire('viewHrSensitive');spRequireTable($pdo,'hr_documents');$id=(int)hrId($body['id']??null,'Document');$row=hrQuery($pdo,'SELECT employee_id FROM hr_documents WHERE id=? AND outlet_id=? FOR UPDATE',[$id,$outlet])->fetchColumn();if($row===false)throw new HrError('Document not found in this outlet.',404);hrQuery($pdo,'DELETE FROM hr_documents WHERE id=? AND outlet_id=?',[$id,$outlet]);spAudit($pdo,'HR_DOCUMENT_DELETE','hr_documents',$id,null,['employee_id'=>(int)$row]);return ['ok'=>true];
}
function hrOpsUploadDocument(PDO $pdo,array $body,int $outlet): array {
    hrRequire('manageHrEmployees');spRequireTable($pdo,'hr_documents');$employee=hrOpsEmployee($pdo,$body['employee_id']??null,$outlet);$type=hrText($body['document_type']??null,'Document type',80,true);$title=hrText($body['title']??null,'Title',180,true);$name=hrText($body['file_name']??null,'File name',255,true);$mime=strtolower((string)hrText($body['mime_type']??null,'File type',100,true));
    if(!in_array($mime,['application/pdf','image/jpeg','image/png'],true))throw new HrError('Only PDF, JPG and PNG documents are supported.');$data=base64_decode((string)($body['file_data']??''),true);if($data===false||strlen($data)>5*1024*1024)throw new HrError('Document is invalid or exceeds 5 MB.');$id=$employee;
    $encrypted=hrCrypt($data);hrQuery($pdo,'INSERT INTO hr_documents(outlet_id,employee_id,document_type,title,file_name,mime_type,file_data,uploaded_by) VALUES(?,?,?,?,?,?,?,?)',[$outlet,$id,$type,$title,$name,$mime,$encrypted,(int)$_SERVER['SP_AUTH_USER_ID']]);$docId=(int)$pdo->lastInsertId();spAudit($pdo,'HR_DOCUMENT_UPLOAD','hr_documents',$docId,null,['employee_id'=>$id,'mime_type'=>$mime]);return ['ok'=>true,'id'=>$docId];
}
function hrOpsDownloadDocument(PDO $pdo,int $id,int $outlet): never {
    spRequireTable($pdo,'hr_documents');$row=hrQuery($pdo,'SELECT file_name,mime_type,file_data FROM hr_documents WHERE id=? AND outlet_id=? LIMIT 1',[$id,$outlet])->fetch();if(!$row)throw new HrError('Document not found in this outlet.',404);
    $plain=hrCrypt((string)$row['file_data'],true);$safe=preg_replace('/[^A-Za-z0-9._-]/','_',basename((string)$row['file_name']));header('Content-Type: '.(string)$row['mime_type']);header('Content-Disposition: attachment; filename="'.$safe.'"');header('X-Content-Type-Options: nosniff');header('Content-Length: '.strlen($plain));echo $plain;exit;
}
