<?php
declare(strict_types=1);
// Shared rules for Remote Printing (print-jobs.php for users, print-agent.php for print PCs).
// Not reachable from the web: api/.htaccess denies every *-lib.php file.

const SP_PRINT_PAPER_SIZES=['A4','A5'];
const SP_PRINT_DOCUMENT_TYPES=['sale','invoice','quotation','document','test'];
const SP_PRINT_MAX_AGENTS=10;            // active print PCs per outlet
const SP_PRINT_PAIRING_MINUTES=10;       // a pairing code works once, for 10 minutes
const SP_PRINT_JOB_MINUTES=15;           // a queued job expires if no PC picks it up in time
const SP_PRINT_STUCK_MINUTES=10;         // a job still "printing" after this is marked failed
const SP_PRINT_ONLINE_SECONDS=60;        // a PC is online when it called in within this time
const SP_PRINT_HISTORY_DAYS=180;
const SP_PRINT_MAX_COPIES=10;
const SP_PRINT_MAX_HTML_BYTES=4194304;   // 4 MB, enough for an invoice with an embedded logo

function spPrintRequireTables(PDO $pdo): void {
    foreach(['sp_print_agents','sp_print_jobs'] as $t) if(!spTableExists($pdo,$t)) throw new RuntimeException('Run database/migrations/remote-printing-v1.sql before using Remote Printing.');
}

// Expire, fail and prune old jobs. Cheap: indexed updates on one outlet (or one agent).
function spPrintHousekeeping(PDO $pdo,int $outlet): void {
    $pdo->prepare("UPDATE sp_print_jobs SET status='EXPIRED',error_message='No print PC picked up this job in time.',content_html=NULL,completed_at=NOW() WHERE outlet_id=? AND status='QUEUED' AND expires_at<=NOW()")->execute([$outlet]);
    $pdo->prepare("UPDATE sp_print_jobs SET status='FAILED',error_message='The print PC stopped responding while printing.',content_html=NULL,completed_at=NOW() WHERE outlet_id=? AND status='PRINTING' AND claimed_at<DATE_SUB(NOW(),INTERVAL ? MINUTE)")->execute([$outlet,SP_PRINT_STUCK_MINUTES]);
    $pdo->prepare("DELETE FROM sp_print_jobs WHERE outlet_id=? AND created_at<DATE_SUB(NOW(),INTERVAL ? DAY)")->execute([$outlet,SP_PRINT_HISTORY_DAYS]);
    $pdo->prepare("DELETE FROM sp_print_agents WHERE outlet_id=? AND status='PENDING' AND pairing_expires_at<DATE_SUB(NOW(),INTERVAL 1 DAY)")->execute([$outlet]);
}

function spPrintCleanName(mixed $value): string {
    $name=trim(preg_replace('/\s+/u',' ',(string)$value)??'');
    $name=preg_replace('/[^\p{L}\p{N} ._()#\/-]/u','',$name)??'';
    return mb_substr($name,0,120);
}

// 10 characters from an alphabet without look-alikes (no 0/O, 1/I/L), shown as XXXXX-XXXXX.
function spPrintNewPairingCode(): string {
    $alphabet='23456789ABCDEFGHJKMNPQRSTUVWXYZ';$code='';
    for($i=0;$i<10;$i++)$code.=$alphabet[random_int(0,strlen($alphabet)-1)];
    return substr($code,0,5).'-'.substr($code,5);
}
function spPrintNormalizeCode(string $code): string { return strtoupper(preg_replace('/[^A-Za-z0-9]/','',$code)??''); }

// Printers reported by the agent: [{name,status,isDefault,paperSizes:["A4","A5"]}]
function spPrintSanitizePrinters(mixed $list): array {
    $out=[];if(!is_array($list))return $out;
    foreach(array_slice($list,0,50) as $p){
        if(!is_array($p))continue;
        $name=trim((string)($p['name']??''));if($name===''||mb_strlen($name)>190)continue;
        $sizes=array_values(array_intersect(SP_PRINT_PAPER_SIZES,array_map(fn($s)=>strtoupper(trim((string)$s)),is_array($p['paperSizes']??null)?$p['paperSizes']:[])));
        $out[]=['name'=>$name,'status'=>mb_substr(trim((string)($p['status']??'')),0,40),'isDefault'=>!empty($p['isDefault']),'paperSizes'=>$sizes];
    }
    return $out;
}
function spPrintDecodePrinters(?string $json): array { $v=json_decode((string)$json,true);return spPrintSanitizePrinters($v); }

function spPrintAgentOut(array $r): array {
    $seen=(int)($r['last_seen']??0);
    return ['id'=>(int)$r['id'],'name'=>(string)$r['agent_name'],'machineName'=>(string)($r['machine_name']??''),'status'=>(string)$r['status'],
        'version'=>(string)($r['agent_version']??''),'printers'=>spPrintDecodePrinters($r['printers_json']??null),
        'lastSeen'=>$seen?:null,'online'=>$r['status']==='ACTIVE'&&$seen>=time()-SP_PRINT_ONLINE_SECONDS,
        'created'=>(int)($r['created']??0)?:null,'pairingExpires'=>$r['status']==='PENDING'?((int)($r['pairing_expires']??0)?:null):null];
}
function spPrintJobOut(array $r): array {
    return ['id'=>(int)$r['id'],'agentId'=>(int)$r['agent_id'],'agentName'=>(string)($r['agent_name']??''),'printer'=>(string)$r['printer_name'],
        'documentType'=>(string)$r['document_type'],'documentId'=>(string)($r['document_id']??''),'documentNo'=>(string)($r['document_no']??''),
        'paperSize'=>(string)$r['paper_size'],'copies'=>(int)$r['copies'],'status'=>(string)$r['status'],'error'=>(string)($r['error_message']??''),
        'requestedBy'=>(string)($r['requested_by_name']??''),'created'=>(int)($r['created']??0)?:null,'completed'=>(int)($r['completed']??0)?:null];
}

// Simple fixed-window limit on sp_login_attempts, used for pairing attempts.
function spPrintThrottle(PDO $pdo,string $bucket,int $limit,int $windowSeconds=900): void {
    if(!spTableExists($pdo,'sp_login_attempts'))return;
    $key=hash('sha256','print:'.$bucket);$now=time();
    $pdo->prepare('INSERT INTO sp_login_attempts(bucket_key,window_start,attempts) VALUES(?,?,1) ON DUPLICATE KEY UPDATE attempts=IF(window_start<?,1,attempts+1),window_start=IF(window_start<?,VALUES(window_start),window_start)')->execute([$key,$now,$now-$windowSeconds,$now-$windowSeconds]);
    $q=$pdo->prepare('SELECT attempts FROM sp_login_attempts WHERE bucket_key=?');$q->execute([$key]);
    if((int)$q->fetchColumn()>$limit)spApiRespond(['ok'=>false,'error'=>'Too many pairing attempts. Wait 15 minutes, then create a new pairing code.'],429);
}
