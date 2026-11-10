<?php
declare(strict_types=1);
// Endpoint for print PCs (SP-Manager Local Agent). No user session: the PC pairs once with a
// one-time code from Settings > Hardware, then authenticates with its own agent token.
// The agent only ever connects out over HTTPS; no port is opened on the shop network.
require_once __DIR__.'/security.php';   // CORS/guard; print-agent.php is exempt from the user session check
require_once __DIR__.'/hardening.php';
require_once __DIR__.'/print-lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
try{
    if(strtoupper((string)($_SERVER['REQUEST_METHOD']??'GET'))!=='POST')spApiRespond(['ok'=>false,'error'=>'Method not allowed.'],405);
    $pdo=spApiDatabase();
    spPrintRequireTables($pdo);
    $body=spReadRequestBody();
    $action=strtolower(trim((string)($body['action']??'')));
    $ip=(string)($_SERVER['REMOTE_ADDR']??'unknown');

    if($action==='pair'){
        spPrintThrottle($pdo,'pair-ip:'.$ip,10);
        $code=spPrintNormalizeCode((string)($body['pairing_code']??''));
        if(strlen($code)!==10)spApiRespond(['ok'=>false,'error'=>'Enter the 10-character pairing code shown in Settings > Hardware.'],400);
        $pdo->beginTransaction();
        $q=$pdo->prepare("SELECT id,outlet_id,agent_name FROM sp_print_agents WHERE pairing_code_hash=? AND status='PENDING' AND pairing_expires_at>NOW() LIMIT 1 FOR UPDATE");
        $q->execute([hash('sha256',$code)]);$agent=$q->fetch();
        if(!$agent){$pdo->rollBack();spApiRespond(['ok'=>false,'error'=>'This pairing code is wrong, already used or expired. Create a new code in Settings > Hardware.'],401);}
        $token='spa_'.bin2hex(random_bytes(32));
        $machine=spPrintCleanName($body['machine_name']??'');$version=substr(preg_replace('/[^0-9A-Za-z.\-]/','',(string)($body['agent_version']??''))??'',0,30);
        $pdo->prepare("UPDATE sp_print_agents SET status='ACTIVE',token_hash=?,pairing_code_hash=NULL,pairing_expires_at=NULL,machine_name=?,agent_version=?,printers_json=?,last_seen_at=NOW() WHERE id=?")
            ->execute([hash('sha256',$token),$machine?:null,$version?:null,json_encode(spPrintSanitizePrinters($body['printers']??[]),JSON_UNESCAPED_UNICODE),(int)$agent['id']]);
        $pdo->commit();
        // The token is returned once; the server keeps only its hash.
        spApiRespond(['ok'=>true,'agent_id'=>(int)$agent['id'],'agent_name'=>(string)$agent['agent_name'],'outlet_id'=>(int)$agent['outlet_id'],'agent_token'=>$token,'poll_seconds'=>5],200);
    }

    // Every other action needs the agent token.
    $token=spCurrentToken();if(!preg_match('/^spa_[a-f0-9]{64}$/',$token))$token='';
    if($token==='')spApiRespond(['ok'=>false,'error'=>'This print PC is not paired.','code'=>'NOT_PAIRED'],401);
    $q=$pdo->prepare("SELECT id,outlet_id,agent_name FROM sp_print_agents WHERE token_hash=? AND status='ACTIVE' LIMIT 1");
    $q->execute([hash('sha256',$token)]);$agent=$q->fetch();
    if(!$agent)spApiRespond(['ok'=>false,'error'=>'This print PC was removed or its pairing is no longer valid. Pair it again.','code'=>'NOT_PAIRED'],401);
    $agentId=(int)$agent['id'];$outlet=(int)$agent['outlet_id'];
    spPrintHousekeeping($pdo,$outlet);

    if($action==='heartbeat'){
        $set=['last_seen_at=NOW()'];$args=[];
        if(array_key_exists('printers',$body)){$set[]='printers_json=?';$args[]=json_encode(spPrintSanitizePrinters($body['printers']),JSON_UNESCAPED_UNICODE);}
        if(isset($body['agent_version'])){$set[]='agent_version=?';$args[]=substr(preg_replace('/[^0-9A-Za-z.\-]/','',(string)$body['agent_version'])??'',0,30);}
        if(isset($body['machine_name'])){$set[]='machine_name=?';$args[]=spPrintCleanName($body['machine_name'])?:null;}
        $args[]=$agentId;
        $pdo->prepare('UPDATE sp_print_agents SET '.implode(',',$set).' WHERE id=?')->execute($args);
        $q=$pdo->prepare("SELECT COUNT(*) FROM sp_print_jobs WHERE agent_id=? AND status='QUEUED' AND expires_at>NOW()");$q->execute([$agentId]);
        spApiRespond(['ok'=>true,'agent_name'=>(string)$agent['agent_name'],'queued'=>(int)$q->fetchColumn(),'poll_seconds'=>5],200);
    }
    if($action==='claim'){
        $pdo->prepare('UPDATE sp_print_agents SET last_seen_at=NOW() WHERE id=?')->execute([$agentId]);
        $pdo->beginTransaction();
        $q=$pdo->prepare("SELECT id,printer_name,document_type,document_id,document_no,paper_size,copies,content_html FROM sp_print_jobs WHERE agent_id=? AND status='QUEUED' AND expires_at>NOW() ORDER BY id LIMIT 1 FOR UPDATE");
        $q->execute([$agentId]);$job=$q->fetch();
        if(!$job){$pdo->commit();spApiRespond(['ok'=>true,'job'=>null],200);}
        $pdo->prepare("UPDATE sp_print_jobs SET status='PRINTING',claimed_at=NOW() WHERE id=?")->execute([(int)$job['id']]);
        $pdo->commit();
        spApiRespond(['ok'=>true,'job'=>['id'=>(int)$job['id'],'outlet_id'=>$outlet,'printer'=>(string)$job['printer_name'],'document_type'=>(string)$job['document_type'],
            'document_id'=>(string)($job['document_id']??''),'document_no'=>(string)($job['document_no']??''),'paper_size'=>(string)$job['paper_size'],
            'copies'=>(int)$job['copies'],'html'=>(string)$job['content_html']]],200);
    }
    if($action==='report'){
        $id=(int)($body['job_id']??0);$status=strtoupper(trim((string)($body['status']??'')));
        if(!in_array($status,['PRINTED','FAILED'],true))spApiRespond(['ok'=>false,'error'=>'Status must be PRINTED or FAILED.'],400);
        $error=$status==='FAILED'?mb_substr(trim((string)($body['error']??'Printing failed.')),0,500):null;
        $q=$pdo->prepare("UPDATE sp_print_jobs SET status=?,error_message=?,content_html=NULL,completed_at=NOW() WHERE id=? AND agent_id=? AND status='PRINTING'");
        $q->execute([$status,$error,$id,$agentId]);
        if(!$q->rowCount())spApiRespond(['ok'=>false,'error'=>'This job is not being printed by this PC.'],409);
        spApiRespond(['ok'=>true],200);
    }
    if($action==='unpair'){
        // The PC removes itself (Unpair on that PC). Its queued jobs are cancelled.
        $pdo->beginTransaction();
        $pdo->prepare("UPDATE sp_print_agents SET status='REVOKED',token_hash=NULL WHERE id=?")->execute([$agentId]);
        $pdo->prepare("UPDATE sp_print_jobs SET status='CANCELLED',error_message='The print PC was unpaired.',content_html=NULL,completed_at=NOW() WHERE agent_id=? AND status IN ('QUEUED','PRINTING')")->execute([$agentId]);
        $pdo->commit();
        spApiRespond(['ok'=>true],200);
    }
    spApiRespond(['ok'=>false,'error'=>'Unknown print agent request.'],400);
}catch(Throwable $e){
    if(isset($pdo)&&$pdo instanceof PDO&&$pdo->inTransaction())$pdo->rollBack();
    error_log('SP print-agent '.get_class($e).': '.$e->getMessage());
    spApiRespond(['ok'=>false,'error'=>spSafeErrorMessage($e)],500);
}
